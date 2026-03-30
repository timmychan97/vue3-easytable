:::anchor Dynamically Enable or Disable Virtual Scrolling

If you need to dynamically enable or disable virtual scrolling, simply modify `virtualScrollOption.enable`. Open F12 to inspect the rendering result.

:::demo

```html
<template>
    <div>
        <el-button @click="switchVirtual(1)">Enable Virtual Scrolling</el-button>
        <el-button @click="switchVirtual(0)">Disable Virtual Scrolling</el-button>
        <br />
        <br />
        <div>Virtual scrolling status: {{ virtualScrollOption.enable ? "Enabled" : "Disabled" }}</div>
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
                    // enable
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