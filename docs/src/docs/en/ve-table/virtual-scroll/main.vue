<script>
import API from '../api/virtual-scroll-option-props.vue'
import FooterSummary from '../footer-summary/virtual-scroll.md'
import AutoHeight from './auto-height.md'
import BaseMd from './base.md'
import ColumnFixed from './column-fixed.md'
import CombineLazyLoad from './combine-lazy-load.md'
import DynamicEnable from './dynamic-enable.md'
import Explain from './explain.md'
import RowCheckbox from './row-checkbox.md'
import RowExpandTable from './row-expand-table.md'
import RowExpand from './row-expand.md'
import RowIndex from './row-index.md'
import RowRadio from './row-radio.md'

export default {
  name: 'BasicMain',
  components: {
    Explain,
    BaseMd,
    AutoHeight,
    RowCheckbox,
    RowRadio,
    RowExpand,
    RowExpandTable,
    ColumnFixed,
    FooterSummary,
    RowIndex,
    CombineLazyLoad,
    DynamicEnable,
    API,
  },
}
</script>

<template>
  <div>
    <h2>Virtual Scroll</h2>
    <Explain />
    <BaseMd />
    <AutoHeight />
    <RowIndex />
    <RowCheckbox />
    <RowRadio />
    <RowExpand />
    <RowExpandTable />
    <ColumnFixed />
    <FooterSummary />
    <CombineLazyLoad />
    <DynamicEnable />
    <API title="API" anchor="API" desc="virtualScrollOption option" />
  </div>
</template>
