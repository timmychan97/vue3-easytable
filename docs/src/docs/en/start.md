## Quick Start

:::anchor npm & yarn

```javascript
npm install vue-easytable
```

or

```javascript
yarn add vue-easytable
```

:::anchor Usage

#### Fully import

Write the following in main.js：

```javascript
import Vue from 'vue'
import VueEasytable from 'vue-easytable' // import library
import 'vue-easytable/libs/theme-default/index.css' // import style

Vue.use(VueEasytable)

new Vue({
  el: '#app',
  render: h => h(App),
})
```

The above code completes the introduction of vue-easytable.Don't forget to import style files.

#### On demand

Write the following in main.js：

```javascript
import Vue from 'vue'
import { VeIcon, VeLoading, VeLocale, VePagination, VeTable } from 'vue-easytable' // import library

import 'vue-easytable/libs/theme-default/index.css' // import style

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
    };
</script>
```

:::

:::anchor Usage By CDN

Through [https://unpkg.com/vue-easytable/](https://unpkg.com/vue-easytable/), you can see the resources of the latest version of Vue vue3-easytable,You can also switch versions to select the required resources,You can start using JS and CSS files on the page

```css
<!-- import style -->
<link rel="stylesheet" href="https://unpkg.com/vue-easytable/libs/theme-default/index.css">
<!-- import Vue -->
<script src="https://cdn.jsdelivr.net/npm/vue@2"></script>
<!-- import library -->
<script src="https://unpkg.com/vue-easytable/libs/umd/index.js"></script>
```

#### Example

```html
<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8" />
        <!-- import style -->
        <link
            rel="stylesheet"
            href="https://unpkg.com/vue-easytable/libs/theme-default/index.css"
        />
    </head>
    <body>
        <div id="app">
            <ve-table :columns="columns" :table-data="tableData"></ve-table>
        </div>
    </body>
    <!-- import Vue -->
    <script src="https://cdn.jsdelivr.net/npm/vue@2"></script>
    <!-- import library -->
    <script src="https://unpkg.com/vue-easytable/libs/umd/index.js"></script>
    <script>
        new Vue({
            el: "#app",
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
        });
    </script>
</html>
```

:::anchor WSL Development

If you develop in WSL (Windows Subsystem for Linux), run directly from the WSL terminal:

```bash
# Install pnpm (if not already installed)
npm install -g pnpm@latest

# Clone the repository and install dependencies
git clone https://github.com/timmychan97/vue3-easytable.git
cd vue3-easytable
pnpm install

# Start the docs dev server
pnpm docs
# Open http://localhost:5173 in your browser
```

WSL2 automatically forwards ports to Windows, so you can access `localhost` directly from your Windows browser.

:::anchor Docker Development

If you use Docker for development, there's no need to install Node.js or pnpm manually. The project includes a `Dockerfile` and `docker-compose.yml` at the root:

```bash
# Clone the repository
git clone https://github.com/timmychan97/vue3-easytable.git
cd vue3-easytable

# Start the docs dev server
docker compose up docs

# Open http://localhost:5173 in your browser
```

**Common commands:**

| Scenario | Command |
| --- | --- |
| Start dev server | `docker compose up docs` |
| Rebuild after dependency changes | `docker compose up --build docs` |
| Clean cache and rebuild | `docker compose down -v` then `docker compose up --build docs` |
| Run tests inside container | `docker compose exec docs pnpm test` |

:::anchor Browser Compatible
Support modern browser and ie10 and above
