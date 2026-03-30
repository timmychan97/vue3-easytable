:::anchor With Event Handling

:::demo Use the `@on-row-insert` event to handle row insertion. The event provides `insertRowIndex`, indicating where the new row should be inserted.

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
        <p style="margin-top: 10px;">总行数: {{ tableData.length }}</p>
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
                        title: "姓名",
                        width: 150,
                        align: "left",
                    },
                    {
                        field: "date",
                        key: "date",
                        title: "日期",
                        width: 150,
                        align: "left",
                    },
                    {
                        field: "hobby",
                        key: "hobby",
                        title: "爱好",
                        width: 200,
                        align: "left",
                    },
                    {
                        field: "address",
                        key: "address",
                        title: "地址",
                        width: "",
                        align: "left",
                    },
                ],
                tableData: [
                    {
                        rowKey: 1001,
                        name: "张三",
                        date: "1900-05-20",
                        hobby: "编程",
                        address: "上海市世纪大道1号",
                    },
                    {
                        rowKey: 1002,
                        name: "李四",
                        date: "1910-06-20",
                        hobby: "编程",
                        address: "北京市世纪大道1号",
                    },
                    {
                        rowKey: 1003,
                        name: "王五",
                        date: "2000-07-20",
                        hobby: "编程、重复编程",
                        address: "重庆市世纪大道1号",
                    },
                ],
            };
        },
        methods: {
            handleRowInsert({ insertRowIndex }) {
                const newRow = {
                    rowKey: Date.now(),
                    name: "新行",
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
