:::anchor Usage
Import where needed

```javascript
import Vue from 'vue'
import { veLoading } from '@vue3-easytable/vue'
```

Call

```javascript
veLoading({
  target: '#loading-1',
  name: 'grid',
  tip: 'loading...',
})
```

:::anchor Global Usage
Mount the veLoading component on Vue's prototype for convenient global access

```javascript
import Vue from 'vue'
import { veLoading } from '@vue3-easytable/vue'

Vue.prototype.$veLoading = veLoading
```

Call

```javascript
this.$veLoading({
  target: '#loading-1',
  name: 'grid',
  tip: 'loading...',
})
```
