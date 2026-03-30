## Quick Start

:::anchor Installation via npm & yarn

```bash
npm install @vue3-easytable/vue
```

or

```bash
pnpm add @vue3-easytable/vue
```

or

```bash
yarn add @vue3-easytable/vue
```

:::anchor Usage

#### Full Import

Add the following to your main.js:

```javascript
// Import the component library
import { useVeTable } from '@vue3-easytable/vue'
import { createApp } from 'vue'
// Import styles
import '@vue3-easytable/vue/libs/theme-default/index.css'

createApp({
  render: h => h(App),
})
  .use(useVeTable())
  .mount('#app')
```

The above code completes the import of @vue3-easytable/vue. Don't forget to import the style file.

#### On-demand Import

Add the following to your main.js:

```javascript
// Import the component library
import { VeIcon, VeLoading, VeLocale, VePagination, VeTable } from '@vue3-easytable/vue'
import { createApp } from 'vue'
// Import styles
import '@vue3-easytable/vue/libs/theme-default/index.css'

Vue.use(VeTable)
Vue.use(VePagination)
Vue.use(VeIcon)
Vue.use(VeLoading)

Vue.prototype.$veLoading = VeLoading
Vue.prototype.$veLocale = VeLocale

new Vue({
  el: '#app',
  render: h => h(App),
})
```

#### Example

:::demo

```html
<template>
    <ve-table :columns="columns" :table-data="tableData" />
</template>

<script>
    export default {
        data() {
            return {
                columns: [
                    { field: "name", key: "a", title: "Name", align: "center" },
                    { field: "date", key: "b", title: "Date", align: "left" },
                    {
                        field: "hobby",
                        key: "c",
                        title: "Hobby",
                        align: "right",
                    },
                    {
                        field: "address",
                        key: "d",
                        title: "Address",
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

:::anchor Usage via CDN

You can view the latest version resources of @vue3-easytable/vue at [https://unpkg.com/@vue3-easytable/vue/](https://unpkg.com/@vue3-easytable/vue/). You can also switch versions to select the resources you need. Include the JS and CSS files on your page to get started:

```html
<!-- Import styles -->
<link rel="stylesheet" href="https://unpkg.com/@vue3-easytable/vue/libs/theme-default/index.css">
<!-- Import Vue -->
<script src="https://cdn.jsdelivr.net/npm/vue@3"></script>
<!-- Import the component library -->
<script src="https://unpkg.com/@vue3-easytable/vue/libs/umd/index.js"></script>
```

#### Example

```html
<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8" />
        <!-- Import styles -->
        <link
            rel="stylesheet"
            href="https://unpkg.com/@vue3-easytable/vue/libs/theme-default/index.css"
        />
    </head>
    <body>
        <div id="app">
            <ve-table :columns="columns" :table-data="tableData"></ve-table>
        </div>
    </body>
    <!-- Import Vue -->
    <script src="https://cdn.jsdelivr.net/npm/vue@3"></script>
    <!-- Import the component library -->
    <script src="https://unpkg.com/@vue3-easytable/vue/libs/umd/vue3-easytable-vue.js"></script>
    <script>
        const { createApp } = Vue
        const { useVeTable } = EasytableVue

        createApp({
            data: function () {
                return {
                    columns: [
                        {
                            field: "name",
                            key: "a",
                            title: "Name",
                            align: "center",
                        },
                        {
                            field: "date",
                            key: "b",
                            title: "Date",
                            align: "left",
                        },
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
        })
        .use(useVeTable())
        .mount("#app");
    </script>
</html>
```

:::anchor WSL Development

If you are developing in WSL (Windows Subsystem for Linux), simply run the following in the WSL terminal:

```bash
# Install pnpm (if not already installed)
npm install -g pnpm@latest

# Clone the repository and install dependencies
git clone https://github.com/timmychan97/vue3-easytable.git
cd vue3-easytable
pnpm install

# Start the documentation dev server
pnpm docs
# Open http://localhost:5173 in your browser
```

WSL2 automatically forwards ports to Windows, so you can access `localhost` directly in your Windows browser.

:::anchor Docker Development

If you use Docker for development, there is no need to manually install Node.js or pnpm. The project root provides a `Dockerfile` and `docker-compose.yml`:

```bash
# Clone the repository
git clone https://github.com/timmychan97/vue3-easytable.git
cd vue3-easytable

# Start the documentation dev server
docker compose up docs

# Open http://localhost:5173 in your browser
```

**Common commands:**

| Scenario | Command |
| --- | --- |
| Start dev server | `docker compose up docs` |
| Rebuild after dependency changes | `docker compose up --build docs` |
| Clear cache and rebuild | `docker compose down -v` then `docker compose up --build docs` |
| Run tests inside the container | `docker compose exec docs pnpm test` |

:::anchor Browser Compatibility
Supports modern browsers and IE11+ by default
