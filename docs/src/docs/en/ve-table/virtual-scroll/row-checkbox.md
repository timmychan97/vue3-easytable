:::anchor Combined with Row Multi-Select

:::demo For row multi-select, the `rowKeyFieldName` property must be specified

```html
<template>
    <div>
        <ve-table
            fixed-header
            :max-height="500"
            :virtual-scroll-option="virtualScrollOption"
            :checkbox-option="checkboxOption"
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
                    enable: true,
                },
                checkboxOption: {
                    // row selection change event
                    selectedRowChange: ({ row, isSelected, selectedRowKeys }) => {
                        console.log(row, isSelected, selectedRowKeys);
                    },
                    // select all change event
                    selectedAllChange: ({ isSelected, selectedRowKeys }) => {
                        console.log(isSelected, selectedRowKeys);
                    },
                },

                columns: [
                    {
                        field: "",
                        key: "a",
                        // type=checkbox
                        type: "checkbox",
                        title: "",
                        width: 50,
                        align: "center",
                    },
                    {
                        field: "name",
                        key: "b",
                        title: "Name",
                        width: 200,
                        align: "left",
                        renderBodyCell: ({ row }, h) => {
                            return <span innerHTML={row.name}></span>;
                        },
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
            initData() {
                let data = [];
                for (let i = 0; i < 10000; i++) {
                    data.push({
                        rowKey: i,
                        name: `name${i}`,
                        hobby: `hobby${i}`,
                        address: `address${i}`,
                    });
                }

                this.tableData = data;
            },
        },
        created() {
            this.initData();
        },
    };
</script>
```

:::