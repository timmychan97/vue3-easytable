:::tip
1. You can select cells and perform batch copy, paste, cut, and delete operations just like in Excel<br>
2. The context menu **Copy** and **Cut** write with the Clipboard API (`navigator.clipboard`) and fall back to `document.execCommand("copy")` when it is unavailable (for example outside a secure context). If both fail, `clipboardOption.writeError({ type, error, text, data, selectionRangeIndexes, selectionRangeKeys })` is called (without it a warning is logged), and a failed cut leaves the cells unchanged<br>
3. Paste, cut and delete skip operation columns and columns without `field`, and the other columns keep their positions<br>
4. When `editOption` is set, paste, cut and delete (including the context menu **Cut** and the "empty" actions) only write to columns with `edit: true`, and call `editOption.beforeCellValueChange` / `afterCellValueChange` (and the deprecated `cellValueChange`) for every cell whose value changes, with the same `{ row, column, changeValue }` as cell editing. `beforeCellValueChange` returning `false` (or throwing) skips that cell only. Order: `before*` (`beforePaste` etc.) → `beforeCellValueChange` and write, per cell → `afterCellValueChange`, per written cell → `after*`. `beforePaste` receives `data` without the non-editable columns; cut still copies the whole selection. Without `editOption`, every data column is written and the cell value callbacks are not called<br>
5. A paste that only covers columns it can't write to (see 3 and 4) does nothing: `beforePaste` / `afterPaste` are not called and the selection stays as it is

:::
