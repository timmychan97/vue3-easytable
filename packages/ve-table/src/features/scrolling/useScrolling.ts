/**
 * 滚动（MOD-02）：滚动阴影 / 滚动条状态、把行或列滚动到可见区域，以及 scrollTo* 实例方法
 */
import type { ComponentPublicInstance, ComputedRef, Ref, ShallowRef } from 'vue'
import type { VeTableProps } from '../../ve-table-props'
import type { CellKey, CellSelectionData, ColgroupData } from '../../ve-table-types'
import type { VirtualScrollInstance } from '../virtual-scroll/virtual-scroll'
import { isEmptyValue, scrollTo as scrollElementTo } from '@vue3-easytable/common/utils'
import { KEY_CODES } from '@vue3-easytable/common/utils/constant'
import { getScrollbarWidth } from '@vue3-easytable/common/utils/scroll-bar'
import { onMounted, ref, watch } from 'vue'
import { queryBodyRow } from '../../util/cell-dom'
import { COLUMN_FIXED_TYPE } from '../../util/constant'
import { getColumnByColkey, getNotFixedTotalWidthByColumnKey } from '../../util/index'

type RowKey = string | number
type ColKey = string | number

export interface UseScrollingOptions {
  props: Pick<VeTableProps, 'fixedHeader' | 'tableData' | 'rowKeyFieldName'>
  // 表格根元素（查找行元素）、滚动容器、内容外层（VueDomResizeObserver 组件）
  rootElement: Ref<HTMLElement | null>
  containerElement: Ref<HTMLElement | null>
  contentWrapper: Ref<ComponentPublicInstance | null>
  colgroups: Ref<ColgroupData[]>
  hasFixedColumn: ComputedRef<boolean>
  // 列配置变化时递增：之后刷新滚动状态
  columnsOptionResetTime: Ref<number>
  isVirtualScroll: ComputedRef<boolean>
  virtualScroll: ShallowRef<VirtualScrollInstance | null>
  headerTotalHeight: ComputedRef<number>
  footerTotalHeight: ComputedRef<number>
  // 键盘上下移动时，行滚动到可见区域后更新活动单元格
  cellSelectionData: Ref<CellSelectionData>
  cellSelectionCurrentCellChange: (cell: CellKey) => void
}

export interface UseScrolling {
  isLeftScrolling: Ref<boolean>
  isRightScrolling: Ref<boolean>
  isVerticalScrolling: Ref<boolean>
  hasXScrollBar: Ref<boolean>
  hasYScrollBar: Ref<boolean>
  // 滚动条宽度缓存；null 表示尚未测量（覆盖式滚动条的宽度为 0，也需要缓存）
  scrollBarWidth: Ref<number | null>
  previewTableContainerScrollLeft: Ref<number | null>
  getScrollBarWidth: () => number
  setScrolling: (containerEl: HTMLElement) => void
  setScrollBarStatus: () => void
  initScrolling: () => void
  columnToVisible: (column: ColgroupData | null | undefined) => false | void
  rowToVisible: (keyCode: number, nextRowKey: RowKey) => void
  scrollTo: (option: ScrollToOptions) => void
  scrollToRowKey: (params: { rowKey: RowKey }) => false | void
  scrollToColKey: (params: { colKey: ColKey }) => void
}

