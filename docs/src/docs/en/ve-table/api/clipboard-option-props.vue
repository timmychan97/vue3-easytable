<script>
import tpl from '@/comp/api-tpl.vue'
import { db } from './db'

export default {
  components: { Tpl: tpl },
  props: {
    anchor: {
      type: String,
      default: 'Clipboard option',
    },
    desc: {
      type: String,
      default: 'clipboardOption',
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
      :table-data="db.clipboardOption.data"
      :columns="db.clipboardOption.columns"
    />
  </div>
</template>
