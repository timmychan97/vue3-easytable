:::tip
1、当存在需要重复拷贝的数据，你可以像 excel 那样进行单元格内容的自动填充<br>
2、自动填充会跳过操作列和没有 `field` 的列：这些列不会被填充；横向填充时，没有数据的来源列对应的目标单元格保持不变<br>
3、设置了 `editOption` 时，自动填充只写入 `edit: true` 的列，并对每个值发生变化的单元格调用 `editOption.beforeCellValueChange` / `afterCellValueChange`（以及即将废弃的 `cellValueChange`），参数与单元格编辑相同（`{ row, column, changeValue }`）。`beforeCellValueChange` 返回 `false`（或抛出异常）只跳过该单元格。顺序：`beforeAutofill` → 逐单元格 `beforeCellValueChange` 并写入 → 对实际写入的单元格逐个调用 `afterCellValueChange` → `afterAutofill`。未设置 `editOption` 时填充所有数据列，不调用这些编辑回调<br>
4、没有任何可写入的单元格时（只覆盖不能写入的列，见第 2、3 条；或横向填充时来源列都没有数据）不执行填充：不调用 `beforeAutofill` / `afterAutofill`，选区保持不变

:::
