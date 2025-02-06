<script>
import API from '../api/column-props/ellipsis-props.vue'
import BaseMd from './base.md'
import EllipsisLine from './ellipsis-line.md'
import Ellipsis from './ellipsis.md'
import Explain from './explain.md'

export default {
  name: 'BasicMain',
  components: {
    Explain,
    BaseMd,
    Ellipsis,
    EllipsisLine,
    API,
  },
}
</script>

<template>
  <div>
    <h2>Cell Ellipsis</h2>
    <Explain />
    <BaseMd />
    <Ellipsis />
    <EllipsisLine />

    <API title="API" anchor="API" desc="ellipsis option" />
  </div>
</template>
