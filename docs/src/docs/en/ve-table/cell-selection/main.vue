<script>
import API from '../api/cell-selection-option-props.vue'
import BaseMd from './base.md'
import DisableSelection from './disable-selection.md'
import Explain from './explain.md'
import RangeSelectionInstanceMethods from './range-selection-instance-methods.md'
import ShortCuts from './shortcuts.md'
import SingleSelectionInstanceMethods from './single-selection-instance-methods.md'

export default {
  name: 'CellSelection',
  components: {
    Explain,
    ShortCuts,
    BaseMd,
    DisableSelection,
    SingleSelectionInstanceMethods,
    RangeSelectionInstanceMethods,
    API,
  },
}
</script>

<template>
  <div>
    <h2>Cell Selection</h2>
    <Explain />
    <ShortCuts />
    <BaseMd />
    <DisableSelection />
    <SingleSelectionInstanceMethods />
    <RangeSelectionInstanceMethods />
    <API title="API" anchor="API" desc="cellSelection" />
  </div>
</template>
