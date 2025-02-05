<script>
import API from './api.md'
import callbackMethods from './callback-methods.md'
import CustomContent from './custom-content.md'
import MultipleSelect from './multiple-select.md'
import Operation from './operation.md'
import SingleSelect from './single-select.md'

export default {
  components: {
    SingleSelect,
    MultipleSelect,
    Operation,
    CustomContent,
    CallbackMethods: callbackMethods,
    API,
  },
}
</script>

<template>
  <div>
    <h2>dropdown 下拉</h2>
    <div>
      <anchor label="单选功能" />
      <SingleSelect />
    </div>
    <div>
      <anchor label="多选功能" />
      <MultipleSelect />
    </div>
    <div>
      <anchor label="操作" />
      <Operation />
    </div>
    <div>
      <anchor label="自定义下拉内容" />
      <CustomContent />
    </div>
    <div>
      <anchor label="回调函数" />
      <CallbackMethods />
    </div>
    <API />
  </div>
</template>
