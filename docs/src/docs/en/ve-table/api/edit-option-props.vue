<script>
import tpl from '@/comp/api-tpl.vue'
import { db } from './db'

export default {
  components: { Tpl: tpl },
  props: {
    anchor: {
      type: String,
      default: 'Cell Edit option',
    },
    desc: {
      type: String,
      default: 'editOption',
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
      :table-data="db.editOption.data"
      :columns="db.editOption.columns"
    />
  </div>
</template>
