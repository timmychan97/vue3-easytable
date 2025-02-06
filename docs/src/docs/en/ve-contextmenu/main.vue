<script>
import Api from './api.md'
import BaseMd from './base.md'

import Usage from './usage.md'

export default {
  components: {
    Usage,
    BaseMd,
    Api,
  },
}
</script>

<template>
  <div>
    <h2>Contextmenu</h2>
    <Usage />
    <BaseMd />
    <Api />
  </div>
</template>
