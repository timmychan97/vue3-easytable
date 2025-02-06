<script>
import API2 from '../api/contextmenu-body-option-props.vue'
import API1 from '../api/contextmenu-header-option-props.vue'
import BaseMd from './base.md'
import ContextmenuTypes from './contextmenu-types.md'
import Custom from './custom.md'
import Explain from './explain.md'

export default {
  name: 'BasicMain',
  components: {
    Explain,
    ContextmenuTypes,
    BaseMd,
    Custom,
    API1,
    API2,
  },
}
</script>

<template>
  <div>
    <h2>右键菜单</h2>
    <Explain />
    <ContextmenuTypes />
    <BaseMd />
    <Custom />
    <API1
      anchor="API contextmenuHeaderOption"
      desc="contextmenuHeaderOption header 右键菜单配置"
    />
    <API2
      anchor="API contextmenuBodyOption"
      desc="contextmenuBodyOption body 右键菜单配置"
    />
  </div>
</template>
