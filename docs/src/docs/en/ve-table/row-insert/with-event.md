:::anchor With Event Handler

:::demo Use the `@on-row-insert` event to handle row insertion. The event provides the `insertRowIndex` which indicates where the new row should be inserted.

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
        <p style="margin-top: 10px;">Total rows: {{ tableData.length }}</p>
    </div>
</template>

<script>
    export default {
        data() {
            return {
                rowInsertOption: {
                    enable: true,
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

