<script lang="ts" setup>
import API from '../api/edit-option-props.vue'
import BaseMd from './base.md'
import CombineColumnFixed from './combine-column-fixed.md'
import CombineElementUi from './combine-element-ui.md'
import Explain from './explain.md'
import InstanceMethods from './instance-method.md'
import ShortCuts from './shortcuts.md'

defineOptions({
  name: 'BasicMain',
})
</script>

<template>
  <div>
    <h2>单元格编辑</h2>
    <Explain />
    <ShortCuts />
    <BaseMd />
    <InstanceMethods />
    <CombineColumnFixed />
    <CombineElementUi />
    <API title="API" anchor="API" desc="eidtOption 单元格编辑配置" />
  </div>
</template>
