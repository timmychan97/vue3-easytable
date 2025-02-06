<script>
import API from '../api/edit-option-props.vue'
import BaseMd from './base.md'
import CombineColumnFixed from './combine-column-fixed.md'
import CombineElementUi from './combine-element-ui.md'
import Explain from './explain.md'
import InstanceMethods from './instance-method.md'
import ShortCuts from './shortcuts.md'

export default {
  name: 'BasicMain',
  components: {
    Explain,
    ShortCuts,
    BaseMd,
    InstanceMethods,
    CombineColumnFixed,
    CombineElementUi,
    API,
  },
}
</script>

<template>
  <div>
    <h2>Cell Edit</h2>
    <Explain />
    <ShortCuts />
    <BaseMd />
    <InstanceMethods />
    <CombineColumnFixed />
    <CombineElementUi />
    <API title="API" anchor="API" desc="eidtOption 单元格编辑配置" />
  </div>
</template>
