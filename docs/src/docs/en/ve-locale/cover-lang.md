:::anchor Override Language Pack

You can modify and extend text content using the `VeLocale.update` method
:::demo

```html
<template>
    <div>
        <div>
            <button class="button-demo" @click="coverLang()">Modify Text</button>
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
