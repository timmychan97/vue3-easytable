:::anchor Nested providers

Providers can be nested. The innermost provider wins for the keys it sets, and every other key comes from the outer provider.

:::demo The inner pagination changes only "Go to", and keeps the total text of the outer provider.

```html
<template>
    <div>
        <ve-config-provider :locale="outerLocale">
            <ve-pagination :total="600" />
            <br />
            <ve-config-provider :locale="innerLocale">
                <ve-pagination :total="600" />
            </ve-config-provider>
        </ve-config-provider>
    </div>
</template>
<script>
    export default {
        data() {
            return {
                outerLocale: {
                    分页: {
                        前往: "Outer: go to",
                        合计: (total) => `Outer: ${total} rows`,
                    },
                },
                innerLocale: {
                    分页: {
                        前往: "Inner: go to",
                    },
                },
            };
        },
    };
</script>
```

:::
