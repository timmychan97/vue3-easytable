Med operasjoner

:::demo

```html
<template>
    <ve-dropdown
        v-model="options"
        show-operation
        confirmFilterText="Filter"
        resetFilterText="Reset"
        is-multiple
        @on-filter-confirm="filterConfirm"
        @on-filter-reset="filterReset"
    >
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
        methods: {
            filterConfirm(items) {
                console.log(items);
            },
            filterReset(items) {
                console.log(items);
            },
        },
    };
</script>
```

:::
