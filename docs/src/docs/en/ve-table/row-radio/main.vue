<script>
import API from '../api/radio-option-props.vue'
import BaseMd from './base.md'
import Explain from './explain.md'
import RadioColumn from './radio-column.md'
import SelectedControl from './selected-control.md'
import SelectedDefault from './selected-default.md'
import SelectedDisable from './selected-disable.md'
import SelectedRowClick from './selected-row-click.md'

export default {
  name: 'BasicMain',
  components: {
    Explain,
    BaseMd,
    RadioColumn,
    SelectedDefault,
    SelectedDisable,
    SelectedControl,
    SelectedRowClick,
    API,
  },
}
</script>

<template>
  <div>
    <h2>Row Radio</h2>
    <Explain />
    <BaseMd />
    <RadioColumn />
    <SelectedDefault />
    <SelectedDisable />
    <SelectedControl />
    <SelectedRowClick />
    <API title="API" anchor="API" desc="radioOption option" />
  </div>
</template>
