:::anchor Innlasting i container
Vis innlastingseffekten inne i containere som tabeller
:::demo 1. Bruk parameteren `target` til å angi innlastingscontaineren. `target` kan være et DOM-element eller en strengselektor (en streng som kan hentes via `document.querySelector`)<br>2. Parameteren `name` angir navn på innlastingseffekttype<br>3. Innlastingsinstansen inneholder tre metoder: `show`, `close` og `destroy`

```html
<template>
    <div>
        <button class="button-demo" @click="show()">Vis innlasting</button>
        <button class="button-demo" @click="close()">Lukk innlasting</button>
        <br />
        <br />
        <ve-table id="loading-container" :columns="columns" :table-data="tableData" />
    </div>
</template>
<script>
    export default {
        data() {
            return {
                loadingInstance: null,
                columns: [
                    { field: "name", key: "a", title: "Name", align: "center" },
                    { field: "date", key: "b", title: "Date", align: "left" },
                    {
                        field: "hobby",
                        key: "c",
                        title: "Hobby",
                        align: "right",
                    },
                    { field: "address", key: "d", title: "Address" },
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
        methods: {
            show() {
                this.loadingInstance.show();
            },
            close() {
                this.loadingInstance.close();
            },
        },
        mounted() {
            this.loadingInstance = this.$veLoading({
                target: document.querySelector("#loading-container"),
                // tilsvarer
                // target:"#loading-container"
                name: "wave",
            });
            this.show();
        },
        destroyed() {
            this.loadingInstance.destroy();
        },
    };
</script>
```

:::
