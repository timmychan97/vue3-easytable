<script>
import API from '../api/column-props/filter-props.vue'
import CustomIcon from './custom-icon.md'
import Explain from './explain.md'
import MixtureFilter from './mixture-filter.md'
import MutilFilter from './mutil-filter.md'
import SingleFilter from './single-filter.md'

export default {
  name: 'BasicMain',
  components: {
    Explain,
    SingleFilter,
    MutilFilter,
    MixtureFilter,
    CustomIcon,
    API,
  },
}
</script>

<template>
  <div>
    <h2>筛选</h2>
    <Explain />
    <SingleFilter />
    <MutilFilter />
    <MixtureFilter />
    <CustomIcon />
    <API title="API" anchor="API" desc="filter 筛选配置" />
  </div>
</template>
