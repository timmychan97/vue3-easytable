<script>
import API from '../api/expand-option-props.vue'
import BaseMd from './base.md'
import DefaultExpand from './default-expand.md'
import ExpandChart from './expand-chart.md'
import ExpandColumn from './expand-column.md'
import ExpandControl from './expand-control.md'
import ExpandEvent from './expand-event.md'
import ExpandTable from './expand-table.md'
import ExpandTrigger from './expand-trigger.md'
import Expandable from './expandable.md'
import Explain from './explain.md'

export default {
  name: 'CustomCell',
  components: {
    Explain,
    BaseMd,
    ExpandTrigger,
    ExpandColumn,
    Expandable,
    DefaultExpand,
    ExpandControl,
    ExpandEvent,
    ExpandChart,
    ExpandTable,
    API,
  },
}
</script>

<template>
  <div>
    <h2>Row Expand</h2>
    <Explain />
    <BaseMd />
    <ExpandTrigger />
    <ExpandColumn />
    <Expandable />
    <DefaultExpand />
    <ExpandEvent />
    <ExpandControl />
    <ExpandChart />
    <ExpandTable />
    <API title="API" anchor="API" desc="expandOption option" />
  </div>
</template>
