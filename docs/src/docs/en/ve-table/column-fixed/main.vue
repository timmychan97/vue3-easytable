<script>
import ColumnFixedAutoWidth from './column-fixed-auto-width.md'
import ColumnFixedLeftRight from './column-fixed-left-right.md'
import ColumnFixedLeft from './column-fixed-left.md'
import ColumnFixedRight from './column-fixed-right.md'
import Explain from './explain.md'

export default {
  name: 'BasicMain',
  components: {
    Explain,
    ColumnFixedLeft,
    ColumnFixedRight,
    ColumnFixedLeftRight,
    ColumnFixedAutoWidth,
  },
}
</script>

<template>
  <div>
    <h2>Column fixed</h2>
    <Explain />
    <ColumnFixedLeft />
    <ColumnFixedRight />
    <ColumnFixedLeftRight />
    <ColumnFixedAutoWidth />
  </div>
</template>
