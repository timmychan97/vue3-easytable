## FAQ

:::anchor scrollWidth Property
Q: How to use the `scrollWidth` property?

A: When the outer container width is less than the `scrollWidth` value, a horizontal scrollbar will appear. When the outer container width is greater than the `scrollWidth` value, it will adapt to the container width automatically.

:::anchor Fixed Columns
Q: Why are some columns not displayed after setting fixed columns?

A: Because the `scrollWidth` value is less than the sum of columns with explicit widths, columns without a set width or with percentage-based widths will be squeezed out.

:::anchor rowKeyFieldName Property
Q: When should the `rowKeyFieldName` property be used?

A: This property ensures correct rendering when data is updated. It applies to the following features: row expand, row single selection, row multiple selection, row click highlight, and virtual scrolling.

:::anchor Error: 'ReferenceError: h is not defined'
Q: Why does the custom column render function `renderBodyCell` throw 'ReferenceError: h is not defined'?

A: Refer to the [official documentation](https://cn.vuejs.org/v2/guide/render-function.html#JSX). You can **add** the second parameter to fix this, for example:

```
renderBodyCell: ({ row, column, rowIndex },h) => {
       return (<div>hello</div>);
}
```

:::anchor Long Text Breaks Layout
Q: Why does the set width not take effect when cell content is too long?

A: When cell text content is too long, it can break the layout. You can control this with the CSS property [word-break](https://developer.mozilla.org/en-US/docs/Web/CSS/word-break) ([see this example for reference](#/en/doc/table/column-width?anchor=long-text-destroys-layout)), for example:

```html
<template>
    <ve-table style="word-break: break-all" :columns="columns" :table-data="tableData" />
</template>
```

:::anchor Custom Scrollbar Styles
Q: How to customize scrollbar styles?

A: The component does not have built-in custom scrollbar styles. You can customize them according to your needs. For scrollbar style customization, refer to: https://developer.mozilla.org/en-US/docs/Web/CSS/::-webkit-scrollbar
