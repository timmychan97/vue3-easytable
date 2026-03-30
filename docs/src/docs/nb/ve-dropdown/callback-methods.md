Tilbakekallsfunksjoner

:::demo

```html
<template>
    <ve-dropdown hideByItemClick :beforeVisibleChange="beforeVisibleChange" v-model="options">
        <div style="color:blue;cursor: pointer;">Klikk her</div>
    </ve-dropdown>
</template>
<script>
    export default {
        data() {
            return {
                options: [
                    { value: 0, label: "张三" },
                    { value: 1, label: "李四" },
                    { value: 2, label: "王二" },
                ],
            };
        },
        methods: {
            beforeVisibleChange({ nextVisible }) {
                console.log("nextVisible::", nextVisible);
            },
        },
    };
</script>
```

:::
