Egendefinert innhold

:::demo

```html
<template>
    <ve-dropdown isCustomContent v-model="options">
        <div style="color:blue;cursor: pointer;">Klikk her</div>
        <template #custom-content>
            <div>Dette er egendefinert innhold</div>
        </template>
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
