<script>
import Base from './base.md'
import Explain from './explain.md'

export default {
  name: 'BasicMain',
  components: {
    Explain,
    Base,
  },
}
</script>

<template>
  <div>
    <h2>Operation Column</h2>
    <Explain />
    <Base />
  </div>
</template>
