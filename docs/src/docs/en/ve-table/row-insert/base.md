:::anchor Base Usage

:::demo Hover over the index column (leftmost column) to see the row insert indicator. Click the plus button to insert a new row at that position.

```html
<template>
    <div>
        <ve-table
            :columns="columns"
            :table-data="tableData"
            row-key-field-name="rowKey"
            :row-insert-option="rowInsertOption"
            :max-height="300"
            @on-row-insert="handleRowInsert"
        />
    </div>
</template>

<script>
    export default {
        data() {
            return {
                rowInsertOption: {
                    enable: true,
                    beforeInsertRow: ({ insertRowIndex }) => {
                        console.log('Before insert at index:', insertRowIndex);
                        return true; // Return false to cancel insertion
                    },
                    afterInsertRow: ({ insertRowIndex }) => {
                        console.log('After insert at index:', insertRowIndex);
                    },
                },
                columns: [
                    {
                        field: "",
                        key: "index",
                        title: "#",
                        width: 50,
                        align: "center",
                        operationColumn: true,
                        renderBodyCell: ({ row, column, rowIndex }, h) => {
                            return rowIndex + 1;
                        },
                    },
                    {
                        field: "name",
                        key: "name",
                        title: "Name",
                        width: 150,
                        align: "left",
                    },
                    {
                        field: "date",
                        key: "date",
                        title: "Date",
                        width: 150,
                        align: "left",
                    },
                    {
                        field: "hobby",
                        key: "hobby",
                        title: "Hobby",
                        width: 200,
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
                tableData: [
                    {
                        rowKey: 1001,
                        name: "John",
                        date: "1900-05-20",
                        hobby: "coding",
                        address: "No.1 Century Avenue, Shanghai",
                    },
                    {
                        rowKey: 1002,
                        name: "Dickerson",
                        date: "1910-06-20",
                        hobby: "coding",
                        address: "No.1 Century Avenue, Beijing",
                    },
                    {
                        rowKey: 1003,
                        name: "Larsen",
                        date: "2000-07-20",
                        hobby: "coding and coding repeat",
                        address: "No.1 Century Avenue, Chongqing",
                    },
                    {
                        rowKey: 1004,
                        name: "Geneva",
                        date: "2010-08-20",
                        hobby: "coding and coding repeat",
                        address: "No.1 Century Avenue, Xiamen",
                    },
                    {
                        rowKey: 1005,
                        name: "Jami",
                        date: "2020-09-20",
                        hobby: "coding and coding repeat",
                        address: "No.1 Century Avenue, Shenzhen",
                    },
                ],
            };
        },
        methods: {
            handleRowInsert({ insertRowIndex }) {
                const newRow = {
                    rowKey: Date.now(),
                    name: "New Row",
                    date: new Date().toISOString().split('T')[0],
                    hobby: "",
                    address: "",
                };
                this.tableData.splice(insertRowIndex, 0, newRow);
            },
        },
    };
</script>
```

:::

