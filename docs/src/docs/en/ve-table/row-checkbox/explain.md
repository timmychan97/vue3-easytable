:::tip
1. Enable multi-select functionality via the `checkboxOption` property.<br>
2. Set `type=checkbox` in `columns` to designate the checkbox column<br>
3. Set the `rowKeyFieldName` property to the column name corresponding to the row data<br>
4. `selectedRowChange` is the row change event. It receives 3 parameters: `row` (current row data), `isSelected` (whether the current row is selected), and `selectedRowKeys` (all selected rowKey values).<br>
5. `selectedAllChange` is the select-all event. It receives 2 parameters: `isSelected` (whether all are selected) and `selectedRowKeys` (all selected rowKey values)<br>
6. Select all / deselect all only change the rows in the current `tableData`. Selected keys that are not in the current data (for example rows on other pages) are kept in `selectedRowKeys`, so a selection can span several pages. Disabled rows keep their state<br>
7. Removing a selected row from `tableData` does not unselect it: its key stays in `selectedRowKeys` (the table cannot tell a removed row from a row on another page), and a later row with the same key shows up checked. To drop the key, use the controlled `selectedRowKeys` and remove the key together with the row
:::
