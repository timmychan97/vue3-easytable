<script>
import tpl from '@/comp/api-tpl.vue'
import { db } from '../db'

export default {
  components: { Tpl: tpl },
  props: {
    anchor: {
      type: String,
      default: 'Cell ellipsis',
    },
    desc: {
      type: String,
      default: 'ellipsis',
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
      :table-data="db.columns.ellipsisProps.data"
      :columns="db.columns.ellipsisProps.columns"
    />
  </div>
</template>
