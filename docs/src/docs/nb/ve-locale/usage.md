:::anchor Bruk

```javascript
import { useVeTable } from '@vue3-easytable/vue'
import { createApp } from 'vue'
// Importer engelsk språkpakke
import enUS from '@vue3-easytable/vue/libs/locale/lang/en-US'

createApp(App).use(useVeTable({
  locale: enUS
}))
```

:::anchor Global bruk
Ved bruk av useVeTable monteres veLocale-komponenten automatisk på Vues prototype for enkel global tilgang

```javascript
import enUS from '@vue3-easytable/vue/libs/locale/lang/en-US'
this.$veLocale.use(enUS)
```
