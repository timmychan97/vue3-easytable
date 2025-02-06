<script>
import API from './api.md'
import BaseMd from './base.md'
import Controlled from './controlled.md'

export default {
  components: {
    BaseMd,
    Controlled,
    API,
  },
}
</script>

<template>
  <div>
    <div>
      <h3>基础功能</h3>
      <BaseMd />
    </div>
    <div>
      <h3>可控属性</h3>
      <Controlled />
    </div>
    <API />
  </div>
</template>
