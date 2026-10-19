:::anchor Usage

`VeConfigProvider` sets the language of every component inside it, such as `ve-table` and `ve-pagination`. It does not change the global language set with `VeLocale.use`, so components outside the provider keep the global language.

The `locale` prop is merged on top of the outer language: the nearest outer `VeConfigProvider`, else the app's language (`useVeTable({ locale })`), else the global language. Pass a full language pack, or only the keys you want to change. The object you pass is never modified.

:::demo The pagination inside the provider uses its own texts. The one below it uses the global language.

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
                        前往: "Jump to",
                        合计: (total) => `${total} rows in total`,
                    },
                },
            };
        },
    };
</script>
```

:::
