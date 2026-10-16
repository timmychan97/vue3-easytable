# Code Audit — vue3-easytable

> **Living document.** This is the single to-do list for the repo-wide audit: race conditions, bugs and
> edge cases, error handling, and modularity. Update it whenever an item moves, and commit the update
> together with the fix it describes.

- **Started:** 2026-10-16, on branch `refactor/all` @ `a0bfb50`
- **Scope:** everything under `packages/` (excluding `docs/`)
- **Method:** four parallel read-only reviews (ve-table core · selection/clipboard/util · table subcomponents · common + other components), then triage. Duplicates were merged across reviews. Every item was confirmed by reading the code. Items marked 🔍 were also re-checked line-by-line during triage. **None have been reproduced at runtime yet**, so start every fix with a failing test.
- **Re-checked:** 2026-10-16 at `0c5b732`, after merging four remote commits (`81a1ebb` docs localisation + locale re-keying, `442962c` ve-table split into `methods/*` + TanStack virtual scroll, `1645d44` / `0c5b732` formatting and lint). Every item that pointed at a changed file was re-read against the new code. See the Changelog for what moved.
- **Line numbers** are as of `0c5b732` for items in changed files, and `a0bfb50` elsewhere (those files are unchanged). They will drift. Search for the quoted symbol if a line no longer matches.

---

## How to maintain this doc

| Marker | Meaning |
|---|---|
| `- [ ]` | Open |
| `- [ ] 🚧` | In progress (add branch name) |
| `- [x] ✅ YYYY-MM-DD · <commit/PR>` | Done (verified by a test or a stated manual check) |
| `- [x] ⛔ won't fix: <reason>` | Closed without a change |
| 🔴 / 🟠 / 🟢 | High / Medium / Low severity |
| 🔍 | Re-verified against the source during triage |

Rules:

1. **Never delete an item.** Close it with ✅ or ⛔ so the history stays readable.
2. **IDs are stable and never reused.** New findings get the next free number in their section, plus a line in the Changelog.
3. When an item is fixed, record **how it was verified** (test name, or the manual repro), on the item itself.
4. Update the **Progress** table and append to the **Changelog** in the same edit.
5. If a fix reveals that an item was wrong, close it as ⛔ and say why. Don't edit it silently.

---

## Progress

| Severity | Total | Open | Done | Won't fix |
|---|---:|---:|---:|---:|
| 🔴 High | 17 | 2 | 15 | 0 |
| 🟠 Medium | 37 | 15 | 20 | 2 |
| 🟢 Low | 36 | 30 | 6 | 0 |
| **Findings** | **90** | **47** | **41** | **2** |
| Modularity (MOD) | 11 | 8 | 3 | 0 |

### Baseline health (update after each batch)

| Check | 2026-10-16 (`a0bfb50`) | 2026-10-16 (`0c5b732`, after merge) | 2026-10-16 (batches 0–2 merged) | 2026-10-16 (batches 3–6 merged) |
|---|---|---|---|---|
| `vitest run` | 37 files · 272 tests · all pass | **24 files · 40 tests fail** · 231 pass (271 total). 29 are stale snapshots: the body measurement row moved out (`442962c`), and the en-US pagination text changed (`81a1ebb`). 11 are virtual-scroll assertions; see VS-05 and Test gaps. Needs `pnpm install` first, because `@tanstack/virtual-core` is a new dependency. | 42 files · 333 tests · all pass | 51 files · 494 tests · all pass. Intermittently exits 1 on an unhandled jsdom rAF-after-teardown error (see Test gaps); a rerun is clean. |
| `eslint packages --quiet` | clean | clean | clean | clean (also `tests`) |
| `vue-tsc --noEmit` | 615 errors (pre-existing; 160 in `ve-table.tsx`). Must not increase. | 462 errors (16 in `ve-table.tsx`). New ceiling: must not increase. | 461 errors. New ceiling: must not increase. | 435 errors. New ceiling: must not increase. |

---

## Suggested fix order

Each batch is roughly one PR. Within a batch, fix the 🔴 items first.

0. ✅ **Regressions from the merge.** Get the test suite green again (refresh the stale snapshots, make the virtual-scroll specs work under jsdom), then VS-05. Settle the I18N-04 decision before anything else touches locale keys. Check COL-07 at runtime.
1. ✅ **Crash one-liners.** Small diffs with high value: COL-01, EDIT-01, DD-05, I18N-01, SEL-04, LOAD-01
2. ✅ **Lifecycle and leaks.** INFRA-01, INFRA-02, INFRA-03, EDIT-02, DD-01, DD-02, MENU-03, MENU-04, FORM-01
3. ✅ **State reconciliation and keyboard.** SEL-01, CLIP-01, SEL-02 + SEL-08 (together), EDIT-04, INFRA-07 (CLIP-01 and the clipboard half of INFRA-07 were done in batch 5)
4. ✅ **Row selection and expand.** MOD-08 first (derived state, D2), then ROW-01 … ROW-05 on top of it
5. ✅ **Clipboard codec.** CLIP-02 … CLIP-05 (MOD-04 first makes these trivially unit-testable)
6. ✅ **Virtual scroll and render performance.** VS-03, VS-06, RENDER-02, RENDER-03, RENDER-06 (VS-06 partly: the empty first render with a non-px `maxHeight` and the `virtualScrollPositions` prop are left for INS-01)
7. **Remaining 🟠 / 🟢**
8. **Modularity** (see MOD section; Composition API per D1)

---

## INFRA — cross-cutting infrastructure

- [x] ✅ 2026-10-16 · fix/audit-batch2-lifecycle-leaks · **INFRA-01** 🔴 `Hooks` has no `removeHook`, so subscriptions leak and dead instances throw
  - **Where:** [common/utils/hooks-manager.ts](../packages/common/utils/hooks-manager.ts). Registered and never removed in `selection/index.tsx:246-290`, `editor/index.tsx:193-208`, `column-resizer/index.tsx:88-95` and `row-insert-indicator/index.tsx:396`.
  - **Trigger:** select a cell, toggle `cellSelectionOption.enable` (or `rowInsertOption.enable`) at runtime, then scroll. The unmounted editor's scroll hook runs `autoResize.init(null)`, and `auto-resize.ts:130` (`el.nodeName`) throws. That aborts `triggerHook`'s `forEach`, so the remaining hooks never run. Each toggle also adds another set of closures.
  - **Fix:** make `addHook` return a disposer and call it in each child's `beforeUnmount`. Isolate errors per callback in `triggerHook`.
  - **Done:** `addHook` returns a disposer and there is a new `removeHook`. `triggerHook` iterates over a copy and wraps each callback in try/catch + `console.error`. `selection` and `editor` keep `hookDisposers` (cleared before re-registering) and dispose them in `beforeUnmount`. `column-resizer` does the same with its one hook. `row-insert-indicator` disposes in `onUnmounted` and skips its `nextTick` registration if it already unmounted.
  - **Verified:** `ve-table-lifecycle.spec.ts` › "toggling cellSelectionOption.enable removes the old hooks (INFRA-01)" (hook count 24 → 6 after three toggles; triggering scroll / size-change after disabling no longer throws or logs) and "toggling rowInsertOption.enable removes the old scroll hook (INFRA-01)" (6 → 3). `common/__tests__/hooks-manager.spec.ts` covers the disposer, error isolation, and self-disposal during trigger.

- [x] ✅ 2026-10-16 · fix/audit-batch2-lifecycle-leaks · **INFRA-02** 🔴 🔍 The emitter mixin never unsubscribes, so handlers run once per past mount
  - **Where:** [common/mixins/emitter.ts:30-33](../packages/common/mixins/emitter.ts#L30-L33). `bus.on(key, callback.bind(this))`, and there is no `off` anywhere in the repo.
  - **Trigger:** toggle `showHeader` off and on, then click a sort icon. Both the dead and the live `header/index.tsx` instances handle `SORT_CHANGE`, so the user's `sortOption.sortChange` runs twice, the first time with stale `sortColumns`. That means two fetches, and the stale one can win. `header-checkbox-content` remounts on every columns change (its key includes `columnsOptionResetTime`), so it leaks as well.
  - **Fix:** keep each bound handler and `bus.off` all of them in the mixin's `beforeUnmount`. Long term: MOD-01.
  - **Done:** `on()` records `{ bus, type, handler }` per instance, and the mixin's `beforeUnmount` `bus.off`s all of them.
  - **Verified:** `ve-table-lifecycle.spec.ts` › "toggling showHeader does not leave a dead SORT_CHANGE handler (INFRA-02)": after two `showHeader` toggles, `sortChange` was called 3 times before the fix and is now called once, with `{ age: 'asc' }`.

- [x] ✅ 2026-10-16 · fix/audit-batch2-lifecycle-leaks · **INFRA-03** 🟠 Debounces, timers and rAF are not cancelled on unmount
  - [x] `ve-table.tsx`: `debouncedBodyCellWidthChange` and `debouncedMeasureCellWidthChange` (created at 858-867) are never cancelled. `unmounted` (1000-1005) destroys the virtualizer and removes the keydown listener, but nothing else. *(Since `442962c`: the rAF timeout, `initVirtualScroll` and `setVirtualPhantomHeight` are gone, and `initTanStackVirtualScroll` null-guards its ref.)* → both are `.cancel()`ed in `unmounted`. (COL-07 then deleted `debouncedBodyCellWidthChange`; its cancel line was dropped in the batch 0 merge, so only `debouncedMeasureCellWidthChange` is cancelled.)
  - [x] `selection/index.tsx:1542-1547`: two debounced functions, no `beforeUnmount`. → cancelled in the new `beforeUnmount` (which also disposes the hooks, INFRA-01).
  - [x] `column-resizer/index.tsx:169-182, 253-258`: document listeners are not removed on unmount. See also COL-05. → `beforeUnmount` removes the `mousemove` / `mouseup` listeners, and if a drag is in progress it calls `clearColumnResizerStatus()`, which resets `document.onselectstart` / `ondragstart`. Replacing those globals is still COL-05.
  - (The editor is tracked in EDIT-02, the contextmenu in MENU-03, the dropdown in DD-01.)
  - **Fix:** add a `beforeUnmount` to each, calling `.cancel()` / `cancelAnimationTimeout` / `clearTimeout`, and null-guard `$refs` in async callbacks.
  - **`$refs` guards:** the remaining ve-table async callbacks were re-read. `setScrollBarStatus` and `initTanStackVirtualScroll` already null-guard their refs, and the other `$nextTick` callbacks only trigger hooks, which no longer reach unmounted children (INFRA-01). The editor's `nextTick` → focus `setTimeout` chain now returns early once unmounted (EDIT-02).
  - **Verified:** `ve-table-lifecycle.spec.ts` (fake timers) › "pending ve-table debounces do not run after unmount (INFRA-03)" (before the fix, `hooks.triggerHook` ran twice after unmount), "pending selection debounces do not run after unmount (INFRA-03)" (before the fix, `setSelectionPositions` ran after `cellSelectionOption.enable` was turned off), and "column resizer removes its document listeners on unmount (INFRA-03)" (unmounting mid-drag removes both listeners and restores `onselectstart`).

- [x] ✅ 2026-10-16 · fix/audit-batch0-regressions **INFRA-04** 🟠 Row and column keys are interpolated unescaped into `querySelector`
  - **Where:** `methods/scrolling.ts:61` (`rowToVisible`), `ve-table.tsx:1989` (`scrollToRowKey`); `selection/index.tsx:1421, 1438, 1452, 1498`; `editor/index.tsx:282`
  - **Trigger:** a rowKey or colKey containing `"` or `\` makes `querySelector` throw a `SyntaxError`, in several places inside a watcher. A key that isn't rendered returns `null`, and code then reads `.offsetTop` and similar on it. (`rowToVisible` and `scrollToRowKey` now null-check; the selection sites still don't.)
  - **Fix:** a shared helper `queryCell(root, rowKey, colKey)` using `CSS.escape` that returns `null` safely, with null guards at the call sites.
  - **Done (with VS-05):** `ve-table/src/util/cell-dom.ts`. The row key is escaped with `CSS.escape`, plus a fallback for environments without `CSS` such as jsdom. The column key is compared against the `col-key` attribute of the row's direct cells, so it is never put into a selector. Every helper returns `null` (or `[]`) for a missing root, row or cell, and ignores rows of tables nested inside expand rows. All six call sites now use it, and each one null-checks the result: `rowToVisible` and `scrollToRowKey` (`queryBodyRow`), selection `getTableCellEl` / `getTableFirstRowCellByColKey` / `getTableLastRowCellByColKey` / `setAutofillEndCellEl`, and editor `setCellEl`.
  - **Verified:** `ve-table-cell-dom.spec.ts`: the helpers in both normal and virtual DOM with keys containing `"`, `\` and `]`, unknown keys, null roots and a nested table; plus `selection and editor work with row keys that contain quotes`, which threw `SyntaxError: … is not a valid selector` (from `rowToVisible` and selection) before the fix.

- [ ] **INFRA-05** 🔴 Importing the library during SSR crashes
  - **Where:** prop declarations `type: [String, HTMLElement]` in `ve-dropdown/src/index.tsx:112`, `ve-select/src/index.tsx:57`, `ve-pagination/src/index.tsx:185` and `ve-contextmenu/src/index.tsx:53`. Also the `default() { return document.body }` defaults and the contextmenu's `immediate` options watcher.
  - **Trigger:** Nuxt or any SSR import. `HTMLElement` is undefined in Node, so the module throws at import time.
  - **Fix:** `type: [String, Object] as PropType<string | HTMLElement>`. Resolve `document.body` lazily in `mounted`, and do all DOM work in `mounted` or later.

- [ ] **INFRA-06** 🟢 `VeTable` declares no `emits`
  - **Where:** `ve-table.tsx` (e.g. `on-row-insert` in `handleRowInsert`, ~2111)
  - **Effect:** listeners also fall through as attributes onto the root `<div>`, and there is no typing.
  - **Fix:** declare `emits` for every emitted event.

- [x] ✅ 2026-10-16 · fix/audit-batch3b-state-reconcile + fix/audit-batch5-clipboard-codec · **INFRA-07** 🟠 A throwing user callback leaves internal state half-updated
  - **Where:**
    - `afterPaste`: `methods/clipboard.ts:118-140`. The data is mutated, but the selection update and the `CLIPBOARD_CELL_VALUE_CHANGE` hook are skipped.
    - `afterAutofill`: `methods/cell-selection.ts:270-290`. The current/end cell update is skipped, and so is `clearCellSelectionAutofillEndCell` in the `isAutofillStarting` watcher (`ve-table.tsx:817-824`).
    - `beforeCopy`: `methods/clipboard.ts:48-69`. It runs after `preventDefault`, so nothing is copied.
    - `beforeCellValueChange` / `afterCellValueChange`: `methods/editing.ts:45-75`. The editing state is never cleared, every later stop re-throws, and the after-callbacks re-fire.
  - **Fix:** a small `safeCall(fn, ...args)` that logs through `console.error` and continues, plus `try/finally` around internal cleanup. Clear internal state before calling the "after" callbacks.
  - **Done (2026-10-16, `fix/audit-batch5-clipboard-codec`), clipboard sites:** every clipboard callback in `methods/clipboard.ts` (`beforeCopy`/`afterCopy`, `beforePaste`/`afterPaste`, `beforeCut`/`afterCut`, `beforeDelete`/`afterDelete`) now goes through `safeCall`. `afterPaste` runs last, after the data, the selection update and the `CLIPBOARD_CELL_VALUE_CHANGE` hook. **Decision for a throwing `before*`:** it cancels the operation exactly like returning `false`. The range is validated first (CLIP-01) and an invalid range never calls `preventDefault`. Once the range is valid, `preventDefault` is called before the `before*` callback and is **kept** when the callback cancels: the native action would only act on the hidden editor textarea (copy its selected text, cut it, or paste into it), and since no `setData` happens, a cancelled copy or cut leaves the user's clipboard untouched. The order is documented at the top of `methods/clipboard.ts`. Verified by `ve-table-clipboard.spec.ts` › "throwing user callbacks (INFRA-07)" (8 tests; before the fix each callback's error escaped `editorCopy`/`editorPaste`/`editorCut`/`deleteCellSelectionRangeValue`, and a throwing `afterPaste` skipped the selection update and the hook). The editing and autofill sites are handled in batch 3b.
  - **Done (2026-10-16, `fix/audit-batch3b-state-reconcile`), editing and autofill sites.** Both use the existing `util/safe-call.ts`.
    - `saveCellWhenStopEditing` (`methods/editing.ts`): `beforeCellValueChange`, `cellValueChange` and `afterCellValueChange` go through `safeCall`. The editing state is cleared *before* the after-callbacks, and `enableStopEditing` is reset in a `finally` (before, the cancel paths skipped that reset).
    - `setCellSelectionByAutofill` (`methods/cell-selection.ts`): `beforeAutofill` and `afterAutofill` go through `safeCall`, and `afterAutofill` now runs *after* the current/end cell update (so a selection the callback sets is no longer overwritten). The `isAutofillStarting` watcher calls `clearCellSelectionAutofillEndCell()` in a `finally`.
    - **Decision: a throwing `before*` callback means "cancel".** `beforeCellValueChange` throwing → the value is not written and no after-callback fires, but the editor is still closed. `beforeAutofill` throwing → nothing is filled and the selection is unchanged, but the autofill end cell is cleared. The error is logged through `console.error`. Rationale: the user code could not say "yes", and a half-applied edit is worse than a dropped one. A throwing `after*` callback is only logged, because the change has already been applied.
    - **Verified:** `ve-table-state-reconcile.spec.ts` › "throwing editing and autofill callbacks (INFRA-07)": "a throwing beforeCellValueChange cancels the change and still clears editing", "a throwing afterCellValueChange keeps the change and clears editing once", "after callbacks see the editing state already cleared", "a throwing afterAutofill still updates the selection and clears the autofill end cell" and "a throwing beforeAutofill cancels the fill and still clears the autofill end cell". Before the fix the errors escaped from `stopEditingCell()` (and editing stayed on), and the autofill errors escaped from the watcher.
  - **Closed** when both branches were merged into `refactor/all` (2026-10-16). Remaining unwrapped user callback found by batch 3b: `beforeStartCellEditing`, tracked as INFRA-11.

