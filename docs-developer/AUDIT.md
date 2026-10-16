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
| 🔴 High | 15 | 15 | 0 | 0 |
| 🟠 Medium | 35 | 33 | 0 | 2 |
| 🟢 Low | 30 | 28 | 2 | 0 |
| **Findings** | **80** | **76** | **2** | **2** |
| Modularity (MOD) | 11 | 11 | 0 | 0 |

### Baseline health (update after each batch)

| Check | 2026-10-16 (`a0bfb50`) | 2026-10-16 (`0c5b732`, after merge) |
|---|---|---|
| `vitest run` | 37 files · 272 tests · all pass | **24 files · 40 tests fail** · 231 pass (271 total). 29 are stale snapshots: the body measurement row moved out (`442962c`), and the en-US pagination text changed (`81a1ebb`). 11 are virtual-scroll assertions; see VS-05 and Test gaps. Needs `pnpm install` first, because `@tanstack/virtual-core` is a new dependency. |
| `eslint packages --quiet` | clean | clean |
| `vue-tsc --noEmit` | 615 errors (pre-existing; 160 in `ve-table.tsx`). Must not increase. | 462 errors (16 in `ve-table.tsx`). New ceiling: must not increase. |

---

## Suggested fix order

Each batch is roughly one PR. Within a batch, fix the 🔴 items first.

0. **Regressions from the merge.** Get the test suite green again (refresh the stale snapshots, make the virtual-scroll specs work under jsdom), then VS-05. Settle the I18N-04 decision before anything else touches locale keys. Check COL-07 at runtime.
1. **Crash one-liners.** Small diffs with high value: COL-01, EDIT-01, DD-05, I18N-01, SEL-04, LOAD-01
2. **Lifecycle and leaks.** INFRA-01, INFRA-02, INFRA-03, EDIT-02, DD-01, DD-02, MENU-03, MENU-04, FORM-01
3. **State reconciliation and keyboard.** SEL-01, CLIP-01, SEL-02 + SEL-08 (together), EDIT-04, INFRA-07
4. **Row selection and expand.** MOD-08 first (derived state, D2), then ROW-01 … ROW-05 on top of it
5. **Clipboard codec.** CLIP-02 … CLIP-05 (MOD-04 first makes these trivially unit-testable)
6. **Virtual scroll and render performance.** VS-03, VS-06, RENDER-02, RENDER-03, RENDER-06
7. **Remaining 🟠 / 🟢**
8. **Modularity** (see MOD section; Composition API per D1)

---

## INFRA — cross-cutting infrastructure

- [ ] **INFRA-01** 🔴 `Hooks` has no `removeHook`, so subscriptions leak and dead instances throw
  - **Where:** [common/utils/hooks-manager.ts](../packages/common/utils/hooks-manager.ts). Registered and never removed in `selection/index.tsx:246-290`, `editor/index.tsx:193-208`, `column-resizer/index.tsx:88-95` and `row-insert-indicator/index.tsx:396`.
  - **Trigger:** select a cell, toggle `cellSelectionOption.enable` (or `rowInsertOption.enable`) at runtime, then scroll. The unmounted editor's scroll hook runs `autoResize.init(null)`, and `auto-resize.ts:130` (`el.nodeName`) throws. That aborts `triggerHook`'s `forEach`, so the remaining hooks never run. Each toggle also adds another set of closures.
  - **Fix:** make `addHook` return a disposer and call it in each child's `beforeUnmount`. Isolate errors per callback in `triggerHook`.

