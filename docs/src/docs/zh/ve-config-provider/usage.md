:::anchor 使用方法

`VeConfigProvider` 为其内部的所有组件（如 `ve-table`、`ve-pagination`）设置语言。它不会修改通过 `VeLocale.use` 设置的全局语言，提供者之外的组件仍使用全局语言。

`locale` 会合并在外层语言之上：最近的外层 `VeConfigProvider`，没有时为当前 app 的语言（`useVeTable({ locale })`），再没有时为全局语言。可以传入完整的语言包，也可以只写需要修改的键。传入的对象不会被修改。

:::demo 提供者内的分页使用自己的文案，下面的分页使用全局语言。

```html
<template>
    <div>
        <ve-config-provider :locale="locale">
            <ve-pagination :total="600" />
        </ve-config-provider>
        <br />
        <ve-pagination :total="600" />
    </div>
</template>
<script>
    export default {
        data() {
            return {
                locale: {
                    分页: {
                        前往: "跳转到",
                        合计: (total) => `总共 ${total} 行`,
                    },
                },
            };
        },
    };
</script>
```

:::
