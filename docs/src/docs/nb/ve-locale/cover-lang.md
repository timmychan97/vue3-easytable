:::anchor Overstyr språkpakke

Du kan endre og utvide tekstinnhold ved hjelp av metoden `VeLocale.update`
:::demo

```html
<template>
    <div>
        <div>
            <button class="button-demo" @click="coverLang()">Endre tekst</button>
            <br />
            <br />
        </div>
        <div>
            <ve-pagination :total="600" />
        </div>
    </div>
</template>
<script>
    export default {
        methods: {
            coverLang() {
                const lang = {
                    pagination: {
                        goto: "Go to",
                    },
                };
                this.$veLocale.update(lang);
            },
        },
    };
</script>
```

:::
