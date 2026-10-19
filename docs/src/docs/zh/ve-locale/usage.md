:::anchor 使用方法

```javascript
import { useVeTable } from '@vue3-easytable/vue'
import { createApp } from 'vue'
// 引入英文语言包
import enUS from 'vue-easytable/libs/locale/lang/en-US'

createApp(App).use(useVeTable({
  locale: enUS
}))
```

:::anchor 全局使用
使用 useVeTable 后，app 中的每个组件都可以通过 `$veLocale` 修改语言，只影响该 app；导入的 `VeLocale` 会修改所有 app（见 国际化 → 每个 app 单独设置语言）

```javascript
import enUS from 'vue-easytable/libs/locale/lang/en-US'
this.$veLocale.use(enUS)
```
