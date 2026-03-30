:::anchor Språkbytte

Du kan implementere flerspråklig støtte via VeLocale-komponenten. Bruk metoden `VeLocale.use` for å bytte gjeldende språk
:::demo

```html
<template>
    <div>
        <div>
            <button class="button-demo" @click="englishLang()">Engelsk</button>
            <button class="button-demo" @click="chineseLang()">Kinesisk</button>
            <br />
            <br />
        </div>
        <div>
            <ve-pagination :total="600" />
        </div>
    </div>
</template>
<script>
    import zhCN from "@vue3-easytable/vue/libs/locale/lang/zh-CN";
    import enUS from "@vue3-easytable/vue/libs/locale/lang/en-US";

    export default {
        methods: {
            englishLang() {
                this.$veLocale.use(enUS);
            },
            chineseLang() {
                this.$veLocale.use(zhCN);
            },
        },
    };
</script>
```

:::
