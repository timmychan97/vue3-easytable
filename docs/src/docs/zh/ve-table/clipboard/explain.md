:::tip
1、你可以像 excle 那样，选中单元格并批量的复制、粘贴、剪切、删除操作<br>
2、右键菜单的“复制”“剪切”通过 Clipboard API（`navigator.clipboard`）写入剪贴板，不可用时（如非安全上下文）退回 `document.execCommand("copy")`。两者都失败时调用 `clipboardOption.writeError({ type, error, text, data, selectionRangeIndexes, selectionRangeKeys })`（未提供时输出警告），剪切失败时单元格保持不变<br>
3、粘贴、剪切、删除会跳过操作列和没有 `field` 的列，其余列保持原来的位置<br>
4、设置了 `editOption` 时，粘贴、剪切、删除（包括右键菜单的“剪切”和各“清空”操作）只写入 `edit: true` 的列，并对每个值发生变化的单元格调用 `editOption.beforeCellValueChange` / `afterCellValueChange`（以及即将废弃的 `cellValueChange`），参数与单元格编辑相同（`{ row, column, changeValue }`）。`beforeCellValueChange` 返回 `false`（或抛出异常）只跳过该单元格。顺序：`before*`（`beforePaste` 等）→ 逐单元格 `beforeCellValueChange` 并写入 → 对实际写入的单元格逐个调用 `afterCellValueChange` → `after*`。`beforePaste` 收到的 `data` 不含不可编辑的列；剪切仍会复制整个选区。未设置 `editOption` 时写入所有数据列，不调用这些编辑回调<br>
5、粘贴区域只覆盖不能写入的列（见第 3、4 条）时不执行粘贴：不调用 `beforePaste` / `afterPaste`，选区保持不变

:::
