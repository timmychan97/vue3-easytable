:::tip
1. Use the `cellSpanOption` configuration object to set cell merging<br>
2. Use the `bodyCellSpan({row,column,rowIndex})` method to set body cell merging<br>
3. Use the `footerCellSpan({row,column,rowIndex})` method to set footer cell merging<br>
4. The `colspan` property specifies the number of columns to merge; the `rowspan` property specifies the number of rows to merge<br>
5. To implement the feature, columns that should not be rendered need to be specified by setting both `colspan` and `rowspan` values to 0<br>
6. By default, the merged content is the content of the rendered cell. To customize the cell content, use `renderBodyCell({row,column,rowIndex},h)` in combination<br>
7. See the examples below for details

:::
