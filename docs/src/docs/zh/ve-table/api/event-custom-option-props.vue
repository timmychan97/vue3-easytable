<script>
import tpl from '@/comp/api-tpl.vue'
import { db } from './db'

export default {
  components: { Tpl: tpl },
  props: {
    anchor: {
      type: String,
      default: '事件自定义配置',
    },
    desc: {
      type: String,
      default: 'eventCustomOption',
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
      :table-data="db.eventCustomOption.data"
      :columns="db.eventCustomOption.columns"
    />
  </div>
</template>
