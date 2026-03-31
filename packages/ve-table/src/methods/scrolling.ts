/**
 * Scrolling and positioning methods extracted from ve-table.
 * Spread into defineComponent({ methods: { ...scrollingMethods } })
 */
import { KEY_CODES } from '@vue3-easytable/common/utils/constant'
import { COLUMN_FIXED_TYPE, COMPS_CUSTOM_ATTRS } from '../util/constant.js'
import { getNotFixedTotalWidthByColumnKey } from '../util/index.js'

export const scrollingMethods = {
  columnToVisible(this: any, nextColumn: any) {
    const { hasXScrollBar, colgroups } = this

    if (!hasXScrollBar)
      return false

    const tableContainerRef = this.$refs[this.tableContainerRef] as HTMLElement

    const { scrollWidth, clientWidth, scrollLeft } = tableContainerRef

    if (!nextColumn.fixed) {
      const leftTotalWidth = getNotFixedTotalWidthByColumnKey({
        colgroups,
        colKey: nextColumn.key,
        fixed: COLUMN_FIXED_TYPE.LEFT,
      })

      const rightTotalWidth = getNotFixedTotalWidthByColumnKey({
        colgroups,
        colKey: nextColumn.key,
        fixed: COLUMN_FIXED_TYPE.RIGHT,
      })

      if (scrollLeft) {
        const diff = scrollLeft - leftTotalWidth
        if (diff > 0)
          tableContainerRef.scrollLeft = scrollLeft - diff
      }

      const scrollRight = scrollWidth - clientWidth - scrollLeft
      if (scrollRight) {
        const diff = scrollRight - rightTotalWidth
        if (diff > 0)
          tableContainerRef.scrollLeft = scrollLeft + diff
      }
    }
  },

  rowToVisible(this: any, keyCode: number, nextRowKey: any) {
    const tableContainerRef = this.$refs[this.tableContainerRef] as HTMLElement
    const tableContentWrapperRef
              = (this.$refs[this.tableContentWrapperRef] as any)?.$el as HTMLElement | undefined

    const { isVirtualScroll, headerTotalHeight, footerTotalHeight }
              = this

    const {
      clientHeight: containerClientHeight,
      scrollTop: containerScrollTop,
    } = tableContainerRef

    const nextRowEl = this.$el.querySelector(
      `tbody tr[${COMPS_CUSTOM_ATTRS.BODY_ROW_KEY}="${nextRowKey}"]`,
    ) as HTMLElement | null

    if (nextRowEl) {
      const { offsetTop: trOffsetTop, clientHeight: trClientHeight }
                  = nextRowEl

      const parentOffsetTop = tableContentWrapperRef?.offsetTop ?? 0

      // arrow up
      if (keyCode === KEY_CODES.ARROW_UP) {
        let diff = 0
        if (isVirtualScroll) {
          diff
                          = headerTotalHeight
                            - (trOffsetTop
                              - (containerScrollTop - parentOffsetTop))
        }
        else {
          diff
                          = containerScrollTop
                            + headerTotalHeight
                            - trOffsetTop
        }

        if (diff > 0)
          tableContainerRef.scrollTop = containerScrollTop - diff
      }
      // arrow down
      else if (keyCode === KEY_CODES.ARROW_DOWN) {
        let diff = 0
        if (isVirtualScroll) {
          diff
                          = trOffsetTop
                            - (containerScrollTop - parentOffsetTop)
                            + trClientHeight
                            + footerTotalHeight
                            - containerClientHeight
        }
        else {
          diff
                          = trOffsetTop
                            + trClientHeight
                            + footerTotalHeight
                            - (containerClientHeight + containerScrollTop)
        }

        if (diff >= 0)
          tableContainerRef.scrollTop = containerScrollTop + diff
      }
      const { currentCell } = this.cellSelectionData
      this.cellSelectionCurrentCellChange({
        rowKey: nextRowKey,
        colKey: currentCell.colKey,
      })
    }
  },

  setScrolling(this: any, tableContainerRef: HTMLElement) {
    if (this.hasFixedColumn) {
      const { scrollWidth, clientWidth, scrollLeft }
                  = tableContainerRef

      const { previewTableContainerScrollLeft: previewScrollLeft }
                  = this

      if (
        previewScrollLeft === 0
        || previewScrollLeft !== scrollLeft
      ) {
        this.previewTableContainerScrollLeft = scrollLeft

        this.isLeftScrolling = scrollLeft > 0
        this.isRightScrolling
                      = scrollWidth - clientWidth > scrollLeft
      }
      this.isLeftScrolling = scrollLeft > 0
      this.isRightScrolling = scrollWidth - clientWidth > scrollLeft
    }

    if (this.fixedHeader) {
      const { scrollTop } = tableContainerRef
      this.isVerticalScrolling = scrollTop > 0
    }
  },

  setScrollBarStatus(this: any) {
    const tableContainerRef = this.$refs[this.tableContainerRef] as HTMLElement | undefined
    if (tableContainerRef) {
      const { scrollWidth, clientWidth, scrollHeight, clientHeight }
                  = tableContainerRef

      if (scrollWidth && clientWidth) {
        this.hasXScrollBar
                      = !!(scrollWidth - clientWidth)
      }

      if (scrollHeight && clientHeight) {
        this.hasYScrollBar
                      = !!(scrollHeight - clientHeight)
      }
    }
  },

  initScrolling(this: any) {
    this.setScrolling(this.$refs[this.tableContainerRef] as HTMLElement)
  },
}
