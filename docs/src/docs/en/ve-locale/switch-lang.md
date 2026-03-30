:::anchor Language Switching

You can implement multi-language support through the VeLocale component. Use the `VeLocale.use` method to switch the current language
:::demo

```html
<template>
    <div>
        <div>
            <button class="button-demo" @click="englishLang()">English</button>
            <button class="button-demo" @click="chineseLang()">Chinese</button>
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
