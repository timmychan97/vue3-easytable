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
Med useVeTable får alle komponentene i appen `$veLocale`. Den endrer bare språket i den appen; den importerte `VeLocale` endrer alle apper (se Internasjonalisering → Språk per app)

```javascript
import enUS from '@vue3-easytable/vue/libs/locale/lang/en-US'
this.$veLocale.use(enUS)
```
