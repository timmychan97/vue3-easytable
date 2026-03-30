## Kom i gang

:::anchor Installasjon via npm og yarn

```bash
npm install @vue3-easytable/vue
```

eller

```bash
pnpm add @vue3-easytable/vue
```

eller

```bash
yarn add @vue3-easytable/vue
```

:::anchor Bruk

#### Full import

Legg til folgende i main.js:

```javascript
// Importer komponentbiblioteket
import { useVeTable } from '@vue3-easytable/vue'
import { createApp } from 'vue'
// Importer stiler
import '@vue3-easytable/vue/libs/theme-default/index.css'

createApp({
  render: h => h(App),
})
  .use(useVeTable())
  .mount('#app')
```

Koden ovenfor fullforer importen av @vue3-easytable/vue. Ikke glem a importere stilfilen.

#### Import ved behov

Legg til folgende i main.js:

```javascript
// Importer komponentbiblioteket
import { VeIcon, VeLoading, VeLocale, VePagination, VeTable } from '@vue3-easytable/vue'
import { createApp } from 'vue'
// Importer stiler
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

#### Eksempel

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

:::anchor Bruk via CDN

Du kan se de nyeste versjonsressursene for @vue3-easytable/vue pa [https://unpkg.com/@vue3-easytable/vue/](https://unpkg.com/@vue3-easytable/vue/). Du kan ogsa bytte versjon for a velge ressursene du trenger. Inkluder JS- og CSS-filene pa siden din for a komme i gang:

```html
<!-- Importer stiler -->
<link rel="stylesheet" href="https://unpkg.com/@vue3-easytable/vue/libs/theme-default/index.css">
<!-- Importer Vue -->
<script src="https://cdn.jsdelivr.net/npm/vue@3"></script>
<!-- Importer komponentbiblioteket -->
<script src="https://unpkg.com/@vue3-easytable/vue/libs/umd/index.js"></script>
```

#### Eksempel

```html
<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8" />
        <!-- Importer stiler -->
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
    <!-- Importer Vue -->
    <script src="https://cdn.jsdelivr.net/npm/vue@3"></script>
    <!-- Importer komponentbiblioteket -->
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

:::anchor WSL-utvikling

Hvis du utvikler i WSL (Windows Subsystem for Linux), kjor ganske enkelt folgende i WSL-terminalen:

```bash
# Installer pnpm (hvis ikke allerede installert)
npm install -g pnpm@latest

# Klon repositoriet og installer avhengigheter
git clone https://github.com/timmychan97/vue3-easytable.git
cd vue3-easytable
pnpm install

# Start dokumentasjonsutviklingsserveren
pnpm docs
# Apne http://localhost:5173 i nettleseren
```

WSL2 videresender porter automatisk til Windows, sa du kan aksessere `localhost` direkte i Windows-nettleseren.

:::anchor Docker-utvikling

Hvis du bruker Docker til utvikling, er det ikke nodvendig a installere Node.js eller pnpm manuelt. Prosjektroten inneholder en `Dockerfile` og `docker-compose.yml`:

```bash
# Klon repositoriet
git clone https://github.com/timmychan97/vue3-easytable.git
cd vue3-easytable

# Start dokumentasjonsutviklingsserveren
docker compose up docs

# Apne http://localhost:5173 i nettleseren
```

**Vanlige kommandoer:**

| Scenario | Kommando |
| --- | --- |
| Start utviklingsserver | `docker compose up docs` |
| Bygg pa nytt etter avhengighetsendringer | `docker compose up --build docs` |
| Tom hurtigbuffer og bygg pa nytt | `docker compose down -v` deretter `docker compose up --build docs` |
| Kjor tester inne i containeren | `docker compose exec docs pnpm test` |

:::anchor Nettleserkompatibilitet
Stotter moderne nettlesere og IE11+ som standard
