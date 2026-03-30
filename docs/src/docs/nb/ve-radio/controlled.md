:::demo Radiofunksjonalitet

```html
<template>
    <div>
        <div>
            <div class="bold">Kontrollert radio</div>
            <button class="button-demo" @click="test()">Test</button>
            <br />
            <ve-radio isControlled @on-radio-change="radioChange" :isSelected="radioVal">
                Radio
            </ve-radio>
            <div>{{radioVal}}</div>
        </div>
    </div>
</template>

<script>
    export default {
        data() {
            return {
                radioVal: false,
            };
        },
        methods: {
            radioChange(val) {
                this.radioVal = val;
                console.log("radioChange::", val);
            },
            test() {
                this.radioVal = !this.radioVal;
            },
        },
    };
</script>
```

:::
