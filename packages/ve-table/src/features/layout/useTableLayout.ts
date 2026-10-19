/**
 * 表格布局尺寸（MOD-02）：表头 / 表尾行高，表格与容器的高度
 *
 * 表头行、表尾行用 ResizeObserver 测量自己的高度，通过表格上下文上报
 * （HEADER_ROW_HEIGHT_CHANGE / FOOTER_ROW_HEIGHT_CHANGE）；合计高度供虚拟滚动、滚动定位等使用。
 */
import type { ComputedRef, Ref } from 'vue'
import type { VeTableProps } from '../../ve-table-props'
import type { ColumnOption, RowHeight } from '../../ve-table-types'
import { isEmptyArray } from '@vue3-easytable/common/utils'
import { computed, ref, watch } from 'vue'

export interface UseTableLayoutOptions {
  props: Pick<VeTableProps, 'showHeader' | 'footerData'>
  // 分组表头的行（每行一个表头 tr）
  groupColumns: Ref<ColumnOption[][]>
}

export interface UseTableLayout {
  headerRows: Ref<RowHeight[]>
  footerRows: Ref<RowHeight[]>
  headerTotalHeight: ComputedRef<number>
  footerTotalHeight: ComputedRef<number>
  // 表格容器外层（含滚动条）的高度
  tableOffestHeight: Ref<number>
  // 表格内容的高度（非虚拟滚动时作为容器高度）
  tableHeight: Ref<number>
  // 展开行 + 左固定列时的视口宽度（virtual phantom 测量）
  tableViewportWidth: Ref<number>
  initHeaderRows: () => void
  initFooterRows: () => void
  headerRowHeightChange: (params: { rowIndex: number, height: number }) => void
  footRowHeightChange: (params: { rowIndex: number, height: number }) => void
}

export function useTableLayout(options: UseTableLayoutOptions): UseTableLayout {
  const { props, groupColumns } = options

  const headerRows = ref<RowHeight[]>([])
  const footerRows = ref<RowHeight[]>([])
  const tableOffestHeight = ref(0)
  const tableHeight = ref(0)
  const tableViewportWidth = ref(0)

  const headerTotalHeight = computed(() => {
    if (!props.showHeader)
      return 0
    return headerRows.value.reduce((total, row) => row.rowHeight + total, 0)
  })

  const footerTotalHeight = computed(() =>
    footerRows.value.reduce((total, row) => row.rowHeight + total, 0),
  )

  function initHeaderRows() {
    if (Array.isArray(groupColumns.value))
      headerRows.value = groupColumns.value.map(() => ({ rowHeight: 0 }))
  }

  function initFooterRows() {
    if (Array.isArray(props.footerData))
      footerRows.value = props.footerData.map(() => ({ rowHeight: 0 }))
  }

  function headerRowHeightChange({ rowIndex, height }: { rowIndex: number, height: number }) {
    headerRows.value.splice(rowIndex, 1, { rowHeight: height })
  }

  function footRowHeightChange({ rowIndex, height }: { rowIndex: number, height: number }) {
    footerRows.value.splice(rowIndex, 1, { rowHeight: height })
  }

  // 表头行数变化（列配置变化）时重置行高，表头行之后会重新上报（RENDER-12）
  watch(groupColumns, (val) => {
    if (!isEmptyArray(val))
      initHeaderRows()
  }, { immediate: true })

  watch(() => props.footerData, (val) => {
    if (!isEmptyArray(val))
      initFooterRows()
  }, { immediate: true })

  return {
    headerRows,
    footerRows,
    headerTotalHeight,
    footerTotalHeight,
    tableOffestHeight,
    tableHeight,
    tableViewportWidth,
    initHeaderRows,
    initFooterRows,
    headerRowHeightChange,
    footRowHeightChange,
  }
}
