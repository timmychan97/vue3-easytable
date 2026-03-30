:::anchor Callback Events
:::demo 1. `on-page-number-change` Page number change callback event<br>2. `on-page-size-change` Page size change callback event

```html
<template>
    <ve-pagination
        :total="600"
        @on-page-number-change="pageNumberChange"
        @on-page-size-change="pageSizeChange"
    />
</template>
<script>
    export default {
        methods: {
            pageNumberChange(pageIndex) {
                console.log(pageIndex);
            },

            pageSizeChange(pageSize) {
                console.log(pageSize);
            },
        },
    };
</script>
```

:::
