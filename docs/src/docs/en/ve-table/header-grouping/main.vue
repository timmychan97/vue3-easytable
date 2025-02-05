<script>
import Explain from './explain.md'
import GroupingHeaderFixedColumn from './grouping-header-fixed-column.md'
import GroupingHeader from './grouping-header.md'

export default {
  name: 'BasicMain',
  components: {
    Explain,
    GroupingHeader,
    GroupingHeaderFixedColumn,
  },
}
</script>

<template>
  <div>
    <h2>Header Grouping</h2>
    <Explain />
    <GroupingHeader />
    <GroupingHeaderFixedColumn />
  </div>
</template>
