:::anchor 切换语言

`locale` 是响应式的：修改后，提供者内的组件会立即更新。不传 `locale` 时，提供者沿用外层语言。

:::demo

```html
<template>
    <div>
        <div>
            <button class="button-demo" @click="locale = shortLocale">简短文案</button>
            <button class="button-demo" @click="locale = longLocale">完整文案</button>
            <button class="button-demo" @click="locale = undefined">全局语言</button>
            <br />
            <br />
        </div>
        <ve-config-provider :locale="locale">
            <ve-pagination :total="600" />
        </ve-config-provider>
    </div>
</template>
<script>
    export default {
        data() {
            return {
                shortLocale: {
                    分页: {
                        前往: "去",
                        合计: (total) => `${total}`,
                    },
                },
                longLocale: {
                    分页: {
                        前往: "跳转到第",
                        合计: (total) => `总共 ${total} 行`,
                    },
                },
                locale: undefined,
            };
        },
    };
</script>
```

:::
