:::tip
1、你可以像 excle 那样，选中单元格并批量的复制、粘贴、剪切、删除操作<br>
2、右键菜单的“复制”“剪切”通过 Clipboard API（`navigator.clipboard`）写入剪贴板，不可用时（如非安全上下文）退回 `document.execCommand("copy")`。两者都失败时调用 `clipboardOption.writeError({ type, error, text, data, selectionRangeIndexes, selectionRangeKeys })`（未提供时输出警告），剪切失败时单元格保持不变<br>
3、粘贴、剪切、删除会跳过操作列和没有 `field` 的列，其余列保持原来的位置

:::
