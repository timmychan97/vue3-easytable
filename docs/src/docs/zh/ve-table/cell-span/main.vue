<script>
import FooterCellSpan from '../footer-summary/cell-span.md'
import BodyColspan from './body-colspan.md'
import BodyRowspan from './body-rowspan.md'
import CustomContent from './custom-content.md'
import Explain from './explain.md'

export default {
  name: 'CellSpan',
  components: {
    Explain,
    BodyColspan,
    BodyRowspan,
    FooterCellSpan,
    CustomContent,
  },
}
</script>

<template>
  <div>
    <h2>单元格合并</h2>
    <Explain />
    <BodyColspan />
    <BodyRowspan />
    <FooterCellSpan />
    <CustomContent />
  </div>
</template>
