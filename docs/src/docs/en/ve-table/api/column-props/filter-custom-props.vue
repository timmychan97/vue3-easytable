<script>
import tpl from '@/comp/api-tpl.vue'
import { db } from '../db'

export default {
  components: { Tpl: tpl },
  props: {
    anchor: {
      type: String,
      default: 'Filter custom',
    },
    desc: {
      type: String,
      default: 'filterCustom',
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
      :table-data="db.columns.filterCustomProps.data"
      :columns="db.columns.filterCustomProps.columns"
    />
  </div>
</template>
