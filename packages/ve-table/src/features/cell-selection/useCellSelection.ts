/**
 * 单元格选区的操作（MOD-02）：setCellSelection 等实例方法、点击选择，以及行列变化后的状态同步（SEL-01）
 *
 * 状态本身在 useCellSelectionState 中；这里依赖滚动（把选中的行列滚动到可见区域）和编辑（同步时清除失效的编辑状态）。
 */
import type { ComputedRef, Ref } from 'vue'
import type { VeTableProps } from '../../ve-table-props'
import type { ColgroupData } from '../../ve-table-types'
import type { UseEditing } from '../editing/useEditing'
import type { UseScrolling } from '../scrolling/useScrolling'
import type { TableContext } from '../table-context'
import type { UseCellSelectionState } from './useCellSelectionState'
import { isEmptyValue } from '@vue3-easytable/common/utils'
import { KEY_CODES } from '@vue3-easytable/common/utils/constant'
import { computed, nextTick, watch } from 'vue'
import { HOOKS_NAME } from '../../util/constant'
import {
  getColumnByColkey,
  getRowKey,
  getSelectionRangeIndexes,
  getSelectionRangeKeys,
} from '../../util/index'

type RowKey = string | number
type ColKey = string | number

export interface UseCellSelectionOptions {
  props: Pick<VeTableProps, 'rowKeyFieldName'>
  colgroups: Ref<ColgroupData[]>
  allRowKeys: ComputedRef<RowKey[]>
  state: UseCellSelectionState
  scrolling: Pick<UseScrolling, 'columnToVisible' | 'rowToVisible' | 'scrollToRowKey'>
  editing: Pick<UseEditing, 'isCellEditing' | 'editingCell' | 'clearEditingCell' | 'editorInputStartValue' | 'enableStopEditing'>
  tableContext: TableContext
}

export interface UseCellSelection {
  // 选区 / 编辑状态依赖的行列 key（SEL-01）
  cellStateKeys: ComputedRef<[ColgroupData[], RowKey[]]>
  setCellSelection: (params: { rowKey: RowKey, colKey: ColKey, isScrollToRow?: boolean }) => false | void
  setRangeCellSelection: (params: {
    startRowKey: RowKey
    startColKey: ColKey
    endRowKey: RowKey
    endColKey: ColKey
    isScrollToStartCell?: boolean
  }) => false | void
  getRangeCellSelection: () => {
    selectionRangeKeys: ReturnType<typeof getSelectionRangeKeys>
    selectionRangeIndexes: ReturnType<typeof getSelectionRangeIndexes>
  } | undefined
  setAllCellSelection: () => false | void
  cellSelectionByClick: (params: { rowData: Record<string, any>, column: ColgroupData }) => void
  reconcileCellState: () => void
}

