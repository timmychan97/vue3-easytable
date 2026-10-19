/**
 * 列状态（MOD-02）：列配置 → cloneColumns → 分组表头 / colgroups，隐藏 / 显示列，拖动列宽
 *
 * 数据流：
 *   columns（prop）/ 隐藏、显示列 / 右键固定列
 *     → cloneColumns（替换整个数组）
 *     → cloneColumns watcher：initGroupColumns（groupColumns、colgroups、isGroupHeader）、
 *       列宽拖动的初始宽度，并递增 columnsOptionResetTime（表头行高、列宽测量、滚动状态据此重新上报 / 刷新）
 */
import type { ComputedRef, Ref } from 'vue'
import type { VeTableProps } from '../../ve-table-props'
import type { ColgroupData, ColumnOption } from '../../ve-table-types'
import type { TableContext } from '../table-context'
import { isBoolean, isEmptyArray, isNumber } from '@vue3-easytable/common/utils'
import { cloneDeep } from 'lodash'
import { computed, ref, watch } from 'vue'
import { COLUMN_FIXED_TYPE, HOOKS_NAME } from '../../util/constant'
import {
  initGroupColumns as buildGroupColumns,
  recursiveRemoveColumnByKey,
  restoreColumnsState,
} from '../../util/index'

export type ColKey = string | number

export interface UseColumnsOptions {
  props: Pick<VeTableProps, 'columns' | 'columnHiddenOption' | 'columnWidthResizeOption'>
  tableContext: TableContext
  /**
   * 拖动列宽之后、通知子组件（TABLE_CELL_WIDTH_CHANGE）之前调用，用于刷新滚动条状态。
   * 由表格传入，因为滚动状态在列状态之后创建
   */
  onColumnWidthResize?: () => void
}

export interface UseColumns {
  cloneColumns: Ref<ColumnOption[]>
  isGroupHeader: Ref<boolean>
  colgroups: Ref<ColgroupData[]>
  groupColumns: Ref<ColumnOption[][]>
  hiddenColumns: Ref<ColKey[]>
  isDefaultHiddenColumnsApplied: Ref<boolean>
  // 列配置变化（新的 columns、隐藏 / 显示列、右键固定列）时递增
  columnsOptionResetTime: Ref<number>
  isColumnResizerHover: Ref<boolean>
  isColumnResizing: Ref<boolean>
  enableColumnResize: ComputedRef<boolean>
  hasFixedColumn: ComputedRef<boolean>
  hasLeftFixedColumn: ComputedRef<boolean>
  hasRightFixedColumn: ComputedRef<boolean>
  initColumns: () => void
  showOrHideColumns: (options?: { keepColumnsState?: boolean }) => void
  initGroupColumns: () => void
  initColumnWidthByColumnResize: () => void
  setColumnWidth: (params: { colKey: ColKey, width: number }) => void
  setIsColumnResizerHover: (val: boolean) => void
  setIsColumnResizing: (val: boolean) => void
  hideColumnsByKeys: (keys: ColKey[]) => void
  showColumnsByKeys: (keys: ColKey[]) => void
}

// 开启列宽拖动、列没有数字宽度时的默认宽度
const COLUMN_DEFAULT_WIDTH = 50

