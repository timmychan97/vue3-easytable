:::anchor Controlled Properties

:::demo 1. `selectedRowKey` is the controlled property for radio selection. After selection, you need to reassign its value in the `selectedRowChange` event. This property allows you to customize more features.<br>2. Once the `selectedRowKey` property is set, the `defaultSelectedRowKey` property will be ignored.

```html
<template>
    <div>
        <button class="button-demo" @click="selectedSwitch(1002)">Toggle Row 2 Selection</button>
        <button class="button-demo" @click="unselected()">Deselect</button>
        <br />
        <br />
        <ve-table
            style="width:100%"
            :columns="columns"
            :table-data="tableData"
            :radio-option="radioOption"
            row-key-field-name="rowKey"
        />
    </div>
</template>

<script>
    export default {
        data() {
            return {
                radioOption: {
                    selectedRowKey: "",
                    // Row selection change event
                    selectedRowChange: ({ row }) => {
                        this.changeSelectedRowKey(row.rowKey);
                    },
                },
                columns: [
                    {
                        field: "",
                        key: "a",
                        // type=radio
                        type: "radio",
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
            changeSelectedRowKey(key) {
                this.radioOption.selectedRowKey = key;
            },
            // Toggle selected row
            selectedSwitch(key) {
                let selectedRowKey = this.radioOption.selectedRowKey;

                if (selectedRowKey === key) {
                    this.radioOption.selectedRowKey = "";
                } else {
                    this.radioOption.selectedRowKey = key;
                }
            },
            // Deselect
            unselected() {
                this.radioOption.selectedRowKey = "";
            },
        },
    };
</script>
```

:::
