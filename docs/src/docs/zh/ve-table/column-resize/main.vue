<script lang="ts">
import API from '../api/column-width-resize-option-props.vue'
import Basic from './basic.md'
import DisableResizing from './disable-resizing.md'
import Explain from './explain.md'

export default {
  name: 'BasicMain',
  components: {
    Explain,
    Basic,
    DisableResizing,
    API,
  },
}
</script>

<template>
  <div>
    <h2>列宽拖动</h2>
    <Explain />
    <Basic />
    <DisableResizing />
    <API title="API" anchor="API" />
  </div>
</template>
