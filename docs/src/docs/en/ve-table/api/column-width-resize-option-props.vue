<script>
import tpl from '@/comp/api-tpl.vue'
import { db } from './db'

export default {
  components: { Tpl: tpl },
  props: {
    anchor: {
      type: String,
      default: 'Column Resize Option',
    },
    desc: {
      type: String,
      default: 'columnWidthResizeOption',
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
      :table-data="db.columnWidthResizeOption.data"
      :columns="db.columnWidthResizeOption.columns"
    />
  </div>
</template>