- [ ] **INFRA-02** 🔴 🔍 The emitter mixin never unsubscribes, so handlers run once per past mount
  - **Where:** [common/mixins/emitter.ts:30-33](../packages/common/mixins/emitter.ts#L30-L33). `bus.on(key, callback.bind(this))`, and there is no `off` anywhere in the repo.
  - **Trigger:** toggle `showHeader` off and on, then click a sort icon. Both the dead and the live `header/index.tsx` instances handle `SORT_CHANGE`, so the user's `sortOption.sortChange` runs twice, the first time with stale `sortColumns`. That means two fetches, and the stale one can win. `header-checkbox-content` remounts on every columns change (its key includes `columnsOptionResetTime`), so it leaks as well.
  - **Fix:** keep each bound handler and `bus.off` all of them in the mixin's `beforeUnmount`. Long term: MOD-01.

- [ ] **INFRA-03** 🟠 Debounces, timers and rAF are not cancelled on unmount
  - [ ] `ve-table.tsx`: `debouncedBodyCellWidthChange` and `debouncedMeasureCellWidthChange` (created at 858-867) are never cancelled. `unmounted` (1000-1005) destroys the virtualizer and removes the keydown listener, but nothing else. *(Since `442962c`: the rAF timeout, `initVirtualScroll` and `setVirtualPhantomHeight` are gone, and `initTanStackVirtualScroll` null-guards its ref.)*
  - [ ] `selection/index.tsx:1542-1547`: two debounced functions, no `beforeUnmount`.
  - [ ] `column-resizer/index.tsx:169-182, 253-258`: document listeners are not removed on unmount. See also COL-05.
  - (The editor is tracked in EDIT-02, the contextmenu in MENU-03, the dropdown in DD-01.)
  - **Fix:** add a `beforeUnmount` to each, calling `.cancel()` / `cancelAnimationTimeout` / `clearTimeout`, and null-guard `$refs` in async callbacks.

- [ ] **INFRA-04** 🟠 Row and column keys are interpolated unescaped into `querySelector`
  - **Where:** `methods/scrolling.ts:61` (`rowToVisible`), `ve-table.tsx:1989` (`scrollToRowKey`); `selection/index.tsx:1421, 1438, 1452, 1498`; `editor/index.tsx:282`
  - **Trigger:** a rowKey or colKey containing `"` or `\` makes `querySelector` throw a `SyntaxError`, in several places inside a watcher. A key that isn't rendered returns `null`, and code then reads `.offsetTop` and similar on it. (`rowToVisible` and `scrollToRowKey` now null-check; the selection sites still don't.)
  - **Fix:** a shared helper `queryCell(root, rowKey, colKey)` using `CSS.escape` that returns `null` safely, with null guards at the call sites.

- [ ] **INFRA-05** 🔴 Importing the library during SSR crashes
  - **Where:** prop declarations `type: [String, HTMLElement]` in `ve-dropdown/src/index.tsx:112`, `ve-select/src/index.tsx:57`, `ve-pagination/src/index.tsx:185` and `ve-contextmenu/src/index.tsx:53`. Also the `default() { return document.body }` defaults and the contextmenu's `immediate` options watcher.
  - **Trigger:** Nuxt or any SSR import. `HTMLElement` is undefined in Node, so the module throws at import time.
  - **Fix:** `type: [String, Object] as PropType<string | HTMLElement>`. Resolve `document.body` lazily in `mounted`, and do all DOM work in `mounted` or later.

- [ ] **INFRA-06** 🟢 `VeTable` declares no `emits`
  - **Where:** `ve-table.tsx` (e.g. `on-row-insert` in `handleRowInsert`, ~2111)
  - **Effect:** listeners also fall through as attributes onto the root `<div>`, and there is no typing.
  - **Fix:** declare `emits` for every emitted event.

- [ ] **INFRA-07** 🟠 A throwing user callback leaves internal state half-updated
  - **Where:**
    - `afterPaste`: `methods/clipboard.ts:118-140`. The data is mutated, but the selection update and the `CLIPBOARD_CELL_VALUE_CHANGE` hook are skipped.
    - `afterAutofill`: `methods/cell-selection.ts:270-290`. The current/end cell update is skipped, and so is `clearCellSelectionAutofillEndCell` in the `isAutofillStarting` watcher (`ve-table.tsx:817-824`).
    - `beforeCopy`: `methods/clipboard.ts:48-69`. It runs after `preventDefault`, so nothing is copied.
    - `beforeCellValueChange` / `afterCellValueChange`: `methods/editing.ts:45-75`. The editing state is never cleared, every later stop re-throws, and the after-callbacks re-fire.
  - **Fix:** a small `safeCall(fn, ...args)` that logs through `console.error` and continues, plus `try/finally` around internal cleanup. Clear internal state before calling the "after" callbacks.

- [ ] **INFRA-08** 🟠 Optional user callbacks are called without existence guards
  - **Where:**
    - `body/index.tsx:705`: `checkboxOption.selectedRowChange`
    - `body/index.tsx:779`: `radioOption.selectedRowChange`
    - `header/index.tsx:114, 132`: `sortOption.sortChange`, and `sortOption` itself may be undefined
    - `header-th.tsx:344`: `checkboxOption.hideSelectAll` with no `checkboxOption`
    - `body/index.tsx:665`: `checkboxOption` becomes null, or `selectedRowKeys` is unset
  - **Trigger:** e.g. a column with `sortBy` but no `sortOption` throws on click.
  - **Fix:** optional chaining plus `typeof fn === 'function'` checks.

- [ ] **INFRA-09** 🟢 Directive robustness
  - **Where:** `common/directives/clickoutside.ts` registers a handler even when the value isn't a function (it throws on every click), and has no `updated` hook (the callback captured at mount goes stale). `common/directives/events-outside.ts`: `beforeUnmount` calls `events.forEach` without checking `events`.
  - **Fix:** validate the binding value, add `updated`, and guard the unmount.

- [ ] **INFRA-10** 🟢 `resize-event` listener bookkeeping
  - **Where:** `common/utils/resize-event.ts:36-41`. `splice(indexOf(fn), 1)` with `-1` removes the **last** listener. After `disconnect()` the empty array is kept, so a later `addResizeListener` on the same element never observes again.
  - **Fix:** guard `idx > -1`, and delete the entry when the array is empty.

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
    - There is no unmount cleanup (also listed in INFRA-03).
  - **Fix:** use `addEventListener('selectstart', prevent)` and remove it afterwards. In mousemove, `if (e.buttons === 0) end()`; also end on `window` `blur` and on Escape.

- [ ] **COL-06** 🟢 🔍 Fixed-column edge detection compares `field` instead of `key`
  - **Where:** `body/index.tsx:423-462` and `footer-td.tsx` (last-left / first-right shadow classes); `selection/index.tsx:238` (`isFirstNotFixedSelectionCol` compares `col.field` to `leftColKey`). `header-th.tsx` correctly uses `_keys`.
  - **Trigger:** two left-fixed columns without `field` (checkbox plus index) mean neither gets the shadow class. When `key !== field`, the selection's 1px left-border fix never applies.
  - **Fix:** compare by `key` everywhere. Long term: MOD-06.

- [ ] **COL-07** 🟠 Column widths are now measured in a separate hidden table that may not match the real one
  - **Where:** `ve-table.tsx:2427-2468`, added in `442962c`. The old zero-height measurement row inside the real `<tbody>` was replaced by a second, absolutely positioned `<table>` that mirrors only the `<colgroup>`. `measureCellWidthChange` (1047) writes those widths into `colgroups[]._realTimeWidth`.
  - **Why it can diverge:** the real `table.ve-table-content` has `table-layout: fixed; min-width: 100%; border-collapse: separate` (`style/ve-table.less:37-41`). The hidden table has none of that, so it uses auto layout. It is also sized `width: tableStyle.width || '100%'` against whatever its containing block is. Columns with explicit widths should still match. Columns without a width, or a table narrower than its column sum, may not.
  - **Effect if it diverges:** `_realTimeWidth` feeds fixed-column `left`/`right` offsets, selection border geometry and `columnToVisible`, so all of them would be off.
  - **Status:** found by reading the code. **Not yet confirmed at runtime.** First step: in a browser, compare `_realTimeWidth` with `td.getBoundingClientRect().width` for a table that mixes fixed-width and auto-width columns.
  - **Also:** `bodyCellWidthChange` and `debouncedBodyCellWidthChange` (1057, 858) are now dead code, since nothing emits `BODY_CELL_WIDTH_CHANGE` any more. Remove them along with the fix.

---

## SEL — cell selection and keyboard

- [ ] **SEL-01** 🔴 Selection and editing state is not reconciled when columns or rows change
  - **Root cause:** nothing re-validates `cellSelectionData` (`currentCell`, `normalEndCell`), `cellSelectionRangeData` or `editingCell` when `colgroups` or `allRowKeys` change. The `allRowKeys` watcher (`ve-table.tsx:726-755`) only re-checks `currentCell`.
  - **Symptoms:**
    - [ ] 🔍 The selection layer crashes on render: `cornerCellInfo` reads `colgroups[index + 1].fixed` with `index === -1` ([selection/index.tsx:201-204](../packages/ve-table/src/selection/index.tsx#L201-L204)). `getBorders` destructures it before its `isRender` early return. Repro: select a cell, then `hideColumnsByKeys([thatColKey])`.
    - [ ] F2 or typing a letter after the column was hidden throws, because `currentColumn` is undefined (`methods/keyboard.ts:176`, `ve-table.tsx:2042`). *Partly fixed in `442962c`:* stopping an edit on a hidden column no longer throws, because `saveCellWhenStopEditing` now clears the editor when the column is missing (`methods/editing.ts:38-41`).
    - [ ] A stale `normalEndCell` after its row is removed: paste throws (`tableData[-1]`), right-click throws (`isCellInSelectionRange` → `null.includes`, `util/index.ts:807-834`), and copy writes `""` to the clipboard. See CLIP-01.
    - [ ] Editing gets stuck when the edited row is removed: `saveCellWhenStopEditing` has no `else` for a missing row, so it skips `clearEditingCell()` (`methods/editing.ts:29-86`). Copy, paste and Delete all stay disabled.
  - **Fix:** one reconcile watcher on `[colgroups, allRowKeys]` that clears or clamps `currentCell`, `normalEndCell`, `editingCell` and the range whenever their keys disappear. Add defensive `index < 0` guards at the sites above, and make `isCellInSelectionRange` null-safe.

- [ ] **SEL-02** 🔴 🔍 The document `keydown` handler acts on keys from anywhere on the page
  - **Where:** `ve-table.tsx:990` (listener), [methods/keyboard.ts:12](../packages/ve-table/src/methods/keyboard.ts#L12) (`dealKeydownEvent`, no target check). `preventDefault` calls are at keyboard.ts:43 (Tab), 136 (Enter), 147 (Space) and 160 (Backspace).
  - **Trigger:** while a cell is selected, type into any other input on the page. A typical case: a dialog opened from the contextmenu's `afterMenuClick` (contextmenu clicks deliberately keep the selection, `tableClickOutside` → `isContextmenuPanelClicked`, ve-table.tsx:1302). Space and Backspace are swallowed, arrows and Enter move the table selection, and letters start editing the cell. Tab is always prevented, so focus can never leave the table.
  - **Fix:** `if (!this.$el.contains(event.target)) return` at the top. Tab stays trapped inside the table (D4). The way out is Esc, which is specified in SEL-08. Ship the two together.

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

- [ ] **SEL-08** 🟠 No keyboard way to leave the table: Tab is trapped and there is no Esc handling (decision D4)
  - **Where:** `methods/keyboard.ts:28-45` (`KEY_CODES.TAB` always calls `preventDefault`). There is no `ESC` case anywhere in `dealKeydownEvent`, and the table root has no `tabindex`, so it can't hold focus itself.
  - **Why it matters:** a keyboard-only user who enters cell navigation can never Tab out (WCAG 2.1.2 "No Keyboard Trap", level A).
  - **Target behaviour (D4):**
    1. **Cell navigation mode** (a cell is active): Tab / Shift+Tab move between cells, and stay trapped as they do today.
    2. **Esc while editing:** closes the editor and returns to cell navigation on the same cell.
       > ❓ Should this *discard* the uncommitted value (Excel / Google Sheets convention) or *commit* it? Confirm when implementing.
    3. **Esc in cell navigation (not editing):** leaves cell navigation. Focus moves to the table root (`tabindex="0"`, with a visible `:focus-visible` ring). The cell keyboard handling goes dormant, and the active cell can stay visible but de-emphasised.
    4. **Table root focused:** Tab / Shift+Tab are **not** intercepted, so the browser moves focus to the next or previous focusable element on the page.
    5. **Re-entering:** Enter (and the arrow keys) on the focused table root resume cell navigation at the last active cell, or the first cell if there is none. Clicking a cell also resumes. Tabbing into the table lands on the root, not inside a cell.
  - **Implementation notes:**
    - Add an explicit mode flag (`keyboardMode: 'cell' | 'table'`) instead of inferring the mode from `currentCell`.
    - SEL-02's `$el.contains(target)` check alone is not enough, because in table mode the key target *is* inside `$el`. The handler must check the mode.
    - The edit textarea (`editor/index.tsx:488`, `tabindex: -1`) holds focus during cell navigation, so Esc → table mode must explicitly call `$el.focus()`.
    - Optional a11y: `role="grid"` on the root, and `aria-describedby` hint text ("Enter to navigate cells, Esc to leave"), localised through `ve-locale`.
  - **Tests:** Tab is prevented in cell mode; Esc while editing closes the editor; Esc in cell mode focuses the root and Tab is not prevented; Enter on the root resumes at the last cell; clicking a cell resumes.

---

## CLIP — clipboard

- [ ] **CLIP-01** 🔴 Clipboard handlers continue with `-1` indices, after `preventDefault`
  - **Where:** `util/clipboard.ts:230` (`startRowIndex = -1`), `:244` (`colgroups[-1].key`), `:282` (`Object.assign(tableData[-1], …)`); `methods/clipboard.ts:48` (`editorCopy` calls `preventDefault()` before validating; same in `editorPaste` :97 and `editorCut` :172).
  - **Trigger:** a stale range (SEL-01), or the edit textarea still focused after the selection is cleared. Paste throws a TypeError, and copy overwrites the user's clipboard with `""`.
  - **Fix:** in `onBeforePaste`, `onBeforeCopy`, `onBeforeCut` and `onBeforeDelete`, return `null` if any index is `-1`. Callers bail out **before** `preventDefault`.

- [ ] **CLIP-02** 🟠 Pasting a non-text clipboard (an image or file) wipes the selected cell
  - **Where:** `util/clipboard.ts:13-14, 218`. `getData('text/plain')` returns `''`, `decodeSpreadsheetStr('')` returns `[['']]`, and `editorPaste` (`methods/clipboard.ts:118`) writes `''`.
  - **Fix:** `if (!pastedData) return null`.

- [ ] **CLIP-03** 🟠 Copy/paste does not round-trip
  - **Where:** `clipboard.ts:115-121` (encode), `85-88`, `131` (decode)
  - **Issues:**
    - The encoder quotes only on `\n`, so values with `\t` or `\r` split into extra cells or rows.
    - Leading quotes are lost: `"a"` pastes back as `a`.
    - No trailing newline is written, but the decoder always drops a final empty row, so copying A1:A2 with A2 empty pastes only A1.
  - **Fix:** quote when `/[\t\r\n"]/.test(val)`, and end every row with `\n` (as Excel does). Add round-trip unit tests (MOD-04).

- [ ] **CLIP-04** 🟢 An unbalanced leading quote swallows the rest of the clipboard
  - **Where:** `clipboard.ts:44-64`. Text like `"12 inch\tfoo\nbar` all lands in one cell.
  - **Fix:** if the closing quote is never found, fall back to treating the quote as a literal.

- [ ] **CLIP-05** 🟢 A ragged paste drops columns
  - **Where:** `clipboard.ts:226-229`. The column count comes from row 0 only, so `"a\nb\tc"` drops `c`.
  - **Fix:** use the maximum row length.

- [ ] **CLIP-06** 🟢 Contextmenu copy and cut use the deprecated `execCommand` and fail silently
  - **Where:** `methods/contextmenu.ts:122, 127, 227, 232`. The return value is ignored, and there is no contextmenu paste.
  - **Fix:** `navigator.clipboard` with an `execCommand` fallback; handle the rejection (permission or insecure context) and surface it through a callback.

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

- [ ] **EDIT-02** 🟠 🔍 Editor lifecycle: the Vue 2 `destroyed()` hook never runs
  - **Where:** [editor/index.tsx:465](../packages/ve-table/src/editor/index.tsx#L465) (`destroyed`, the only Vue 2 lifecycle hook left in the repo), `:450-460` (uncancelled lodash debounces), `:224` (uncancelled `setTimeout`).
  - **Effect:** `autoResize` is never unobserved. After unmount the debounces run `setTextareaPosition` against null refs and throw.
  - **Fix:** `beforeUnmount() { debounceSetTextareaPosition.cancel(); debounceSetCellEl.cancel(); clearTimeout(focusTimer); textareaUnObserve() }`.

- [ ] **EDIT-03** 🟠 The editor stays positioned over the previous cell
  - **Where:** `editor/index.tsx:275-290` (`setCellEl` only assigns when a cell is found).
  - **Trigger:** virtual scroll, or a target cell that isn't rendered. The textarea sits over the old cell while edits go to the new one. Since `442962c` this happens on **every** cell in virtual-scroll mode, because the `tbody.ve-table-body` selector never matches there (see VS-05).
  - **Fix:** `else { this.cellEl = null; this.overflowViewport = true }`.

- [ ] **EDIT-04** 🟢 `startEditingCell` while another cell is editing silently drops that value
  - **Where:** `ve-table.tsx:2008-2086`. The comment (2030-2032) says it closes the previous cell, but the code doesn't. An unknown rowKey also throws (`currentRow` is unchecked, ~2024-2066).
  - **Fix:** call `STOP_EDITING_CELL` first when `isCellEditing`, and guard `!currentRow || !currentColumn`.

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

- [ ] **VS-03** 🟠 Every cell edit discards all measured row heights *(still true after the TanStack switch)*
  - **Where:** `ve-table.tsx:706-725`. The `tableData` watcher is still `deep: true`, and on every change it calls `this._vs.measure()`, which clears TanStack's whole size cache.
  - **Trigger:** variable-height rows with virtual scroll, then edit, paste or autofill a cell. Every row falls back to `estimateSize` until it is re-measured, so the spacer heights and the scroll offset jump.
  - **Fix:** drop `deep: true`. Call `setOptions({ count, getItemKey })` only when the length or row keys change, and let TanStack's per-element `ResizeObserver` (`measureElement`) pick up the height change of an edited row. Sizes are cached by `getItemKey`, so they survive reordering.

- [x] ✅ 2026-10-16 · `442962c` **VS-04** 🟢 `scrollToRowKey` timer and null handling
  - **Where (at `a0bfb50`):** `ve-table.tsx:3735-3747`. The 200ms `setTimeout` was never stored or cleared, and an unrendered key gave `rowEl.offsetTop` on `null`.
  - **Resolved by the rewrite** (`ve-table.tsx:1970-2000`): the timer is gone, virtual mode uses `_vs.scrollToIndex`, and the non-virtual path null-checks the row. Verified by reading the code only; there is no test for it.
  - **Residual (not tracked separately):** in non-virtual mode an unknown key now scrolls to the top (`scrollTop = 0`) instead of doing nothing. (Escaping: INFRA-04.)

- [ ] **VS-05** 🔴 🔍 In virtual-scroll mode the body loses its `ve-table-body` class, which breaks styling, selection, the editor and row insert
  - **Where:** [body/index.tsx:848-897](../packages/ve-table/src/body/index.tsx#L848-L897), added in `442962c`. The virtual path returns a **fragment** of `<tbody>` elements. `ve-table.tsx:2190` passes `class: [clsName('body'), this.tableBodyClass]` to `<Body>`, but Vue can't fall attributes through to a fragment root, so the class is dropped (a dev-mode warning; silent in production). None of the generated `<tbody>` elements gets `ve-table-body`, `ve-table-stripe`, `ve-table-row-hover` or `ve-table-row-highlight`.
  - **Effects:**
    - **Styling:** every rule under `tbody.ve-table-body` (`style/ve-table.less:161` onwards) stops applying: cell padding, background, font size, row height, operation-column and indicator colours, stripe, hover and highlight. Stripe would also be wrong even with the class, because each row is the first child of its own `<tbody>`, so `tr:nth-child(2n + 1)` matches every row.
    - **Selection:** `selection/index.tsx:1421, 1438, 1452, 1498` look up cells with `tbody.ve-table-body …` and find nothing, so the selection borders don't render.
    - **Editor:** `editor/index.tsx:282` uses the same selector, so the textarea is never positioned (EDIT-03).
    - **Row insert:** `row-insert-indicator/index.tsx:183` takes `tableEl.querySelector('tbody')`. That is the top spacer `<tbody>` or a single row, so at most one row is ever considered.
  - **Status:** confirmed by reading the code, not reproduced in a browser. The jsdom specs can't show it, because they render 0 virtual rows (see Test gaps).
  - **Fix:** give every generated row `<tbody>` the body classes explicitly (computed in `ve-table.tsx`, passed as a prop rather than relying on fall-through). Change the cell lookups to a selector that works in both modes (e.g. `.ve-table-body tr[row-key=…]`, or a shared `queryCell` helper, see INFRA-04). Make stripe use a row-index class instead of `nth-child`. In the row-insert indicator, scan `tr.ve-table-body-tr` across the whole table.

- [ ] **VS-06** 🟢 TanStack integration leftovers
  - `_vs` and `measureColsWidths` are declared in `data()` (`ve-table.tsx:376-381`), so Vue makes the virtualizer adapter and the `Map` deeply reactive, despite the "non-reactive, managed manually" comment at 868-869. Use `markRaw`, or assign them in `created` without declaring them in `data`.
  - `virtualScrollOption.scrolling`, `minRowHeight` and `bufferScale` are read once in `initTanStackVirtualScroll` (`ve-table.tsx:1222-1251`). Later changes are never pushed to `setOptions`, although `virtual-scroll.ts:189-241` supports it.
  - No `scrollMargin` is passed, so TanStack treats row 0 as starting at `scrollTop = 0` even though the sticky header sits above it. The visible range is off by the header height; overscan (≥ 3 rows) hides this in most cases.
  - `actualRenderTableData` is `[]` until the virtualizer exists (created in `$nextTick` after mount), so the first render of a virtual table has no rows.
  - `rowInsertIndicatorProps` passes `virtualScrollPositions: []` (`ve-table.tsx:674`) only for compatibility. Remove the prop from `row-insert-indicator` together with INS-01.

---

## ROW — row checkbox, radio and expand

- [ ] **ROW-01** 🔴 🔍 `defaultExpandAllRows` aliases and then mutates the table's `allRowKeys`
  - **Where:** [body/index.tsx:582-584](../packages/ve-table/src/body/index.tsx#L582-L584) (`this.internalExpandRowkeys = allRowKeys`, no copy), `:494-499` (`splice`/`push` in place).
  - **Trigger:** `defaultExpandAllRows: true`, then click an expand icon. The row key is removed from the table's `allRowKeys`, so keyboard navigation skips that row and select-all and row-insert get the wrong keys.
  - **Fix:** `allRowKeys.slice()`, and make `expandRowChange` build new arrays.

- [ ] **ROW-02** 🔴 🔍 With `defaultExpandAllRows`, rows can never be collapsed
  - **Where:** [body/expand-tr.tsx:67-68](../packages/ve-table/src/body/expand-tr.tsx#L67-L68). It returns `true` whenever the option is set and ignores `expandedRowkeys`, including controlled ones. The icon rotates but the row stays open.
  - **Fix:** delete that branch, since `initInternalExpandRowKeys` already seeds the keys.

- [ ] **ROW-03** 🔴 Non-deep watchers miss in-place array mutation (a Vue 2 assumption)
  - **Where:** `body/index.tsx:354` (`expandOption.expandedRowKeys`), `:367` (`checkboxOption.selectedRowKeys`), `:373` (`internalCheckboxSelectedRowKeys`); `body/body-checkbox-content.tsx:66`
  - **Trigger:** the official demos mutate in place: `row-checkbox/selected-control.md:120-128`, `pagination/checkbox.md:104-108` and `expand-control.md:125`. Checkboxes and select-all don't update. A controlled expand goes stale, and the next click collapses unexpectedly.
  - **Fix (D2, proper fix):** derive the state instead of mirroring it: `isSelected = computed(() => selectedKeySet.value.has(rowKey))`, built on the MOD-08 composables. Remove the `internal*RowKeys` mirror copies and the non-deep watchers. Don't use `deep: true` as a stopgap. In-place mutation of the user's arrays must keep working, because the official demos rely on it.

- [ ] **ROW-04** 🟠 The header select-all state goes stale
  - **Where:** `body/index.tsx:373-378` (`sendToCheckboxAll` runs only on selection change), `header-checkbox-content.tsx:21` (starts at `isSelected = false` after a remount).
  - **Trigger:** select all, then add a row, and the header still shows checked. Change the columns, and the header shows unchecked while every row is selected.
  - **Fix:** watch `[isCheckboxSelectedAll, isCheckboxIndeterminate]`, or pass the state down as props.

- [ ] **ROW-05** 🟠 The select-all math compares counts instead of sets
  - **Where:** `body/index.tsx:313-334`
  - **Trigger:** all rows disabled and none selected gives `0 + N === N`, so the header shows checked. Keys from other pages, or disabled keys that are not in the data, inflate the count.
  - **Fix:** `all.length && all.some(k => !disabled.has(k)) && all.every(k => sel.has(k) || disabled.has(k))`.

- [ ] **ROW-06** 🟢 With expand `trigger: 'row'`, an icon click dispatches `BODY_CELL_CLICK` twice
  - **Where:** `expand-tr-icon.tsx:68`. The click bubbles into the td.
  - **Fix:** `stopPropagation` on the icon click, or de-duplicate in the handler.

---

## INS — row insert indicator

- [ ] **INS-01** 🟠 The row insert indicator inserts at the wrong index
  - **Where:** `row-insert-indicator/index.tsx:180-181` (the header area always returns index `0`), `:231` (the virtual-scroll offset is skipped when `closestIndex === 0`). Since `442962c` the virtual case is broken further: only the first `<tbody>` is scanned (VS-05).
  - **Trigger:** a sticky header with the table scrolled to row 300: the line is drawn above row 300, but the insert goes to row 0. With virtual scroll, inserting at the first rendered row goes to the wrong index.
  - **Fix:** always use `start + closestIndex`, and map the header area to the first *visible* row.

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

- [ ] **RENDER-02** 🟠 Unkeyed fragments around each body row cause mass remounts *(non-virtual path only since `442962c`)*
  - **Where:** `body/index.tsx:899-911`. Each row returns `[<BodyTr key=…/>, expandRow]`, so Vue builds unkeyed Fragments and matches rows by position. *The virtual path (848-897) now wraps each row in a keyed `<tbody>`, and the placeholder branch that dropped expand rows is gone.*
  - **Trigger:** sorting or inserting at the top of a non-virtual table. Every shifted row remounts, including its tds and checkboxes.
  - **Fix:** a flat array with keys: `<BodyTr key={k}/>`, plus `<ExpandTr key={`${k}__expand`}/>`.

- [ ] **RENDER-03** 🟠 One deep watcher per cell on the whole `rowData`
  - **Where:** `body-td.tsx:172-182`. That is rows × columns deep traversals just to copy one field, and it goes stale if `column.field` changes.
  - **Fix:** `computed: { rawCellValue() { return this.rowData[this.column.field] } }`.

- [ ] **RENDER-04** 🟢 A cell span with only one dimension makes the cell disappear
  - **Where:** `body-td.tsx:413-416, 581`; `footer-td.tsx:271-274, 321`. `bodyCellSpan` returning `{ colspan: 2 }` leaves `rowspan` undefined.
  - **Fix:** `rowspan ?? 1` and `colspan ?? 1`.

- [ ] **RENDER-05** 🟠 🔍 `getTextContentOfVNode` always returns `''` for a VNode
  - **Where:** [common/utils/index.ts:87-88](../packages/common/utils/index.ts#L87-L88). It returns early whenever the VNode has children, so the recursion below is unreachable.
  - **Effect:** `column.ellipsis.showTitle` gives an empty `title` for any `renderBodyCell` that returns a VNode (`body-td.tsx:351`).
  - **Fix:** remove the early return, and handle string children, arrays and the `default` slot function.

- [ ] **RENDER-06** 🟠 🔍 A scrollbar width of `0` is never cached, so it is re-measured on every render
  - **Where:** [ve-table.tsx:1168-1182](../packages/ve-table/src/ve-table.tsx#L1168-L1182) (`if (scrollBarWidth)`). Callers ~479 and ~2354.
  - **Trigger:** overlay scrollbars (the macOS default, mobile). Every render and every `tableContainerStyle` evaluation appends a probe div and forces layout twice, including on each virtual-scroll re-render (every `_vsVersion` bump).
  - **Fix:** a `null` sentinel for "not measured".

---

## MENU — contextmenu (table menus and the `ve-contextmenu` component)

- [ ] **MENU-01** 🟢 Commented-out contextmenu types give items `type: undefined`
  - **Where:** `ve-table/src/util/constant.ts:254, 258` (`REMOVE_COLUMN`, `HIDE_COLUMN`); used at `util/index.ts:318, 326, 383`.
  - **Effect:** a user menu item with no `type` matches "removeColumn", and a user `type: 'REMOVE_COLUMN'` renders with no label.
  - **Fix:** restore the constants (implementing them is optional), or remove them from the collections.

- [ ] **MENU-02** 🟠 Changing `eventTarget` leaves a listener on the old element
  - **Where:** `ve-contextmenu/src/index.tsx:109-115, 458-474`. The old listener is never removed, and a string selector is resolved by an `immediate` watcher before mount, so it gets `null` and is never retried.
  - **Fix:** call `removeContextmenuEvent()` before re-registering, and resolve strings in `mounted`.

- [ ] **MENU-03** 🟠 The debounced hover handler fires after unmount
  - **Where:** `ve-contextmenu/src/index.tsx:120-133, 217-226` (the 300ms `debounceCreatePanelByHover` is never cancelled).
  - **Trigger:** right-click, hover a parent item, then change route within 300ms. A new body div is created, then `appendChild(undefined)` throws a TypeError.
  - **Fix:** in `beforeUnmount`, `debounceCreatePanelByHover.cancel()` and set `isPanelsEmptyed = true`.

- [ ] **MENU-04** 🟠 Submenu containers leak on every right-click
  - **Where:** `ve-contextmenu/src/index.tsx:411-447`. `removeOrEmptyPanels(true)` removes only containers whose IDs are in the current `panelOptions`. ve-table replaces `options` on every right-click (`methods/contextmenu.ts:39, 53`), which regenerates the IDs.
  - **Fix:** keep a `Set` of the created container elements, and remove them all when the options change and on unmount (or MOD-09).

- [ ] **MENU-05** 🟢 Submenu positioning
  - **Where:** `ve-contextmenu/src/index.tsx:366, 372`. When opening to the left it uses `parentPanelLeft - parentPanelWidth` instead of `currentPanelWidth`. The viewport-relative `getViewportOffset().left` is used as a body coordinate, so it is off by `scrollX`. Nothing clamps a panel that is larger than the viewport.
  - **Fix:** use `currentPanelWidth`, add the scroll offsets, and clamp to the viewport.

---

## DD — dropdown and select

- [ ] **DD-01** 🔴 🔍 A hide/show race through an uncancelled 150ms timer
  - **Where:** [ve-dropdown/src/index.tsx:306-319](../packages/ve-dropdown/src/index.tsx#L306-L319). `visible-change(false)` is emitted immediately, but `internalVisible = false` and the panel clear happen 150ms later. The `FIXME` is already there.
  - **Trigger:**
    - Uncontrolled: a second click within 150ms sees "visible" and hides again, so the click is lost.
    - Controlled (ve-table filters): `visible` goes true → false → true within 150ms, and the old timer empties the freshly shown panel.
  - **Fix:** keep `hideTimer`, `clearTimeout` it in `showDropDown` and `beforeUnmount`, and set `internalVisible` synchronously. If a fade is wanted, it must be interruptible: cancel any in-flight animation and start from the current visual state, with no queued timers.

- [ ] **DD-02** 🔴 🔍 The dropdown leaks its body container on every unmount
  - **Where:** [ve-dropdown/src/index.tsx:337-343](../packages/ve-dropdown/src/index.tsx#L337-L343) (only `innerHTML = ''`), `227-228`, `516-535`
  - **Trigger:** every VeSelect (one per VePagination) and every ve-table filter column leaves one div in `body` per mount, so route changes grow the DOM without bound. Unmounting before the `nextTick` in `addRootElementToElement` creates the div after unmount.
  - **Fix:** `rootEl.remove()` in `beforeUnmount`. Better: `<Teleport>` (MOD-09).

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

- [ ] **LOAD-01** 🔴 🔍 The `lock` option never works, and `destroy()` leaves classes on the parent
  - **Where:** [ve-loading/src/index.ts:93-100](../packages/ve-loading/src/index.ts#L93-L100). `options.parent__` is set **after** `createInstance(options)` has mounted, and root props are not reactive, so `instance.parent__` stays `null`.
  - **Effect:** `show()`/`close()` never toggle `ve-loading-parent-lock`, and `destroy()` never removes `ve-loading-parent-relative`, so the target (or `body`) keeps `position: relative !important`. `show(); destroy()` in the same tick would also re-add the class after destroy. The existing "lock" test only checks `.ve-loading-fixed`, which is why this isn't caught.
  - **Fix:** compute `parent` before `createInstance` and pass it in. Check that the instance is still alive inside the `nextTick` callbacks. Count references on the parent class when several loaders share one target.

---

## FORM — checkbox, checkbox-group and radio

- [ ] **FORM-01** 🟠 Checkbox-group callbacks are never unregistered
  - **Where:** `ve-checkbox-group/src/uses.ts:219-223` (`callbacks.push(cb)`), `ve-checkbox/src/index.tsx:34`
  - **Trigger:** `v-for` checkboxes whose options change. Dead checkboxes keep receiving updates.
  - **Fix:** `onCheckboxGroupUpdate` returns an unregister function, called in `onBeforeUnmount`.

- [ ] **FORM-02** 🟢 Disabled and uncontrolled checkbox/radio state
  - **Where:** `ve-checkbox/src/index.tsx:113-126`, `ve-radio/src/index.tsx:83-86`. A disabled control ignores model changes, so it goes stale when the group value changes. An uncontrolled one with no `v-model` never shows the `*-checked` class.
  - **Fix:** make `disabled` block user input only, not model sync, and keep local state when uncontrolled.

- [ ] **FORM-03** 🟢 Checkbox-group leftovers
  - **Where:** `ve-checkbox-group/src`. `expose: ['modelValue', 'updateModel']`, but `updateModel` doesn't exist, and `provide() { aaa }` is debug code.

---

## I18N — locale and ConfigProvider

- [ ] **I18N-01** 🟠 🔍 ConfigProvider renders nothing, and the locale plumbing is disconnected
  - **Where:** [common/comps/config-provider/index.ts:16](../packages/common/comps/config-provider/index.ts#L16) (`slots.defaults?.()`, a typo for `default`). Also `ve-locale/index.ts:49-58`: `useLocale` assigns to an injected read-only computed, and `update()` merges into the user's locale object. Neither is wired to `createI18N`, which reads only the global singleton.
  - **Decision D3: fix it and export it.**
    - Fix the slot typo.
    - Make the provided locale reactive to prop changes: always provide a computed, and fall back to the global locale.
    - `useLocale` must not write to the injected computed or mutate user objects.
    - Wire `createI18N` / every component's locale lookup through the injected context (MOD-11).
    - Export it from `packages/vue/src/index.ts`, add a docs page and tests (nested providers, switching locale at runtime).

- [ ] **I18N-02** 🟢 The locale singleton is deep-merged in place and shared across apps
  - **Where:** `ve-locale/index.ts:22-35`. A second app's `use({ locale })` switches the first app's language.
  - **Fix:** `merge({}, defaultLang, lang)` into a fresh object, and a per-app provide (MOD-11).

- [x] ✅ 2026-10-16 · `81a1ebb` **I18N-03** 🟢 Missing pagination aria keys in seven languages
  - **Where (at `a0bfb50`):** `common/locale/lang/{fr-FR,ru-RU,ko-KR,pt-BR,zh-TW,af-ZA,zu-ZA}.ts`. They lacked `prevPage`, `nextPage`, `paginationLabel`, `pageLabel`, `currentPageLabel`, `jumpToLabel` and `pageSizeLabel`, so those users got **Chinese** aria-labels.
  - **Resolved:** all ten lang files now define all 13 pagination keys and all table keys (under the renamed keys, see I18N-04). `prev5`/`next5` also became functions of `pagingCount` everywhere. Verified by grepping every lang file for the full key set.
  - **Not done:** the type-level shape check. `LocaleMessage` is still `Record<string, Record<string, …>>` (`common/locale/types.d.ts`), so a missing or misspelled key is still not a compile error. That check now belongs with I18N-04.

- [ ] **I18N-04** 🟠 🔍 Locale message keys were renamed to Chinese, which silently breaks user locale overrides
  - **Where:** `81a1ebb` re-keyed every lang file and every lookup: `pagination` → `分页`, `table` → `表格`, `goto` → `前往`, `cut` → `剪切`, `confirmFilter` → `确认筛选`, and so on (`ve-pagination/src/util/constant.ts:4`, `ve-table/src/util/constant.ts:4`, `ve-pagination/src/{index,pager}.tsx`, `ve-table/src/util/index.ts:302-388`, `header/header-filter-content.tsx:71-72`). A few English strings changed as well, e.g. `confirmFilter` "Confirm" → `确认筛选` "Filter", and "Remove $1 row" → "Delete $1 row(s)".
  - **Effect:** this is a breaking change to the public locale format. A custom language object, or `VeLocale.update({ pagination: { goto: '…' } })`, written against the documented keys now merges into an unused `pagination` section and is silently ignored: no error, no warning. The UI falls back to the built-in language (zh-CN by default).
  - **Still on the old keys:** the docs `docs/src/docs/{en,nb,zh}/locale.md` and `docs/src/docs/{en,nb,zh}/ve-locale/cover-lang.md` (the "cover lang" demo is now a no-op), and the test `ve-locale/__tests__/ve-locale.spec.tsx:51`.
  - **Decision needed (open, see Decisions):** revert to the English keys, **or** keep the Chinese keys and ship a migration (accept the old keys through an alias map that logs a deprecation warning, update the docs, note it in the changelog). Either way, type `LocaleMessage` precisely so that missing and unknown keys fail `vue-tsc`.

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
  - `autofill/cell-autofill.ts`
  - `contextmenu/options.ts`
  - `core.ts`: `clsName`, `getRowKey`, `getEmitEventName` …
- [ ] **MOD-04** Split `clipboard.ts` into `tsv-codec.ts` (pure encode/decode with round-trip unit tests) and `handlers.ts` (`onBefore*`/`onAfter*`). [CLIP-02 … CLIP-05]
- [ ] **MOD-05** Split `selection/index.tsx` into:
  - `geometry.ts`: pure rect → border boxes and autofill direction
  - `SelectionBorders.tsx`
  - `cell-dom.ts`: escaped lookups
  - `useSelectionPositions.ts`: element tracking, hook registration and removal, debounces, unmount cleanup

  [FILL-01, SEL-07, INFRA-04]
- [ ] **MOD-06** `useFixedColumns(colgroups)`: one `Map<colKey, { style, class }>` computed at table level and shared by header, body and footer, replacing three divergent implementations. [COL-06]
- [ ] **MOD-07** `bindCustomEvents(customEvents, extra)`: replace the nine forwarding methods (`cellClick` … `rowClick` …) copied across six components.
- [ ] **MOD-08** `useRowSelection` / `useRowExpand` composables that return derived state as props, and remove the local `isSelected` mirrors in the checkbox and radio content components. [ROW-03, ROW-04, ROW-05]
- [ ] **MOD-09** A `usePopper(triggerRef, { appendTo, placement })` built on `<Teleport>`, shared by dropdown and contextmenu, so neither moves Vue-owned DOM by hand any more. [DD-01, DD-02, MENU-03, MENU-04, MENU-05]
- [ ] **MOD-10** Pagination subcomponents (Total, Prev, Next, Sizer, Jumper): use props or an injected context instead of reaching into `this.$parent`.
- [ ] **MOD-11** A single `useLocale()` that falls back to the global singleton, merges without mutating, and is used by `createI18N`. [I18N-01, I18N-02]

---

## Decisions

Record new decisions here with the next free `D` number and the date. Reference them from items as (Dn).

| ID | Date | Question | Decision |
|---|---|---|---|
| D1 | 2026-10-16 | Options API or Composition API for the refactor? | **Composition API.** Feature composables, components move to `setup()` (MOD section). |
| D2 | 2026-10-16 | ROW-03: `deep: true` or derived state? | **Proper fix:** derived state through MOD-08; no `deep: true` stopgap. |
| D3 | 2026-10-16 | ConfigProvider: finish it or delete it? | **Fix it** and export it (I18N-01). |
| D4 | 2026-10-16 | Tab inside the table: trapped, or leaves at the edges? | **Stays trapped.** Esc leaves cell navigation and focuses the table itself, and from there Tab moves to the next element on the page (SEL-08). |

### Still open

- **SEL-08:** should Esc while editing discard or commit the uncommitted value? (Spreadsheet convention is to discard.)
- **I18N-04:** locale keys. Revert to the English keys, or keep the Chinese keys from `81a1ebb` and ship a deprecation alias for the old ones? Either way it is a public-API change, so it needs a changelog entry.

---

## Test gaps noticed during the audit

- The VeLoading "lock" test asserts only `.ve-loading-fixed` (LOAD-01).
- `ve-table-cell-selection.spec.ts:599-604` asserts buggy behaviour (SEL-03).
- No tests for remount or toggle scenarios (toggle `cellSelectionOption.enable`, `showHeader`, `rowInsertOption.enable`), which would catch INFRA-01 and INFRA-02.
- No clipboard codec round-trip tests (CLIP-03 … CLIP-05).
- No virtual-scroll tests with variable row heights plus edits (VS-03).
- **The suite has been red since `442962c` (40 failures).** 29 snapshots were never refreshed after the measurement row moved out of `<tbody>`, plus the en-US pagination text changes. The 11 virtual-scroll specs fail because jsdom has no layout: the scroll container measures 0 px, so TanStack yields no items and nothing renders. One (`dynamically turns virtual scrolling on`, :158) also still asserts the removed `.ve-table-virtual-phantom`. Fix: pass TanStack's `initialRect` (or mock `getBoundingClientRect` / `offsetHeight` in the spec), then rewrite the assertions for the spacer-based DOM.
- No test checks that virtual-scroll rows carry the body classes, or that selection and editor cell lookups work in virtual mode (VS-05).
- `ve-locale.spec.tsx:51` still overrides the old `pagination.goto` key, so it passes without testing anything (I18N-04).
- Still open from `REFACTOR_PLAN.md`: `ve-table-row-insert.spec.ts`, `ve-table-clipboard.spec.ts`, `ve-table-autofill.spec.ts`.

---

## Changelog

Newest first. One line per change: date · IDs · what happened · commit/PR.

- **2026-10-16** · VS-01, VS-02 ⛔ · VS-04, I18N-03 ✅ · VS-05, VS-06, COL-07, I18N-04, I18N-05 added · SEL-01, MOD-02 progress · Re-checked the audit after merging `81a1ebb`, `442962c`, `1645d44` and `0c5b732` from remote. VS-01/VS-02: code removed by the TanStack switch. VS-04: rewritten without the timer, with a null check. I18N-03: all langs complete as of `81a1ebb`. New: **VS-05** 🔴 virtual-mode body loses its class (styling, selection, editor, row insert), **COL-07** hidden measurement table may mis-measure widths (unconfirmed), **I18N-04** locale keys renamed to Chinese (breaking, decision pending), plus VS-06 and I18N-05 (🟢). SEL-01: stop-editing on a hidden column is now guarded. MOD-02: step 1 (method modules) done. SEL-03: corrected the function name (`setRangeCellSelectionByBodyIndicator`; the line numbers were right). Re-anchored line numbers for every item in changed files. Baseline: tests now red (40 failures), tsc 615 → 462, eslint clean.

- **2026-10-16** · D1–D4, ROW-03, I18N-01, SEL-02, SEL-08, MOD · Decisions recorded (Composition API, derived row state, fix ConfigProvider, Tab trapped with Esc to leave). Added **SEL-08** (Esc / keyboard-trap behaviour). Moved the doc to `docs-developer/`, which is now tracked in git.
- **2026-10-16** · all · Audit created from 4 parallel reviews; 74 findings + 11 modularity items logged at `a0bfb50`. No code changed.
