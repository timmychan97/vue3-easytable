<script>
import Api from './api.md'
import CoverLang from './cover-lang.md'
import SwitchLang from './switch-lang.md'
import Usage from './usage.md'

export default {
  components: {
    Usage,
    SwitchLang,
    CoverLang,
    Api,
  },
}
</script>

<template>
  <div>
    <h2>locale 国际化</h2>
    <Usage />
    <SwitchLang />
    <CoverLang />
    <Api />
  </div>
</template>
