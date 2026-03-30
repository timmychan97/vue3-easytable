:::tip
1. Enable multi-select functionality via the `checkboxOption` property.<br>
2. Set `type=checkbox` in `columns` to designate the checkbox column<br>
3. Set the `rowKeyFieldName` property to the column name corresponding to the row data<br>
4. `selectedRowChange` is the row change event. It receives 3 parameters: `row` (current row data), `isSelected` (whether the current row is selected), and `selectedRowKeys` (all selected rowKey values).<br>
5. `selectedAllChange` is the select-all event. It receives 2 parameters: `isSelected` (whether all are selected) and `selectedRowKeys` (all selected rowKey values)
:::
