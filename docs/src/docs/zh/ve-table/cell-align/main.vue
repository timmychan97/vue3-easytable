<script>
import BasicAlign from './basic-align.md'
import Explain from './explain.md'

export default {
  name: 'CellAlign',
  components: {
    Explain,
    BasicAlign,
  },
}
</script>

<template>
  <div>
    <h2>单元格对齐</h2>
    <Explain />
    <BasicAlign />
  </div>
</template>
