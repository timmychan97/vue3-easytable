:::tip
1. Use the `cellStyleOption` configuration object to set cell styles<br>
2. Use the callback function property `bodyCellClass({ row, column, rowIndex })` to set the class for body cells that match the condition<br>
3. Use the callback function property `headerCellClass({column, rowIndex})` to set the class for header cells that match the condition<br>
4. Use the callback function property `footerCellClass({row, column, rowIndex})` to set the class for footer cells that match the condition<br>
5. The `<style>` tag must not use the `scoped` attribute<br>
6. You can also customize cell styles through `renderBodyCell`, `renderHeaderCell`, `renderFooterCell`, etc.

:::
