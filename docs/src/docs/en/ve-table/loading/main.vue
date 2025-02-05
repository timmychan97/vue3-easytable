<script>
import Basic from './basic.md'
import Explain from './explain.md'

export default {
  name: 'BasicMain',
  components: {
    Explain,
    Basic,
  },
}
</script>

<template>
  <div>
    <h2>Enable Loading</h2>
    <Explain />
    <Basic />
  </div>
</template>
