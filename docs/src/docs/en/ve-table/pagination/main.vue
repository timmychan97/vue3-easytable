<script>
import Basic from './basic.md'
import Checkbox from './checkbox.md'
import Explain from './explain.md'

export default {
  name: 'BasicMain',
  components: {
    Explain,
    Basic,
    Checkbox,
  },
}
</script>

<template>
  <div>
    <h2>Combining Pagination</h2>
    <Explain />
    <Basic />
    <Checkbox />
  </div>
</template>
