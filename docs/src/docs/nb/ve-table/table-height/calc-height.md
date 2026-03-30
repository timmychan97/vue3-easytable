:::anchor Dynamisk tabellhøyde (calc CSS-funksjon)

:::demo 1. Du kan bruke [calc CSS-funksjonen](<https://developer.mozilla.org/en-US/docs/Web/CSS/calc()>) for å oppnå dynamisk tabellhøyde<br>2. Prøv å endre nettleservinduets størrelse for å se effekten

```html
<template>
    <ve-table
        max-height="calc(100vh - 350px)"
        fixed-header
        :columns="columns"
        :table-data="tableData"
    />
</template>

<script>
    export default {
        data() {
            return {
                columns: [
                    { field: "name", key: "a", title: "Name", align: "center" },
                    { field: "date", key: "b", title: "Date", align: "left" },
                    {
                        field: "hobby",
                        key: "c",
                        title: "Hobby",
                        align: "center",
                    },
                    {
                        field: "address",
                        key: "d",
                        title: "Address",
                        align: "left",
                    },
                ],
                tableData: [],
            };
        },
        methods: {
            initTableData() {
                let data = [];
                for (let i = 0; i < 20; i++) {
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