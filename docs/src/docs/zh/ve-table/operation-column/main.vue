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
    <h2>操作列</h2>
    <Explain />
    <Base />
  </div>
</template>
