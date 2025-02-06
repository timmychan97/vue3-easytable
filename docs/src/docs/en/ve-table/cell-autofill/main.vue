<script>
import API from '../api/cell-autofill-option-props.vue'
import AutofillDirection from './autofill-direction.md'
import BaseMd from './base.md'
import Explain from './explain.md'

export default {
  name: 'CellSelection',
  components: {
    Explain,
    BaseMd,
    AutofillDirection,
    API,
  },
}
</script>

<template>
  <div>
    <h2>Cell Autofill</h2>
    <Explain />
    <BaseMd />
    <AutofillDirection />
    <API title="API" anchor="API" />
  </div>
</template>
