Custom Content

:::demo

```html
<template>
    <ve-dropdown isCustomContent v-model="options">
        <div style="color:blue;cursor: pointer;">Click here</div>
        <template #custom-content>
            <div>This is custom content</div>
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
