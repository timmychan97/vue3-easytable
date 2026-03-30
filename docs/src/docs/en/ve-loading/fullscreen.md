:::anchor Fullscreen Loading

:::demo 1. Use the `fullscreen` parameter to display Loading in fullscreen mode<br>2. Use the `lock` parameter to disable mouse scrolling

```html
<template>
    <div>
        <button class="button-demo" @click="show()">Show Loading</button>
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
