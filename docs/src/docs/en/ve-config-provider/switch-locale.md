:::anchor Switching the language

`locale` is reactive: when it changes, the components inside the provider update right away. Without `locale`, the provider passes the outer language through.

:::demo

```html
<template>
    <div>
        <div>
            <button class="button-demo" @click="locale = shortLocale">Short texts</button>
            <button class="button-demo" @click="locale = longLocale">Long texts</button>
            <button class="button-demo" @click="locale = undefined">Global language</button>
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
                        前往: "Go",
                        合计: (total) => `${total}`,
                    },
                },
                longLocale: {
                    分页: {
                        前往: "Go to page",
                        合计: (total) => `${total} rows in total`,
                    },
                },
                locale: undefined,
            };
        },
    };
</script>
```

:::
