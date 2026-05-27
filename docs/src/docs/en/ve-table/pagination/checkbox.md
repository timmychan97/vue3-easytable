:::anchor Combined with Row Multi-Select

:::demo The multi-select logic in this example can refer to [mail.google.com](https://mail.google.com/)

```html
<template>
    <div>
        <div>当前选中的行key：{{selectedRowKeysCollection}}</div>
        <ve-table
            :columns="columns"
            :table-data="currentPageData"
            :checkbox-option="checkboxOption"
            row-key-field-name="rowKey"
        />
        <div class="table-pagination">
            <ve-pagination
                :total="totalCount"
                :page-index="pageIndex"
                :page-size="pageSize"
                @on-page-number-change="pageNumberChange"
                @on-page-size-change="pageSizeChange"
            />
        </div>
    </div>
</template>

<style>
    .table-pagination {
        margin-top: 20px;
        text-align: right;
    }
</style>

<script>
    // Simulation table data from database
    let DB_DATA = [];

    export default {
        data() {
            return {
                pageIndex: 1,
                pageSize: 10,
                selectedRowKeysCollection: [],
                checkboxOption: {
                    selectedRowKeys: [],
                    selectedRowChange: null,
                    selectedAllChange: null,
                },
                columns: [
                    {
                        field: "",
                        key: "a",
                        title: "#",
                        align: "center",
                        renderBodyCell: null,
                    },
                    {
                        field: "",
                        key: "checkbox",
                        type: "checkbox",
                        title: "",
                        width: 50,
                        align: "center",
                    },

                    { field: "name", key: "b", title: "Name", align: "center" },
                    { field: "date", key: "c", title: "Date", align: "left" },
                    { field: "hobby", key: "d", title: "Hobby", align: "left" },
                    { field: "address", key: "e", title: "Address" },
                ],
            };
        },
        computed: {
            currentPageData() {
                const { pageIndex, pageSize } = this;
                return DB_DATA.slice((pageIndex - 1) * pageSize, pageIndex * pageSize);
            },
            totalCount() {
                return DB_DATA.length;
            },
        },
        methods: {
            changeSelectedRowKeys(row, isSelected) {
                const rowKey = row.rowKey;

                if (isSelected) {
                    if (this.checkboxOption.selectedRowKeys.indexOf(rowKey) === -1) {
                        this.checkboxOption.selectedRowKeys.push(rowKey);
                    }
                    if (this.selectedRowKeysCollection.indexOf(rowKey) === -1) {
                        this.selectedRowKeysCollection.push(rowKey);
                    }
                } else {
                    const cbIndex = this.checkboxOption.selectedRowKeys.indexOf(rowKey);
                    if (cbIndex > -1) {
                        this.checkboxOption.selectedRowKeys.splice(cbIndex, 1);
                    }
                    const collIndex = this.selectedRowKeysCollection.indexOf(rowKey);
                    if (collIndex > -1) {
                        this.selectedRowKeysCollection.splice(collIndex, 1);
                    }
                }
            },

            changeSelectAll(isSelected, selectedRowKeys) {
                this.checkboxOption.selectedRowKeys = selectedRowKeys;

                if (isSelected) {
                    const existing = new Set(this.selectedRowKeysCollection);
                    selectedRowKeys.forEach(function (key) {
                        if (!existing.has(key)) {
                            this.selectedRowKeysCollection.push(key);
                        }
                    }, this);
                } else {
                    const currentPageKeys = new Set(
                        this.currentPageData.map(function (item) { return item.rowKey; })
                    );
                    this.selectedRowKeysCollection = this.selectedRowKeysCollection.filter(
                        function (key) { return !currentPageKeys.has(key); }
                    );
                }
            },

            resetSelectedRowKeys() {
                this.checkboxOption.selectedRowKeys = [];

                const selectedRowKeysCollection = this.selectedRowKeysCollection;

                if (selectedRowKeysCollection.length) {
                    this.currentPageData.forEach(function (item) {
                        if (selectedRowKeysCollection.indexOf(item.rowKey) > -1) {
                            this.checkboxOption.selectedRowKeys.push(item.rowKey);
                        }
                    }, this);
                }
            },

            pageNumberChange(pageIndex) {
                this.pageIndex = pageIndex;
                this.resetSelectedRowKeys();
            },

            pageSizeChange(pageSize) {
                this.pageIndex = 1;
                this.pageSize = pageSize;
                this.resetSelectedRowKeys();
            },

            initDatabase() {
                DB_DATA = [];
                for (let i = 0; i < 1000; i++) {
                    DB_DATA.push({
                        rowKey: i,
                        name: "John" + i,
                        date: "1900-05-20",
                        hobby: "coding and coding repeat" + i,
                        address: "No.1 Century Avenue, Shanghai" + i,
                    });
                }
            },
        },
        created() {
            this.initDatabase();

            // Assign callbacks here where `this` is guaranteed to be the
            // component instance (avoids arrow-function capture issues when
            // the demo is compiled at runtime via new Function).
            var self = this;
            this.checkboxOption.selectedRowChange = function (params) {
                self.changeSelectedRowKeys(params.row, params.isSelected);
            };
            this.checkboxOption.selectedAllChange = function (params) {
                self.changeSelectAll(params.isSelected, params.selectedRowKeys);
            };
            this.columns[0].renderBodyCell = function (params) {
                return (self.pageIndex - 1) * self.pageSize + params.rowIndex + 1;
            };
        },
    };
</script>
```

:::
