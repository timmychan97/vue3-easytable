<script>
import API from '../api/event-custom-option-props.vue'
import OnFooterCell from '../footer-summary/on-footer-cell.md'
import OnFooterRow from '../footer-summary/on-footer-row.md'
import Explain from './explain.md'
import OnBodyCell from './on-body-cell.md'
import OnBodyRow from './on-body-row.md'
import OnHeaderCell from './on-header-cell.md'
import OnHeaderRow from './on-header-row.md'

export default {
  name: 'EventCustom',
  components: {
    Explain,
    OnBodyRow,
    OnBodyCell,
    OnHeaderRow,
    OnHeaderCell,
    OnFooterRow,
    OnFooterCell,
    API,
  },
}
</script>

<template>
  <div>
    <h2>Event Custom</h2>
    <Explain />
    <OnBodyRow />
    <OnBodyCell />
    <OnHeaderRow />
    <OnHeaderCell />
    <OnFooterRow />
    <OnFooterCell />
    <API title="API" anchor="API" desc="eventCustomOption option" />
  </div>
</template>
