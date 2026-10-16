:::anchor Bytte språk

`locale` er reaktiv: når den endres, oppdateres komponentene inni med en gang. Uten `locale` sender provideren språket utenfor videre.

:::demo

```html
<template>
    <div>
        <div>
            <button class="button-demo" @click="locale = shortLocale">Korte tekster</button>
            <button class="button-demo" @click="locale = longLocale">Lange tekster</button>
            <button class="button-demo" @click="locale = undefined">Globalt språk</button>
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
                        前往: "Gå",
                        合计: (total) => `${total}`,
                    },
                },
                longLocale: {
                    分页: {
                        前往: "Gå til side",
                        合计: (total) => `${total} rader til sammen`,
                    },
                },
                locale: undefined,
            };
        },
    };
</script>
```

:::
