/**
 * 单元格选区状态（MOD-02）
 *
 * - cellSelectionData：活动单元格（currentCell）、区域选择的结束单元格（normalEndCell）、填充的结束单元格（autoFillEndCell）
 * - cellSelectionRangeData：选区的上下左右边界，由选区层（selection）根据上面两个单元格计算后回传
 * - 表头 / 行指示器（整列、整行选择）只保存 key（SEL-09），需要下标时按当前行列顺序计算
 *
 * 这里只有状态与直接修改状态的函数，不涉及滚动、编辑等其他功能；
 * 选区的实例方法（setCellSelection 等）在 useCellSelection 中。
 */
import type { ComputedRef, Ref } from 'vue'
import type { VeTableProps } from '../../ve-table-props'
import type {
  BodyIndicatorRowKeys,
  CellKey,
  CellSelectionData,
  CellSelectionRangeData,
  ColgroupData,
  HeaderIndicatorColKeys,
} from '../../ve-table-types'
import { isBoolean, isEmptyValue } from '@vue3-easytable/common/utils'
import { computed, ref, watch } from 'vue'
import { CURRENT_CELL_SELECTION_TYPES } from '../../util/constant'

type RowKey = string | number
type ColKey = string | number

export interface UseCellSelectionStateOptions {
  props: Pick<VeTableProps, 'cellSelectionOption' | 'rowKeyFieldName'>
  colgroups: Ref<ColgroupData[]>
  allRowKeys: ComputedRef<RowKey[]>
}

export interface IndicatorIndexes {
  startColIndex: number
  endColIndex: number
  startRowIndex: number
  endRowIndex: number
}

export interface UseCellSelectionState {
  cellSelectionData: Ref<CellSelectionData>
  cellSelectionRangeData: Ref<CellSelectionRangeData>
  headerIndicatorColKeys: Ref<HeaderIndicatorColKeys>
  bodyIndicatorRowKeys: Ref<BodyIndicatorRowKeys>
  // '' | 'single' | 'range'
  currentCellSelectionType: Ref<string>
  // 是否开启单元格选择（单元格编辑、剪贴板都依赖单元格选择）
  enableCellSelection: ComputedRef<boolean>
  cellSelectionCurrentCellChange: (cell: CellKey) => void
  cellSelectionNormalEndCellChange: (cell: CellKey) => void
  cellSelectionAutofillCellChange: (cell: CellKey) => void
  clearCellSelectionCurrentCell: () => void
  clearCellSelectionNormalEndCell: () => void
  clearCellSelectionAutofillEndCell: () => void
  headerIndicatorColKeysChange: (keys: HeaderIndicatorColKeys) => void
  clearHeaderIndicatorColKeys: () => void
  bodyIndicatorRowKeysChange: (keys: BodyIndicatorRowKeys) => void
  clearBodyIndicatorRowKeys: () => void
  clearIndicatorKeys: () => void
  getIndicatorIndexes: () => IndicatorIndexes
  cellSelectionRangeDataChange: (newData: Partial<CellSelectionRangeData>) => void
  setCurrentCellSelectionType: () => void
  setRangeCellSelectionByHeaderIndicator: () => void
  setRangeCellSelectionByBodyIndicator: () => void
}

