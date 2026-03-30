:::anchor Dynamisk aktivering eller deaktivering av virtuell rulling

Hvis du trenger å dynamisk aktivere eller deaktivere virtuell rulling, endrer du bare `virtualScrollOption.enable`. Åpne F12 for å inspisere renderingsresultatet.

:::demo

```html
<template>
    <div>
        <el-button @click="switchVirtual(1)">Aktiver virtuell rulling</el-button>
        <el-button @click="switchVirtual(0)">Deaktiver virtuell rulling</el-button>
        <br />
        <br />
        <div>Status for virtuell rulling: {{ virtualScrollOption.enable ? "Aktivert" : "Deaktivert" }}</div>
        <br />
        <ve-table
            :max-height="500"
            :virtual-scroll-option="virtualScrollOption"
            :columns="columns"
            :table-data="tableData"
            row-key-field-name="rowKey"
        />
    </div>
</template>

<script>
    export default {
        data() {
            return {
                virtualScrollOption: {
                    // aktiver
                    enable: false,
                },
                columns: [
                    {
                        field: "index",
                        key: "a",
                        title: "#",
                        width: 100,
                        align: "left",
                    },
                    {
                        field: "name",
                        key: "b",
                        title: "Name",
                        width: 200,
                        align: "left",
                    },
                    {
                        field: "hobby",
                        key: "c",
                        title: "Hobby",
                        width: 300,
                        align: "left",
                    },
                    {
                        field: "address",
                        key: "d",
                        title: "Address",
                        width: "",
                        align: "left",
                    },
                ],
                tableData: [],
            };
        },
        methods: {
            // switch virtual scroll
            switchVirtual(enable) {
                this.virtualScrollOption.enable = enable ? true : false;
            },
            // createTableData
            createTableData() {
                let data = [];
                for (let i = 0; i < 100; i++) {
                    data.push({
                        rowKey: i,
                        index: i,
                        name: `name${i}`,
                        hobby: `hobby${i}`,
                        address: `address${i}`,
                    });
                }

                this.tableData = data;
            },
        },

        mounted() {
            this.createTableData();
        },
    };
</script>
```

:::