export function useColumns(options: UseColumnsOptions): UseColumns {
  const { props, tableContext, onColumnWidthResize } = options

  const cloneColumns = ref<ColumnOption[]>([])
  const isGroupHeader = ref(false)
  const colgroups = ref<ColgroupData[]>([])
  const groupColumns = ref<ColumnOption[][]>([])
  const hiddenColumns = ref<ColKey[]>([])
  // defaultHiddenColumnKeys 是否已应用（只应用一次，COL-09）
  const isDefaultHiddenColumnsApplied = ref(false)
  const columnsOptionResetTime = ref(0)

  // 列宽拖动手柄的状态（column-resizer 通过 props 中的 setter 修改）
  const isColumnResizerHover = ref(false)
  const isColumnResizing = ref(false)

  // 是否开启列宽拖动
  const enableColumnResize = computed(() => {
    const enable = props.columnWidthResizeOption?.enable
    return isBoolean(enable) ? enable : false
  })

  const hasFixedColumn = computed(() => colgroups.value.some(
    x => x.fixed === COLUMN_FIXED_TYPE.LEFT || x.fixed === COLUMN_FIXED_TYPE.RIGHT,
  ))
  const hasLeftFixedColumn = computed(() => colgroups.value.some(x => x.fixed === COLUMN_FIXED_TYPE.LEFT))
  const hasRightFixedColumn = computed(() => colgroups.value.some(x => x.fixed === COLUMN_FIXED_TYPE.RIGHT))

  // 初始化列宽拖动的宽度
  function initColumnWidthByColumnResize() {
    if (!enableColumnResize.value)
      return

    colgroups.value = colgroups.value.map((item) => {
      item._columnResizeWidth = isNumber(item.width) ? item.width : COLUMN_DEFAULT_WIDTH
      return item
    })
  }

  /*
   * 隐藏 / 显示列
   * @param keepColumnsState 是否保留当前的列状态（右键固定列、拖动列宽）。
   *   隐藏 / 显示列时保留；columns 变化时按新的列配置重新生成
   */
  function showOrHideColumns({ keepColumnsState = false } = {}) {
    let columns = (cloneDeep(props.columns) as ColumnOption[]).map((col) => {
      // 操作列默认左固定
      if (col.operationColumn)
        col.fixed = COLUMN_FIXED_TYPE.LEFT
      return col
    })

    // 递归移除隐藏的列
    hiddenColumns.value.forEach((key) => {
      columns = recursiveRemoveColumnByKey(columns, key)
    })

    if (keepColumnsState) {
      columns = restoreColumnsState({
        cloneColumns: columns,
        prevCloneColumns: cloneColumns.value,
        colgroups: colgroups.value,
        enableColumnResize: enableColumnResize.value,
      })
    }

    cloneColumns.value = columns
  }

  // 根据 columns 重新生成 cloneColumns
  function initColumns() {
    const { columnHiddenOption } = props
    // 默认隐藏列只应用一次（首次有 columnHiddenOption 时）；
    // 之后 columns 变化时保留运行时隐藏 / 显示的列（COL-09）
    if (columnHiddenOption && !isDefaultHiddenColumnsApplied.value) {
      const { defaultHiddenColumnKeys } = columnHiddenOption

      // 复制一份，避免之后显示列时修改用户传入的数组（COL-03）
      if (!isEmptyArray(defaultHiddenColumnKeys))
        hiddenColumns.value = [...defaultHiddenColumnKeys]

      isDefaultHiddenColumnsApplied.value = true
    }

    showOrHideColumns()
  }

  // 初始化分组表头
  function initGroupColumns() {
    const result = buildGroupColumns(cloneColumns.value)
    isGroupHeader.value = result.isGroupHeader
    colgroups.value = result.colgroups
    groupColumns.value = result.groupColumns
  }

  // 拖动列宽（column-resizer 调用）
  function setColumnWidth({ colKey, width }: { colKey: ColKey, width: number }) {
    colgroups.value = colgroups.value.map((item) => {
      if (item.key === colKey)
        item._columnResizeWidth = width
      return item
    })
    onColumnWidthResize?.()
    tableContext.emit(HOOKS_NAME.TABLE_CELL_WIDTH_CHANGE)
  }

  function setIsColumnResizerHover(val: boolean) {
    isColumnResizerHover.value = val
  }

  function setIsColumnResizing(val: boolean) {
    isColumnResizing.value = val
  }

  // 实例方法：隐藏列
  function hideColumnsByKeys(keys: ColKey[]) {
    if (isEmptyArray(keys))
      return
    // 将要隐藏的列添加到 hiddenColumns 中
    hiddenColumns.value = Array.from(new Set(hiddenColumns.value.concat(keys)))
    showOrHideColumns({ keepColumnsState: true })
  }

  // 实例方法：显示列
  function showColumnsByKeys(keys: ColKey[]) {
    if (isEmptyArray(keys))
      return
    // 将要显示的列从 hiddenColumns 中移除
    hiddenColumns.value = hiddenColumns.value.filter(key => !keys.includes(key))
    showOrHideColumns({ keepColumnsState: true })
  }

  watch(
    () => props.columns,
    (_newVal, oldVal) => {
      // 只重新生成 cloneColumns，分组表头、列宽由 cloneColumns watcher 统一处理（COL-04）
      initColumns()

      // 首次执行时 cloneColumns watcher 尚未创建，需要在这里同步初始化
      if (!oldVal) {
        initGroupColumns()
        initColumnWidthByColumnResize()
      }
    },
    { immediate: true },
  )

  // columns 变化、隐藏 / 显示列、右键（取消）固定列都会替换 cloneColumns
  watch(cloneColumns, () => {
    initGroupColumns()
    initColumnWidthByColumnResize()
    columnsOptionResetTime.value++
  })

  return {
    cloneColumns,
    isGroupHeader,
    colgroups,
    groupColumns,
    hiddenColumns,
    isDefaultHiddenColumnsApplied,
    columnsOptionResetTime,
    isColumnResizerHover,
    isColumnResizing,
    enableColumnResize,
    hasFixedColumn,
    hasLeftFixedColumn,
    hasRightFixedColumn,
    initColumns,
    showOrHideColumns,
    initGroupColumns,
    initColumnWidthByColumnResize,
    setColumnWidth,
    setIsColumnResizerHover,
    setIsColumnResizing,
    hideColumnsByKeys,
    showColumnsByKeys,
  }
}
