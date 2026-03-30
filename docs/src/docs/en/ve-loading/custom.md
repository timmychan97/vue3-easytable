:::anchor Customization
You can also customize the loading text, background color, and size
:::demo 1. `color` sets the loading effect color<br>2. `tip` sets the loading text<br>3. `overlayBackgroundColor` sets the overlay background color. You can specify [rgba](https://www.w3schools.com/cssref/func_rgba.asp) to make the background transparent

```html
<template>
    <div>
        <button class="button-demo" @click="show()">Show Loading</button>
        <button class="button-demo" @click="close()">Close Loading</button>
        <br />
        <br />
        <div
            id="custom-loading-container"
            style="width:100%;height:250px;background-color:#2980b9;"
        />
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
            },
            close() {
                this.loadingInstance.close();
            },
        },
        mounted() {
            this.loadingInstance = this.$veLoading({
                target: document.querySelector("#custom-loading-container"),
                name: "wave",
                color: "#fff",
                tip: "loading...",
                overlayBackgroundColor: "rgba(255, 255, 255, 0.1)",
            });
            this.show();
        },
        destroyed() {
            this.loadingInstance.destroy();
        },
    };
</script>
```

:::