- [ ] **INFRA-08** 🟠 Optional user callbacks are called without existence guards
  - **Where:**
    - `body/index.tsx:705`: `checkboxOption.selectedRowChange`
    - `body/index.tsx:779`: `radioOption.selectedRowChange`
    - `header/index.tsx:114, 132`: `sortOption.sortChange`, and `sortOption` itself may be undefined
    - `header-th.tsx:344`: `checkboxOption.hideSelectAll` with no `checkboxOption`
    - `body/index.tsx:665`: `checkboxOption` becomes null, or `selectedRowKeys` is unset
  - **Trigger:** e.g. a column with `sortBy` but no `sortOption` throws on click.
  - **Fix:** optional chaining plus `typeof fn === 'function'` checks.
  - **Progress (2026-10-16, `fix/audit-batch4-row-state`):** the row checkbox, radio and expand callbacks now go through the MOD-08 composables, which call `selectedRowChange`, `selectedAllChange` and the expand callbacks only when they exist (a missing `selectedRowChange` used to throw `selectedRowChange is not a function` on a checkbox click). The header `sortOption` sites and `hideSelectAll` are still open.

- [ ] **INFRA-09** 🟢 Directive robustness
  - **Where:** `common/directives/clickoutside.ts` registers a handler even when the value isn't a function (it throws on every click), and has no `updated` hook (the callback captured at mount goes stale). `common/directives/events-outside.ts`: `beforeUnmount` calls `events.forEach` without checking `events`.
  - **Fix:** validate the binding value, add `updated`, and guard the unmount.

- [ ] **INFRA-10** 🟢 `resize-event` listener bookkeeping
  - **Where:** `common/utils/resize-event.ts:36-41`. `splice(indexOf(fn), 1)` with `-1` removes the **last** listener. After `disconnect()` the empty array is kept, so a later `addResizeListener` on the same element never observes again.
  - **Fix:** guard `idx > -1`, and delete the entry when the array is empty.

