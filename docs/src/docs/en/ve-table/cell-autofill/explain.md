:::tip
1. When you have data that needs to be copied repeatedly, you can autofill cell content just like in Excel<br>
2. Autofill skips operation columns and columns without `field`: they are not filled, and in a horizontal fill a source column without data leaves its target cells unchanged<br>
3. When `editOption` is set, autofill only writes to columns with `edit: true`, and calls `editOption.beforeCellValueChange` / `afterCellValueChange` (and the deprecated `cellValueChange`) for every cell whose value changes, with the same `{ row, column, changeValue }` as cell editing. `beforeCellValueChange` returning `false` (or throwing) skips that cell only. Order: `beforeAutofill` → `beforeCellValueChange` and write, per cell → `afterCellValueChange`, per written cell → `afterAutofill`. Without `editOption`, every data column is filled and the cell value callbacks are not called<br>
4. A fill that has nothing to write (it only covers columns it can't write to, see 2 and 3, or in a horizontal fill its source columns hold no data) does nothing: `beforeAutofill` / `afterAutofill` are not called and the selection stays as it is

:::
