<script>
import tpl from '@/comp/api-tpl.vue'
import { db } from './db'

export default {
  components: { Tpl: tpl },
  props: {
    anchor: {
      type: String,
      default: '单元格自动填充配置',
    },
    desc: {
      type: String,
      default: 'cellAutofillOption',
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
      :table-data="db.cellAutofillOption.data"
      :columns="db.cellAutofillOption.columns"
    />
  </div>
</template>
