:::anchor Automatisk tabellhøyde

:::demo Når ingen tabellhøyde er angitt, bestemmes tabellhøyden av innholdet

```html
<template>
    <ve-table :columns="columns" :table-data="tableData" />
</template>

<script>
    export default {
        data() {
            return {
                columns: [
                    { field: "name", key: "a", title: "Name", align: "center" },
                    { field: "date", key: "b", title: "Date", align: "left" },
                    { field: "hobby", key: "c", title: "Hobby", align: "center" },
                    { field: "address", key: "d", title: "Address", align: "left" },
                ],
                tableData: [],
            };
        },
        methods: {
            initTableData() {
                let data = [];
                for (let i = 0; i < 2; i++) {
                    data.push({
                        name: i,
                        date: i,
                        hobby: i,
                        address: i,
                    });
                }
                this.tableData = data;
            },
        },
        created() {
            this.initTableData();
        },
    };
</script>
```

:::