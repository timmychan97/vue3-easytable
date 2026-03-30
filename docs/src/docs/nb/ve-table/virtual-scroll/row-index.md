::: anchor Problem med radindeks

Etter aktivering av virtuell rulling kan radnumre returneres fra serveren. Hvis tabellen bruker klientside-spørring, kreves noe behandling. Se eksempelet nedenfor for detaljer.

:::demo 1. Rulling utløser `scrolling({ startRowIndex, visibleStartIndex, visibleEndIndex, visibleAboveCount, visibleBelowCount })`. `startRowIndex` er gjeldende startradindeks for rendering, `visibleStartIndex` er startradindeksen i det synlige området, `visibleEndIndex` er sluttradindeksen i det synlige området, `visibleAboveCount` er antall rader rendret over det synlige området, `visibleBelowCount` er antall rader rendret under det synlige området.<br>2. Ved å kombinere metoden `scrolling` med `rowIndex` returnert av `renderBodyCell({ row, column, rowIndex })`, kan det faktiske radnummeret under virtuell rulling beregnes som `rowIndex + startRowIndex + 1`.

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
                // søkeverdi
                searchValue: "",
                // startradindeks
                startRowIndex: 0,
                virtualScrollOption: {
                    // Aktiver eller ikke
                    enable: true,
                    scrolling: this.scrolling,
                },
                // kolonner
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
                // faktiske tabelldata
                tableData: [],
                // kildedata
                sourceData: [],
            };
        },
        methods: {
            // virtuell rulling
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
            // render radindeks
            renderRowIndex({ row, column, rowIndex }) {
                return (
                    <span class="text-bold" style="color:#1890ff;">
                        {rowIndex + this.startRowIndex + 1}
                    </span>
                );
            },

            // søk
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
