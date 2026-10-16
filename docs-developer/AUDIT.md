# Code Audit — vue3-easytable

> **Living document.** This is the single to-do list for the repo-wide audit: race conditions, bugs and
> edge cases, error handling, and modularity. Update it whenever an item moves, and commit the update
> together with the fix it describes.

- **Started:** 2026-10-16, on branch `refactor/all` @ `a0bfb50`
- **Scope:** everything under `packages/` (excluding `docs/`)
- **Method:** four parallel read-only reviews (ve-table core · selection/clipboard/util · table subcomponents · common + other components), then triage. Duplicates were merged across reviews. Every item was confirmed by reading the code. Items marked 🔍 were also re-checked line-by-line during triage. **None have been reproduced at runtime yet**, so start every fix with a failing test.
- **Line numbers** are as of `a0bfb50` and will drift. Search for the quoted symbol if a line no longer matches.

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
| 🔴 High | 14 | 14 | 0 | 0 |
| 🟠 Medium | 33 | 33 | 0 | 0 |
| 🟢 Low | 28 | 28 | 0 | 0 |
| **Findings** | **75** | **75** | **0** | **0** |
| Modularity (MOD) | 11 | 11 | 0 | 0 |

### Baseline health (update after each batch)

| Check | 2026-10-16 (`a0bfb50`) |
|---|---|
| `vitest run` | 37 files · 272 tests · all pass |
| `eslint packages --quiet` | clean |
| `vue-tsc --noEmit` | 615 errors (pre-existing; 160 in `ve-table.tsx`). Must not increase. |

---

## Suggested fix order

Each batch is roughly one PR. Within a batch, fix the 🔴 items first.

1. **Crash one-liners.** Small diffs with high value: COL-01, EDIT-01, DD-05, I18N-01, SEL-04, LOAD-01, VS-02
2. **Lifecycle and leaks.** INFRA-01, INFRA-02, INFRA-03, EDIT-02, DD-01, DD-02, MENU-03, MENU-04, FORM-01
3. **State reconciliation and keyboard.** SEL-01, CLIP-01, SEL-02 + SEL-08 (together), EDIT-04, INFRA-07
4. **Row selection and expand.** MOD-08 first (derived state, D2), then ROW-01 … ROW-05 on top of it
5. **Clipboard codec.** CLIP-02 … CLIP-05 (MOD-04 first makes these trivially unit-testable)
6. **Virtual scroll and render performance.** VS-01, VS-03, RENDER-02, RENDER-03, RENDER-06
7. **Remaining 🟠 / 🟢**
8. **Modularity** (see MOD section; Composition API per D1)

---

## INFRA — cross-cutting infrastructure

- [ ] **INFRA-01** 🔴 `Hooks` has no `removeHook`, so subscriptions leak and dead instances throw
  - **Where:** [common/utils/hooks-manager.ts](../packages/common/utils/hooks-manager.ts). Registered and never removed in `selection/index.tsx:257-304`, `editor/index.tsx:193-208`, `column-resizer/index.tsx:88-95` and `row-insert-indicator/index.tsx:396`.
  - **Trigger:** select a cell, toggle `cellSelectionOption.enable` (or `rowInsertOption.enable`) at runtime, then scroll. The unmounted editor's scroll hook runs `autoResize.init(null)`, and `auto-resize.ts:130` (`el.nodeName`) throws. That aborts `triggerHook`'s `forEach`, so the remaining hooks never run. Each toggle also adds another set of closures.
  - **Fix:** make `addHook` return a disposer and call it in each child's `beforeUnmount`. Isolate errors per callback in `triggerHook`.

