<script>
import tpl from '@/comp/api-tpl.vue'
import { db } from '../db'
import EllipsisProps from './ellipsis-props'
import FilterCustomProps from './filter-custom-props'
import FilterProps from './filter-props'

export default {
  components: { Tpl: tpl },
  props: {
    anchor: {
      type: String,
      default: 'Column option',
    },
    desc: {
      type: String,
      default: 'Columns',
    },
  },
  data() {
    return {
      db,
      expandOption: {
        expandable: ({ row, column, rowIndex }) => {
          if (![49, 50, 55].includes(row.expandId))
            return false
        },
        defaultExpandedRowKeys: [],
        render: ({ row, column, rowIndex }) => {
          if (row.expandId === 49)
            return <EllipsisProps />
          else if (row.expandId === 50)
            return <FilterProps />
          else if (row.expandId === 55)
            return <FilterCustomProps />
        },
      },
    }
  },
}
</script>

<template>
  <div>
    <Tpl
      :desc="desc"
      :anchor="anchor"
      :table-data="db.columns.data"
      :columns="db.columns.columns"
      :expand-option="expandOption"
    />
  </div>
</template>
