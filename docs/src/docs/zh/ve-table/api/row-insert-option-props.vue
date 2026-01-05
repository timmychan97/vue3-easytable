<script>
import tpl from '@/comp/api-tpl.vue'
import { db } from './db'

export default {
  components: { Tpl: tpl },
  props: {
    anchor: {
      type: String,
      default: '行插入配置',
    },
    desc: {
      type: String,
      default: 'rowInsertOption',
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
      :table-data="db.rowInsertOption.data"
      :columns="db.rowInsertOption.columns"
    />
  </div>
</template>
