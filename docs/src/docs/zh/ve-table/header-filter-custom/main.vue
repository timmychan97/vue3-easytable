<script>
import API from '../api/column-props/filter-custom-props.vue'
import CustomIcon from './custom-icon.md'
import Explain from './explain.md'
import SingleFilter from './single-filter.md'

export default {
  name: 'BasicMain',
  components: {
    Explain,
    SingleFilter,
    CustomIcon,
    API,
  },
}
</script>

<template>
  <div>
    <h2>筛选自定义</h2>
    <Explain />
    <SingleFilter />
    <CustomIcon />
    <API title="API" anchor="API" desc="filterCustom 自定义筛选配置" />
  </div>
</template>
