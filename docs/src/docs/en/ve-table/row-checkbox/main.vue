<script>
import API from '../api/checkbox-option-props.vue'
import BaseMd from './base.md'
import Explain from './explain.md'
import SelectedAllHide from './selected-all-hide.md'
import SelectedColumn from './selected-column.md'
import SelectedControl from './selected-control.md'
import SelectedDefault from './selected-default.md'
import SelectedDisable from './selected-disable.md'
import SelectedRowClick from './selected-row-click.md'

export default {
  name: 'BasicMain',
  components: {
    Explain,
    BaseMd,
    SelectedDefault,
    SelectedColumn,
    SelectedDisable,
    SelectedControl,
    SelectedRowClick,
    SelectedAllHide,
    API,
  },
}
</script>

<template>
  <div>
    <h2>Row Checkbox</h2>
    <Explain />
    <BaseMd />
    <SelectedColumn />
    <SelectedDefault />
    <SelectedDisable />
    <SelectedControl />
    <SelectedRowClick />
    <SelectedAllHide />
    <API title="API" anchor="API" desc="checkboxOption option" />
  </div>
</template>
