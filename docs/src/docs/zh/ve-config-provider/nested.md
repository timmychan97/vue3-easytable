:::anchor 嵌套使用

提供者可以嵌套。对于设置了的键，以最内层的提供者为准，其余的键沿用外层提供者。

:::demo 内层分页只修改了“前往”，合计文案沿用外层提供者。

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
                        前往: "外层：前往",
                        合计: (total) => `外层：共 ${total} 行`,
                    },
                },
                innerLocale: {
                    分页: {
                        前往: "内层：前往",
                    },
                },
            };
        },
    };
</script>
```

:::
