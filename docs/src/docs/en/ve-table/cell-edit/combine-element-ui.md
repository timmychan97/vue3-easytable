:::anchor Combined with Element Plus

:::demo 1. You can also combine with Element Plus components for date, number, dropdown, and other editing features<br/>2. Note: The component itself may conflict with third-party library component shortcuts. In this case, you can disable cell selection via `cellSelectionOption`

```html
<template>
    <div>
        <button class="button-demo" @click="submit()">Submit</button>
        <br />
        <br />
        <ve-table
            rowKeyFieldName="rowKey"
            :fixed-header="true"
            :columns="columns"
            :table-data="tableData"
            :cell-selection-option="cellSelectionOption"
            :row-style-option="rowStyleOption"
        />
    </div>
</template>

<script>
    import { ElDatePicker, ElInputNumber, ElOption, ElSelect } from "element-plus";

    export default {
        data() {
            return {
                rowStyleOption: {
                    clickHighlight: false,
                    hoverHighlight: false,
                },
                // submit data
                submitData: [
                    // {
                    //     rowKey: 0,
                    //     field: "",
                    //     value: "",
                    // },
                ],
                cellSelectionOption: {
                    // default true
                    enable: false,
                },
                columns: [
                    {
                        field: "",
                        key: "a",
                        title: "",
                        width: 50,
                        align: "center",
                        operationColumn: true,
                        renderBodyCell: ({ row, column, rowIndex }, h) => {
                            return ++rowIndex;
                        },
                    },
                    {
                        field: "name",
                        key: "name",
                        title: "Name",
                        align: "left",
                        width: "15%",
                    },
                    {
                        field: "date",
                        key: "date",
                        title: "Date",
                        align: "left",
                        width: "15%",
                        renderBodyCell: ({ row, column, rowIndex }, h) => {
                            return (
                                <ElDatePicker
                                    size="small"
                                    modelValue={row["date"]}
                                    onUpdate:modelValue={(val) => {
                                        row["date"] = val;
                                        this.cellDataChange(row, column, val);
                                    }}
                                    type="date"
                                    value-format="YYYY-MM-DD"
                                    placeholder="Select date"
                                />
                            );
                        },
                    },
                    {
                        field: "age",
                        key: "age",
                        title: "Age",
                        align: "center",
                        width: "30%",
                        renderBodyCell: ({ row, column, rowIndex }, h) => {
                            return (
                                <ElInputNumber
                                    size="small"
                                    min={1}
                                    modelValue={row["age"]}
                                    onUpdate:modelValue={(val) => {
                                        row["age"] = val;
                                    }}
                                    onChange={(val) => {
                                        this.cellDataChange(row, column, val);
                                    }}
                                />
                            );
                        },
                    },
                    {
                        field: "gender",
                        key: "gender",
                        title: "Gender",
                        align: "left",
                        width: "40%",
                        renderBodyCell: ({ row, column, rowIndex }, h) => {
                            return (
                                <ElSelect
                                    size="small"
                                    modelValue={row["gender"]}
                                    onUpdate:modelValue={(val) => {
                                        row["gender"] = val;
                                        this.cellDataChange(row, column, val);
                                    }}
                                    placeholder="Select"
                                >
                                    {{
                                        default: () => [
                                            <ElOption label="female" value="female" />,
                                            <ElOption label="male" value="male" />,
                                        ],
                                    }}
                                </ElSelect>
                            );
                        },
                    },
                ],
                // table data
                tableData: [
                    {
                        name: "John",
                        date: "1900-05-20",
                        age: 17,
                        gender: "female",
                        rowKey: 0,
                    },
                    {
                        name: "Dickerson",
                        date: "1910-06-20",
                        age: 20,
                        gender: "male",
                        rowKey: 1,
                    },
                    {
                        name: "Larsen",
                        date: "2000-07-20",
                        age: 22,
                        gender: "female",
                        rowKey: 2,
                    },
                    {
                        name: "Geneva",
                        date: "2010-08-20",
                        age: 18,
                        gender: "male",
                        rowKey: 3,
                    },
                    {
                        name: "Jami",
                        date: "2020-09-20",
                        age: 29,
                        gender: "female",
                        rowKey: 4,
                    },
                ],
            };
        },
        methods: {
            // submit
            submit() {
                alert(JSON.stringify(this.submitData));
            },

            // cell data change
            cellDataChange(row, column, cellValue) {
                const { submitData } = this;

                let currentCell = submitData.find(
                    (x) => x.rowKey === row["rowKey"] && x.field === column.field,
                );

                if (currentCell) {
                    currentCell.value = cellValue;
                } else {
                    let newCell = {
                        rowKey: row["rowKey"],
                        field: column.field,
                        value: cellValue,
                    };
                    this.submitData.push(newCell);
                }
            },
        },
    };
</script>
```

:::
