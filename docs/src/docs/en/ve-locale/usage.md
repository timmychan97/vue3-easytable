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
Using useVeTable adds `$veLocale` to every component of the app. It changes the language of that app only; the imported `VeLocale` changes every app (see Internationalization → Language per App)

```javascript
import enUS from '@vue3-easytable/vue/libs/locale/lang/en-US'
this.$veLocale.use(enUS)
```
