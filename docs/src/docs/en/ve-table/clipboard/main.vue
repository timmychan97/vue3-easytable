<script>
import API from '../api/clipboard-option-props.vue'
import Base from './base.md'
import Explain from './explain.md'
import ShortCuts from './shortcuts.md'

export default {
  name: 'BasicMain',
  components: {
    Explain,
    ShortCuts,
    Base,
    API,
  },
}
</script>

<template>
  <div>
    <h2>Clipboard</h2>
    <Explain />
    <ShortCuts />
    <Base />
    <API title="API" anchor="API" desc="clipboardOption" />
  </div>
</template>