export function useCellSelection(options: UseCellSelectionOptions): UseCellSelection {
  const { props, colgroups, allRowKeys, state, scrolling, editing, tableContext } = options
  const {
    enableCellSelection,
    cellSelectionData,
    cellSelectionRangeData,
    headerIndicatorColKeys,
    bodyIndicatorRowKeys,
  } = state

  const cellStateKeys = computed<[ColgroupData[], RowKey[]]>(() => [colgroups.value, allRowKeys.value])

  // 实例方法：选中单元格，并把该列（可选：该行）滚动到可见区域
  function setCellSelection({ rowKey, colKey, isScrollToRow = true }: { rowKey: RowKey, colKey: ColKey, isScrollToRow?: boolean }) {
    if (!enableCellSelection.value)
      return false

    if (isEmptyValue(rowKey) || isEmptyValue(colKey))
      return

    const column = getColumnByColkey(colKey, colgroups.value)

    // 未知的行或列：不改变选区（SEL-06）
    if (!column || !allRowKeys.value.includes(rowKey))
      return false

    // 普通单元格选择，不再是整列 / 整行选择（SEL-09）
    state.clearIndicatorKeys()

    state.cellSelectionCurrentCellChange({ rowKey, colKey })
    // 选中单个单元格：清除之前区域选择的结束单元格（SEL-12）
    state.clearCellSelectionNormalEndCell()

    scrolling.columnToVisible(column)
    if (isScrollToRow)
      scrolling.scrollToRowKey({ rowKey })
  }

  // 实例方法：选中区域，并可选把起始单元格滚动到可见区域
  function setRangeCellSelection({
    startRowKey,
    startColKey,
    endRowKey,
    endColKey,
    isScrollToStartCell = false,
  }: {
    startRowKey: RowKey
    startColKey: ColKey
    endRowKey: RowKey
    endColKey: ColKey
    isScrollToStartCell?: boolean
  }) {
    if (!enableCellSelection.value)
      return false

    if (isEmptyValue(startRowKey) || isEmptyValue(startColKey) || isEmptyValue(endRowKey) || isEmptyValue(endColKey))
      return false

    // 未知的行或列：不改变选区（SEL-06）
    const rowKeys = allRowKeys.value
    const startColumn = getColumnByColkey(startColKey, colgroups.value)
    if (
      !rowKeys.includes(startRowKey)
      || !rowKeys.includes(endRowKey)
      || !startColumn
      || !getColumnByColkey(endColKey, colgroups.value)
    ) {
      return false
    }

    // 普通区域选择，不再是整列 / 整行选择（SEL-09）
    state.clearIndicatorKeys()

    state.cellSelectionCurrentCellChange({ rowKey: startRowKey, colKey: startColKey })
    state.cellSelectionNormalEndCellChange({ rowKey: endRowKey, colKey: endColKey })

    if (isScrollToStartCell) {
      scrolling.columnToVisible(startColumn)
      scrolling.scrollToRowKey({ rowKey: startRowKey })
    }
  }

  // 实例方法：当前选区的 key 与下标，没有选区时返回 undefined
  function getRangeCellSelection() {
    const { rowKey, colKey } = cellSelectionData.value.currentCell

    if (isEmptyValue(rowKey) || isEmptyValue(colKey))
      return

    return {
      selectionRangeKeys: getSelectionRangeKeys({ cellSelectionRangeData: cellSelectionRangeData.value }),
      selectionRangeIndexes: getSelectionRangeIndexes({
        cellSelectionRangeData: cellSelectionRangeData.value,
        colgroups: colgroups.value,
        allRowKeys: allRowKeys.value,
      }),
    }
  }

  // 实例方法：全选（整列 + 整行指示器）
  function setAllCellSelection() {
    if (!enableCellSelection.value)
      return false

    const colKeys = colgroups.value.filter(x => !x.operationColumn).map(x => x.key)
    if (colKeys.length) {
      state.headerIndicatorColKeysChange({
        startColKey: colKeys[0],
        endColKey: colKeys[colKeys.length - 1],
      })
    }

    const rowKeys = allRowKeys.value
    if (rowKeys.length) {
      state.bodyIndicatorRowKeysChange({
        startRowKey: rowKeys[0],
        endRowKey: rowKeys[rowKeys.length - 1],
      })
    }
  }

  // 点击单元格选中：列滚动到可见区域，行只在被遮挡时滚动
  function cellSelectionByClick({ rowData, column }: { rowData: Record<string, any>, column: ColgroupData }) {
    const rowKey = getRowKey(rowData, props.rowKeyFieldName) as RowKey

    setCellSelection({ rowKey, colKey: column.key, isScrollToRow: false })
    scrolling.rowToVisible(KEY_CODES.ARROW_UP, rowKey)
    scrolling.rowToVisible(KEY_CODES.ARROW_DOWN, rowKey)
  }

  /*
   * 列（colgroups）或行（allRowKeys）变化后，同步选区与编辑状态（SEL-01）
   *  - 正在编辑的单元格所在行 / 列已不存在：清除编辑状态（无处保存，直接丢弃）
   *  - currentCell 所在行 / 列已不存在：清空选区（连同 normalEndCell）
   *  - normalEndCell 所在行 / 列已不存在：选区收缩为 currentCell
   *  - 行位置变化：更新 rowIndex，并刷新选区位置
   *  - 表头 / 行指示器的 key 已不存在：清除指示器
   *  - range 中仍引用已不存在的 key（选区层未挂载时）：按当前单元格重置
   */
  function reconcileCellState() {
    const rowKeys = allRowKeys.value
    const { currentCell, normalEndCell, autoFillEndCell } = cellSelectionData.value

    const hasCol = (colKey: ColKey) => colgroups.value.some(x => x.key === colKey)
    const hasRow = (rowKey: RowKey) => rowKeys.includes(rowKey)
    const isCellSet = (cell: { rowKey: RowKey, colKey: ColKey }) =>
      !isEmptyValue(cell.rowKey) && !isEmptyValue(cell.colKey)
    const isCellExist = (cell: { rowKey: RowKey, colKey: ColKey }) => hasRow(cell.rowKey) && hasCol(cell.colKey)

    // editing cell
    if (editing.isCellEditing.value && !isCellExist(editing.editingCell.value)) {
      editing.clearEditingCell()
      editing.editorInputStartValue.value = ''
      editing.enableStopEditing.value = true
    }

    /*
    表头 / 行指示器（整列、整行选择）引用的 key 已不存在时清除。
    key 仍存在时不重新应用：方向键移动后指示器并不会被清除，重新应用会把选区拉回去
    */
    const { startColKey, endColKey } = headerIndicatorColKeys.value
    if ((!isEmptyValue(startColKey) || !isEmptyValue(endColKey)) && (!hasCol(startColKey) || !hasCol(endColKey)))
      state.clearHeaderIndicatorColKeys()

    const { startRowKey, endRowKey } = bodyIndicatorRowKeys.value
    if ((!isEmptyValue(startRowKey) || !isEmptyValue(endRowKey)) && (!hasRow(startRowKey) || !hasRow(endRowKey)))
      state.clearBodyIndicatorRowKeys()

    let isPositionChanged = false

    // current cell
    if (isCellSet(currentCell)) {
      if (!isCellExist(currentCell)) {
        state.clearCellSelectionCurrentCell()
      }
      else {
        const rowIndex = rowKeys.indexOf(currentCell.rowKey)
        if (rowIndex !== currentCell.rowIndex) {
          currentCell.rowIndex = rowIndex
          isPositionChanged = true
        }
      }
    }

    // normal end cell：没有 currentCell 时 range 也没有意义
    if (isCellSet(normalEndCell)) {
      if (!isCellSet(currentCell) || !isCellExist(normalEndCell)) {
        state.clearCellSelectionNormalEndCell()
      }
      else {
        const rowIndex = rowKeys.indexOf(normalEndCell.rowKey)
        if (rowIndex !== normalEndCell.rowIndex) {
          normalEndCell.rowIndex = rowIndex
          isPositionChanged = true
        }
      }
    }

    // autofill end cell
    if (isCellSet(autoFillEndCell) && !isCellExist(autoFillEndCell))
      state.clearCellSelectionAutofillEndCell()

    /*
    selection range：通常由选区层根据 currentCell / normalEndCell 重新计算，
    这里只处理选区层没有同步时仍引用已不存在 key 的情况
    */
    const { leftColKey, rightColKey, topRowKey, bottomRowKey } = cellSelectionRangeData.value
    const isRangeStale
      = [leftColKey, rightColKey].some(x => !isEmptyValue(x) && !hasCol(x))
        || [topRowKey, bottomRowKey].some(x => !isEmptyValue(x) && !hasRow(x))

    if (isRangeStale) {
      if (!isCellSet(currentCell)) {
        state.cellSelectionRangeDataChange({
          leftColKey: '',
          rightColKey: '',
          topRowKey: '',
          bottomRowKey: '',
        })
      }
      else if (!isCellSet(normalEndCell)) {
        state.cellSelectionRangeDataChange({
          leftColKey: currentCell.colKey,
          rightColKey: currentCell.colKey,
          topRowKey: currentCell.rowKey,
          bottomRowKey: currentCell.rowKey,
        })
      }
    }

    // 行位置变化（如在上方插入行）后，等 DOM 更新再刷新选区位置
    if (isPositionChanged) {
      nextTick(() => {
        tableContext.emit(HOOKS_NAME.CLIPBOARD_CELL_VALUE_CHANGE)
      })
    }
  }

  // 行或列变化后同步选区与编辑状态（SEL-01）
  watch(cellStateKeys, () => {
    reconcileCellState()
  })

  return {
    cellStateKeys,
    setCellSelection,
    setRangeCellSelection,
    getRangeCellSelection,
    setAllCellSelection,
    cellSelectionByClick,
    reconcileCellState,
  }
}
