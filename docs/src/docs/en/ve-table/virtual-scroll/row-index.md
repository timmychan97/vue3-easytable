:::anchor Row Index Issue

After enabling virtual scrolling, row numbers can be returned from the server. If the table uses client-side querying, some processing is needed. See the example below for details.

:::demo 1. Scrolling triggers `scrolling({ startRowIndex, visibleStartIndex, visibleEndIndex, visibleAboveCount, visibleBelowCount })`. `startRowIndex` is the current starting row index for rendering, `visibleStartIndex` is the start row index of the visible area, `visibleEndIndex` is the end row index of the visible area, `visibleAboveCount` is the number of rows rendered above the visible area, `visibleBelowCount` is the number of rows rendered below the visible area.<br>2. By combining the `scrolling` method with the `rowIndex` returned by `renderBodyCell({ row, column, rowIndex })`, the actual row number during virtual scrolling can be calculated as `rowIndex + startRowIndex + 1`.

```html
<template>
    <div>
        <el-input style="width:250px" v-model="searchValue" placeholder="search name"></el-input>
        <el-button type="primary" @click="search">Search</el-button>
        <br />
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
    import Mock from "mockjs";
    export default {
        data() {
            return {
                // search value
                searchValue: "",
                // start row index
                startRowIndex: 0,
                virtualScrollOption: {
                    // Enable or not
                    enable: true,
                    scrolling: this.scrolling,
                },
                // columns
                columns: [
                    {
                        field: "index",
                        key: "index",
                        title: "#",
                        width: 200,
                        align: "left",
                        renderBodyCell: this.renderRowIndex,
                    },
                    {
                        field: "name",
                        key: "name",
                        title: "Name",
                        width: 200,
                        align: "left",
                    },
                    {
                        field: "hobby",
                        key: "hobby",
                        title: "Hobby",
                        width: 300,
                        align: "left",
                    },
                    {
                        field: "address",
                        key: "address",
                        title: "Address",
                        width: "",
                        align: "left",
                    },
                ],
                // real table data
                tableData: [],
                // source data
                sourceData: [],
            };
        },
        methods: {
            // virtual scrolling
            scrolling({
                startRowIndex,
                visibleStartIndex,
                visibleEndIndex,
                visibleAboveCount,
                visibleBelowCount,
            }) {
                this.startRowIndex = startRowIndex;
                console.log("startRowIndex::", startRowIndex);
                console.log("visibleStartIndex::", visibleStartIndex);
                console.log("visibleEndIndex::", visibleEndIndex);
                console.log("visibleAboveCount::", visibleAboveCount);
                console.log("visibleBelowCount::", visibleBelowCount);
            },
            // render row index
            renderRowIndex({ row, column, rowIndex }) {
                return (
                    <span class="text-bold" style="color:#1890ff;">
                        {rowIndex + this.startRowIndex + 1}
                    </span>
                );
            },

            // search
            search() {
                const searchValue = this.searchValue;
                this.tableData = this.sourceData.filter(
                    (x) =>
                        !searchValue.length ||
                        x.name.toLowerCase().includes(searchValue.toLowerCase()),
                );
            },

            initData() {
                let data = [];
                for (let i = 0; i < 1000; i++) {
                    data.push({
                        rowKey: i,
                        name: Mock.Random.name(),
                        hobby: `hobby`,
                        address: `address`,
                    });
                }

                this.sourceData = data;
                this.tableData = this.sourceData.slice(0);
            },
        },
        created() {
            this.initData();
        },
    };
</script>
```

:::
