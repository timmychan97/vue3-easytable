<script>
import tpl from '@/comp/api-tpl.vue'
import { db } from '../db'

export default {
  components: { Tpl: tpl },
  props: {
    anchor: {
      type: String,
      default: '筛选',
    },
    desc: {
      type: String,
      default: 'filter',
    },
  },
  data() {
    return {
      db,
    }
  },
}
</script>

<template>
  <div>
    <Tpl
      :desc="desc"
      :anchor="anchor"
      :table-data="db.columns.filterProps.data"
      :columns="db.columns.filterProps.columns"
    />
  </div>
</template>
