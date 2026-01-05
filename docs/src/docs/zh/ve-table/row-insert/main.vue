<script>
import API from '../api/row-insert-option-props.vue'
import BaseMd from './base.md'
import Explain from './explain.md'
import WithEvent from './with-event.md'

export default {
  name: 'RowInsert',
  components: {
    Explain,
    BaseMd,
    WithEvent,
    API,
  },
}
</script>

<template>
  <div>
    <h2>行插入</h2>
    <Explain />
    <BaseMd />
    <WithEvent />
    <API title="API" anchor="API" desc="rowInsertOption" />
  </div>
</template>
