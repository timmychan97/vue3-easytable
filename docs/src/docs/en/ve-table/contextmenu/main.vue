<script>
import API2 from '../api/contextmenu-body-option-props'
import API1 from '../api/contextmenu-header-option-props'
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
    <h2>Contextmenu</h2>
    <Explain />
    <ContextmenuTypes />
    <BaseMd />
    <Custom />
    <API1
      anchor="API contextmenuHeaderOption"
      desc="contextmenuHeaderOption"
    />
    <API2 anchor="API contextmenuBodyOption" desc="contextmenuBodyOption" />
  </div>
</template>
