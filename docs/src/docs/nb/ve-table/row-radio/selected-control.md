::: anchor Kontrollerte egenskaper

:::demo 1. `selectedRowKey` er den kontrollerte egenskapen for radiovalg. Etter valg må du tilordne verdien på nytt i hendelsen `selectedRowChange`. Denne egenskapen lar deg tilpasse flere funksjoner.<br>2. Når egenskapen `selectedRowKey` er satt, vil egenskapen `defaultSelectedRowKey` ignoreres.

```html
<template>
    <div>
        <button class="button-demo" @click="selectedSwitch(1002)">Veksle rad 2 valg</button>
        <button class="button-demo" @click="unselected()">Fjern valg</button>
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
                    // Hendelse for endring av radvalg
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
            // Veksle valgt rad
            selectedSwitch(key) {
                let selectedRowKey = this.radioOption.selectedRowKey;

                if (selectedRowKey === key) {
                    this.radioOption.selectedRowKey = "";
                } else {
                    this.radioOption.selectedRowKey = key;
                }
            },
            // Fjern valg
            unselected() {
                this.radioOption.selectedRowKey = "";
            },
        },
    };
</script>
```

:::