export function useCellSelectionState(options: UseCellSelectionStateOptions): UseCellSelectionState {
  const { props, colgroups, allRowKeys } = options

  const cellSelectionData = ref<CellSelectionData>({
    currentCell: { rowKey: '', colKey: '', rowIndex: -1 },
    normalEndCell: { rowKey: '', colKey: '', rowIndex: -1 },
    autoFillEndCell: { rowKey: '', colKey: '' },
  })
  const cellSelectionRangeData = ref<CellSelectionRangeData>({
    leftColKey: '',
    rightColKey: '',
    topRowKey: '',
    bottomRowKey: '',
  })
  // 整列 / 整行选择的指示器，只保存 key（SEL-09）
  const headerIndicatorColKeys = ref<HeaderIndicatorColKeys>({ startColKey: '', endColKey: '' })
  const bodyIndicatorRowKeys = ref<BodyIndicatorRowKeys>({ startRowKey: '', endRowKey: '' })
  const currentCellSelectionType = ref('')

  const enableCellSelection = computed(() => {
    const { cellSelectionOption, rowKeyFieldName } = props
    if (isEmptyValue(rowKeyFieldName))
      return false
    if (cellSelectionOption && isBoolean(cellSelectionOption.enable) && cellSelectionOption.enable === false)
      return false
    return true
  })

  function cellSelectionCurrentCellChange({ rowKey, colKey }: CellKey) {
    const { currentCell } = cellSelectionData.value
    currentCell.colKey = colKey
    currentCell.rowKey = rowKey
    currentCell.rowIndex = allRowKeys.value.indexOf(rowKey)
  }

  function cellSelectionNormalEndCellChange({ rowKey, colKey }: CellKey) {
    const { normalEndCell } = cellSelectionData.value
    normalEndCell.colKey = colKey
    normalEndCell.rowKey = rowKey
    normalEndCell.rowIndex = allRowKeys.value.indexOf(rowKey)
  }

  function cellSelectionAutofillCellChange({ rowKey, colKey }: CellKey) {
    const { autoFillEndCell } = cellSelectionData.value
    autoFillEndCell.colKey = colKey
    autoFillEndCell.rowKey = rowKey
  }

  function clearCellSelectionCurrentCell() {
    cellSelectionCurrentCellChange({ rowKey: '', colKey: '' })
  }

  function clearCellSelectionNormalEndCell() {
    cellSelectionNormalEndCellChange({ rowKey: '', colKey: '' })
  }

  function clearCellSelectionAutofillEndCell() {
    cellSelectionAutofillCellChange({ rowKey: '', colKey: '' })
  }

  /*
   * 表头 / 行指示器（整列、整行选择）只保存 key（SEL-09）。
   * 行列位置会变化（插入行、排序、隐藏列），需要下标时用 getIndicatorIndexes 按 key 重新计算
   */
  function headerIndicatorColKeysChange({ startColKey, endColKey }: HeaderIndicatorColKeys) {
    headerIndicatorColKeys.value.startColKey = startColKey
    headerIndicatorColKeys.value.endColKey = endColKey
  }

  function clearHeaderIndicatorColKeys() {
    headerIndicatorColKeys.value.startColKey = ''
    headerIndicatorColKeys.value.endColKey = ''
  }

  function bodyIndicatorRowKeysChange({ startRowKey, endRowKey }: BodyIndicatorRowKeys) {
    bodyIndicatorRowKeys.value.startRowKey = startRowKey
    bodyIndicatorRowKeys.value.endRowKey = endRowKey
  }

  function clearBodyIndicatorRowKeys() {
    bodyIndicatorRowKeys.value.startRowKey = ''
    bodyIndicatorRowKeys.value.endRowKey = ''
  }

  // 清除表头与行指示器：选区被键盘、单元格点击或 API 改为普通单元格选择时调用（SEL-09）
  function clearIndicatorKeys() {
    clearHeaderIndicatorColKeys()
    clearBodyIndicatorRowKeys()
  }

  // 按当前的 colgroups / allRowKeys 计算指示器的起止下标，未设置或已不存在时为 -1（SEL-09）
  function getIndicatorIndexes(): IndicatorIndexes {
    const colIndex = (colKey: ColKey) =>
      isEmptyValue(colKey) ? -1 : colgroups.value.findIndex(x => x.key === colKey)
    const rowIndex = (rowKey: RowKey) =>
      isEmptyValue(rowKey) ? -1 : allRowKeys.value.indexOf(rowKey)

    return {
      startColIndex: colIndex(headerIndicatorColKeys.value.startColKey),
      endColIndex: colIndex(headerIndicatorColKeys.value.endColKey),
      startRowIndex: rowIndex(bodyIndicatorRowKeys.value.startRowKey),
      endRowIndex: rowIndex(bodyIndicatorRowKeys.value.endRowKey),
    }
  }

  // 选区边界（选区层计算后回传）
  function cellSelectionRangeDataChange(newData: Partial<CellSelectionRangeData>) {
    Object.assign(cellSelectionRangeData.value, newData)
  }

  // 根据活动单元格与结束单元格设置选择类型
  function setCurrentCellSelectionType() {
    const { currentCell, normalEndCell } = cellSelectionData.value

    if (isEmptyValue(currentCell.rowKey) || isEmptyValue(currentCell.colKey))
      currentCellSelectionType.value = ''
    else if (!isEmptyValue(normalEndCell.rowKey) && !isEmptyValue(normalEndCell.colKey))
      currentCellSelectionType.value = CURRENT_CELL_SELECTION_TYPES.RANGE
    else
      currentCellSelectionType.value = CURRENT_CELL_SELECTION_TYPES.SINGLE
  }

  // 整列选择：从第一行到最后一行
  function setRangeCellSelectionByHeaderIndicator() {
    const { startColKey, endColKey } = headerIndicatorColKeys.value
    if (isEmptyValue(startColKey) || isEmptyValue(endColKey))
      return

    const rowKeys = allRowKeys.value
    cellSelectionCurrentCellChange({ rowKey: rowKeys[0], colKey: startColKey })
    cellSelectionNormalEndCellChange({ rowKey: rowKeys[rowKeys.length - 1], colKey: endColKey })
  }

  // 整行选择：从第一个到最后一个非操作列
  function setRangeCellSelectionByBodyIndicator() {
    const { startRowKey, endRowKey } = bodyIndicatorRowKeys.value
    if (isEmptyValue(startRowKey) || isEmptyValue(endRowKey))
      return

    // 整行选择只包含非操作列（SEL-03：之前固定从 colgroups[1] 开始，没有操作列时会漏掉第一列）
    const dataColumns = colgroups.value.filter(x => !x.operationColumn)
    if (dataColumns.length) {
      cellSelectionCurrentCellChange({ rowKey: startRowKey, colKey: dataColumns[0].key })
      cellSelectionNormalEndCellChange({ rowKey: endRowKey, colKey: dataColumns[dataColumns.length - 1].key })
    }
  }

  watch(() => cellSelectionData.value.currentCell, setCurrentCellSelectionType, { deep: true, immediate: true })
  watch(() => cellSelectionData.value.normalEndCell, setCurrentCellSelectionType, { deep: true, immediate: true })
  watch(headerIndicatorColKeys, setRangeCellSelectionByHeaderIndicator, { deep: true })
  watch(bodyIndicatorRowKeys, setRangeCellSelectionByBodyIndicator, { deep: true })

  return {
    cellSelectionData,
    cellSelectionRangeData,
    headerIndicatorColKeys,
    bodyIndicatorRowKeys,
    currentCellSelectionType,
    enableCellSelection,
    cellSelectionCurrentCellChange,
    cellSelectionNormalEndCellChange,
    cellSelectionAutofillCellChange,
    clearCellSelectionCurrentCell,
    clearCellSelectionNormalEndCell,
    clearCellSelectionAutofillEndCell,
    headerIndicatorColKeysChange,
    clearHeaderIndicatorColKeys,
    bodyIndicatorRowKeysChange,
    clearBodyIndicatorRowKeys,
    clearIndicatorKeys,
    getIndicatorIndexes,
    cellSelectionRangeDataChange,
    setCurrentCellSelectionType,
    setRangeCellSelectionByHeaderIndicator,
    setRangeCellSelectionByBodyIndicator,
  }
}
