<script>
import BaseMd from './base.md'
import Explain from './explain.md'

export default {
  name: 'BasicMain',
  components: {
    Explain,
    BaseMd,
  },
}
</script>

<template>
  <div>
    <h2>操作列</h2>
    <Explain />
    <BaseMd />
  </div>
</template>
