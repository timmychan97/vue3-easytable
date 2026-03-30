:::anchor Fullskjerm-innlasting

:::demo 1. Bruk parameteren `fullscreen` for å vise innlasting i fullskjermmodus<br>2. Bruk parameteren `lock` for å deaktivere muserulle

```html
<template>
    <div>
        <button class="button-demo" @click="show()">Vis innlasting</button>
    </div>
</template>
<script>
    export default {
        data() {
            return {
                loadingInstance: null,
            };
        },
        methods: {
            show() {
                this.loadingInstance.show();

                setTimeout(() => {
                    this.loadingInstance.close();
                }, 2000);
            },
        },
        mounted() {
            this.loadingInstance = this.$veLoading({
                fullscreen: true,
                name: "bounce",
                lock: true,
            });
        },
        destroyed() {
            this.loadingInstance.destroy();
        },
    };
</script>
```

:::
