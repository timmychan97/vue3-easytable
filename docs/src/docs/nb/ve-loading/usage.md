:::anchor Bruk
Importer der det er nødvendig

```javascript
import Vue from 'vue'
import { veLoading } from '@vue3-easytable/vue'
```

Kall

```javascript
veLoading({
  target: '#loading-1',
  name: 'grid',
  tip: 'loading...',
})
```

:::anchor Global bruk
Monter veLoading-komponenten på Vues prototype for enkel global tilgang

```javascript
import Vue from 'vue'
import { veLoading } from '@vue3-easytable/vue'

Vue.prototype.$veLoading = veLoading
```

Kall

```javascript
this.$veLoading({
  target: '#loading-1',
  name: 'grid',
  tip: 'loading...',
})
```
