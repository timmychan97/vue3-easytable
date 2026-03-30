:::anchor Tilpasning
Du kan også tilpasse innlastingstekst, bakgrunnsfarge og størrelse
:::demo 1. `color` setter fargen på innlastingseffekten<br>2. `tip` setter innlastingsteksten<br>3. `overlayBackgroundColor` setter bakgrunnsfargen på overlegget. Du kan bruke [rgba](https://www.w3schools.com/cssref/func_rgba.asp) for å gjøre bakgrunnen gjennomsiktig

```html
<template>
    <div>
        <button class="button-demo" @click="show()">Vis innlasting</button>
        <button class="button-demo" @click="close()">Lukk innlasting</button>
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
