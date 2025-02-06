<script lang="ts" setup>
import API from '../api/column-props/ellipsis-props.vue'
import BaseMd from './base.md'
import EllipsisLine from './ellipsis-line.md'
import Ellipsis from './ellipsis.md'
import Explain from './explain.md'

defineOptions({
  name: 'BasicMain',
})
</script>

<template>
  <div>
    <h2>单元格省略</h2>
    <Explain />
    <BaseMd />
    <Ellipsis />
    <EllipsisLine />

    <API title="API" anchor="API" desc="ellipsis 单元格省略配置" />
  </div>
</template>
