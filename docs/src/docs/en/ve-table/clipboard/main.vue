<script>
import API from '../api/clipboard-option-props.vue'
import BaseMd from './base.md'
import Explain from './explain.md'
import ShortCuts from './shortcuts.md'

export default {
  name: 'BasicMain',
  components: {
    Explain,
    ShortCuts,
    BaseMd,
    API,
  },
}
</script>

<template>
  <div>
    <h2>Clipboard</h2>
    <Explain />
    <ShortCuts />
    <BaseMd />
    <API title="API" anchor="API" desc="clipboardOption" />
  </div>
</template>