- [ ] **INFRA-02** 🔴 🔍 The emitter mixin never unsubscribes, so handlers run once per past mount
  - **Where:** [common/mixins/emitter.ts:30-33](../packages/common/mixins/emitter.ts#L30-L33). `bus.on(key, callback.bind(this))`, and there is no `off` anywhere in the repo.
  - **Trigger:** toggle `showHeader` off and on, then click a sort icon. Both the dead and the live `header/index.tsx` instances handle `SORT_CHANGE`, so the user's `sortOption.sortChange` runs twice, the first time with stale `sortColumns`. That means two fetches, and the stale one can win. `header-checkbox-content` remounts on every columns change (its key includes `columnsOptionResetTime`), so it leaks as well.
  - **Fix:** keep each bound handler and `bus.off` all of them in the mixin's `beforeUnmount`. Long term: MOD-01.

- [ ] **INFRA-03** 🟠 Debounces, timers and rAF are not cancelled on unmount
  - [ ] `ve-table.tsx`: debounced `bodyCellWidthChange` (~941) and the rAF timeout (~2224) are never cancelled. The `nextTick` in `initVirtualScroll` (~2244) and `setVirtualPhantomHeight` read `$refs` without null guards.
  - [ ] `selection/index.tsx:1551-1559`: two debounced functions, no `beforeUnmount`.
  - [ ] `column-resizer/index.tsx:169-182, 253-258`: document listeners are not removed on unmount. See also COL-05.
  - (The editor is tracked in EDIT-02, the contextmenu in MENU-03, the dropdown in DD-01.)
  - **Fix:** add a `beforeUnmount` to each, calling `.cancel()` / `cancelAnimationTimeout` / `clearTimeout`, and null-guard `$refs` in async callbacks.

- [ ] **INFRA-04** 🟠 Row and column keys are interpolated unescaped into `querySelector`
  - **Where:** `ve-table.tsx:1880, 3743`; `selection/index.tsx:1432, 1449, 1463, 1509`; `editor/index.tsx:282`
  - **Trigger:** a rowKey or colKey containing `"` or `\` makes `querySelector` throw a `SyntaxError`, in several places inside a watcher. A key that isn't rendered returns `null`, and code then reads `.offsetTop` and similar on it.
  - **Fix:** a shared helper `queryCell(root, rowKey, colKey)` using `CSS.escape` that returns `null` safely, with null guards at the call sites.

- [ ] **INFRA-05** 🔴 Importing the library during SSR crashes
  - **Where:** prop declarations `type: [String, HTMLElement]` in `ve-dropdown/src/index.tsx:112`, `ve-select/src/index.tsx:57`, `ve-pagination/src/index.tsx:185` and `ve-contextmenu/src/index.tsx:53`. Also the `default() { return document.body }` defaults and the contextmenu's `immediate` options watcher.
  - **Trigger:** Nuxt or any SSR import. `HTMLElement` is undefined in Node, so the module throws at import time.
  - **Fix:** `type: [String, Object] as PropType<string | HTMLElement>`. Resolve `document.body` lazily in `mounted`, and do all DOM work in `mounted` or later.

- [ ] **INFRA-06** 🟢 `VeTable` declares no `emits`
  - **Where:** `ve-table.tsx` (e.g. `on-row-insert`, ~3865)
  - **Effect:** listeners also fall through as attributes onto the root `<div>`, and there is no typing.
  - **Fix:** declare `emits` for every emitted event.

- [ ] **INFRA-07** 🟠 A throwing user callback leaves internal state half-updated
  - **Where:**
    - `afterPaste`: `ve-table.tsx:3336-3364`. The data is mutated, but the selection update and the `CLIPBOARD_CELL_VALUE_CHANGE` hook are skipped.
    - `afterAutofill`: `ve-table.tsx:1491-1505`. `clearCellSelectionAutofillEndCell` is skipped.
    - `beforeCopy`: `ve-table.tsx:3289-3298`. It runs after `preventDefault`, so nothing is copied.
    - `beforeCellValueChange` / `afterCellValueChange`: `ve-table.tsx:2354-2403`. The editing state is never cleared, every later stop re-throws, and the after-callbacks re-fire.
  - **Fix:** a small `safeCall(fn, ...args)` that logs through `console.error` and continues, plus `try/finally` around internal cleanup. Clear internal state before calling the "after" callbacks.

- [ ] **INFRA-08** 🟠 Optional user callbacks are called without existence guards
  - **Where:**
    - `body/index.tsx:711`: `checkboxOption.selectedRowChange`
    - `body/index.tsx:785`: `radioOption.selectedRowChange`
    - `header/index.tsx:114, 132`: `sortOption.sortChange`, and `sortOption` itself may be undefined
    - `header-th.tsx:344`: `checkboxOption.hideSelectAll` with no `checkboxOption`
    - `body/index.tsx:671`: `checkboxOption` becomes null, or `selectedRowKeys` is unset
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

- [ ] **COL-01** 🔴 🔍 "Left/Right fixed column to" on a column fixed the other way crashes the table
  - **Where:** [util/index.ts:1504-1506](../packages/ve-table/src/util/index.ts#L1504-L1506). `setColumnFixed` returns `false`, and the callers `ve-table.tsx:3095, 3118` assign it to `this.cloneColumns`. The watcher (~852) then runs `initGroupColumns(false)`, which throws `false.forEach is not a function`.
  - **Trigger:** a column with `fixed: 'left'`, right-click its header, choose "Right fixed column to".
  - **Fix:** `return cloneColumns` (or have the callers ignore a falsy result). Also disable the menu item when the direction conflicts (`setHeaderContextmenuOptions`, util ~497-521).

- [ ] **COL-02** 🟢 🔍 The "don't left-fix the last column" guard is a no-op
  - **Where:** [util/index.ts:1527](../packages/ve-table/src/util/index.ts#L1527). `index < cloneColumns.length` is always true. The RIGHT branch (`index > 0`) is correct.
  - **Fix:** `index < cloneColumns.length - 1`.

- [ ] **COL-03** 🟠 Hide/show columns mutates the user's prop and discards resize and fixed state
  - **Where:** `ve-table.tsx:1179` (`this.hiddenColumns = defaultHiddenColumnKeys` keeps the prop reference, and `showColumnsByKeys` ~3702 `splice`s it); `ve-table.tsx:1187-1209` (rebuilds from `cloneDeep(this.columns)`, then `initColumnWidthByColumnResize` resets widths).
  - **Trigger:** resize a column or fix it via the contextmenu, then call `hideColumnsByKeys` / `showColumnsByKeys`. The resized widths and the fixed state are lost, and the user's `defaultHiddenColumnKeys` array is mutated.
  - **Fix:** copy the array (`[...keys]`), and re-apply `_columnResizeWidth` and `fixed` from the current colgroups.

- [ ] **COL-04** 🟢 A `columns` change runs `initGroupColumns` and `initColumnWidthByColumnResize` twice
  - **Where:** `ve-table.tsx:837-879`. The `columns` watcher, then the `cloneColumns` watcher.
  - **Fix:** do the work only in the `cloneColumns` watcher.

- [ ] **COL-05** 🟢 The column resizer clobbers globals and can get stuck
  - **Where:** `column-resizer/index.tsx:169-182, 253-258`
  - **Issues:**
    - It overwrites `document.onselectstart` and `document.ondragstart`, removing any app handlers.
    - Alt-tab, or releasing the mouse outside the window, leaves resizing stuck.
    - There is no unmount cleanup (also listed in INFRA-03).
  - **Fix:** use `addEventListener('selectstart', prevent)` and remove it afterwards. In mousemove, `if (e.buttons === 0) end()`; also end on `window` `blur` and on Escape.

- [ ] **COL-06** 🟢 🔍 Fixed-column edge detection compares `field` instead of `key`
  - **Where:** `body/index.tsx:417-457` and `footer-td.tsx` (last-left / first-right shadow classes); `selection/index.tsx:249` (`isFirstNotFixedSelectionCol` compares `col.field` to `leftColKey`). `header-th.tsx` correctly uses `_keys`.
  - **Trigger:** two left-fixed columns without `field` (checkbox plus index) mean neither gets the shadow class. When `key !== field`, the selection's 1px left-border fix never applies.
  - **Fix:** compare by `key` everywhere. Long term: MOD-06.

---

## SEL — cell selection and keyboard

- [ ] **SEL-01** 🔴 Selection and editing state is not reconciled when columns or rows change
  - **Root cause:** nothing re-validates `cellSelectionData` (`currentCell`, `normalEndCell`), `cellSelectionRangeData` or `editingCell` when `colgroups` or `allRowKeys` change. The `allRowKeys` watcher (`ve-table.tsx:808-832`) only re-checks `currentCell`.
  - **Symptoms:**
    - [ ] 🔍 The selection layer crashes on render: `cornerCellInfo` reads `colgroups[index + 1].fixed` with `index === -1` ([selection/index.tsx:212-216](../packages/ve-table/src/selection/index.tsx#L212-L216)). `getBorders` destructures it before its `isRender` early return. Repro: select a cell, then `hideColumnsByKeys([thatColKey])`.
    - [ ] F2, typing a letter, or stopping an edit after the column was hidden throws, because `currentColumn` is undefined (`ve-table.tsx:1753, 3796, 2359`).
    - [ ] A stale `normalEndCell` after its row is removed: paste throws (`tableData[-1]`), right-click throws (`isCellInSelectionRange` → `null.includes`, `util/index.ts:853-855`), and copy writes `""` to the clipboard. See CLIP-01.
    - [ ] Editing gets stuck when the edited row is removed: `saveCellWhenStopEditing` skips `clearEditingCell()` (`ve-table.tsx:2354-2403`). Copy, paste and Delete all stay disabled.
  - **Fix:** one reconcile watcher on `[colgroups, allRowKeys]` that clears or clamps `currentCell`, `normalEndCell`, `editingCell` and the range whenever their keys disappear. Add defensive `index < 0` guards at the sites above, and make `isCellInSelectionRange` null-safe.

- [ ] **SEL-02** 🔴 🔍 The document `keydown` handler acts on keys from anywhere on the page
  - **Where:** `ve-table.tsx:1070` (listener), [ve-table.tsx:1589](../packages/ve-table/src/ve-table.tsx#L1589) (`dealKeydownEvent`, no target check). `preventDefault` calls are at ~1620 (Tab), ~1724 and ~1737.
  - **Trigger:** while a cell is selected, type into any other input on the page. A typical case: a dialog opened from the contextmenu's `afterMenuClick` (contextmenu clicks deliberately keep the selection, ~2310). Space and Backspace are swallowed, arrows and Enter move the table selection, and letters start editing the cell. Tab is always prevented, so focus can never leave the table.
  - **Fix:** `if (!this.$el.contains(event.target)) return` at the top. Tab stays trapped inside the table (D4). The way out is Esc, which is specified in SEL-08. Ship the two together.

- [ ] **SEL-03** 🟠 🔍 `setAllCellSelection()` skips the first column when there is no operation column
  - **Where:** [ve-table.tsx:3518-3527](../packages/ve-table/src/ve-table.tsx#L3518-L3527). It hard-codes `colgroups[1]`.
  - **Note:** the test at `__tests__/ve-table-cell-selection.spec.ts:599-604` **locks in the bug** (`leftColKey: 'b'`). Update it with the fix.
  - **Fix:** use the first column where `!x.operationColumn`.

- [ ] **SEL-04** 🟢 🔍 Typo in a range check: `index1 !== -1 && index1 !== -1`
  - **Where:** [util/index.ts:739](../packages/ve-table/src/util/index.ts#L739). It should test `index2`. An unknown `colKey2` returns `slice(-1, …)` garbage instead of `null`.

- [ ] **SEL-05** 🟢 🔍 `getNextColKey` with an unknown key returns the first column
  - **Where:** [util/index.ts:1150-1158](../packages/ve-table/src/util/index.ts#L1150-L1158). `-1 < length - 1` is true.
  - **Fix:** return `null` when `index < 0`.

- [ ] **SEL-06** 🟢 `columnToVisible(undefined)` throws
  - **Where:** `ve-table.tsx:~1833`. The public `setCellSelection` / `setRangeCellSelection` reach it with an unknown colKey when there is a horizontal scrollbar.
  - **Fix:** validate keys in the public APIs and guard `columnToVisible`.

- [ ] **SEL-07** 🟢 `getSelectionAreas` shares a nested border object that `getBorders` mutates
  - **Where:** `selection/index.tsx:884-898` and `1243-1249`. The area layer's position on the right-fixed side depends on this hidden mutation, and on the first row the layer is shifted 1px.
  - **Fix:** clone the border objects per consumer, or make the geometry pure (MOD-05).

- [ ] **SEL-08** 🟠 No keyboard way to leave the table: Tab is trapped and there is no Esc handling (decision D4)
  - **Where:** `ve-table.tsx:1605-1620` (`KEY_CODES.TAB` always calls `preventDefault`). There is no `ESC` case anywhere in `dealKeydownEvent`, and the table root has no `tabindex`, so it can't hold focus itself.
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
  - **Where:** `clipboard.ts:230` (`startRowIndex = -1`), `:244` (`colgroups[-1].key`), `:282` (`Object.assign(tableData[-1], …)`); `ve-table.tsx:3272` (`editorCopy` calls `preventDefault()` before validating).
  - **Trigger:** a stale range (SEL-01), or the edit textarea still focused after the selection is cleared. Paste throws a TypeError, and copy overwrites the user's clipboard with `""`.
  - **Fix:** in `onBeforePaste`, `onBeforeCopy`, `onBeforeCut` and `onBeforeDelete`, return `null` if any index is `-1`. Callers bail out **before** `preventDefault`.

- [ ] **CLIP-02** 🟠 Pasting a non-text clipboard (an image or file) wipes the selected cell
  - **Where:** `clipboard.ts:13-14, 218`. `getData('text/plain')` returns `''`, `decodeSpreadsheetStr('')` returns `[['']]`, and `editorPaste` (~3330) writes `''`.
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
  - **Where:** `ve-table.tsx:3082, 3087, 3187, 3192`. The return value is ignored, and there is no contextmenu paste.
  - **Fix:** `navigator.clipboard` with an `execCommand` fallback; handle the rejection (permission or insecure context) and surface it through a callback.

---

## FILL — autofill

- [ ] **FILL-01** 🟠 The autofill direction is a render side effect and goes stale
  - **Where:**
    - `selection/index.tsx:1124-1141, 1163-1169` dispatches `AUTOFILLING_DIRECTION_CHANGE` from inside render.
    - `ve-table.tsx:1556` (`autofillingDirection` is never reset).
    - `ve-table.tsx:1444` (`setCellSelectionByAutofill`).
    - `util/index.ts:1220-1403` (`cellAutofill`).
  - **Trigger:** `cellAutofillOption: { directionY: false }`. Autofill right once, then drag the corner down. On mouseup the stale RIGHT is used, and the current cell moves to the dragged-to row. If the first drag goes in a disallowed direction, the direction is `null` and `beforeAutofill`/`afterAutofill` still fire with every index at `-1`.
  - **Fix:** make the direction a pure computed value (geometry function, MOD-05). Reset it to `null` when autofill starts and ends. Return early when it is `null` or not allowed.

- [ ] **FILL-02** 🟠 An autofill drag is not cancelled when the mouse is released outside the table or window
  - **Where:** `isAutofillStarting` is reset only at `ve-table.tsx:2316, 2915-2932, 3032`. There is no `window` `mouseup` or `blur` listener.
  - **Trigger:** release outside the browser window: the drag stays armed, and the next mouseup in the table commits it, overwriting data. Release outside the table but inside the page: `tableClickOutside` fires and the watcher **commits** instead of cancelling.
  - **Fix:** on corner mousedown, add `window` `mouseup` (once) and `blur` → cancel listeners. Releasing outside the table cancels without committing. Remove both in `beforeUnmount`.

---

## EDIT — cell editing

- [ ] **EDIT-01** 🔴 🔍 Alt+Enter while editing replaces the text with `"undefined\n"` when `key !== field`
  - **Where:** [editor/index.tsx:429](../packages/ve-table/src/editor/index.tsx#L429). It reads `editingCell.row[editingCell.colKey]`. The rest of the table uses `row[column.field]` (`ve-table.tsx:2359`). The repo's own fixtures use `key: 'a', field: 'name'`.
  - **Fix:** `editingCell.row[editingCell.column.field]`.

- [ ] **EDIT-02** 🟠 🔍 Editor lifecycle: the Vue 2 `destroyed()` hook never runs
  - **Where:** [editor/index.tsx:465](../packages/ve-table/src/editor/index.tsx#L465) (`destroyed`, the only Vue 2 lifecycle hook left in the repo), `:450-460` (uncancelled lodash debounces), `:224` (uncancelled `setTimeout`).
  - **Effect:** `autoResize` is never unobserved. After unmount the debounces run `setTextareaPosition` against null refs and throw.
  - **Fix:** `beforeUnmount() { debounceSetTextareaPosition.cancel(); debounceSetCellEl.cancel(); clearTimeout(focusTimer); textareaUnObserve() }`.

- [ ] **EDIT-03** 🟠 The editor stays positioned over the previous cell
  - **Where:** `editor/index.tsx:275-290` (`setCellEl` only assigns when a cell is found).
  - **Trigger:** virtual scroll, or a target cell that isn't rendered. The textarea sits over the old cell while edits go to the new one.
  - **Fix:** `else { this.cellEl = null; this.overflowViewport = true }`.

- [ ] **EDIT-04** 🟢 `startEditingCell` while another cell is editing silently drops that value
  - **Where:** `ve-table.tsx:3787-3839`. The comment says it closes the previous cell, but the code doesn't. An unknown rowKey also throws (`currentRow` is unchecked, ~3778-3820).
  - **Fix:** call `STOP_EDITING_CELL` first when `isCellEditing`, and guard `!currentRow || !currentColumn`.

---

## VS — virtual scroll

- [ ] **VS-01** 🟠 🔍 The binary search is effectively linear and can return an out-of-range index
  - **Where:** [ve-table.tsx:2137-2159](../packages/ve-table/src/ve-table.tsx#L2137-L2159), and the caller ~2110
  - **Issues:**
    - `end = end - 1` should be `end = midIndex - 1`, so the search is O(n) on every scroll event.
    - An exact match returns `midIndex + 1`, which can equal `list.length`, and `positions[start].top` then throws. Repro: 40px rows, scrollTop 4000, and `tableData` shrinks to 100 rows.
    - The function returns `null` when scrollTop is past the end.
  - **Fix:** a correct lower-bound bisection, clamped to `[0, len - 1]`.

- [ ] **VS-02** 🟠 `bodyRowHeightChange` with an unknown row key reads `positions[-1]`
  - **Where:** `ve-table.tsx:2058-2062`. This happens without `rowKeyFieldName`, or for a row missing its key, because the ResizeObserver reports `key: null`.
  - **Fix:** `if (index < 0) return`.

- [ ] **VS-03** 🟠 Every cell edit discards all measured row heights
  - **Where:** `ve-table.tsx:797-806` (the `deep: true` `tableData` watcher calls `initVirtualScrollPositions()`), `2046`. `virtualScrollPositions` is reactive despite the "非响应式" comment at ~337, which makes the loop at 2069-2078 slow.
  - **Trigger:** variable-height rows with virtual scroll, then edit, paste or autofill a cell. The offset and phantom height go wrong and the content jumps.
  - **Fix:** rebuild only when the row keys or the length change, keep known heights by rowKey, and store positions with `markRaw` or a non-reactive field.

- [ ] **VS-04** 🟢 `scrollToRowKey` timer and null handling
  - **Where:** `ve-table.tsx:3735-3747`. The 200ms `setTimeout` is never stored or cleared: a user who scrolls within 200ms is pulled back, and repeated calls jitter. An unrendered key gives `rowEl.offsetTop` on `null`. (Escaping: INFRA-04.)
  - **Fix:** keep and clear the timer id, and null-guard the row element.

---

## ROW — row checkbox, radio and expand

- [ ] **ROW-01** 🔴 🔍 `defaultExpandAllRows` aliases and then mutates the table's `allRowKeys`
  - **Where:** [body/index.tsx:588-590](../packages/ve-table/src/body/index.tsx#L588-L590) (`this.internalExpandRowkeys = allRowKeys`, no copy), `:488-493` (`splice`/`push` in place).
  - **Trigger:** `defaultExpandAllRows: true`, then click an expand icon. The row key is removed from the table's `allRowKeys`, so keyboard navigation skips that row and select-all and row-insert get the wrong keys.
  - **Fix:** `allRowKeys.slice()`, and make `expandRowChange` build new arrays.

- [ ] **ROW-02** 🔴 🔍 With `defaultExpandAllRows`, rows can never be collapsed
  - **Where:** [body/expand-tr.tsx:67-68](../packages/ve-table/src/body/expand-tr.tsx#L67-L68). It returns `true` whenever the option is set and ignores `expandedRowkeys`, including controlled ones. The icon rotates but the row stays open.
  - **Fix:** delete that branch, since `initInternalExpandRowKeys` already seeds the keys.

- [ ] **ROW-03** 🔴 Non-deep watchers miss in-place array mutation (a Vue 2 assumption)
  - **Where:** `body/index.tsx:348` (`expandOption.expandedRowKeys`), `:361` (`checkboxOption.selectedRowKeys`), `:367` (`internalCheckboxSelectedRowKeys`); `body/body-checkbox-content.tsx:66`
  - **Trigger:** the official demos mutate in place: `row-checkbox/selected-control.md:120-128`, `pagination/checkbox.md:104-108` and `expand-control.md:125`. Checkboxes and select-all don't update. A controlled expand goes stale, and the next click collapses unexpectedly.
  - **Fix (D2, proper fix):** derive the state instead of mirroring it: `isSelected = computed(() => selectedKeySet.value.has(rowKey))`, built on the MOD-08 composables. Remove the `internal*RowKeys` mirror copies and the non-deep watchers. Don't use `deep: true` as a stopgap. In-place mutation of the user's arrays must keep working, because the official demos rely on it.

- [ ] **ROW-04** 🟠 The header select-all state goes stale
  - **Where:** `body/index.tsx:367-372` (`sendToCheckboxAll` runs only on selection change), `header-checkbox-content.tsx:21` (starts at `isSelected = false` after a remount).
  - **Trigger:** select all, then add a row, and the header still shows checked. Change the columns, and the header shows unchecked while every row is selected.
  - **Fix:** watch `[isCheckboxSelectedAll, isCheckboxIndeterminate]`, or pass the state down as props.

- [ ] **ROW-05** 🟠 The select-all math compares counts instead of sets
  - **Where:** `body/index.tsx:307-328`
  - **Trigger:** all rows disabled and none selected gives `0 + N === N`, so the header shows checked. Keys from other pages, or disabled keys that are not in the data, inflate the count.
  - **Fix:** `all.length && all.some(k => !disabled.has(k)) && all.every(k => sel.has(k) || disabled.has(k))`.

- [ ] **ROW-06** 🟢 With expand `trigger: 'row'`, an icon click dispatches `BODY_CELL_CLICK` twice
  - **Where:** `expand-tr-icon.tsx:68`. The click bubbles into the td.
  - **Fix:** `stopPropagation` on the icon click, or de-duplicate in the handler.

---

## INS — row insert indicator

- [ ] **INS-01** 🟠 The row insert indicator inserts at the wrong index
  - **Where:** `row-insert-indicator/index.tsx:180-181` (the header area always returns index `0`), `:231` (the virtual-scroll offset is skipped when `closestIndex === 0`).
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

- [ ] **RENDER-02** 🟠 Unkeyed fragments around each body row cause mass remounts
  - **Where:** `body/index.tsx:864-921`. Each row returns `[<BodyTr key=…/>, expandRow]`, so Vue builds unkeyed Fragments and matches rows by position. The placeholder branch at `:904-906` drops expand rows while scrolling.
  - **Trigger:** sorting, inserting at the top, or any virtual-scroll step. Every shifted row remounts, including its tds, checkboxes and `VueDomResizeObserver`, which re-emits heights (see VS-03).
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
  - **Where:** [ve-table.tsx:1225-1238](../packages/ve-table/src/ve-table.tsx#L1225-L1238) (`if (scrollBarWidth)`). Callers ~573 and ~4116.
  - **Trigger:** overlay scrollbars (the macOS default, mobile). Every render and every `tableContainerStyle` evaluation appends a probe div and forces layout twice, including on each virtual-scroll re-render.
  - **Fix:** a `null` sentinel for "not measured".

---

## MENU — contextmenu (table menus and the `ve-contextmenu` component)

- [ ] **MENU-01** 🟢 Commented-out contextmenu types give items `type: undefined`
  - **Where:** `ve-table/src/util/constant.ts:255, 259` (`REMOVE_COLUMN`, `HIDE_COLUMN`); used at `util/index.ts:328, 336, 393`.
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
  - **Where:** `ve-contextmenu/src/index.tsx:411-447`. `removeOrEmptyPanels(true)` removes only containers whose IDs are in the current `panelOptions`. ve-table replaces `options` on every right-click (`ve-table.tsx:2698/2712`), which regenerates the IDs.
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

- [ ] **DD-05** 🟠 🔍 VeSelect's open/closed arrow never toggles
  - **Where:** [ve-select/src/index.tsx:152](../packages/ve-select/src/index.tsx#L152). It listens with `onDropdownVisibleChange`, but the dropdown emits `'on-dropdown-visible-change'`, whose handler key is `onOnDropdownVisibleChange`.
  - **Fix:** rename the listener.

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
  - **Where:** `ve-pagination/src/index.tsx:82, 89, 123, 127` (`ve-pagination-size-label`, `ve-pagination-jumper`). `aria-labelledby` points at the wrong instance.
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

- [ ] **I18N-03** 🟢 Missing pagination aria keys in seven languages
  - **Where:** `common/locale/lang/{fr-FR,ru-RU,ko-KR,pt-BR,zh-TW,af-ZA,zu-ZA}.ts`. They lack `prevPage`, `nextPage`, `paginationLabel`, `pageLabel`, `currentPageLabel`, `jumpToLabel` and `pageSizeLabel`, so those users get **Chinese** aria-labels.
  - **Fix:** add the keys, plus a type-level check that every lang satisfies the full shape.

---

## MOD — modularity

These are structural changes. Several of them remove whole bug classes above (noted in brackets).
**Approach (D1): Composition API.** Logic moves into `use*` composables organised by feature, e.g. `packages/ve-table/src/features/<feature>/use<Feature>.ts`, and components move to `setup()`. Migrate one feature at a time, keeping the test suite green after each step. The public API (props, emits, instance methods exposed via `expose`) must not change.

- [ ] **MOD-01** Replace the emitter mixin and `Hooks` with a typed `provide/inject` table context (`useTableContext`) whose subscriptions auto-dispose through `onScopeDispose` / `beforeUnmount`. [INFRA-01, INFRA-02]
- [ ] **MOD-02** Split `ve-table.tsx` (4.2k lines) into feature composables and move the component to `setup()` (D1). Instance methods currently called through `this[INSTANCE_METHODS.*]` (and by users through refs) must be kept via `expose`.
  | Module | Approx. lines | Notes |
  |---|---|---|
  | virtual-scroll | data 337-365; computed 491-539; watch 797-806, 884-898; methods 1939-2251; handler 4017-4052 | Most bugs (VS-*). Start here. |
  | keyboard-navigation | 1588-1937 | Self-contained; SEL-02 |
  | cell-selection (+ indicators, autofill) | 1273-1586, 2406-2932, 3491-3675; watch 899-937 | Mostly pure state transitions, so testable without a DOM |
  | editing | 2331-2404, 2934-3023, 3761-3853 | EDIT-*, INFRA-07 |
  | clipboard | 3244-3489 | Takes `{ tableData, colgroups, allRowKeys, rangeData, option }` |
  | contextmenu wiring | 2686-2722, 3025-3242 | Mutates `tableData` and `cloneColumns` |
  | columns (hide/show, group, resize, fixed) | 1081-1222, 3677-3707; watch 837-879 | COL-* |
  | scroll shadow / scrollbar status | 2253-2305 | Container ref only |
  | event wiring | 956-1067 | 24 near-identical `this.on(...)` calls → an `[event, method]` table |
- [ ] **MOD-03** Split `util/index.ts` (1.6k lines) into:
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

---

## Test gaps noticed during the audit

- The VeLoading "lock" test asserts only `.ve-loading-fixed` (LOAD-01).
- `ve-table-cell-selection.spec.ts:599-604` asserts buggy behaviour (SEL-03).
- No tests for remount or toggle scenarios (toggle `cellSelectionOption.enable`, `showHeader`, `rowInsertOption.enable`), which would catch INFRA-01 and INFRA-02.
- No clipboard codec round-trip tests (CLIP-03 … CLIP-05).
- No virtual-scroll tests with variable row heights plus edits (VS-03).
- Still open from `REFACTOR_PLAN.md`: `ve-table-row-insert.spec.ts`, `ve-table-clipboard.spec.ts`, `ve-table-autofill.spec.ts`.

---

## Changelog

Newest first. One line per change: date · IDs · what happened · commit/PR.

- **2026-10-16** · D1–D4, ROW-03, I18N-01, SEL-02, SEL-08, MOD · Decisions recorded (Composition API, derived row state, fix ConfigProvider, Tab trapped with Esc to leave). Added **SEL-08** (Esc / keyboard-trap behaviour). Moved the doc to `docs-developer/`, which is now tracked in git.
- **2026-10-16** · all · Audit created from 4 parallel reviews; 74 findings + 11 modularity items logged at `a0bfb50`. No code changed.
