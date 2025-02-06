<script>
import API from './api.md'
import BaseMd from './base.md'
import Collection from './collection.vue'
import Explain from './explain.md'
import Usage from './usage.md'

export default {
  components: {
    Explain,
    Usage,
    BaseMd,
    Collection,
    API,
  },
}
</script>

<template>
  <div>
    <h2>Icon 图标</h2>
    <Explain />
    <Usage />
    <BaseMd />
    <Collection />
    <API />
  </div>
</template>
