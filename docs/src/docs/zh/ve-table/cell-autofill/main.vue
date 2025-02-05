<script lang="ts" setup>
import API from '../api/cell-autofill-option-props.vue'
import AutofillDirection from './autofill-direction.md'
import Base from './base.md'
import Explain from './explain.md'

defineOptions({
  name: 'CellSelection',
})
</script>

<template>
  <div>
    <h2>单元格自动填充</h2>
    <Explain />
    <Base />
    <AutofillDirection />
    <API title="API" anchor="API" />
  </div>
</template>
