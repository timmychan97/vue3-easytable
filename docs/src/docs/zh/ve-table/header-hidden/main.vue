<script lang="ts" setup>
import BaseMd from './base.md'
import Explain from './explain.md'

defineOptions({
  name: 'BasicMain',
})
</script>

<template>
  <div>
    <h2>表头隐藏</h2>
    <Explain />
    <BaseMd />
  </div>
</template>
