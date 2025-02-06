<script>
import API from './api.md'
import BaseMd from './base.md'

export default {
  components: { BaseMd, API },
  data() {
    return {
      selectItems1: [
        { value: 0, label: '张三' },
        { value: 1, label: '李四' },
        { value: 2, label: '王二' },
      ],

      selectItems2: [
        { value: 0, label: '张三' },
        { value: 1, label: '李四' },
        { value: 2, label: '王二' },
      ],

      selectItems3: [
        { value: 0, label: '张三' },
        { value: 1, label: '李四' },
        { value: 2, label: '王二' },
      ],
    }
  },
}
</script>

<template>
  <div>
    <BaseMd />
    <API />
  </div>
</template>