export function useScrolling(options: UseScrollingOptions): UseScrolling {
  const {
    props,
    rootElement,
    containerElement,
    contentWrapper,
    colgroups,
    hasFixedColumn,
    columnsOptionResetTime,
    isVirtualScroll,
    virtualScroll,
    headerTotalHeight,
    footerTotalHeight,
    cellSelectionData,
    cellSelectionCurrentCellChange,
  } = options

  const isLeftScrolling = ref(false)
  const isRightScrolling = ref(false)
  const isVerticalScrolling = ref(false)
  const hasXScrollBar = ref(false)
  const hasYScrollBar = ref(false)
  const scrollBarWidth = ref<number | null>(null)
  const previewTableContainerScrollLeft = ref<number | null>(null)

  function getScrollBarWidth() {
    // RENDER-06：用 null 判断是否已测量。覆盖式滚动条（macOS、移动端）宽度为 0，
    // 若用真值判断会在每次渲染时都插入探测元素并强制两次布局
    if (scrollBarWidth.value !== null)
      return scrollBarWidth.value

    const result = getScrollbarWidth()
    scrollBarWidth.value = result
    return result
  }

  // 根据滚动位置设置左右滚动阴影、表头阴影
  function setScrolling(containerEl: HTMLElement) {
    if (hasFixedColumn.value) {
      const { scrollWidth, clientWidth, scrollLeft } = containerEl
      const previewScrollLeft = previewTableContainerScrollLeft.value

      if (previewScrollLeft === 0 || previewScrollLeft !== scrollLeft)
        previewTableContainerScrollLeft.value = scrollLeft

      isLeftScrolling.value = scrollLeft > 0
      isRightScrolling.value = scrollWidth - clientWidth > scrollLeft
    }

    if (props.fixedHeader)
      isVerticalScrolling.value = containerEl.scrollTop > 0
  }

  // 是否出现横向 / 纵向滚动条
  function setScrollBarStatus() {
    const containerEl = containerElement.value
    if (!containerEl)
      return

    const { scrollWidth, clientWidth, scrollHeight, clientHeight } = containerEl
    if (scrollWidth && clientWidth)
      hasXScrollBar.value = !!(scrollWidth - clientWidth)
    if (scrollHeight && clientHeight)
      hasYScrollBar.value = !!(scrollHeight - clientHeight)
  }

  function initScrolling() {
    setScrolling(containerElement.value as HTMLElement)
  }

  // 横向滚动，使列完整可见（固定列始终可见）
  function columnToVisible(column: ColgroupData | null | undefined) {
    // 未知的列（SEL-06）
    if (!hasXScrollBar.value || !column)
      return false

    const containerEl = containerElement.value as HTMLElement
    const { scrollWidth, clientWidth, scrollLeft } = containerEl

    if (!column.fixed) {
      const leftTotalWidth = getNotFixedTotalWidthByColumnKey({
        colgroups: colgroups.value,
        colKey: column.key,
        fixed: COLUMN_FIXED_TYPE.LEFT,
      })

      const rightTotalWidth = getNotFixedTotalWidthByColumnKey({
        colgroups: colgroups.value,
        colKey: column.key,
        fixed: COLUMN_FIXED_TYPE.RIGHT,
      })

      if (scrollLeft) {
        const diff = scrollLeft - leftTotalWidth
        if (diff > 0)
          containerEl.scrollLeft = scrollLeft - diff
      }

      const scrollRight = scrollWidth - clientWidth - scrollLeft
      if (scrollRight) {
        const diff = scrollRight - rightTotalWidth
        if (diff > 0)
          containerEl.scrollLeft = scrollLeft + diff
      }
    }
  }

  // 键盘上下移动：纵向滚动使下一行可见，并把活动单元格移到该行
  function rowToVisible(keyCode: number, nextRowKey: RowKey) {
    const containerEl = containerElement.value as HTMLElement
    const contentWrapperEl = contentWrapper.value?.$el as HTMLElement | undefined

    const { clientHeight: containerClientHeight, scrollTop: containerScrollTop } = containerEl

    // key 会被转义；未渲染的行返回 null
    const nextRowEl = queryBodyRow(rootElement.value, nextRowKey) as HTMLElement | null
    if (!nextRowEl)
      return

    const { offsetTop: trOffsetTop, clientHeight: trClientHeight } = nextRowEl
    const parentOffsetTop = contentWrapperEl?.offsetTop ?? 0

    // arrow up
    if (keyCode === KEY_CODES.ARROW_UP) {
      let diff = 0
      if (isVirtualScroll.value)
        diff = headerTotalHeight.value - (trOffsetTop - (containerScrollTop - parentOffsetTop))
      else
        diff = containerScrollTop + headerTotalHeight.value - trOffsetTop

      if (diff > 0)
        containerEl.scrollTop = containerScrollTop - diff
    }
    // arrow down
    else if (keyCode === KEY_CODES.ARROW_DOWN) {
      let diff = 0
      if (isVirtualScroll.value) {
        diff = trOffsetTop
          - (containerScrollTop - parentOffsetTop)
          + trClientHeight
          + footerTotalHeight.value
          - containerClientHeight
      }
      else {
        diff = trOffsetTop
          + trClientHeight
          + footerTotalHeight.value
          - (containerClientHeight + containerScrollTop)
      }

      if (diff >= 0)
        containerEl.scrollTop = containerScrollTop + diff
    }

    cellSelectionCurrentCellChange({
      rowKey: nextRowKey,
      colKey: cellSelectionData.value.currentCell.colKey,
    })
  }

  // 实例方法：滚动到指定位置
  function scrollTo(option: ScrollToOptions) {
    scrollElementTo(containerElement.value as HTMLElement, option)
  }

  // 实例方法：滚动到指定行
  function scrollToRowKey({ rowKey }: { rowKey: RowKey }) {
    if (isEmptyValue(rowKey)) {
      console.warn('Row key can\'t be empty!')
      return false
    }

    const vs = virtualScroll.value
    if (isVirtualScroll.value && vs) {
      const index = (props.tableData as any[]).findIndex(row => row[props.rowKeyFieldName] === rowKey)
      if (index >= 0)
        vs.scrollToIndex(index, { align: 'start', behavior: 'auto' })
    }
    else {
      // key 会被转义；未渲染的行返回 null
      const rowEl = queryBodyRow(rootElement.value, rowKey)
      const scrollTop = rowEl ? rowEl.offsetTop - headerTotalHeight.value : 0

      scrollElementTo(containerElement.value as HTMLElement, {
        top: scrollTop,
        behavior: 'smooth',
      })
    }
  }

  // 实例方法：滚动到指定列
  function scrollToColKey({ colKey }: { colKey: ColKey }) {
    const column = getColumnByColkey(colKey, colgroups.value)
    if (column)
      columnToVisible(column)
  }

  // 列配置变化（列宽、固定列可能变化）后刷新滚动阴影
  watch(columnsOptionResetTime, () => {
    initScrolling()
  })

  onMounted(() => {
    initScrolling()
  })

  return {
    isLeftScrolling,
    isRightScrolling,
    isVerticalScrolling,
    hasXScrollBar,
    hasYScrollBar,
    scrollBarWidth,
    previewTableContainerScrollLeft,
    getScrollBarWidth,
    setScrolling,
    setScrollBarStatus,
    initScrolling,
    columnToVisible,
    rowToVisible,
    scrollTo,
    scrollToRowKey,
    scrollToColKey,
  }
}
