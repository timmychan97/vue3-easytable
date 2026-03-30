<anchor  label="Basic Functionality"></anchor>
:::demo

```html
<template>
    <ve-select v-model="selectItems1" placeholder="Name" />
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

<anchor  label="Setting Width"></anchor>
:::demo

```html
<template>
    <ve-select v-model="selectItems1" placeholder="Name" :width="120" />
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

<anchor  label="Multi-Select"></anchor>
:::demo

```html
<template>
    <ve-select v-model="selectItems2" is-multiple placeholder="Name" />
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

<anchor  label="Input Dropdown"></anchor>
:::demo

```html
<template>
    <ve-select v-model="selectItems3" placeholder="Name" isInput />
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

<anchor  label="Events"></anchor>
:::demo

```html
<template>
    <ve-select v-model="selectItems1" placeholder="Name" @on-select-change="selectChange" />
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
