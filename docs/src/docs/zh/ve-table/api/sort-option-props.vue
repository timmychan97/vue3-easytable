<script>
import tpl from '@/comp/api-tpl.vue'
import { db } from './db'

export default {
  components: { Tpl: tpl },
  props: {
    anchor: {
      type: String,
      default: '排序配置',
    },
    desc: {
      type: String,
      default: 'sortOption',
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
      :table-data="db.sortOption.data"
      :columns="db.sortOption.columns"
    />
  </div>
</template>
