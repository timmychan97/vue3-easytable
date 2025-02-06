<script>
import BaseMd from './base.md'
import Explain from './explain.md'
import HeaderFixedDisabled from './header-fixed-disabled.md'

export default {
  name: 'BasicMain',
  components: {
    Explain,
    BaseMd,
    HeaderFixedDisabled,
  },
}
</script>

<template>
  <div>
    <h2>固定表头</h2>
    <Explain />
    <BaseMd />
    <HeaderFixedDisabled />
  </div>
</template>
