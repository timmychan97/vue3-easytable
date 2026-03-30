<anchor  label="Grunnleggende funksjonalitet"></anchor>
:::demo

```html
<template>
    <ve-select v-model="selectItems1" placeholder="Navn" />
</template>
<script>
    export default {
        data() {
            return {
                selectItems1: [
                    { value: 0, label: "张三" },
                    { value: 1, label: "李四" },
                    { value: 2, label: "王二" },
                ],
            };
        },
    };
</script>
```

:::

<anchor  label="Angi bredde"></anchor>
:::demo

```html
<template>
    <ve-select v-model="selectItems1" placeholder="Navn" :width="120" />
</template>
<script>
    export default {
        data() {
            return {
                selectItems1: [
                    { value: 0, label: "张三" },
                    { value: 1, label: "李四" },
                    { value: 2, label: "王二" },
                ],
            };
        },
    };
</script>
```

:::

<anchor  label="Flervalg"></anchor>
:::demo

```html
<template>
    <ve-select v-model="selectItems2" is-multiple placeholder="Navn" />
</template>
<script>
    export default {
        data() {
            return {
                selectItems2: [
                    { value: 0, label: "张三" },
                    { value: 1, label: "李四" },
                    { value: 2, label: "王二" },
                ],
            };
        },
    };
</script>
```

:::

<anchor  label="Nedtrekk med inndatafelt"></anchor>
:::demo

```html
<template>
    <ve-select v-model="selectItems3" placeholder="Navn" isInput />
</template>
<script>
    export default {
        data() {
            return {
                selectItems3: [
                    { value: 0, label: "张三" },
                    { value: 1, label: "李四" },
                    { value: 2, label: "王二" },
                ],
            };
        },
    };
</script>
```

:::

<anchor  label="Hendelser"></anchor>
:::demo

```html
<template>
    <ve-select v-model="selectItems1" placeholder="Navn" @on-select-change="selectChange" />
</template>
<script>
    export default {
        data() {
            return {
                selectItems1: [
                    { value: 0, label: "张三" },
                    { value: 1, label: "李四" },
                    { value: 2, label: "王二" },
                ],
            };
        },
        methods: {
            selectChange(items) {
                console.log("items::", items);
            },
        },
    };
</script>
```

:::
