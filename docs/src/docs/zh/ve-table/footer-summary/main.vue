<script>
import BaseMd from './base.md'
import CellSpan from './cell-span.md'
import CellStyle from './cell-style.md'
import CustomCell from './custom-cell.md'
import Explain from './explain.md'
import FooterColumnFixed from './footer-column-fixed.md'
import FooterFixed from './footer-fixed.md'
import OnFooterCell from './on-footer-cell.md'
import OnFooterRow from './on-footer-row.md'
import VirtualScroll from './virtual-scroll.md'

export default {
  name: 'EventCustom',
  components: {
    Explain,
    BaseMd,
    CustomCell,
    CellStyle,
    CellSpan,
    OnFooterRow,
    OnFooterCell,
    FooterFixed,
    FooterColumnFixed,
    VirtualScroll,
  },
}
</script>

<template>
  <div>
    <h2>footer 汇总</h2>
    <Explain />
    <BaseMd />
    <CustomCell />
    <CellStyle />
    <CellSpan />
    <OnFooterRow />
    <OnFooterCell />
    <FooterFixed />
    <FooterColumnFixed />
    <VirtualScroll />
  </div>
</template>
