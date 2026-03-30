:::anchor Pixel Column Width

:::demo 1. When column width is set as a pixel value (px), cell width scales according to the pixel ratio. If you do not want scaling, set the outer container width<br>2. When setting pixel values, remember not to include units

```html
<template>
    <ve-table
        :columns="columns"
        :table-data="tableData"
        :border-around="true"
        :border-x="true"
        :border-y="true"
    />
</template>

<script>
    export default {
        data() {
            return {
                columns: [
                    {
                        field: "name",
                        key: "a",
                        title: "Name 400px",
                        width: 400,
                    },
                    { field: "date", key: "b", title: "Tel 200px", width: 200 },
                    {
                        field: "hobby",
                        key: "c",
                        title: "Hobby 200px",
                        width: 200,
                    },
                    {
                        field: "address",
                        key: "d",
                        title: "Address 200px",
                        width: 200,
                    },
                ],
                tableData: [
                    {
                        name: "John",
                        date: "1900-05-20",
                        hobby: "coding and coding repeat",
                        address: "No.1 Century Avenue, Shanghai",
                    },
                    {
                        name: "Dickerson",
                        date: "1910-06-20",
                        hobby: "coding and coding repeat",
                        address: "No.1 Century Avenue, Beijing",
                    },
                    {
                        name: "Larsen",
                        date: "2000-07-20",
                        hobby: "coding and coding repeat",
                        address: "No.1 Century Avenue, Chongqing",
                    },
                    {
                        name: "Geneva",
                        date: "2010-08-20",
                        hobby: "coding and coding repeat",
                        address: "No.1 Century Avenue, Xiamen",
                    },
                    {
                        name: "Jami",
                        date: "2020-09-20",
                        hobby: "coding and coding repeat",
                        address: "No.1 Century Avenue, Shenzhen",
                    },
                ],
            };
        },
    };
</script>
```

:::
