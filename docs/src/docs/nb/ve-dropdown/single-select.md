Enkeltvalg

:::demo

```html
<template>
    <ve-dropdown hideByItemClick v-model="options">
        <div style="color:blue;cursor: pointer;">Klikk her</div>
    </ve-dropdown>
</template>
<script>
    export default {
        data() {
            return {
                options: [
                    { value: 0, label: "张三" },
                    { value: 1, label: "李四", selected: true },
                    { value: 2, label: "王二" },
                ],
            };
        },
    };
</script>
```

:::

Enkeltvalg med radioknapp

:::demo

```html
<template>
    <ve-dropdown showRadio v-model="options">
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
    };
</script>
```

:::
