<script>
import tpl from '@/comp/api-tpl.vue'
import { db } from './db'

export default {
  components: { Tpl: tpl },
  props: {
    anchor: {
      type: String,
      default: 'Column hidden option',
    },
    desc: {
      type: String,
      default: 'columnHiddenOption',
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
      :table-data="db.columnHiddenOption.data"
      :columns="db.columnHiddenOption.columns"
    />
  </div>
</template>
