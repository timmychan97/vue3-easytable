<script>
import API from '../api/cell-autofill-option-props.vue'
import AutofillDirection from './autofill-direction.md'
import Base from './base.md'
import Explain from './explain.md'

export default {
  name: 'CellSelection',
  components: {
    Explain,
    Base,
    AutofillDirection,
    API,
  },
}
</script>

<template>
  <div>
    <h2>Cell Autofill</h2>
    <Explain />
    <Base />
    <AutofillDirection />
    <API title="API" anchor="API" />
  </div>
</template>