- [ ] **INFRA-11** 🟢 User callbacks still called without `safeCall` (found in batches 3b and 6)
  - **Where:** `beforeStartCellEditing` (`ve-table.tsx`, `startEditingCell`) and `virtualScrollOption.scrolling` (called from the virtual-scroll adapter's change handler).
  - **Effect:** a throw from `beforeStartCellEditing` escapes `startEditingCell` / the keyboard handler; a throw from `scrolling` escapes the virtualizer's change notification.
  - **Fix:** route both through `util/safe-call.ts`, as INFRA-07 did for the editing, autofill and clipboard callbacks.

---

## COL — columns (fixed, hide/show, resize)

- [x] ✅ 2026-10-16 · fix/audit-batch1-crash-oneliners **COL-01** 🔴 🔍 "Left/Right fixed column to" on a column fixed the other way crashes the table
  - **Where:** [util/index.ts:1447-1450](../packages/ve-table/src/util/index.ts#L1447-L1450). `setColumnFixed` returns `false`, and the callers `methods/contextmenu.ts:135, 158` assign it to `this.cloneColumns`. The `cloneColumns` watcher (`ve-table.tsx:771`) then runs `initGroupColumns(false)`, which throws `false.forEach is not a function`.
  - **Trigger:** a column with `fixed: 'left'`, right-click its header, choose "Right fixed column to".
  - **Fix:** `return cloneColumns` (or have the callers ignore a falsy result). Also disable the menu item when the direction conflicts (`setHeaderContextmenuOptions`, util ~404-470).
  - **Done:** `setColumnFixed` now returns the unchanged `cloneColumns` (same reference, so the watcher doesn't fire). `setHeaderContextmenuOptions` disables "Left fixed column to" when the range's right edge column is right-fixed, and "Right fixed column to" when the left edge column is left-fixed (the same edges `setColumnFixed` checks).
  - **Verified:** `ve-table-contextmenu.spec.tsx` › "header contextmenu right fixed column to on a left fixed column" (the menu node is `ve-contextmenu-node-disabled`; calling `contextmenuItemClick('RIGHT_FIXED_COLUMN_TO')` directly no longer reaches the app `errorHandler` with `cloneColumns.forEach is not a function`, and the columns and header stay intact). `ve-table-util.spec.ts` › `setColumnFixed` (both directions return the same array unchanged) and `setHeaderContextmenuOptions` (disabled per direction, both enabled on an unfixed column, multi-column range uses the same edges).

- [ ] **COL-02** 🟢 🔍 The "don't left-fix the last column" guard is a no-op
  - **Where:** [util/index.ts:1471](../packages/ve-table/src/util/index.ts#L1471). `index < cloneColumns.length` is always true. The RIGHT branch (`index > 0`) is correct.
  - **Fix:** `index < cloneColumns.length - 1`.

- [ ] **COL-03** 🟠 Hide/show columns mutates the user's prop and discards resize and fixed state
  - **Where:** `ve-table.tsx:1122` (`this.hiddenColumns = defaultHiddenColumnKeys` keeps the prop reference, and `showColumnsByKeys` ~1958 `splice`s it); `ve-table.tsx:1129-1153` (rebuilds from `cloneDeep(this.columns)`, then `initColumnWidthByColumnResize` resets widths).
  - **Trigger:** resize a column or fix it via the contextmenu, then call `hideColumnsByKeys` / `showColumnsByKeys`. The resized widths and the fixed state are lost, and the user's `defaultHiddenColumnKeys` array is mutated.
  - **Fix:** copy the array (`[...keys]`), and re-apply `_columnResizeWidth` and `fixed` from the current colgroups.

- [ ] **COL-04** 🟢 A `columns` change runs `initGroupColumns` and `initColumnWidthByColumnResize` twice
  - **Where:** `ve-table.tsx:756-782`. The `columns` watcher, then the `cloneColumns` watcher.
  - **Fix:** do the work only in the `cloneColumns` watcher.

- [ ] **COL-05** 🟢 The column resizer clobbers globals and can get stuck
  - **Where:** `column-resizer/index.tsx:169-182, 253-258`
  - **Issues:**
    - It overwrites `document.onselectstart` and `document.ondragstart`, removing any app handlers.
    - Alt-tab, or releasing the mouse outside the window, leaves resizing stuck.
    - There is no unmount cleanup (also listed in INFRA-03). → Fixed by INFRA-03 (batch 2). The other two bullets are still open.
  - **Fix:** use `addEventListener('selectstart', prevent)` and remove it afterwards. In mousemove, `if (e.buttons === 0) end()`; also end on `window` `blur` and on Escape.

- [ ] **COL-06** 🟢 🔍 Fixed-column edge detection compares `field` instead of `key`
  - **Where:** `body/index.tsx:423-462` and `footer-td.tsx` (last-left / first-right shadow classes); `selection/index.tsx:238` (`isFirstNotFixedSelectionCol` compares `col.field` to `leftColKey`). `header-th.tsx` correctly uses `_keys`.
  - **Trigger:** two left-fixed columns without `field` (checkbox plus index) mean neither gets the shadow class. When `key !== field`, the selection's 1px left-border fix never applies.
  - **Fix:** compare by `key` everywhere. Long term: MOD-06.

- [x] ✅ 2026-10-16 · fix/audit-batch0-regressions **COL-07** 🟠 Column widths are now measured in a separate hidden table that may not match the real one
  - **Where:** `ve-table.tsx:2427-2468`, added in `442962c`. The old zero-height measurement row inside the real `<tbody>` was replaced by a second, absolutely positioned `<table>` that mirrors only the `<colgroup>`. `measureCellWidthChange` (1047) writes those widths into `colgroups[]._realTimeWidth`.
  - **Why it can diverge:** the real `table.ve-table-content` has `table-layout: fixed; min-width: 100%; border-collapse: separate` (`style/ve-table.less:37-41`). The hidden table has none of that, so it uses auto layout. It is also sized `width: tableStyle.width || '100%'` against whatever its containing block is. Columns with explicit widths should still match. Columns without a width, or a table narrower than its column sum, may not.
  - **Effect if it diverges:** `_realTimeWidth` feeds fixed-column `left`/`right` offsets, selection border geometry and `columnToVisible`, so all of them would be off.
  - **Status:** found by reading the code. **Not yet confirmed at runtime.** First step: in a browser, compare `_realTimeWidth` with `td.getBoundingClientRect().width` for a table that mixes fixed-width and auto-width columns.
  - **Also:** `bodyCellWidthChange` and `debouncedBodyCellWidthChange` (1057, 858) are now dead code, since nothing emits `BODY_CELL_WIDTH_CHANGE` any more. Remove them along with the fix.
  - **Confirmed at runtime (2026-10-16, headless Chromium via Playwright, Vite page mounting `VeTable`).** Columns: `a` 120px fixed-left, `b` auto, `c` 200px, `d` auto, `e` 20%, `f` 90px fixed-right. The probe compared each `colgroups[]._realTimeWidth` with `td.getBoundingClientRect().width` of the first body row. Before the fix, with no `scrollWidth`:
    - 1200px container: `a` measured 120 but real 146.67 (−26.67); `b` 268.6 vs 295.4; `d` 268.6 vs 226.3; `e` 236.8 vs 239.6. Only `c` and `f` matched.
    - 600px container: `c` measured 200 but real 66.89; `d` 28.6 vs 146.67; `f` 90 vs 62.
    - 300px container (narrower than the column sum): `b` and `d` measured **0**.
  - **Root cause, more specific than the item above:** without `scrollWidth`, `table.ve-table-content` has `width: auto`. `table-layout: fixed` only applies to tables with a non-auto width, so the real table actually uses **automatic, content-driven layout**. A hidden table without the cell contents can never reproduce that. Copying the CSS would not help. With `scrollWidth` set, the real table is fixed-layout and the old hidden table happened to match.
  - **Fix:** the measurement row is back in the real table, as a zero-height `<tr>` in its own `<tbody aria-hidden="true">` after `<thead>`. It is outside every `tbody.ve-table-body`, so stripe, the virtual-row `<tbody>`s, `queryBodyRows` / `queryCell`, the row-insert indicator and the last-row border rule are unaffected. The hidden sibling `<table>` is removed, and so are `bodyCellWidthChange` and `debouncedBodyCellWidthChange` (data, `created`, method). INFRA-03's mention of `debouncedBodyCellWidthChange` is now obsolete; only `debouncedMeasureCellWidthChange` is left to cancel. The `BODY_CELL_WIDTH_CHANGE` constant (`util/constant.ts:56`) is now unused, like `BODY_ROW_HEIGHT_CHANGE`.
  - **Verified:** the same Chromium probe after the fix shows diff 0 for every column at 1200, 600 and 300px containers, and with `scrollWidth: 1500`. The measurement row is 0px high, with no gap between header and first row, in both normal and virtual mode. The VS-05 browser checks still pass. Tests: `ve-table-column-measure.spec.tsx`: `measures in a hidden row of the real table, outside the body rows` (failed before the fix), `writes the measured widths into colgroups[]._realTimeWidth`, `keeps the measurement row out of the virtual rows`.

---

## SEL — cell selection and keyboard

- [x] ✅ 2026-10-16 · fix/audit-batch3b-state-reconcile · **SEL-01** 🔴 Selection and editing state is not reconciled when columns or rows change
  - **Root cause:** nothing re-validates `cellSelectionData` (`currentCell`, `normalEndCell`), `cellSelectionRangeData` or `editingCell` when `colgroups` or `allRowKeys` change. The `allRowKeys` watcher (`ve-table.tsx:726-755`) only re-checks `currentCell`.
  - **Symptoms:**
    - [x] 🔍 The selection layer crashes on render: `cornerCellInfo` reads `colgroups[index + 1].fixed` with `index === -1` ([selection/index.tsx:201-204](../packages/ve-table/src/selection/index.tsx#L201-L204)). `getBorders` destructures it before its `isRender` early return. Repro: select a cell, then `hideColumnsByKeys([thatColKey])`.
    - [x] F2 or typing a letter after the column was hidden throws, because `currentColumn` is undefined (`methods/keyboard.ts:176`, `ve-table.tsx:2042`). *Partly fixed in `442962c`:* stopping an edit on a hidden column no longer throws, because `saveCellWhenStopEditing` now clears the editor when the column is missing (`methods/editing.ts:38-41`).
    - [x] A stale `normalEndCell` after its row is removed: paste throws (`tableData[-1]`), right-click throws (`isCellInSelectionRange` → `null.includes`, `util/index.ts:807-834`), and copy writes `""` to the clipboard. See CLIP-01.
    - [x] Editing gets stuck when the edited row is removed: `saveCellWhenStopEditing` has no `else` for a missing row, so it skips `clearEditingCell()` (`methods/editing.ts:29-86`). Copy, paste and Delete all stay disabled.
  - **Fix:** one reconcile watcher on `[colgroups, allRowKeys]` that clears or clamps `currentCell`, `normalEndCell`, `editingCell` and the range whenever their keys disappear. Add defensive `index < 0` guards at the sites above, and make `isCellInSelectionRange` null-safe.
  - **Correction (render crash trigger):** with `index === -1` the check reads `colgroups[0]` first, and only reaches `colgroups[-1]` if that column is right-fixed. So the crash needs the first column to be right-fixed, or **no columns left** (`colgroups[0]` is undefined). Hiding just the selected column in a normal table left a stale selection but did not crash. The guard covers both cases.
  - **Done:** the old `allRowKeys` watcher is replaced by one watcher on a new `cellStateKeys` computed (`[colgroups, allRowKeys]`) in `ve-table.tsx`, which calls the new `reconcileCellState()` (`methods/cell-selection.ts`). When a key disappears it clears the editing cell (nothing to save), clears `currentCell` together with `normalEndCell`, collapses the range to `currentCell` when only `normalEndCell` is gone, clears the autofill end cell and any header/body indicator whose keys are gone, and resets a stale `cellSelectionRangeData` when the selection layer has not re-derived it. When rows move it updates both `rowIndex` values and refreshes the selection position, as the old watcher did for `currentCell`. Removed cells are cleared, not clamped to a neighbour, which matches the old row-removed behaviour. Guards: `cornerCellInfo` checks `index > -1 && index < length - 1`; `getBorders` reads its computeds only after the `isRender` early return; `isFirstSelectionCol` tolerates empty `colgroups`; F2 uses `currentColumn?.edit` (`methods/keyboard.ts`); `startEditingCell` returns early for an unknown row or column (EDIT-04); `isCellInSelectionRange` returns `false` when either key list is `null`; `saveCellWhenStopEditing` clears the editor when the row is gone; the editor's `containerStyle` uses `column?.fixed` (it threw `reading 'fixed'` of null when the current cell was cleared while editing).
  - **Verified:** `ve-table-state-reconcile.spec.ts` › "selection state when columns or rows change (SEL-01)", 14 tests, all failing before the fix: hiding the selected column left `currentCell` on the hidden column; hiding every column logged `TypeError: Cannot read properties of undefined (reading 'fixed')` from render; `cornerCellInfo` with right-fixed columns and a stale range threw the same; F2 and typing threw `reading 'edit'`; after removing the top row of an upward range, copy wrote `""`, paste threw `Cannot convert undefined or null to object` and right-click threw `null.includes`; removing the edited row left `isCellEditing` true (and render threw `reading 'fixed'` of null), and an in-place removal followed by `stopEditingCell()` did too; `isCellInSelectionRange` threw on unknown keys. Copy, paste and Delete work again after the edited row is removed.

- [x] ✅ 2026-10-16 · fix/audit-batch3a-keyboard-esc · **SEL-02** 🔴 🔍 The document `keydown` handler acts on keys from anywhere on the page
  - **Where:** `ve-table.tsx:990` (listener), [methods/keyboard.ts:12](../packages/ve-table/src/methods/keyboard.ts#L12) (`dealKeydownEvent`, no target check). `preventDefault` calls are at keyboard.ts:43 (Tab), 136 (Enter), 147 (Space) and 160 (Backspace).
  - **Trigger:** while a cell is selected, type into any other input on the page. A typical case: a dialog opened from the contextmenu's `afterMenuClick` (contextmenu clicks deliberately keep the selection, `tableClickOutside` → `isContextmenuPanelClicked`, ve-table.tsx:1302). Space and Backspace are swallowed, arrows and Enter move the table selection, and letters start editing the cell. Tab is always prevented, so focus can never leave the table.
  - **Fix:** `if (!this.$el.contains(event.target)) return` at the top. Tab stays trapped inside the table (D4). The way out is Esc, which is specified in SEL-08. Ship the two together.
  - **Done:** `dealKeydownEvent` (`methods/keyboard.ts`) returns early unless the key belongs to this table: the event path (`composedPath()`, so a table inside shadow DOM also works) contains the table root. One deliberate exception: when no element has focus (target is `body`, `html` or `document`), the key is still handled as before. That is not "another widget's key", and it keeps the existing specs that dispatch on `document` meaningful. Real focus is now on the root or the edit textarea anyway, because the root is focusable (SEL-08). Shipped together with SEL-08.
  - **Verified:** `ve-table-keyboard.spec.ts` › "keys from outside the table (SEL-02)": "ignores arrow keys and Enter typed into an input outside the table" and "does not swallow Tab, Space or Backspace, nor start editing from an outside input" (both failed before the fix: the events were `preventDefault`ed and the selection moved); "still handles keys inside the table" guards the other side. Headless Chromium: typing, arrows, Space, Backspace and Enter in an `<input>` after the table leave the input value correct and the table selection unchanged.

- [ ] **SEL-03** 🟠 🔍 `setAllCellSelection()` skips the first column when there is no operation column
  - **Where:** [methods/cell-selection.ts:371-389](../packages/ve-table/src/methods/cell-selection.ts#L371-L389). `setRangeCellSelectionByBodyIndicator` hard-codes `colgroups[1]`. `setAllCellSelection()` (`ve-table.tsx:1904`) reaches it through the `bodyIndicatorRowKeys` watcher, and so does any row-indicator selection. *(The original entry pointed at the right lines but named the wrong function.)*
  - **Note:** the test at `__tests__/ve-table-cell-selection.spec.ts:599-604` **locks in the bug** (`leftColKey: 'b'`). Update it with the fix.
  - **Fix:** use the first column where `!x.operationColumn`.

- [x] ✅ 2026-10-16 · fix/audit-batch1-crash-oneliners **SEL-04** 🟢 🔍 Typo in a range check: `index1 !== -1 && index1 !== -1`
  - **Where:** [util/index.ts:725](../packages/ve-table/src/util/index.ts#L725). It should test `index2`. An unknown `colKey2` returns `slice(-1, …)` garbage instead of `null`.
  - **Verified:** `ve-table-util.spec.ts` › `getColKeysByRangeColKeys` › "returns null when colKey2 is unknown" (failed with `[]` before the fix).

- [ ] **SEL-05** 🟢 🔍 `getNextColKey` with an unknown key returns the first column
  - **Where:** [util/index.ts:1092-1102](../packages/ve-table/src/util/index.ts#L1092-L1102). `-1 < length - 1` is true.
  - **Fix:** return `null` when `index < 0`.

- [ ] **SEL-06** 🟢 `columnToVisible(undefined)` throws
  - **Where:** `methods/scrolling.ts:10-20` (`nextColumn.fixed`). The public `setCellSelection` / `setRangeCellSelection` (`ve-table.tsx:1816-1818, 1861-1863`) reach it with an unknown colKey when there is a horizontal scrollbar.
  - **Fix:** validate keys in the public APIs and guard `columnToVisible`.

- [ ] **SEL-07** 🟢 `getSelectionAreas` shares a nested border object that `getBorders` mutates
  - **Where:** `selection/index.tsx:873-887` and `1243-1260`. The area layer's position on the right-fixed side depends on this hidden mutation, and on the first row the layer is shifted 1px.
  - **Fix:** clone the border objects per consumer, or make the geometry pure (MOD-05).

- [x] ✅ 2026-10-16 · fix/audit-batch3a-keyboard-esc · **SEL-08** 🟠 No keyboard way to leave the table: Tab is trapped and there is no Esc handling (decision D4)
  - **Where:** `methods/keyboard.ts:28-45` (`KEY_CODES.TAB` always calls `preventDefault`). There is no `ESC` case anywhere in `dealKeydownEvent`, and the table root has no `tabindex`, so it can't hold focus itself.
  - **Why it matters:** a keyboard-only user who enters cell navigation can never Tab out (WCAG 2.1.2 "No Keyboard Trap", level A).
  - **Target behaviour (D4):**
    1. **Cell navigation mode** (a cell is active): Tab / Shift+Tab move between cells, and stay trapped as they do today.
    2. **Esc while editing:** closes the editor and returns to cell navigation on the same cell.
       > **Decided (D6):** discard. The cell keeps its previous value, and `beforeCellValueChange` / `afterCellValueChange` don't fire.
    3. **Esc in cell navigation (not editing):** leaves cell navigation. Focus moves to the table root (`tabindex="0"`, with a visible `:focus-visible` ring). The cell keyboard handling goes dormant, and the active cell can stay visible but de-emphasised.
    4. **Table root focused:** Tab / Shift+Tab are **not** intercepted, so the browser moves focus to the next or previous focusable element on the page.
    5. **Re-entering:** Enter (and the arrow keys) on the focused table root resume cell navigation at the last active cell, or the first cell if there is none. Clicking a cell also resumes. Tabbing into the table lands on the root, not inside a cell.
  - **Implementation notes:**
    - Add an explicit mode flag (`keyboardMode: 'cell' | 'table'`) instead of inferring the mode from `currentCell`.
    - SEL-02's `$el.contains(target)` check alone is not enough, because in table mode the key target *is* inside `$el`. The handler must check the mode.
    - The edit textarea (`editor/index.tsx:488`, `tabindex: -1`) holds focus during cell navigation, so Esc → table mode must explicitly call `$el.focus()`.
    - Optional a11y: `role="grid"` on the root, and `aria-describedby` hint text ("Enter to navigate cells, Esc to leave"), localised through `ve-locale`.
  - **Tests:** Tab is prevented in cell mode; Esc while editing closes the editor; Esc in cell mode focuses the root and Tab is not prevented; Enter on the root resumes at the last cell; clicking a cell resumes.
  - **Done:** new `keyboardMode: 'cell' | 'table'` data flag (`KEYBOARD_MODE` in `util/constant.ts`, starts as `'table'`). It becomes `'cell'` when the active cell's key changes to a real cell (click, API, keyboard; a watcher on `currentCell.rowKey` / `colKey`, so a `rowIndex` change from sorting doesn't switch it), and on any body-cell mousedown, so clicking the same cell also resumes. It becomes `'table'` on Esc, or when the active cell is cleared. In `'table'` mode, or with no active cell, `dealKeydownEvent` only reacts to keys whose target is the root itself: Enter and the arrow keys call `resumeCellKeyboardMode()` (last active cell, or the first non-operation column of the first row via `setCellSelection`, without moving), and Tab is left to the browser. Esc while editing calls the new `discardEditingCell()` (D6), which clears the editing state without `saveCellWhenStopEditing`. Esc in cell mode calls `leaveCellKeyboardMode()` → `root.focus({ preventScroll: true })`. The root gets `tabindex="0"` only when cell selection is enabled, plus `ve-table-keyboard-dormant` while in table mode with an active cell. The editor gets a `keyboardMode` prop and its `v-focus` is gated on cell mode, so it no longer steals focus back from the root on re-render. Styles (`style/ve-table.less`): a `:focus-visible` ring drawn on a `::after` overlay (an outline is hidden under the positioned header and fixed cells, and an outer offset gets clipped by `overflow: hidden` parents), no ring for mouse focus, and the active cell's border and corner at reduced opacity while dormant. New theme vars `@ve-table-focus-ring-color` and `@ve-table-selection-dormant-opacity` (default and dark), `KEY_CODES.ESC`. The instance API only gained methods. The optional a11y part was **not** done: `role="grid"` on the wrapper `<div>` around a native `<table>` would be wrong ARIA without restructuring rows and cells, so it isn't cheap. The localised `aria-describedby` hint is left for that work. 22 snapshots changed by exactly one line each (the root `<div>` gained `tabindex="0"`); every diff was checked before `-u`.
  - **Verified:** `ve-table-keyboard.spec.ts` › "keyboard mode (SEL-08)", 10 tests. These failed before the fix: root has `tabindex="0"`; "esc while editing closes the editor, discards the value and stays on the cell (D6)" (callbacks not called, cell text unchanged, Tab still trapped afterwards); "esc in cell mode focuses the table root, and Tab is then not intercepted" (plus the dormant class); "keeps cell handling dormant in table mode" (Space and letters do nothing, and focus isn't stolen 10 ms later); "enter on the focused root resumes cell navigation at the last active cell" (focus back on the textarea); "an arrow key on the focused root also resumes without moving"; "enter on the focused root starts at the first cell when there is no active cell". These passed before and guard existing behaviour: "traps Tab in cell mode", "clicking a cell resumes cell navigation", "does not add a tab stop when cell selection is disabled". **Headless Chromium** (Vite page + Playwright, real key presses): Tab from a button lands on the root with the ring; Enter selects the first cell and focuses the textarea; Tab and Shift+Tab stay trapped; typing then Esc discards (no `afterCellValueChange`); Esc focuses the root with the ring and a dimmed active cell, and focus stays there after 300 ms; Tab moves to the next input; Shift+Tab returns to the root; ArrowRight resumes on the same cell; clicking another cell, or the same cell after Esc, resumes; no page scroll, no console errors.

- [ ] **SEL-09** 🟢 Header and body indicator state lingers after keyboard navigation (found in batch 3b)
  - **Where:** `headerIndicatorColKeys` / `bodyIndicatorRowKeys` in `ve-table.tsx`. Arrow-key navigation does not clear them, and their stored indexes go stale when rows or columns move.
  - **Note:** SEL-01's `reconcileCellState()` only clears indicators whose keys disappeared. Re-applying them on every change would pull the selection back after arrow-key moves.
  - **Fix:** clear the indicator keys when the selection is changed by the keyboard or a single-cell click, and store keys only (derive indexes when needed).

- [ ] **SEL-10** 🟠 Focusable elements inside cells are treated as cell navigation (found in batch 3a)
  - **Where:** `methods/keyboard.ts` `dealKeydownEvent` (SEL-02's check accepts any target inside the table root), and the editor's focus timer (`editor/index.tsx`).
  - **Trigger:** a `renderBodyCell` that renders an `<input>` (or a row checkbox). Typing in it moves the selection with the arrow keys and starts editing on letters. Clicking it lets the editor's focus timer pull focus to the hidden textarea. This predates SEL-02/SEL-08.
  - **Fix:** in cell mode, ignore keys whose target is an editable or interactive element other than the editor textarea and the table root (`input`, `textarea`, `select`, `[contenteditable]`, `button`), and don't steal focus from such an element on mousedown.

---

## CLIP — clipboard

- [x] ✅ 2026-10-16 · fix/audit-batch5-clipboard-codec · **CLIP-01** 🔴 Clipboard handlers continue with `-1` indices, after `preventDefault`
  - **Where:** `util/clipboard.ts:230` (`startRowIndex = -1`), `:244` (`colgroups[-1].key`), `:282` (`Object.assign(tableData[-1], …)`); `methods/clipboard.ts:48` (`editorCopy` calls `preventDefault()` before validating; same in `editorPaste` :97 and `editorCut` :172).
  - **Trigger:** a stale range (SEL-01), or the edit textarea still focused after the selection is cleared. Paste throws a TypeError, and copy overwrites the user's clipboard with `""`.
  - **Fix:** in `onBeforePaste`, `onBeforeCopy`, `onBeforeCut` and `onBeforeDelete`, return `null` if any index is `-1`. Callers bail out **before** `preventDefault`.
  - **Done:** `onBeforeCopy` / `onBeforeCut` / `onBeforeDelete` share one `getRangeResponse` (`util/clipboard/handlers.ts`, built on `getSelectionRangeIndexes` / `getSelectionRangeKeys`), which returns `null` when the range is missing or any of the four indexes is `-1`. `onBeforePaste` returns `null` when the range is missing or its top-left key (the paste anchor) is gone. `editorCopy`, `editorPaste`, `editorCut` and `deleteCellSelectionRangeValue` return before `preventDefault` and before the `before*` callback. The guards stand on their own, independent of SEL-01. Worse than described: a stale **top** row made delete (and cut) clear rows `0 … bottom`, because the `rowIndex >= -1` check matched every row.
  - **Verified:** `ve-table-clipboard.spec.ts` › "clipboard handlers" (each `onBefore*` with a stale top/bottom row, left/right column, empty keys, or no range) and "a stale or missing selection (CLIP-01)": copy and cut no longer call `preventDefault` or `setData` (before: `preventDefault` + an empty write), paste no longer throws (`TypeError: Cannot convert undefined or null to object`), delete no longer clears data (before: rows 1–3 were emptied), and copy with no selection at all leaves the native copy alone.

- [x] ✅ 2026-10-16 · fix/audit-batch5-clipboard-codec · **CLIP-02** 🟠 Pasting a non-text clipboard (an image or file) wipes the selected cell
  - **Where:** `util/clipboard.ts:13-14, 218`. `getData('text/plain')` returns `''`, `decodeSpreadsheetStr('')` returns `[['']]`, and `editorPaste` (`methods/clipboard.ts:118`) writes `''`.
  - **Fix:** `if (!pastedData) return null`.
  - **Done:** as proposed, in `onBeforePaste`. `editorPaste` then returns without `preventDefault` and without calling `beforePaste`. `decodeSpreadsheetStr('')` now returns `[]` (CLIP-03), and `editorPaste` also bails out on an empty result.
  - **Verified:** `ve-table-clipboard.spec.ts` › "pasting a clipboard without text (an image) leaves the cell and the native paste alone" (before: the cell became `''`) and "onBeforePaste › returns null when the clipboard has no text".

- [x] ✅ 2026-10-16 · fix/audit-batch5-clipboard-codec · **CLIP-03** 🟠 Copy/paste does not round-trip
  - **Where:** `clipboard.ts:115-121` (encode), `85-88`, `131` (decode)
  - **Issues:**
    - The encoder quotes only on `\n`, so values with `\t` or `\r` split into extra cells or rows.
    - Leading quotes are lost: `"a"` pastes back as `a`.
    - No trailing newline is written, but the decoder always drops a final empty row, so copying A1:A2 with A2 empty pastes only A1.
  - **Fix:** quote when `/[\t\r\n"]/.test(val)`, and end every row with `\n` (as Excel does). Add round-trip unit tests (MOD-04).
  - **Done:** `util/clipboard/tsv-codec.ts` was rewritten as a small index-based parser. The encoder quotes when `/[\t\r\n"]/` matches, doubles `"`, writes `null`/`undefined` as empty cells and ends every row with `\n`. The decoder treats a final line break as the end of the last row, not as an extra empty row: `a\n\n` → `[['a'], ['']]`, `a` and `a\n` → `[['a']]`, and `''` → `[]`. Line breaks `\n`, `\r\n`, `\r` (and the old `\n\r`) are accepted.
  - **Verified:** `ve-table-tsv-codec.spec.ts` (encode, decode and 15 round-trip cases: tab, CR, CRLF, LF, quotes, a value wrapped in quotes, a leading quote only, empty trailing cells, an empty trailing/first row, a single empty cell, ragged rows, `null`/numbers). Before the fix 6 round-trip cases failed (e.g. `[['a\tb','c']]` → `[['a','b','c']]`, `[['"a"']]` → `[['a']]`, `[['a'],['']]` → `[['a']]`). End to end: `ve-table-clipboard.spec.ts` › "copy then paste round-trips an empty last row and special characters" (before: `tab\there` pasted as two cells).

- [x] ✅ 2026-10-16 · fix/audit-batch5-clipboard-codec · **CLIP-04** 🟢 An unbalanced leading quote swallows the rest of the clipboard
  - **Where:** `clipboard.ts:44-64`. Text like `"12 inch\tfoo\nbar` all lands in one cell.
  - **Fix:** if the closing quote is never found, fall back to treating the quote as a literal.
  - **Done:** a value is only parsed as quoted when its closing quote is found **and** is followed by a tab, a line break or the end of the text. Otherwise the cell is read literally (quote included) up to the next separator, so `"a" b` also stays `"a" b` (it used to become `a b`).
  - **Verified:** `ve-table-tsv-codec.spec.ts` › "treats an unbalanced leading quote as a literal character" (before: `[['12 inch\tfoo\nbar']]`, now `[['"12 inch', 'foo'], ['bar']]`) and "treats a leading quote as literal when the closing quote is not followed by a separator".

- [x] ✅ 2026-10-16 · fix/audit-batch5-clipboard-codec · **CLIP-05** 🟢 A ragged paste drops columns
  - **Where:** `clipboard.ts:226-229`. The column count comes from row 0 only, so `"a\nb\tc"` drops `c`.
  - **Fix:** use the maximum row length.
  - **Done:** `onBeforePaste` takes the longest row (with `reduce`, not `Math.max(...rows)`, so a very large paste can't overflow the argument list). Cells missing from shorter rows are left unchanged.
  - **Verified:** `ve-table-clipboard.spec.ts` › "onBeforePaste › uses the longest row for the column count" (before: `endColIndex` 0 and `c` dropped) and "pastes every column of a ragged block".

- [ ] **CLIP-06** 🟢 Contextmenu copy and cut use the deprecated `execCommand` and fail silently
  - **Where:** `methods/contextmenu.ts:122, 127, 227, 232`. The return value is ignored, and there is no contextmenu paste.
  - **Fix:** `navigator.clipboard` with an `execCommand` fallback; handle the rejection (permission or insecure context) and surface it through a callback.

- [ ] **CLIP-07** 🟠 Paste, cut and delete on a column without `field` write a property named `"undefined"` (found in batch 5)
  - **Where:** `util/clipboard/handlers.ts` (`onAfterPaste`, and the shared clearing used by cut and delete): `row[column.field]` with `field` undefined.
  - **Trigger:** a range that includes an operation column, or any column with only a `key`. Paste writes the pasted value and cut/delete write `''` under the key `"undefined"` in the user's row objects.
  - **Fix:** skip columns without `field` (and operation columns) when reading and writing.

- [ ] **CLIP-08** 🟢 Cut and delete never trigger `CLIPBOARD_CELL_VALUE_CHANGE` (found in batch 5)
  - **Where:** `methods/clipboard.ts` `editorCut` / `deleteCellSelectionRangeValue`. Paste triggers the hook, the other two don't.
  - **Effect:** if clearing cells changes row heights, the selection borders aren't repositioned.
  - **Fix:** trigger the hook after `onAfterCut` / `onAfterDelete`.

- [ ] **CLIP-09** 🟢 With a stale range, the native paste lands in the hidden editor textarea (found in batch 5)
  - **Where:** since CLIP-01, an invalid range no longer calls `preventDefault`, so the browser pastes into the focused (hidden) textarea.
  - **Effect:** harmless (input is ignored while not editing), but the text stays in the textarea's DOM until the next re-render.
  - **Fix:** clear the textarea value after a skipped paste, or `preventDefault` only when the target is the editor textarea and not editing.

---

## FILL — autofill

- [ ] **FILL-01** 🟠 The autofill direction is a render side effect and goes stale
  - **Where:**
    - `selection/index.tsx:~1110-1160` dispatches `AUTOFILLING_DIRECTION_CHANGE` from inside render (the dispatch is at 1153).
    - `methods/cell-selection.ts:302-304` (`autofillingDirectionChange`; `autofillingDirection` is never reset).
    - `methods/cell-selection.ts:105-291` (`setCellSelectionByAutofill`).
    - `util/index.ts:1119-1405` (`cellAutofill`).
  - **Trigger:** `cellAutofillOption: { directionY: false }`. Autofill right once, then drag the corner down. On mouseup the stale RIGHT is used, and the current cell moves to the dragged-to row. If the first drag goes in a disallowed direction, the direction is `null` and `beforeAutofill`/`afterAutofill` still fire with every index at `-1`.
  - **Fix:** make the direction a pure computed value (geometry function, MOD-05). Reset it to `null` when autofill starts and ends. Return early when it is `null` or not allowed.

- [ ] **FILL-02** 🟠 An autofill drag is not cancelled when the mouse is released outside the table or window
  - **Where:** `isAutofillStarting` is reset only at `ve-table.tsx:1308` (`tableClickOutside`), `1784` (`tableContainerMouseup`), `methods/contextmenu.ts:72` and `methods/cell-selection.ts:404`. There is no `window` `mouseup` or `blur` listener.
  - **Trigger:** release outside the browser window: the drag stays armed, and the next mouseup in the table commits it, overwriting data. Release outside the table but inside the page: `tableClickOutside` fires and the watcher **commits** instead of cancelling.
  - **Fix:** on corner mousedown, add `window` `mouseup` (once) and `blur` → cancel listeners. Releasing outside the table cancels without committing. Remove both in `beforeUnmount`.

---

## EDIT — cell editing

- [x] ✅ 2026-10-16 · fix/audit-batch1-crash-oneliners **EDIT-01** 🔴 🔍 Alt+Enter while editing replaces the text with `"undefined\n"` when `key !== field`
  - **Where:** [editor/index.tsx:429](../packages/ve-table/src/editor/index.tsx#L429). It reads `editingCell.row[editingCell.colKey]`. The rest of the table uses `row[column.field]` (`methods/editing.ts:43`). The repo's own fixtures use `key: 'a', field: 'name'`.
  - **Fix:** `editingCell.row[editingCell.column.field]`.
  - **Verified:** `ve-table-cell-edit.spec.ts` › "key code alt+enter event when column key differs from field" (columns keyed `col-<field>`; the textarea read `'und\nefined'` before the fix, now `'AAA\n'` and `afterCellValueChange` gets `date: 'AAA\n'`).

- [x] ✅ 2026-10-16 · fix/audit-batch2-lifecycle-leaks · **EDIT-02** 🟠 🔍 Editor lifecycle: the Vue 2 `destroyed()` hook never runs
  - **Where:** [editor/index.tsx:465](../packages/ve-table/src/editor/index.tsx#L465) (`destroyed`, the only Vue 2 lifecycle hook left in the repo), `:450-460` (uncancelled lodash debounces), `:224` (uncancelled `setTimeout`).
  - **Effect:** `autoResize` is never unobserved. After unmount the debounces run `setTextareaPosition` against null refs and throw.
  - **Fix:** `beforeUnmount() { debounceSetTextareaPosition.cancel(); debounceSetCellEl.cancel(); clearTimeout(focusTimer); textareaUnObserve() }`.
  - **Done:** `destroyed()` was removed. `beforeUnmount` disposes the hooks (INFRA-01), cancels both debounces, clears the stored `focusTimer`, and calls `textareaUnObserve()`. The `currentCell` watcher's `nextTick` callback returns early once unmounted, and re-selecting a cell clears the previous focus timer before scheduling a new one.
  - **Verified:** `ve-table-lifecycle.spec.ts` › "pending editor timers do not run after unmount (EDIT-02)": while editing with non-zero mocked rects, trigger the scroll hook and change cell, then turn `cellSelectionOption.enable` off. `autoResize.unObserve` is called, and advancing fake timers no longer throws `Cannot read properties of null (reading 'nodeName')`.

- [ ] **EDIT-03** 🟠 The editor stays positioned over the previous cell
  - **Where:** `editor/index.tsx:275-290` (`setCellEl` only assigns when a cell is found).
  - **Trigger:** virtual scroll, or a target cell that isn't rendered. The textarea sits over the old cell while edits go to the new one. Since `442962c` this happens on **every** cell in virtual-scroll mode, because the `tbody.ve-table-body` selector never matches there (see VS-05).
  - **Fix:** `else { this.cellEl = null; this.overflowViewport = true }`.
  - **Progress (2026-10-16, `fix/audit-batch0-regressions`):** the "every cell in virtual mode" symptom is gone. Since VS-05, `setCellEl` uses `queryCell`, which finds rendered virtual rows (test `the editor finds the selected cell element`; Chromium check: textarea placed on the cell after Enter). The original case is **still open**: when the target cell is not rendered (scrolled out of the virtual window), `setCellEl` still keeps the previous `cellEl`. The `else` branch above is not done yet.

- [x] ✅ 2026-10-16 · fix/audit-batch3b-state-reconcile · **EDIT-04** 🟢 `startEditingCell` while another cell is editing silently drops that value
  - **Where:** `ve-table.tsx:2008-2086`. The comment (2030-2032) says it closes the previous cell, but the code doesn't. An unknown rowKey also throws (`currentRow` is unchecked, ~2024-2066).
  - **Fix:** call `STOP_EDITING_CELL` first when `isCellEditing`, and guard `!currentRow || !currentColumn`.
  - **Done:** `startEditingCell` validates first (same cell → no-op; unknown row or column → returns `false` and leaves the current edit alone; non-editable column → `false`), then saves the previous cell through `STOP_EDITING_CELL` (keeping the caller's `enableStopEditing`), and only then clones the row, so `beforeStartCellEditing` sees the saved value.
  - **Verified:** `ve-table-state-reconcile.spec.ts` › "startEditingCell while another cell is editing (EDIT-04)": "saves the previous cell before editing the next one" (row 1 kept `John` instead of `AAA` before the fix, and `afterCellValueChange` never ran) and "ignores an unknown rowKey or colKey without throwing" (threw `Cannot read properties of undefined (reading 'name')` before).

---

## VS — virtual scroll

> Since `442962c`, virtual scroll is a thin adapter over `@tanstack/virtual-core` ([virtual-scroll.ts](../packages/ve-table/src/virtual-scroll.ts)). The body renders a top spacer, then one `<tbody data-index>` per visible row (measured by TanStack), then a bottom spacer. The hand-rolled position table, binary search, phantom and `BodyTrScrolling` placeholder are gone.

- [x] ⛔ won't fix: code removed in `442962c` (TanStack replaced the hand-rolled index search). **VS-01** 🟠 🔍 The binary search is effectively linear and can return an out-of-range index
  - **Where (at `a0bfb50`):** `ve-table.tsx:2137-2159`, and the caller ~2110
  - **Issues:**
    - `end = end - 1` should be `end = midIndex - 1`, so the search is O(n) on every scroll event.
    - An exact match returns `midIndex + 1`, which can equal `list.length`, and `positions[start].top` then throws. Repro: 40px rows, scrollTop 4000, and `tableData` shrinks to 100 rows.
    - The function returns `null` when scrollTop is past the end.
  - **Fix:** a correct lower-bound bisection, clamped to `[0, len - 1]`.

- [x] ⛔ won't fix: code removed in `442962c` (rows no longer report heights through `BODY_ROW_HEIGHT_CHANGE`; TanStack measures the `<tbody>` itself). **VS-02** 🟠 `bodyRowHeightChange` with an unknown row key reads `positions[-1]`
  - **Where (at `a0bfb50`):** `ve-table.tsx:2058-2062`. This happens without `rowKeyFieldName`, or for a row missing its key, because the ResizeObserver reports `key: null`.
  - **Fix:** `if (index < 0) return`.
  - **Leftover:** the `BODY_ROW_HEIGHT_CHANGE` constant (`util/constant.ts:62`) is now unused.

- [x] ✅ 2026-10-16 · fix/audit-batch6-vs-render-perf · **VS-03** 🟠 Every cell edit discards all measured row heights *(still true after the TanStack switch)*
  - **Where:** `ve-table.tsx:706-725`. The `tableData` watcher is still `deep: true`, and on every change it calls `this._vs.measure()`, which clears TanStack's whole size cache.
  - **Trigger:** variable-height rows with virtual scroll, then edit, paste or autofill a cell. Every row falls back to `estimateSize` until it is re-measured, so the spacer heights and the scroll offset jump.
  - **Fix:** drop `deep: true`. Call `setOptions({ count, getItemKey })` only when the length or row keys change, and let TanStack's per-element `ResizeObserver` (`measureElement`) pick up the height change of an edited row. Sizes are cached by `getItemKey`, so they survive reordering.
  - **Confirmed in Chromium** before the fix (Playwright, 1000 rows where every third row is three lines tall, `maxHeight: 500`, scrolled to 20000): a real double-click edit of a visible cell, with no height change, dropped the measured sizes from 15 to 8, shrank the total height by 202px, moved `scrollTop` from 20087 to 20145, and the first visible row jumped from 495 to 502.
  - **Done:**
    - The deep `tableData` watcher is gone. It only drove the virtualizer (`allRowKeys`, the footer and the cell-selection re-positioning are computed or watched on their own). It is replaced by a `virtualRowIdentity` computed (`{ count, keys: allRowKeys }`) and a watcher that returns early unless the count or the key order changed (or virtual scroll is off). Editing a field never touches it; in-place `push` / `splice` / `reverse` and whole-array replacement still do.
    - On a change it calls `_vs.setOptions({ count, getItemKey })` and no longer calls `measure()`. `getItemKey` reads `this.tableData` at call time (new `getVirtualRowKey`), so replacing the array with the same keys needs no update.
    - Adapter (`virtual-scroll.ts`): `setOptions` passes a fresh `getItemKey` wrapper whenever the keys change. TanStack memoises row positions on the `getItemKey` reference, so this re-lays out the rows in the new order while `itemSizeCache` (keyed by row key) keeps every measured height. `setOptions` now notifies the host itself, because TanStack's `setOptions` does not fire `onChange` (the old code only re-rendered because `measure()` did).
    - The `<tbody>` ref callback is a stable bound method (`measureVirtualRow`) instead of a new arrow function per render.
  - **Verified:** `ve-table-virtual-scroll.spec.tsx` › `cell edits keep measured row heights (VS-03)`: `editing a cell does not re-measure all rows` (failed before: `measure` was called and the measured sizes of off-screen rows were lost), `adding, removing and reordering rows updates the count and keys` (failed before: after an in-place `reverse()` the measured height of key 2 was gone), and `an edited row's new height is picked up by its own ResizeObserver` (a guard for the new path; it uses a fake `ResizeObserver` that, like browsers, reports once on `observe`). `tests/utils` `mockVirtualScrollLayout` now also passes the row `<tbody>` to `rowHeight`, so a test can size rows by key instead of index. Same Chromium scenario after the fix: the edit leaves the measured count (14), total height, spacers, `scrollTop` and the first visible row (495, same offset) unchanged; making a visible row taller (40 → 85px) grows the total by exactly 45px without moving the rows above it.

- [x] ✅ 2026-10-16 · `442962c` **VS-04** 🟢 `scrollToRowKey` timer and null handling
  - **Where (at `a0bfb50`):** `ve-table.tsx:3735-3747`. The 200ms `setTimeout` was never stored or cleared, and an unrendered key gave `rowEl.offsetTop` on `null`.
  - **Resolved by the rewrite** (`ve-table.tsx:1970-2000`): the timer is gone, virtual mode uses `_vs.scrollToIndex`, and the non-virtual path null-checks the row. Verified by reading the code only; there is no test for it.
  - **Residual (not tracked separately):** in non-virtual mode an unknown key now scrolls to the top (`scrollTop = 0`) instead of doing nothing. (Escaping: INFRA-04.)

- [x] ✅ 2026-10-16 · fix/audit-batch0-regressions **VS-05** 🔴 🔍 In virtual-scroll mode the body loses its `ve-table-body` class, which breaks styling, selection, the editor and row insert
  - **Where:** [body/index.tsx:848-897](../packages/ve-table/src/body/index.tsx#L848-L897), added in `442962c`. The virtual path returns a **fragment** of `<tbody>` elements. `ve-table.tsx:2190` passes `class: [clsName('body'), this.tableBodyClass]` to `<Body>`, but Vue can't fall attributes through to a fragment root, so the class is dropped (a dev-mode warning; silent in production). None of the generated `<tbody>` elements gets `ve-table-body`, `ve-table-stripe`, `ve-table-row-hover` or `ve-table-row-highlight`.
  - **Effects:**
    - **Styling:** every rule under `tbody.ve-table-body` (`style/ve-table.less:161` onwards) stops applying: cell padding, background, font size, row height, operation-column and indicator colours, stripe, hover and highlight. Stripe would also be wrong even with the class, because each row is the first child of its own `<tbody>`, so `tr:nth-child(2n + 1)` matches every row.
    - **Selection:** `selection/index.tsx:1421, 1438, 1452, 1498` look up cells with `tbody.ve-table-body …` and find nothing, so the selection borders don't render.
    - **Editor:** `editor/index.tsx:282` uses the same selector, so the textarea is never positioned (EDIT-03).
    - **Row insert:** `row-insert-indicator/index.tsx:183` takes `tableEl.querySelector('tbody')`. That is the top spacer `<tbody>` or a single row, so at most one row is ever considered.
  - **Status:** confirmed by reading the code, not reproduced in a browser. The jsdom specs can't show it, because they render 0 virtual rows (see Test gaps).
  - **Fix:** give every generated row `<tbody>` the body classes explicitly (computed in `ve-table.tsx`, passed as a prop rather than relying on fall-through). Change the cell lookups to a selector that works in both modes (e.g. `.ve-table-body tr[row-key=…]`, or a shared `queryCell` helper, see INFRA-04). Make stripe use a row-index class instead of `nth-child`. In the row-insert indicator, scan `tr.ve-table-body-tr` across the whole table.
  - **Confirmed in Chromium** before the fix (once VS-07 was fixed so that rows rendered at all): the row `<tbody>`s had `class=""`, cells had 1px padding instead of 10px, and Vue warned "Extraneous non-props attributes (class)".
  - **Done:**
    - `Body` takes `bodyClass` and `stripe` props (`ve-table.tsx` bodyProps). `bodyClass` goes on the single `<tbody>` in normal mode and on every row `<tbody data-index>` in virtual mode. The spacer `<tbody>`s get no class.
    - `Body` declares `emits: ['on-highlight-row-change']`, so its fragment root no longer drops or warns about that listener.
    - Stripe: `BodyTr` adds `ve-table-body-tr-stripe` when `stripe && rowIndex % 2 === 0` (data index), and `style/ve-table.less` uses that class instead of `nth-child(2n + 1)`. Side effect: in normal mode, an expanded row no longer shifts the stripe pattern.
    - `style/ve-table.less` border-around: `tr:last-child > td { border-bottom: 0 }` became `> tbody:last-of-type > tr:last-child > td, > tfoot > tr:last-child > td`, because every virtual row is the last child of its own `<tbody>` and so lost its bottom border.
    - Cell and row lookups go through the new `util/cell-dom.ts` (`queryCell`, `queryBodyRow`, `queryBodyRows`, `queryFirstRowCell`, `queryLastRowCell`; see INFRA-04): selection (`getTableCellEl`, first/last-row lookups, autofill end cell), editor `setCellEl`, `rowToVisible`, `scrollToRowKey`, and the row-insert indicator (all rendered rows, not just the first `<tbody>`).
  - **Verified:** `ve-table-virtual-scroll.spec.tsx` › `body behaviour in virtual mode (VS-05)`: `every rendered row <tbody> carries the body classes` (also asserts no "Extraneous non-…" warning), `stripes rows by data index, not by DOM position`, `does not add the stripe row class when stripe is off`, `clicking a row highlights it`, `cell selection finds the selected cell element`, `the editor finds the selected cell element`, `the row insert indicator sees every rendered row`. All of these failed before the fix. Also checked in headless Chromium: 10px cell padding, 1px row bottom borders, stripe on even data rows after scrolling (96, 98, …), 4 visible selection borders after a click, and the editor textarea placed on the cell's rect after Enter. The non-virtual table is unchanged.

- [ ] **VS-06** 🟢 TanStack integration leftovers
  - ✅ `_vs` and `measureColsWidths` are declared in `data()` (`ve-table.tsx:376-381`), so Vue makes the virtualizer adapter and the `Map` deeply reactive, despite the "non-reactive, managed manually" comment at 868-869. Use `markRaw`, or assign them in `created` without declaring them in `data`.
  - ✅ `virtualScrollOption.scrolling`, `minRowHeight` and `bufferScale` are read once in `initTanStackVirtualScroll` (`ve-table.tsx:1222-1251`). Later changes are never pushed to `setOptions`, although `virtual-scroll.ts:189-241` supports it.
  - ✅ No `scrollMargin` is passed, so TanStack treats row 0 as starting at `scrollTop = 0` even though the sticky header sits above it. The visible range is off by the header height; overscan (≥ 3 rows) hides this in most cases.
  - ✅ (pixel `maxHeight` only) `actualRenderTableData` is `[]` until the virtualizer exists (created in `$nextTick` after mount), so the first render of a virtual table has no rows.
  - `rowInsertIndicatorProps` passes `virtualScrollPositions: []` (`ve-table.tsx:674`) only for compatibility. Remove the prop from `row-insert-indicator` together with INS-01.
  - **Progress (2026-10-16, `fix/audit-batch6-vs-render-perf`):** the first four points are done; only the `virtualScrollPositions` prop is left, to go with INS-01.
    - **Reactivity:** `measureColsWidths` is `markRaw(new Map())` in `data()`, and `_vs` is assigned `markRaw(createVirtualScroll(…))`. Only the reference is reactive, so `wrapper.vm._vs` still works. The redundant assignments in `created` are gone.
    - **Option changes:** watchers on `virtualScrollOverscan`, `virtualScrollEstimateSize` and `virtualScrollOption.scrolling` call `_vs.setOptions`. The adapter keeps the scrolling callback in a variable (`null` clears it) instead of rebuilding `onChange`, and an `estimateSize` change re-lays out the unmeasured rows without dropping measured ones (fresh `getItemKey` wrapper, no `measure()`).
    - **Header offset:** a plain `scrollMargin` is only right for a header that scrolls away. With a sticky header (the default `fixedHeader`), a margin would make `scrollToRowKey` (`align: 'start'`) park the row behind the header, and the "visible" range would include rows hidden under it. So a new `virtualScrollViewportOffsets` computed passes `scrollMargin = headerTotalHeight` only when `fixedHeader` is false. For a sticky header (`stickyStart`) and a sticky footer (`stickyEnd`), the adapter wraps `observeElementRect` and subtracts their heights from the container height that TanStack sees; row coordinates are unchanged. Header and footer heights are measured after mount, so the computed is watched and the adapter re-emits the adjusted rect. `getPaddingBottom` also ignored `scrollMargin` (`getTotalSize()` excludes it, `item.end` includes it); fixed.
    - **First render:** before the virtualizer exists, `virtualItems` falls back to `initialVirtualItems`: the first `ceil(maxHeight / estimateSize) + overscan` rows at the estimated size, plus an estimated bottom spacer. When the virtualizer is created, the same keyed `<tbody>`s are reused and measured. This needs a pixel `maxHeight` (a number or `"500px"`). With `%`, `vh` or `calc()` the row count can't be estimated before layout, so those tables still render no rows until the `$nextTick` after mount.
    - **Verified:** `ve-table-virtual-scroll.spec.tsx` › `virtualizer integration (VS-06)`. All of these failed before: `keeps the virtualizer and the column width map out of Vue reactivity` (`isProxy` was true), `pushes later changes of bufferScale, minRowHeight and scrolling to the virtualizer` (overscan stayed 5), `a sticky header shrinks the viewport that TanStack sees` (TanStack saw 500px instead of 460, and the `scrolling` callback range was off), `a non-sticky header is passed as scrollMargin` (margin was 0; it also checks the spacer heights), and `renders the first rows before the virtualizer exists, then reuses them` (0 rows before; the row-0 `<tbody>` is now the same node after the virtualizer appears). In Chromium (40px header, 500px container): sticky header: TanStack sees 460px, the `scrolling` callback reports rows 495–504, exactly the rows visible below the header (it reported 505 before), and `scrollToRowKey(500)` puts row 500 right below the header (top at 40px, as before). With `fixedHeader: false`: `scrollMargin` is 40, row 0 starts below the header, the reported range matches the visible rows, and `scrollToRowKey(500)` puts row 500 at the top of the container (before: at 40px, with row 499 visible above it).

- [x] ✅ 2026-10-16 · fix/audit-batch0-regressions **VS-07** 🔴 Virtual scroll renders no rows at all: the TanStack adapter never attaches to the scroll container
  - **Where:** `virtual-scroll.ts` `createVirtualScroll`, added in `442962c`. It called `virtualizer._didMount()` but never `virtualizer._willUpdate()`. In `@tanstack/virtual-core` 3.x, `_willUpdate` is what reads `getScrollElement()`, measures it (`observeElementRect`) and adds the scroll listener (`observeElementOffset`); `_didMount` only returns the cleanup. TanStack's own framework adapters call both.
  - **Effect:** `scrollRect` stays at `initialRect` (0×0), so `calculateRange` returns `null` and `getVirtualItems()` is empty. A table with `virtualScrollOption.enable` showed the header and **no rows**, and scrolling never updated the range. The only thing that ever called `_willUpdate` was `setOptions` (from the `tableData` watcher), so the table could start working after its data changed once. This, not just jsdom's missing layout, is why the virtual-scroll specs rendered 0 rows.
  - **Found:** while getting the suite green, then reproduced in headless Chromium (Playwright + a Vite page mounting `VeTable` with 1000 rows and `maxHeight: 500`): 0 `tr.ve-table-body-tr` before the fix; 30 rows after it, and rows 110–144 after setting `scrollTop = 4000`.
  - **Fix:** call `virtualizer._willUpdate()` right after `_didMount()`.
  - **Verified:** `ve-table-virtual-scroll.spec.tsx`. All 13 specs now render real rows under jsdom: `tests/utils` `mockVirtualScrollLayout` stubs `offsetHeight` for the container and the per-row `<tbody data-index>`, and `getVirtualRenderRange` computes the expected range. New specs: `scrolls to the middle and renders the rows around the scroll offset`, plus spacer-height and scrolled-range assertions in `same row height` and `scrolling callback`. Plus the browser check above.

---

## ROW — row checkbox, radio and expand

- [x] ✅ 2026-10-16 · fix/audit-batch4-row-state · **ROW-01** 🔴 🔍 `defaultExpandAllRows` aliases and then mutates the table's `allRowKeys`
  - **Where:** [body/index.tsx:582-584](../packages/ve-table/src/body/index.tsx#L582-L584) (`this.internalExpandRowkeys = allRowKeys`, no copy), `:494-499` (`splice`/`push` in place).
  - **Trigger:** `defaultExpandAllRows: true`, then click an expand icon. The row key is removed from the table's `allRowKeys`, so keyboard navigation skips that row and select-all and row-insert get the wrong keys.
  - **Fix:** `allRowKeys.slice()`, and make `expandRowChange` build new arrays.
  - **Done:** `useRowExpand` seeds its internal keys with `allRowKeys.slice()` (and `defaultExpandedRowKeys.slice()`), and `toggleRowExpand` always builds a new array. It never mutates its inputs; the callbacks get copies.
  - **Verified:** `ve-table-row-state.spec.tsx` › "clicking a row collapses it and does not touch the table allRowKeys" (before: the table's `allRowKeys` lost `1002` after one click) and "row keys reported by afterExpandRowChange are a new array"; `ve-table-row-state-composables.spec.ts` › "defaultExpandAllRows copies allRowKeys and rows can collapse".

- [x] ✅ 2026-10-16 · fix/audit-batch4-row-state · **ROW-02** 🔴 🔍 With `defaultExpandAllRows`, rows can never be collapsed
  - **Where:** [body/expand-tr.tsx:67-68](../packages/ve-table/src/body/expand-tr.tsx#L67-L68). It returns `true` whenever the option is set and ignores `expandedRowkeys`, including controlled ones. The icon rotates but the row stays open.
  - **Fix:** delete that branch, since `initInternalExpandRowKeys` already seeds the keys.
  - **Done:** branch deleted; `ExpandTr` only checks the expanded keys. `defaultExpandAllRows` is used only to seed `useRowExpand`, so a controlled `expandedRowKeys` now wins over it, as the docs say.
  - **Verified:** same test as ROW-01 (before: all 5 rows stayed open after the click), plus "controlled expandedRowKeys wins over defaultExpandAllRows" (before: 5 rows open instead of 1).

- [x] ✅ 2026-10-16 · fix/audit-batch4-row-state · **ROW-03** 🔴 Non-deep watchers miss in-place array mutation (a Vue 2 assumption)
  - **Where:** `body/index.tsx:354` (`expandOption.expandedRowKeys`), `:367` (`checkboxOption.selectedRowKeys`), `:373` (`internalCheckboxSelectedRowKeys`); `body/body-checkbox-content.tsx:66`
  - **Trigger:** the official demos mutate in place: `row-checkbox/selected-control.md:120-128`, `pagination/checkbox.md:104-108` and `expand-control.md:125`. Checkboxes and select-all don't update. A controlled expand goes stale, and the next click collapses unexpectedly.
  - **Fix (D2, proper fix):** derive the state instead of mirroring it: `isSelected = computed(() => selectedKeySet.value.has(rowKey))`, built on the MOD-08 composables. Remove the `internal*RowKeys` mirror copies and the non-deep watchers. Don't use `deep: true` as a stopgap. In-place mutation of the user's arrays must keep working, because the official demos rely on it.
  - **Done (D2):** controlled mode reads the user's array directly; `selectedKeySet` / `expandedKeySet` are computeds that iterate it, so `push` / `splice` are tracked without `deep: true`. Internal state exists only for uncontrolled mode and is only ever replaced. The `internalExpandRowkeys`, `internalCheckboxSelectedRowKeys` and `internalRadioSelectedRowKey` mirrors, their props on `BodyTr` / `BodyTd`, and the non-deep watchers are gone.
  - **Verified:** `ve-table-row-state.spec.tsx` › "push / splice on controlled selectedRowKeys updates the rows and the header" (before: an in-place `push` left every checkbox unchecked) and "push / splice on controlled expandedRowKeys, and the next click uses the mutated keys" (before: `afterExpandedRowKeys` was `[1001, 1002]`, built from the stale mirror). The existing `ve-table-row-expand.spec.tsx` › "expandOption expandedRowKeys(controllable attr)" asserted that buggy `[1001, 1002]`; it now expects `[1001, 1003, 1002]`, and its snapshot was updated (row 1003 stays expanded). Composable tests cover the same for `useRowSelection` / `useRowExpand`.

- [x] ✅ 2026-10-16 · fix/audit-batch4-row-state · **ROW-04** 🟠 The header select-all state goes stale
  - **Where:** `body/index.tsx:373-378` (`sendToCheckboxAll` runs only on selection change), `header-checkbox-content.tsx:21` (starts at `isSelected = false` after a remount).
  - **Trigger:** select all, then add a row, and the header still shows checked. Change the columns, and the header shows unchecked while every row is selected.
  - **Fix:** watch `[isCheckboxSelectedAll, isCheckboxIndeterminate]`, or pass the state down as props.
  - **Done:** the header checkbox reads `isSelectedAll` / `isIndeterminate` straight from the injected row state (MOD-08), which depends on `allRowKeys`. The `CHECKBOX_SELECTED_ALL_INFO` / `CHECKBOX_SELECTED_ALL_CHANGE` relay through ve-table is removed.
  - **Verified:** `ve-table-row-state.spec.tsx` › "select all, then add a row: header is no longer checked" and its controlled variant (before: header stayed checked), and "columns change keeps the header state" (before: header unchecked after remount while every row was selected).

- [x] ✅ 2026-10-16 · fix/audit-batch4-row-state · **ROW-05** 🟠 The select-all math compares counts instead of sets
  - **Where:** `body/index.tsx:313-334`
  - **Trigger:** all rows disabled and none selected gives `0 + N === N`, so the header shows checked. Keys from other pages, or disabled keys that are not in the data, inflate the count.
  - **Fix:** `all.length && all.some(k => !disabled.has(k)) && all.every(k => sel.has(k) || disabled.has(k))`.
  - **Done:** `useRowSelection.isSelectedAll` uses exactly that formula. `isIndeterminate` counts only selected keys that are in the data (some but not all rows), which keeps the old "checked + indeterminate" look when every enabled row is selected but a disabled row isn't.
  - **Verified:** `ve-table-row-state.spec.tsx` › "all rows disabled and none selected: header is not checked", "selected keys that are not in the data do not inflate the count", "disabled keys that are not in the data do not inflate the count" (all three showed a checked header before), plus "every enabled row selected, the disabled row unselected: header is checked"; `ve-table-row-state-composables.spec.ts` › "isSelectedAll compares sets (ROW-05)".

- [ ] **ROW-06** 🟢 With expand `trigger: 'row'`, an icon click dispatches `BODY_CELL_CLICK` twice
  - **Where:** `expand-tr-icon.tsx:68`. The click bubbles into the td.
  - **Fix:** `stopPropagation` on the icon click, or de-duplicate in the handler.

- [ ] **ROW-07** 🟢 Controlled select-all drops other pages' keys (found in batch 4)
  - **Where:** `features/row-selection/useRowSelection.ts` `selectAll`. Selecting all builds the key list from the current data, and deselecting keeps only the disabled-and-selected keys, so keys selected on other pages are dropped in both directions.
  - **Note:** this is the original behaviour, kept on purpose by MOD-08. The pagination demo works around it with its own key collection.
  - **Fix (needs a decision):** keep selected keys that aren't in the current data when selecting or deselecting all, and document it.

---

## INS — row insert indicator

- [ ] **INS-01** 🟠 The row insert indicator inserts at the wrong index
  - **Where:** `row-insert-indicator/index.tsx:180-181` (the header area always returns index `0`), `:231` (the virtual-scroll offset is skipped when `closestIndex === 0`). Since `442962c` the virtual case is broken further: only the first `<tbody>` is scanned (VS-05).
  - **Trigger:** a sticky header with the table scrolled to row 300: the line is drawn above row 300, but the insert goes to row 0. With virtual scroll, inserting at the first rendered row goes to the wrong index.
  - **Fix:** always use `start + closestIndex`, and map the header area to the first *visible* row.
  - **Progress (2026-10-16, `fix/audit-batch0-regressions`):** the "only the first `<tbody>` is scanned" part is fixed with VS-05. The indicator now uses `queryBodyRows(tableEl)` (test `the row insert indicator sees every rendered row`). The index mapping (`closestIndex === 0`, header area → 0) is unchanged and still open.

- [ ] **INS-02** 🟢 `getBoundingClientRect` runs on every row on every mousemove
  - **Where:** `row-insert-indicator/index.tsx:189-220`. That is O(N) layout reads on large non-virtual tables.
  - **Fix:** throttle with rAF, and binary-search the rows by offset.

---

## RENDER — body, header and footer rendering

- [ ] **RENDER-01** 🟠 🔍 The `h` passed to user render callbacks is the component proxy, not `h`
  - **Where:**
    - `body/body-td.tsx:557` → `renderBodyCell(params, h)` (~327)
    - `header/header-th.tsx:558` → `renderHeaderCell`
    - `footer/footer-td.tsx:317` → `renderFooterCell`
    - `header/header-filter-content.tsx:62` → `filterIcon(h)`
    - `header/header-filter-custom-content.tsx:84, 98`, where `h` is the slot props
  - **Cause:** Vue 3 calls `render(proxy, cache, …)`, so the `render(h)` parameter shadows the imported `h`.
  - **Trigger:** user code calling `h('span')` throws "h is not a function". (`expand-tr.tsx:109` is correct.)
  - **Fix:** remove the `h` parameter and pass the imported `h`.

- [x] ✅ 2026-10-16 · fix/audit-batch6-vs-render-perf · **RENDER-02** 🟠 Unkeyed fragments around each body row cause mass remounts *(non-virtual path only since `442962c`)*
  - **Where:** `body/index.tsx:899-911`. Each row returns `[<BodyTr key=…/>, expandRow]`, so Vue builds unkeyed Fragments and matches rows by position. *The virtual path (848-897) now wraps each row in a keyed `<tbody>`, and the placeholder branch that dropped expand rows is gone.*
  - **Trigger:** sorting or inserting at the top of a non-virtual table. Every shifted row remounts, including its tds and checkboxes.
  - **Fix:** a flat array with keys: `<BodyTr key={k}/>`, plus `<ExpandTr key={`${k}__expand`}/>`.
  - **Done:** the non-virtual render loop builds one flat array: each `<BodyTr>` (already keyed by `getTrKey`), followed by its expand row if it has one. The expand row is `cloneVNode(getExpandRowComp(…), { key: `${key}__expand` })`, so `getExpandRowComp` is unchanged. Rows without an expand row no longer leave a `null` slot, which removes one `<!---->` placeholder per row from 24 snapshot files (115 lines, nothing else changed).
  - **Verified:** new `ve-table-render.spec.tsx` › `body rows are keyed (RENDER-02)`: `inserting a row at the top keeps the DOM nodes of the existing rows` and `reordering rows (e.g. sorting) moves the DOM nodes instead of re-creating them`. Both check that every existing `<tr>` and the expanded row's `<tr>` are the same DOM nodes afterwards, and that the expand row still follows its row. Both failed before (new `<tr>` nodes).

- [x] ✅ 2026-10-16 · fix/audit-batch6-vs-render-perf · **RENDER-03** 🟠 One deep watcher per cell on the whole `rowData`
  - **Where:** `body-td.tsx:172-182`. That is rows × columns deep traversals just to copy one field, and it goes stale if `column.field` changes.
  - **Fix:** `computed: { rawCellValue() { return this.rowData[this.column.field] } }`.
  - **Done:** as proposed. The `rawCellValue` data field and the deep `rowData` watcher are removed.
  - **Verified:** `ve-table-render.spec.tsx` › `body cells read only their own field (RENDER-03)`: `does not traverse the whole row object` (each row has a nested object with a counting getter that no column uses; editing one cell read it 7 times before, 0 now) and `follows a change of column.field` (same column key, new field; the cell kept showing the old field's value before). `updates the cell when its field changes in place` guards the normal edit path.

- [ ] **RENDER-04** 🟢 A cell span with only one dimension makes the cell disappear
  - **Where:** `body-td.tsx:413-416, 581`; `footer-td.tsx:271-274, 321`. `bodyCellSpan` returning `{ colspan: 2 }` leaves `rowspan` undefined.
  - **Fix:** `rowspan ?? 1` and `colspan ?? 1`.

- [ ] **RENDER-05** 🟠 🔍 `getTextContentOfVNode` always returns `''` for a VNode
  - **Where:** [common/utils/index.ts:87-88](../packages/common/utils/index.ts#L87-L88). It returns early whenever the VNode has children, so the recursion below is unreachable.
  - **Effect:** `column.ellipsis.showTitle` gives an empty `title` for any `renderBodyCell` that returns a VNode (`body-td.tsx:351`).
  - **Fix:** remove the early return, and handle string children, arrays and the `default` slot function.

- [x] ✅ 2026-10-16 · fix/audit-batch6-vs-render-perf · **RENDER-06** 🟠 🔍 A scrollbar width of `0` is never cached, so it is re-measured on every render
  - **Where:** [ve-table.tsx:1168-1182](../packages/ve-table/src/ve-table.tsx#L1168-L1182) (`if (scrollBarWidth)`). Callers ~479 and ~2354.
  - **Trigger:** overlay scrollbars (the macOS default, mobile). Every render and every `tableContainerStyle` evaluation appends a probe div and forces layout twice, including on each virtual-scroll re-render (every `_vsVersion` bump).
  - **Fix:** a `null` sentinel for "not measured".
  - **Done:** `scrollBarWidth` starts as `null`, and `getScrollBarWidth` returns the cached value whenever it is not `null`, including `0`.
  - **Verified:** `ve-table-render.spec.tsx` › `scrollbar width (RENDER-06)` › `measures a 0px scrollbar width only once`. It counts the `.ve-scrollbar-wrap` probes appended to `body` across several re-renders (jsdom always measures 0, like an overlay scrollbar). It counted 6 before and counts 1 now.

- [ ] **RENDER-07** 🟢 Checkbox and radio cells render a stray `column="[object Object]"` attribute (found in batch 4)
  - **Where:** the body checkbox / radio content components receive `column` from `body-td.tsx` but don't declare it, so it falls through onto the `<label>`. It is visible in the snapshots.
  - **Fix:** stop passing `column`, or declare it (or set `inheritAttrs: false`), then refresh the affected snapshots.

---

## MENU — contextmenu (table menus and the `ve-contextmenu` component)

- [ ] **MENU-01** 🟢 Commented-out contextmenu types give items `type: undefined`
  - **Where:** `ve-table/src/util/constant.ts:254, 258` (`REMOVE_COLUMN`, `HIDE_COLUMN`); used at `util/index.ts:318, 326, 383`.
  - **Effect:** a user menu item with no `type` matches "removeColumn", and a user `type: 'REMOVE_COLUMN'` renders with no label.
  - **Fix:** restore the constants (implementing them is optional), or remove them from the collections.

- [ ] **MENU-02** 🟠 Changing `eventTarget` leaves a listener on the old element
  - **Where:** `ve-contextmenu/src/index.tsx:109-115, 458-474`. The old listener is never removed, and a string selector is resolved by an `immediate` watcher before mount, so it gets `null` and is never retried.
  - **Fix:** call `removeContextmenuEvent()` before re-registering, and resolve strings in `mounted`.

- [x] ✅ 2026-10-16 · fix/audit-batch2-lifecycle-leaks · **MENU-03** 🟠 The debounced hover handler fires after unmount
  - **Where:** `ve-contextmenu/src/index.tsx:120-133, 217-226` (the 300ms `debounceCreatePanelByHover` is never cancelled).
  - **Trigger:** right-click, hover a parent item, then change route within 300ms. A new body div is created, then `appendChild(undefined)` throws a TypeError.
  - **Fix:** in `beforeUnmount`, `debounceCreatePanelByHover.cancel()` and set `isPanelsEmptyed = true`.
  - **Done:** as proposed, plus the `$nextTick` inside `createPanelByHover` returns early once the instance is unmounted.
  - **Verified:** `ve-contextmenu.spec.tsx` › "the hover debounce does not fire after unmount (MENU-03)" (fake timers). Before the fix it reproduced exactly as described: `body` gained a div and there was an unhandled `TypeError: Failed to execute 'appendChild'`.

- [x] ✅ 2026-10-16 · fix/audit-batch2-lifecycle-leaks · **MENU-04** 🟠 Submenu containers leak on every right-click
  - **Where:** `ve-contextmenu/src/index.tsx:411-447`. `removeOrEmptyPanels(true)` removes only containers whose IDs are in the current `panelOptions`. ve-table replaces `options` on every right-click (`methods/contextmenu.ts:39, 53`), which regenerates the IDs.
  - **Fix:** keep a `Set` of the created container elements, and remove them all when the options change and on unmount (or MOD-09).
  - **Done:** `addContextmenuPanelToBody` records each container in a non-reactive `panelContainerEls` set (`markRaw`). The `options` watcher and `unmounted` call the new `removeAllPanelContainers()` instead of `removeOrEmptyPanels(true)`, whose `isRemove` branch no longer has a caller.
  - **Verified:** `ve-contextmenu.spec.tsx` › "repeated right-clicks with replaced options do not leak submenu containers (MENU-04)". Each cycle opens a submenu, right-clicks again (which resets `panelOptions` to the root only), then replaces `options`. Before the fix this leaked one container per cycle (+5); now the count is flat and unmount returns `body` to its starting size. See also MENU-06, found while writing this test.

- [ ] **MENU-05** 🟢 Submenu positioning
  - **Where:** `ve-contextmenu/src/index.tsx:366, 372`. When opening to the left it uses `parentPanelLeft - parentPanelWidth` instead of `currentPanelWidth`. The viewport-relative `getViewportOffset().left` is used as a body coordinate, so it is off by `scrollX`. Nothing clamps a panel that is larger than the viewport.
  - **Fix:** use `currentPanelWidth`, add the scroll offsets, and clamp to the viewport.

- [ ] **MENU-06** 🔴 The ve-table contextmenu is removed right after it opens (found in batch 2; seen in jsdom, not yet confirmed in a browser)
  - **Where:** `ve-table.tsx` `bodyCellContextmenu` / `headerCellContextmenu` → `setContextmenuOptions` (`methods/contextmenu.ts:33-62`), together with the `options` watcher in `ve-contextmenu/src/index.tsx:93-108`.
  - **Trigger:** right-click a body cell. The cell's `contextmenu` handler replaces `contextmenuOptions` synchronously. The same event then bubbles to `.ve-table-content`, where `showRootContextmenuPanel` shows the panel in the **old** root container. On the next flush, the `options` watcher removes that container (since `65b1cfd`, initial import) and creates a new, empty one. A jsdom probe right after `dispatchEvent` found 2 nodes inside `.ve-contextmenu-popper`, and 0 after `await later()`, on every right-click. The existing ve-table contextmenu specs don't catch this, because they count `.ve-contextmenu-node` anywhere in the document, including the hidden render root.
  - **Fix (proposal):** don't regenerate the menu on every right-click while it is being shown. Either compute the options before the menu opens (for example on right-button `mousedown`), or have the `options` watcher rebuild in place and re-show when the menu is open. Covered long-term by MOD-09. Confirm in the docs site first.

---

## DD — dropdown and select

- [x] ✅ 2026-10-16 · fix/audit-batch2-lifecycle-leaks · **DD-01** 🔴 🔍 A hide/show race through an uncancelled 150ms timer
  - **Where:** [ve-dropdown/src/index.tsx:306-319](../packages/ve-dropdown/src/index.tsx#L306-L319). `visible-change(false)` is emitted immediately, but `internalVisible = false` and the panel clear happen 150ms later. The `FIXME` is already there.
  - **Trigger:**
    - Uncontrolled: a second click within 150ms sees "visible" and hides again, so the click is lost.
    - Controlled (ve-table filters): `visible` goes true → false → true within 150ms, and the old timer empties the freshly shown panel.
  - **Fix:** keep `hideTimer`, `clearTimeout` it in `showDropDown` and `beforeUnmount`, and set `internalVisible` synchronously. If a fade is wanted, it must be interruptible: cancel any in-flight animation and start from the current visual state, with no queued timers.
  - **Done:** the panel has no CSS transition (`ve-dropdown-dd-show` isn't styled; hiding means emptying the popper container), so the timer only delayed the hide. `hideDropDown` now sets `internalVisible = false` and empties the container synchronously, so there is no hide timer left to race with or cancel. The `dropdownClickOutside` `setTimeout(0)` is now stored as `clickOutsideTimer`, coalesced, and cleared in `beforeUnmount`. The controlled `visible` watcher's double-`nextTick` callback returns early once the instance is unmounted.
  - **Verified:** `ve-dropdown.spec.tsx` › "rapid clicks toggle correctly when uncontrolled (DD-01)" (three clicks within 20ms emitted `true, false, false` before the fix and now emit `true, false, true`), "controlled visible true → false → true keeps the panel content (DD-01)" (the container was empty before the fix), and "the click-outside timer does not fire after unmount (DD-01)" (`hideDropDown` ran after unmount before the fix).

- [x] ✅ 2026-10-16 · fix/audit-batch2-lifecycle-leaks · **DD-02** 🔴 🔍 The dropdown leaks its body container on every unmount
  - **Where:** [ve-dropdown/src/index.tsx:337-343](../packages/ve-dropdown/src/index.tsx#L337-L343) (only `innerHTML = ''`), `227-228`, `516-535`
  - **Trigger:** every VeSelect (one per VePagination) and every ve-table filter column leaves one div in `body` per mount, so route changes grow the DOM without bound. Unmounting before the `nextTick` in `addRootElementToElement` creates the div after unmount.
  - **Fix:** `rootEl.remove()` in `beforeUnmount`. Better: `<Teleport>` (MOD-09).
  - **Done:** new `removeRootElement()` runs in `beforeUnmount` (it replaces the old `removeOrEmptyRootPanel()` call in `unmounted`). The `nextTick` in `addRootElementToElement` returns early if the instance is already unmounted. MOD-09 is still the long-term fix.
  - **Verified:** `ve-dropdown.spec.tsx` › "unmount removes the body container (DD-02)" (5 mount / open / unmount cycles leave `document.body.children.length` unchanged; it was +5 before) and "unmount before the container is created leaves nothing behind (DD-02)" (mount + immediate unmount, ×5). These tests mount without `attachTo`, because the shared `wrapMount` helper leaves its own container in `body` on every mount.

- [ ] **DD-03** 🟠 Every document click "hides" every closed dropdown
  - **Where:** `ve-dropdown/src/index.tsx:472-480, 640`. `v-click-outside` is always bound, and `hideDropDown()` has no visibility check.
  - **Effect:** every click emits `on-dropdown-visible-change(false)` and schedules a timer for every dropdown on the page.
  - **Fix:** `if (!this.isDropdownVisible) return`.

- [ ] **DD-04** 🟠 The dropdown mutates the caller's option objects before the user confirms
  - **Where:** `ve-dropdown/src/index.tsx:244` (shallow `Object.assign([], modelValue)`), `261-263`, `445-452`, `484-489`. ve-table passes `column.filter.filterList` straight in (`header-filter-content.tsx:28`).
  - **Trigger:** tick a filter item, then click outside without confirming. The user's column config is changed permanently.
  - **Fix:** `this.internalOptions = (this.modelValue ?? []).map(x => ({ ...x }))`.

- [x] ✅ 2026-10-16 · fix/audit-batch1-crash-oneliners **DD-05** 🟠 🔍 VeSelect's open/closed arrow never toggles
  - **Where:** [ve-select/src/index.tsx:152](../packages/ve-select/src/index.tsx#L152). It listens with `onDropdownVisibleChange`, but the dropdown emits `'on-dropdown-visible-change'`, whose handler key is `onOnDropdownVisibleChange`.
  - **Fix:** rename the listener.
  - **Verified:** `ve-select.spec.tsx` › "toggles the arrow icon class with the dropdown visibility" (`ve-select-show` is added on open and removed on close; it was never added before the fix).

- [ ] **DD-06** 🟢 A `popperAppendTo` selector that matches nothing throws
  - **Where:** `ve-dropdown/src/index.tsx:532` (`this.popperAppendToEl!.tagName`)
  - **Fix:** fall back to `document.body` and warn.

---

## PAG — pagination

- [ ] **PAG-01** 🟠 Edge cases with `total = 0`, `pageSize = 0` and an out-of-range `pageIndex`
  - **Where:** `ve-pagination/src/index.tsx:54` (Next uses `=== pageCount`), `224-226` (the `pageIndex` watcher skips validation), `246-247` (`getValidNum` returns 0)
  - **Trigger:**
    - `total = 0`, then type "3" + Enter in the jumper: it emits `on-page-number-change(0)`.
    - Next looks enabled when `total` shrinks below the current page.
    - `pageSize = 0` displays "Infinity".
  - **Fix:** `pageCount = Math.max(1, Math.ceil(total / Math.max(1, size)))`, use `>=` for disabled, and clamp in the watchers.

- [ ] **PAG-02** 🟢 Hard-coded element IDs collide when there are several paginations
  - **Where:** `ve-pagination/src/index.tsx:82, 89, 123, 127` (`ve-pagination-size-label`, `ve-pagination-jumper`). (Re-checked at `0c5b732`: unchanged.) `aria-labelledby` points at the wrong instance.
  - **Fix:** per-instance ids (`useId()` or a random suffix).

- [ ] **PAG-03** 🟢 `pageSizeChangeHandler` ignores its argument
  - **Where:** `ve-pagination/src/index.tsx:103` vs `277`. It works only because the dropdown mutates the cached option objects (DD-04). Fixing DD-04 alone will break page-size changes, so fix both together.

---

## LOAD — loading service

- [x] ✅ 2026-10-16 · fix/audit-batch1-crash-oneliners **LOAD-01** 🔴 🔍 The `lock` option never works, and `destroy()` leaves classes on the parent
  - **Where:** [ve-loading/src/index.ts:93-100](../packages/ve-loading/src/index.ts#L93-L100). `options.parent__` is set **after** `createInstance(options)` has mounted, and root props are not reactive, so `instance.parent__` stays `null`.
  - **Effect:** `show()`/`close()` never toggle `ve-loading-parent-lock`, and `destroy()` never removes `ve-loading-parent-relative`, so the target (or `body`) keeps `position: relative !important`. `show(); destroy()` in the same tick would also re-add the class after destroy. The existing "lock" test only checks `.ve-loading-fixed`, which is why this isn't caught.
  - **Fix:** compute `parent` before `createInstance` and pass it in. Check that the instance is still alive inside the `nextTick` callbacks. Count references on the parent class when several loaders share one target.
  - **Done:** `parent__` is computed before `createInstance`, which reads `parent`/`lock` from the options in a closure. Both parent classes go through a per-element reference count (`WeakMap`). Each instance holds at most one lock reference, the `nextTick` callbacks return early once destroyed, and `destroy()` is idempotent. (The no-op `setVisible(false)` after `app.unmount()` was dropped.)
  - **Verified:** `ve-loading.spec.tsx` › "lock prop" (now also asserts relative on create, lock on `show()`, lock removed on `close()`, both removed on `destroy()`), "does not lock the parent without the lock prop", "show then destroy in the same tick leaves no parent classes", "keeps the parent classes while another loading shares the target" (includes a double `destroy()`).

---

## FORM — checkbox, checkbox-group and radio

- [x] ✅ 2026-10-16 · fix/audit-batch2-lifecycle-leaks · **FORM-01** 🟠 Checkbox-group callbacks are never unregistered
  - **Where:** `ve-checkbox-group/src/uses.ts:219-223` (`callbacks.push(cb)`), `ve-checkbox/src/index.tsx:34`
  - **Trigger:** `v-for` checkboxes whose options change. Dead checkboxes keep receiving updates.
  - **Fix:** `onCheckboxGroupUpdate` returns an unregister function, called in `onBeforeUnmount`.
  - **Done:** as proposed. The `Payload` type and the inject default both return a disposer, and the checkbox calls it in `onBeforeUnmount`.
  - **Verified:** `ve-checkbox.spec.ts` › "unmounted checkboxes stop receiving group updates (FORM-01)". A probe child wraps the group's `onCheckboxGroupUpdate` to count calls. After replacing a 3-item `v-for` three times, one `modelValue` change called 12 callbacks before the fix and calls 3 now.

- [ ] **FORM-02** 🟢 Disabled and uncontrolled checkbox/radio state
  - **Where:** `ve-checkbox/src/index.tsx:113-126`, `ve-radio/src/index.tsx:83-86`. A disabled control ignores model changes, so it goes stale when the group value changes. An uncontrolled one with no `v-model` never shows the `*-checked` class.
  - **Fix:** make `disabled` block user input only, not model sync, and keep local state when uncontrolled.

- [ ] **FORM-03** 🟢 Checkbox-group leftovers
  - **Where:** `ve-checkbox-group/src`. `expose: ['modelValue', 'updateModel']`, but `updateModel` doesn't exist, and `provide() { aaa }` is debug code.

---

## I18N — locale and ConfigProvider

- [x] ✅ 2026-10-16 · fix/audit-i18n01-config-provider **I18N-01** 🟠 🔍 ConfigProvider renders nothing, and the locale plumbing is disconnected
  - **Where:** [common/comps/config-provider/index.ts:16](../packages/common/comps/config-provider/index.ts#L16) (`slots.defaults?.()`, a typo for `default`). Also `ve-locale/index.ts:49-58`: `useLocale` assigns to an injected read-only computed, and `update()` merges into the user's locale object. Neither is wired to `createI18N`, which reads only the global singleton.
  - **Decision D3: fix it and export it.**
    - Fix the slot typo.
    - Make the provided locale reactive to prop changes: always provide a computed, and fall back to the global locale.
    - `useLocale` must not write to the injected computed or mutate user objects.
    - Wire `createI18N` / every component's locale lookup through the injected context (MOD-11).
    - Export it from `packages/vue/src/index.ts`, add a docs page and tests (nested providers, switching locale at runtime).
  - **Done:**
    - `common/comps/config-provider/index.ts`: renders `slots.default`, and always provides a computed through `provideLocale(() => props.locale)`, so a change to `locale` (including back to `undefined`) re-renders the children. `locale` is typed `LocaleMessageInput`, runs through `normalizeLocaleMessage` (old English keys work and warn once per key), and is merged on top of the outer locale (the nearest outer provider, else the global `VeLocale` singleton) into a fresh object. A partial locale is therefore enough, and the innermost provider wins.
    - `ve-locale/index.ts`: the injection key holds a read-only `Ref<LocaleMessage>`. New `injectLocale()` returns the nearest provided locale, or the global one (also outside an injection context). `useLocale()` never writes to the injected ref, and its `update()` keeps a normalized local override for that caller only. Nothing mutates user objects. Before, `useLocale` without a provider fell back to a private zh-CN clone, not the global locale.
    - `common/locale/index.ts`: `createI18N(compName, getMessages?)` resolves through `injectLocale()` by default. New `useI18N(compName)` binds `t` to the locale injected at setup. Every lookup now goes through it: `ve-pagination` (root, Total/Prev/Next/Sizer/Jumper and the pager, via `setup`), `header-filter-content` (`setup`), and the ve-table contextmenu (an `inject` option, `veLocale`). ve-table uses `inject` instead of `setup` to keep its instance shape until MOD-02: with a `setup()`, VTU's `wrapper.vm` stops exposing `_`-prefixed data such as `_vs`, which broke a virtual-scroll spec.
    - Exported as `VeConfigProvider` from `packages/vue/src/index.ts` and registered by `useVeTable()` (`<ve-config-provider>`), like the other components (`withUse`). Renamed from the never-exported `EtConfigProvider`.
    - Docs: `docs/{en,nb,zh}/ve-config-provider.md` (usage, nested providers, switching at runtime, API) plus sidebar entries.
  - **Verified:** `common/__tests__/config-provider.spec.tsx` (11 tests, written first; 10 failed before the fix): `is exported and registered by useVeTable`, `renders its default slot`, `a component inside the provider uses the provider locale`, `nested providers: the innermost provider wins`, `switching the locale prop at runtime updates the rendered text`, `without a provider, components fall back to the global locale`, `a provider without a locale passes the global locale through, including later updates`, `accepts an old English key through the provider and warns once`, `does not mutate the user locale object or the global locale`, and `inside ve-table` › `the header filter uses the provider locale` / `the contextmenu uses the provider locale`. The three docs demos were also checked in headless Chromium against a `vitepress build` (en, nb, zh: every button, no console errors). `vue-tsc` stays at 461 with the same error set.

- [ ] **I18N-02** 🟢 The locale singleton is deep-merged in place and shared across apps
  - **Where:** `ve-locale/index.ts:22-35`. A second app's `use({ locale })` switches the first app's language.
  - **Fix:** `merge({}, defaultLang, lang)` into a fresh object, and a per-app provide (MOD-11).
  - **Progress (I18N-01):** an app can now get its own language by wrapping its root in `VeConfigProvider`. The global singleton is still merged in place and shared across apps, so this item stays open.

- [x] ✅ 2026-10-16 · `81a1ebb` **I18N-03** 🟢 Missing pagination aria keys in seven languages
  - **Where (at `a0bfb50`):** `common/locale/lang/{fr-FR,ru-RU,ko-KR,pt-BR,zh-TW,af-ZA,zu-ZA}.ts`. They lacked `prevPage`, `nextPage`, `paginationLabel`, `pageLabel`, `currentPageLabel`, `jumpToLabel` and `pageSizeLabel`, so those users got **Chinese** aria-labels.
  - **Resolved:** all ten lang files now define all 13 pagination keys and all table keys (under the renamed keys, see I18N-04). `prev5`/`next5` also became functions of `pagingCount` everywhere. Verified by grepping every lang file for the full key set.
  - **Not done:** the type-level shape check. `LocaleMessage` is still `Record<string, Record<string, …>>` (`common/locale/types.d.ts`), so a missing or misspelled key is still not a compile error. That check now belongs with I18N-04. *(Done with I18N-04 in `fix/audit-batch0-regressions`: the lang files now use `satisfies LocaleMessage`.)*

- [x] ✅ 2026-10-16 · fix/audit-batch0-regressions **I18N-04** 🟠 🔍 Locale message keys were renamed to Chinese, which silently breaks user locale overrides
  - **Where:** `81a1ebb` re-keyed every lang file and every lookup: `pagination` → `分页`, `table` → `表格`, `goto` → `前往`, `cut` → `剪切`, `confirmFilter` → `确认筛选`, and so on (`ve-pagination/src/util/constant.ts:4`, `ve-table/src/util/constant.ts:4`, `ve-pagination/src/{index,pager}.tsx`, `ve-table/src/util/index.ts:302-388`, `header/header-filter-content.tsx:71-72`). A few English strings changed as well, e.g. `confirmFilter` "Confirm" → `确认筛选` "Filter", and "Remove $1 row" → "Delete $1 row(s)".
  - **Effect:** this is a breaking change to the public locale format. A custom language object, or `VeLocale.update({ pagination: { goto: '…' } })`, written against the documented keys now merges into an unused `pagination` section and is silently ignored: no error, no warning. The UI falls back to the built-in language (zh-CN by default).
  - **Still on the old keys:** the docs `docs/src/docs/{en,nb,zh}/locale.md` and `docs/src/docs/{en,nb,zh}/ve-locale/cover-lang.md` (the "cover lang" demo is now a no-op), and the test `ve-locale/__tests__/ve-locale.spec.tsx:51`.
  - **Decision needed (open, see Decisions):** revert to the English keys, **or** keep the Chinese keys and ship a migration (accept the old keys through an alias map that logs a deprecation warning, update the docs, note it in the changelog). Either way, type `LocaleMessage` precisely so that missing and unknown keys fail `vue-tsc`.
  - **Decided (D5):** keep the Chinese keys and ship a migration.
  - **Done:**
    - `common/locale/legacy-keys.ts`: `LEGACY_LOCALE_KEY_MAP` (all 27 old keys → new keys; typed with `satisfies`, so every deprecated key must map to an existing new key) and `normalizeLocaleMessage()`. It returns a new object and never mutates the input. If the same object also has the new key, the new key wins. Unknown keys are left where they were. It logs one `console.warn` per old key, naming the old and the new path.
    - Applied in `VeLocale.update` (and so `VeLocale.use` and `useVeTable({ locale })`) and in `useLocale().update` (one line, alias only).
    - `common/locale/types.d.ts`: precise `LocaleMessage` (`PaginationLocaleMessage`, `TableLocaleMessage`, with typed function messages), `DeprecatedLocaleMessage` (old keys, each marked `@deprecated`), and `LocaleMessageInput` (partial new keys plus the deprecated keys) for user input. All 10 lang files use `satisfies LocaleMessage` instead of `as LocaleMessage`. `createLocale` takes `keyof LocaleMessage`.
    - Docs: `docs/src/docs/{en,nb,zh}/locale.md` use the new keys and have a key list plus an old → new migration table. The `ve-locale/cover-lang.md` demos use `分页.前往` and change the text visibly ("Jump to" / "Hopp til" / "跳转到").
    - Changelog: a "breaking change + deprecation" section at the top of `MIGRATION.md`. `docs/src/docs/*/update-log.md` are empty and not included by any page, so they were left alone.
  - **Verified:** `ve-locale.spec.tsx`. `render by update method` now overrides `分页.前往` and asserts the label, and its old snapshot (`跳转到`) is valid again. Also: `overrides a message with the new key`, `accepts a deprecated English key and warns once per key`, `use() accepts a language pack written with the old keys`, `normalizeLocaleMessage` › maps / prefers new key / keeps unknown keys. The type check is guarded by `locale message types reject missing and unknown keys`, which has two `@ts-expect-error` lines that would fail `vue-tsc` if the type became loose again. `vue-tsc` stayed at 462.
  - **Not covered:** `provideLocale(lang)` and the ConfigProvider `locale` prop pass user objects through without normalizing them. They are not wired to `createI18N` yet (I18N-01), so nothing reads them today. Normalize there when I18N-01 connects them. *(Done with I18N-01 in `fix/audit-i18n01-config-provider`: `provideLocale` runs `normalizeLocaleMessage` on the ConfigProvider `locale` prop, and the result reaches every component. Verified by `accepts an old English key through the provider and warns once`.)*

- [ ] **I18N-05** 🟢 The new Norwegian locale file is named `no-NB`
  - **Where:** `common/locale/lang/no-NB.ts` (added in `81a1ebb`). The BCP 47 tag for Norwegian Bokmål is `nb-NO`, which is what the docs use (`docs/.vitepress/theme/index.ts:24-25` maps `nb-NO` → `no-NB`).
  - **Fix:** rename the file to `nb-NO.ts` before it ships in a release and users start importing it by path.

---

## MOD — modularity

These are structural changes. Several of them remove whole bug classes above (noted in brackets).
**Approach (D1): Composition API.** Logic moves into `use*` composables organised by feature, e.g. `packages/ve-table/src/features/<feature>/use<Feature>.ts`, and components move to `setup()`. Migrate one feature at a time, keeping the test suite green after each step. The public API (props, emits, instance methods exposed via `expose`) must not change.

- [ ] **MOD-01** Replace the emitter mixin and `Hooks` with a typed `provide/inject` table context (`useTableContext`) whose subscriptions auto-dispose through `onScopeDispose` / `beforeUnmount`. [INFRA-01, INFRA-02]
- [ ] 🚧 **MOD-02** Split `ve-table.tsx` into feature composables and move the component to `setup()` (D1). Instance methods currently called through `this[INSTANCE_METHODS.*]` (and by users through refs) must be kept via `expose`.
  - **Step 1 done in `442962c`:** `ve-table.tsx` went from 4.2k to 2.5k lines. Method groups moved to `src/methods/*.ts` as plain objects that are spread into the Options API `methods` (`ve-table.tsx:2117-2122`), virtual scroll moved to `src/virtual-scroll.ts`, and shared types to `src/ve-table-types.ts`. This is still the Options API: the modules take `this: any`, share all state through `this`, and are not composables. Note that the spread comes **last**, so a module method silently overrides a same-named inline method.
  - **Remaining:** turn each module into a `use*` composable with explicit inputs and outputs, and move the component to `setup()`.
  | Module | Where now (`0c5b732`) | Notes |
  |---|---|---|
  | virtual-scroll | `virtual-scroll.ts`; ve-table.tsx computed 385-453, watch 706-725 and 803-815, methods 1216-1262 | Already isolated behind an adapter. VS-03, VS-05, VS-06 |
  | keyboard-navigation | `methods/keyboard.ts` | SEL-02, SEL-08 |
  | cell-selection (+ indicators, autofill) | `methods/cell-selection.ts`; ve-table.tsx 1391-1785 (mouse handlers), 1800-1931 (instance methods); watch 816-854 | Mostly pure state transitions, so testable without a DOM |
  | editing | `methods/editing.ts`; ve-table.tsx 2008-2099 (start/stop instance methods) | EDIT-*, INFRA-07 |
  | clipboard | `methods/clipboard.ts` | Takes `{ tableData, colgroups, allRowKeys, rangeData, option }` |
  | contextmenu wiring | `methods/contextmenu.ts` | Mutates `tableData` and `cloneColumns` |
  | columns (hide/show, group, resize, fixed) | ve-table.tsx 1040-1165, 1933-1963; watch 756-782 | COL-* |
  | scroll shadow / scrollbar status | `methods/scrolling.ts` | Container ref only |
  | event wiring | ve-table.tsx 879-987 | 21 near-identical `this.on(...)` calls → an `[event, method]` table |
- [ ] **MOD-03** Split `util/index.ts` (1.5k lines) into:
  - `columns/`: init-group-columns, column-fixed, col-keys
  - `selection-range/range.ts`: this also removes the four copies of the index/keys logic in the clipboard `onBefore*` functions
    - *Progress (`fix/audit-batch5-clipboard-codec`):* the three identical copies in `onBeforeCopy` / `onBeforeCut` / `onBeforeDelete` are now one `getRangeResponse` in `util/clipboard/handlers.ts`, built on `getSelectionRangeIndexes` / `getSelectionRangeKeys`. `onBeforePaste` keeps its own anchor-based logic.
  - `autofill/cell-autofill.ts`
  - `contextmenu/options.ts`
  - `core.ts`: `clsName`, `getRowKey`, `getEmitEventName` …
- [x] ✅ 2026-10-16 · fix/audit-batch5-clipboard-codec · **MOD-04** Split `clipboard.ts` into `tsv-codec.ts` (pure encode/decode with round-trip unit tests) and `handlers.ts` (`onBefore*`/`onAfter*`). [CLIP-02 … CLIP-05]
  - **Done:** `util/clipboard/` now holds `tsv-codec.ts` (pure `decodeSpreadsheetStr` / `encodeToSpreadsheetStr`), `handlers.ts` (`onBefore*` / `onAfter*`, plus the private `getRangeResponse`, `clearRangeValues` and clipboard read/write helpers) and `index.ts` (re-exports both). The move was its own commit with no behaviour change; `methods/clipboard.ts` imports from `../util/clipboard/index.js`.
  - **Verified:** the full suite passed unchanged after the move commit; the codec is covered by `ve-table-tsv-codec.spec.ts` (CLIP-03, CLIP-04).
- [ ] **MOD-05** Split `selection/index.tsx` into:
  - `geometry.ts`: pure rect → border boxes and autofill direction
  - `SelectionBorders.tsx`
  - `cell-dom.ts`: escaped lookups
  - `useSelectionPositions.ts`: element tracking, hook registration and removal, debounces, unmount cleanup

  [FILL-01, SEL-07, INFRA-04]
- [ ] **MOD-06** `useFixedColumns(colgroups)`: one `Map<colKey, { style, class }>` computed at table level and shared by header, body and footer, replacing three divergent implementations. [COL-06]
- [ ] **MOD-07** `bindCustomEvents(customEvents, extra)`: replace the nine forwarding methods (`cellClick` … `rowClick` …) copied across six components.
- [x] ✅ 2026-10-16 · fix/audit-batch4-row-state · **MOD-08** `useRowSelection` / `useRowExpand` composables that return derived state as props, and remove the local `isSelected` mirrors in the checkbox and radio content components. [ROW-03, ROW-04, ROW-05]
  - **Done:** `features/row-selection/useRowSelection.ts` (`useRowSelection` for checkboxes, `useRowRadio` for radios) and `features/row-expand/useRowExpand.ts`. Inputs are getters (`checkboxOption` / `radioOption` / `expandOption`, `allRowKeys`, a `getRowByKey` lookup); outputs are computeds (`selectedRowKeys`, `selectedKeySet`, `isSelectedAll`, `isIndeterminate`, `expandedRowKeys`, `expandedKeySet`, …) plus actions (`selectRow`, `selectAll`, `toggleRowExpand`) that call the user callbacks. `features/row-state` creates all three once per table: ve-table (still Options API) calls `createRowState` in its `provide()` option, where the instance scope is active, so the computeds and watchers stop on unmount. The body, the body checkbox/radio cells and the header checkbox `inject` it (`setup()`), so the checkbox/radio cells no longer keep a local `isSelected` and no longer talk through the emitter. The four row-selection events were removed from `EMIT_EVENTS`.
  - **Verified:** `ve-table-row-state-composables.spec.ts` (12 unit tests, written together with the composables) and the ROW-01 … ROW-05 integration tests above, which were written first and failed on the old code.
- [ ] **MOD-09** A `usePopper(triggerRef, { appendTo, placement })` built on `<Teleport>`, shared by dropdown and contextmenu, so neither moves Vue-owned DOM by hand any more. [DD-01, DD-02, MENU-03, MENU-04, MENU-05]
- [ ] **MOD-10** Pagination subcomponents (Total, Prev, Next, Sizer, Jumper): use props or an injected context instead of reaching into `this.$parent`.
- [x] ✅ 2026-10-16 · fix/audit-i18n01-config-provider **MOD-11** A single `useLocale()` that falls back to the global singleton, merges without mutating, and is used by `createI18N`. [I18N-01, I18N-02]
  - **Done with I18N-01:** `injectLocale()` (`ve-locale/index.ts`) is the one lookup path: nearest `VeConfigProvider`, else the global singleton. `useLocale()`, `createI18N` and the new `useI18N` all go through it, and `provideLocale` / `useLocale().update` merge into fresh objects. Verified by the I18N-01 tests. I18N-02 is only partly covered: the global singleton itself is still merged in place.

---

## Decisions

Record new decisions here with the next free `D` number and the date. Reference them from items as (Dn).

| ID | Date | Question | Decision |
|---|---|---|---|
| D1 | 2026-10-16 | Options API or Composition API for the refactor? | **Composition API.** Feature composables, components move to `setup()` (MOD section). |
| D2 | 2026-10-16 | ROW-03: `deep: true` or derived state? | **Proper fix:** derived state through MOD-08; no `deep: true` stopgap. |
| D3 | 2026-10-16 | ConfigProvider: finish it or delete it? | **Fix it** and export it (I18N-01). |
| D4 | 2026-10-16 | Tab inside the table: trapped, or leaves at the edges? | **Stays trapped.** Esc leaves cell navigation and focuses the table itself, and from there Tab moves to the next element on the page (SEL-08). |
| D5 | 2026-10-16 | I18N-04: revert the locale keys to English, or keep the Chinese keys from `81a1ebb`? | **Keep the Chinese keys and ship a migration.** The old English keys are accepted through an alias map with a one-time deprecation warning per key. `LocaleMessage` is typed precisely, and the docs and `MIGRATION.md` describe the change (I18N-04). |
| D6 | 2026-10-16 | SEL-08: should Esc while editing discard or commit the uncommitted value? | **Discard** (Excel / Google Sheets convention). The editor closes, the cell keeps its previous value, `beforeCellValueChange` / `afterCellValueChange` don't fire, and cell navigation continues on the same cell (SEL-08). |

### Still open

None.

---

## Test gaps noticed during the audit

- ~~The VeLoading "lock" test asserts only `.ve-loading-fixed` (LOAD-01).~~ Closed 2026-10-16 by the LOAD-01 tests (parent classes on show/close/destroy, same-tick destroy, shared target).
- `ve-table-cell-selection.spec.ts:599-604` asserts buggy behaviour (SEL-03).
- ~~No tests for remount or toggle scenarios (toggle `cellSelectionOption.enable`, `showHeader`, `rowInsertOption.enable`), which would catch INFRA-01 and INFRA-02.~~ Added in `ve-table-lifecycle.spec.ts` (batch 2), together with fake-timer unmount tests in `ve-dropdown.spec.tsx`, `ve-contextmenu.spec.tsx` and `ve-checkbox.spec.ts` ("lifecycle and timers" blocks).
- The shared `wrapMount` helper (`tests/utils/index.ts`) mounts with `attachTo: 'body'`, and VTU never removes that container, so every mount leaves one `div` in `body`. Body-leak tests have to mount without `attachTo` (the batch 2 tests do).
- ~~No clipboard codec round-trip tests (CLIP-03 … CLIP-05).~~ Closed 2026-10-16 by `ve-table-tsv-codec.spec.ts` (encode, decode, round trip) and `ve-table-clipboard.spec.ts` (handlers and the table's copy/cut/paste/delete), in `fix/audit-batch5-clipboard-codec`.
- ~~No virtual-scroll tests with variable row heights plus edits (VS-03).~~ Added in `fix/audit-batch6-vs-render-perf`: `ve-table-virtual-scroll.spec.tsx` › `cell edits keep measured row heights (VS-03)`, with a fake `ResizeObserver` for TanStack's per-row observer.
- **The suite has been red since `442962c` (40 failures).** 29 snapshots were never refreshed after the measurement row moved out of `<tbody>`, plus the en-US pagination text changes. The 11 virtual-scroll specs fail because jsdom has no layout: the scroll container measures 0 px, so TanStack yields no items and nothing renders. One (`dynamically turns virtual scrolling on`, :158) also still asserts the removed `.ve-table-virtual-phantom`. Fix: pass TanStack's `initialRect` (or mock `getBoundingClientRect` / `offsetHeight` in the spec), then rewrite the assertions for the spacer-based DOM.
  *Done in `fix/audit-batch0-regressions`.* The 29 snapshots were refreshed after checking that each diff contained only those two changes. The `render by update method` locale snapshot was the exception: its diff was the I18N-04 bug itself, so it was kept and fixed with I18N-04. The virtual-scroll specs failed mainly because of **VS-07** (the adapter never attached to the container, so no rows rendered in a real browser either). The specs now stub the layout in the tests only (`mockVirtualScrollLayout`, so production code is unchanged), assert real row ranges, spacers and scrolling, and no longer reference `.ve-table-virtual-phantom`.
- No test checks that virtual-scroll rows carry the body classes, or that selection and editor cell lookups work in virtual mode (VS-05). *Added in `fix/audit-batch0-regressions`* (see VS-05). `tests/utils` now has `mockVirtualScrollLayout`, `getVirtualRenderRange` and `mockCellRects` for jsdom layout-dependent tests.
- `ve-locale.spec.tsx:51` still overrides the old `pagination.goto` key, so it passes without testing anything (I18N-04). *Fixed in `fix/audit-batch0-regressions`: it overrides `分页.前往` and asserts the label; separate tests cover the old keys.*
- `ve-loading.spec.tsx`: "render normal", "fullscreen prop" and the fullscreen part of "lock prop" never `destroy()` their loaders. Since LOAD-01, "fullscreen prop" (`lock: true` + `show()`) leaves `ve-loading-parent-lock` on `body` for the rest of the file. Harmless under jsdom, but the new parent-class tests use their own target element for this reason.
- **Intermittent unhandled jsdom error** (seen 3 times on 2026-10-16, in `ve-table-cell-edit.spec.ts`, `ve-table-header-sort.spec.tsx` and `ve-table-header-filter.spec.tsx`): `TypeError: Cannot read properties of null (reading '_location')` from jsdom's `runAnimationFrameCallbacks` after the environment was torn down. All tests pass, but vitest exits 1; a rerun is clean. Likely cause: `resize-observer-polyfill` (`common/utils/resize-event.ts`) schedules `requestAnimationFrame` refreshes, and tables mounted with the shared `wrapMount` helper are never unmounted (see the `wrapMount` bullet above), so a refresh can fire after teardown. Fix: unmount every wrapper in a global `afterEach` (or track mounts in `tests/utils`), and/or disconnect observers in the resize-observer component's unmount.
- Still open from `REFACTOR_PLAN.md`: `ve-table-row-insert.spec.ts`, ~~`ve-table-clipboard.spec.ts`~~ (added in `fix/audit-batch5-clipboard-codec`), `ve-table-autofill.spec.ts`.

---

## Changelog

Newest first. One line per change: date · IDs · what happened · commit/PR.

- **2026-10-16** · Progress, Baseline · INFRA-07 ✅ · INFRA-11, SEL-09, SEL-10, CLIP-07, CLIP-08, CLIP-09, ROW-07, RENDER-07 added · INFRA-08 progress · Merged batches 3a, 3b, 4, 5 and 6 into `refactor/all` (worked in parallel in separate worktrees, on top of the shared `safeCall` helper in `be159bf`). AUDIT.md conflicted at each merge; `body/index.tsx` conflicted on imports only (batch 4 + 6). After merging 3a, the 3b spec `removing the edited row clears editing…` failed because its synthetic keydowns had no target and SEL-02 now ignores them; the spec dispatches them on the table root now. INFRA-07 ticked once both halves (3b editing/autofill, 5 clipboard) were in. The agents' new findings got IDs here. Recounted Progress: 90 findings, 41 done, 2 won't fix. Merged tree: 51 files · 494 tests all pass, eslint clean, tsc 435 (new ceiling). New test gap: an intermittent jsdom rAF-after-teardown error.
- **2026-10-16** · VS-03, RENDER-02, RENDER-03, RENDER-06 ✅ · VS-06 progress · Batch 6 (virtual scroll and render performance), each fixed test-first. VS-03: the deep `tableData` watcher and its `measure()` call are gone. The virtualizer is updated only when the row count or keys change, measured heights survive edits and reordering, and an edited row is re-measured by its own ResizeObserver. This was confirmed in Chromium: before the fix, one edit made the view jump 7 rows. VS-06: `_vs` and the width map are `markRaw`; later `bufferScale` / `minRowHeight` / `scrolling` changes reach TanStack; a sticky header and footer shrink the viewport TanStack sees, and a non-sticky header becomes `scrollMargin` (`getPaddingBottom` fixed for it); the first render shows rows when `maxHeight` is in pixels. Only `virtualScrollPositions` is left (with INS-01). RENDER-02: flat keyed body rows, with the expand row keyed `${key}__expand`. RENDER-03: `rawCellValue` is a computed. RENDER-06: `null` sentinel. 25 snapshots refreshed (115 `<!---->` placeholders gone, one spacer style reordered). Suite 45 files · 361 tests all pass, eslint clean, tsc 461 (unchanged). · `fix/audit-batch6-vs-render-perf`
- **2026-10-16** · MOD-08, ROW-01, ROW-02, ROW-03, ROW-04, ROW-05 ✅ · Batch 4 (row selection and expand). New `useRowSelection` / `useRowRadio` / `useRowExpand` composables return derived state (D2): controlled arrays are read directly, so in-place `push` / `splice` works without `deep: true`, and internal state exists only in uncontrolled mode and is never mutated in place. ve-table provides them once (`provide()` option, no `setup()`); the header checkbox, body cells and body inject them. Mirrors, non-deep watchers and the select-all event relay are gone. `defaultExpandAllRows` copies `allRowKeys` and rows collapse again; select-all uses the set formula. 27 new tests (the 15 integration tests were written first and 10 of them failed on the old code); one existing expand test and its snapshot asserted the ROW-03 bug and were updated. The `selected-control`, `expand-control` and `pagination/checkbox` demos were checked in headless Chromium (in-place push/splice, icon click, select-all, page switch; no console errors). Suite 46 files · 374 tests all pass, eslint clean, tsc 444 (was 461). · `fix/audit-batch4-row-state`
- **2026-10-16** · SEL-02, SEL-08 ✅ · D6 · Keyboard scope and a way out of the table. The document `keydown` handler ignores keys from outside the table (unless nothing has focus). A new `keyboardMode` flag (`'cell' | 'table'`): Tab stays trapped in cell mode; Esc while editing discards (D6); Esc in cell mode focuses the root (`tabindex="0"`, `:focus-visible` ring, dimmed active cell) and Tab then leaves; Enter or an arrow key on the root, or a click, resumes. The editor no longer steals focus in table mode. 13 new tests in `ve-table-keyboard.spec.ts` (9 failed before), checked in headless Chromium. 22 snapshots refreshed (only `tabindex="0"` on the root). The optional `role="grid"` / hint was not done (see SEL-08). Suite 45 files · 360 tests all pass, eslint clean, tsc 461 (unchanged). · `fix/audit-batch3a-keyboard-esc`
- **2026-10-16** · SEL-01, EDIT-04 ✅ · INFRA-07 progress · Batch 3b (state reconciliation). One watcher on `[colgroups, allRowKeys]` (`cellStateKeys` → `reconcileCellState()`) replaces the `allRowKeys` watcher and clears or collapses the editing cell, current/end/autofill cells, indicators and a stale range when their keys disappear. Guards in `cornerCellInfo`/`getBorders`, F2, `startEditingCell`, `isCellInSelectionRange`, `saveCellWhenStopEditing` and the editor style. SEL-01's render-crash trigger corrected (needs a right-fixed first column or no columns). `startEditingCell` saves the previous edit first. INFRA-07: editing and autofill callbacks go through `safeCall`; a throwing `before*` cancels, internal state is cleared before `after*`; clipboard sites are in batch 5. 20 new tests in `ve-table-state-reconcile.spec.ts`, all failing first. Suite 45 files · 367 tests all pass, eslint clean, tsc 461 → 457. · `fix/audit-batch3b-state-reconcile`
- **2026-10-16** · MOD-04, CLIP-01, CLIP-02, CLIP-03, CLIP-04, CLIP-05 ✅ · INFRA-07, MOD-03 progress · Batch 5 (clipboard codec). `util/clipboard.ts` split into `util/clipboard/{tsv-codec,handlers,index}.ts` (pure move commit first). The codec quotes on `\t`/`\r`/`\n`/`"`, ends every row with `\n`, keeps an empty last row, and reads an unbalanced or unterminated leading quote literally. `onBefore*` return `null` for a missing or stale range and for a paste without text, and the callers bail out before `preventDefault` (a stale top row used to make delete/cut clear rows `0 … bottom`). Ragged pastes use the longest row. All eight clipboard callbacks go through `safeCall`; a throwing `before*` cancels like `false` (keeping `preventDefault`), and `afterPaste` runs after the selection update and the hook. New `ve-table-tsv-codec.spec.ts` and `ve-table-clipboard.spec.ts` (73 tests, 50 failed before the fix). Suite 46 files · 420 tests all pass, eslint clean, tsc 461 → 456. · `fix/audit-batch5-clipboard-codec`
- **2026-10-16** · I18N-01, MOD-11 ✅ · I18N-02 progress · I18N-04 remark closed · ConfigProvider fixed and exported (D3). It renders its slot, always provides a computed merged on top of the outer locale (nearest provider, else the global `VeLocale`), normalizes old English keys, and never mutates user objects. `useLocale` no longer writes to the injected ref. `createI18N`/`useI18N` resolve through `injectLocale()`, used by pagination, the header filter and the ve-table contextmenu. Exported as `VeConfigProvider` and registered by `useVeTable()`. Docs page in en/nb/zh. 11 new tests (written first); the docs demos were checked in headless Chromium. Suite 43 files · 344 tests all pass, eslint clean, tsc 461 (unchanged). · `fix/audit-i18n01-config-provider`
- **2026-10-16** · Progress, Baseline · Merged batches 0, 1 and 2 into `refactor/all`. Only AUDIT.md conflicted; the stale `debouncedBodyCellWidthChange.cancel()` from INFRA-03 was dropped because COL-07 removed that debounce. Recounted Progress: 82 findings (+VS-07, +MENU-06), 21 done, 2 won't fix. Merged tree: 42 files · 333 tests all pass, eslint clean, tsc 461 (new ceiling).
- **2026-10-16** · VS-05, INFRA-04, I18N-04, COL-07 ✅ · D5 · VS-07 added and ✅ · EDIT-03, INS-01 progress · Batch 0 (regressions from the merge): the suite is green again. COL-07 was confirmed in headless Chromium: without `scrollWidth` the real table uses auto layout, so the empty hidden table mis-measured both auto and fixed-width columns. The measurement row is back in the real table, in its own hidden `<tbody>`, and the dead `bodyCellWidthChange` was removed. I18N-04 (D5): the Chinese keys stay, the old English keys are accepted through an alias map with a one-time deprecation warning, `LocaleMessage` is typed precisely and checked with `satisfies`, and the docs and `MIGRATION.md` are updated. 29 stale snapshots were refreshed after checking each diff. The virtual-scroll specs were rewritten for the spacer DOM with a test-only layout stub. New **VS-07** 🔴: the TanStack adapter never called `_willUpdate()`, so virtual tables rendered no rows in real browsers (reproduced in headless Chromium, then fixed). VS-05: body classes are now a prop on every row `<tbody>`, stripe uses a data-index class, and the border-around last-row rule was fixed; verified in tests and Chromium. INFRA-04: a shared, escaped `util/cell-dom.ts` is used at every lookup site. · `fix/audit-batch0-regressions`
- **2026-10-16** · INFRA-01, INFRA-02, INFRA-03, EDIT-02, DD-01, DD-02, MENU-03, MENU-04, FORM-01 ✅ · MENU-06 added · Batch 2 (lifecycle and leaks). `Hooks.addHook` returns a disposer and `triggerHook` isolates errors. The emitter mixin `bus.off`s on unmount. Debounces, timers and document listeners are cancelled in ve-table, selection, editor (`destroyed` → `beforeUnmount`), column-resizer and contextmenu. The dropdown hides synchronously (no 150ms timer) and removes its body container. Contextmenu containers are tracked in a Set. Checkbox-group callbacks unregister. New finding: **MENU-06** 🔴, the ve-table menu is removed right after it opens (jsdom only, needs a browser check). 18 new tests; no new failures (still 40, same set), tsc 461, eslint clean. · `fix/audit-batch2-lifecycle-leaks`
- **2026-10-16** · COL-01, EDIT-01, DD-05, SEL-04, LOAD-01 ✅ · Batch 1 (crash one-liners), each fixed test-first: conflicting fixed-direction menu action no longer crashes and its menu item is disabled; Alt+Enter reads `column.field`; VeSelect arrow toggles; `getColKeysByRangeColKeys` checks `index2`; VeLoading sets the parent before mounting, guards `nextTick` after destroy and ref-counts parent classes (closes the LOAD-01 test gap). New `ve-table-util.spec.ts`. **I18N-01 deferred** until the I18N-04 locale-key work from batch 0 has merged. Suite: same 40 baseline failures, +15 passing tests; eslint clean; tsc 462 (unchanged). Progress and Baseline tables left for the post-merge recount. · `fix/audit-batch1-crash-oneliners`
- **2026-10-16** · VS-01, VS-02 ⛔ · VS-04, I18N-03 ✅ · VS-05, VS-06, COL-07, I18N-04, I18N-05 added · SEL-01, MOD-02 progress · Re-checked the audit after merging `81a1ebb`, `442962c`, `1645d44` and `0c5b732` from remote. VS-01/VS-02: code removed by the TanStack switch. VS-04: rewritten without the timer, with a null check. I18N-03: all langs complete as of `81a1ebb`. New: **VS-05** 🔴 virtual-mode body loses its class (styling, selection, editor, row insert), **COL-07** hidden measurement table may mis-measure widths (unconfirmed), **I18N-04** locale keys renamed to Chinese (breaking, decision pending), plus VS-06 and I18N-05 (🟢). SEL-01: stop-editing on a hidden column is now guarded. MOD-02: step 1 (method modules) done. SEL-03: corrected the function name (`setRangeCellSelectionByBodyIndicator`; the line numbers were right). Re-anchored line numbers for every item in changed files. Baseline: tests now red (40 failures), tsc 615 → 462, eslint clean.

- **2026-10-16** · D1–D4, ROW-03, I18N-01, SEL-02, SEL-08, MOD · Decisions recorded (Composition API, derived row state, fix ConfigProvider, Tab trapped with Esc to leave). Added **SEL-08** (Esc / keyboard-trap behaviour). Moved the doc to `docs-developer/`, which is now tracked in git.
- **2026-10-16** · all · Audit created from 4 parallel reviews; 74 findings + 11 modularity items logged at `a0bfb50`. No code changed.
