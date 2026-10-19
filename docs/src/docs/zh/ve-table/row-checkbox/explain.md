:::tip
1、通过 `checkboxOption` 属性开启多选功能。<br>
2、通过在`columns` 设置`type=checkbox`作为多选的列<br>
3、设置`rowKeyFieldName`属性对应行数据的列名<br>
4、`selectedRowChange`行改变事件。事件接收 3 个参数，`row`:当前行数据，`isSelected`当前行是否选中，`selectedRowKeys`所有选中的 rowKey 信息。<br>
5、`selectedAllChange`全选事件。事件接收 2 个参数，`isSelected`是否全选。`selectedRowKeys`所有选中的 rowKey 信息<br>
6、全选 / 取消全选只改变当前 `tableData` 中的行。不在当前数据中的已选 key（例如其他页的行）会保留在 `selectedRowKeys` 中，因此可以跨页勾选。禁用的行保持原状态
:::
