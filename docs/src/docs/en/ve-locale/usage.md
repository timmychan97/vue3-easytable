:::anchor Usage

```javascript
import { useVeTable } from '@vue3-easytable/vue'
import { createApp } from 'vue'
// Import English language pack
import enUS from '@vue3-easytable/vue/libs/locale/lang/en-US'

createApp(App).use(useVeTable({
  locale: enUS
}))
```

:::anchor Global Usage
Using useVeTable will automatically mount the veLocale component on Vue's prototype for convenient global access

```javascript
import enUS from '@vue3-easytable/vue/libs/locale/lang/en-US'
this.$veLocale.use(enUS)
```
