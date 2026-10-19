/**
 * 单元格自动填充（MOD-03）
 *
 * 写入规则与粘贴相同（FILL-03、FILL-04，D12），共用 features/cell-value-change：
 * - 操作列、没有 field 的列始终跳过：作为目标列不写入，作为源列（横向填充）没有可填充的值，
 *   对应的目标单元格保持不变；
 * - 设置了 editOption 时（editableOnly）只写入 edit: true 的列，并通过 canChange 逐单元格
 *   调用 beforeCellValueChange（返回 false 或抛出异常只跳过该单元格）；
 * - 值没有变化的单元格不写入，也不回调。
 */
import type {
  AppliedCellChange,
  CanChangeCell,
  CellChange,
} from '../../features/cell-value-change/index.js'
import type { CellKey, CellSelectionRangeData } from '../../ve-table-types'
import type { ColgroupsParam, RowKeysParam } from '../core'
import {
  applyCellChanges,
  isDataColumn,
  isWritableColumn,
} from '../../features/cell-value-change/index.js'
import { AUTOFILLING_DIRECTION } from '../constant'

export interface AutofillRangeIndexes {
  startRowIndex: number
  endRowIndex: number
  startColIndex: number
  endColIndex: number
}

/**
 * beforeAutofill / afterAutofill 的参数
 */
export interface AutofillResponse {
  direction: string
  sourceSelectionRangeIndexes: AutofillRangeIndexes
  targetSelectionRangeIndexes: AutofillRangeIndexes
  sourceSelectionData: Record<string, any>[]
  targetSelectionData: Record<string, any>[]
}

function isValidRange(range: AutofillRangeIndexes) {
  return !Object.values(range).includes(-1)
    && range.startRowIndex <= range.endRowIndex
    && range.startColIndex <= range.endColIndex
}

/**
 * 目标单元格对应的源单元格：源区域按填充方向重复（与 Excel 相同）
 */
function getSourceCellIndex({
  direction,
  source,
  rowIndex,
  colIndex,
}: {
  direction: string
  source: AutofillRangeIndexes
  rowIndex: number
  colIndex: number
}) {
  const rowCount = source.endRowIndex - source.startRowIndex + 1
  const colCount = source.endColIndex - source.startColIndex + 1

  switch (direction) {
    case AUTOFILLING_DIRECTION.DOWN:
      return {
        rowIndex: source.startRowIndex + ((rowIndex - source.endRowIndex - 1) % rowCount),
        colIndex,
      }
    case AUTOFILLING_DIRECTION.UP:
      return {
        rowIndex: source.endRowIndex - ((source.startRowIndex - 1 - rowIndex) % rowCount),
        colIndex,
      }
    case AUTOFILLING_DIRECTION.RIGHT:
      return {
        rowIndex,
        colIndex: source.startColIndex + ((colIndex - source.endColIndex - 1) % colCount),
      }
    case AUTOFILLING_DIRECTION.LEFT:
      return {
        rowIndex,
        colIndex: source.endColIndex - ((source.startColIndex - 1 - colIndex) % colCount),
      }
    default:
      return null
  }
}

/**
 * 计算自动填充要写入的单元格（按行、列从左上到右下的顺序）
 * 跳过不可写入的目标列与没有数据的源列（FILL-03、FILL-04）
 */
export function getAutofillChanges({
  tableData,
  colgroups,
  direction,
  sourceSelectionRangeIndexes: source,
  targetSelectionRangeIndexes: target,
  editableOnly = false,
}: {
  tableData: Record<string, any>[]
  colgroups: ColgroupsParam
  direction: string
  sourceSelectionRangeIndexes: AutofillRangeIndexes
  targetSelectionRangeIndexes: AutofillRangeIndexes
  editableOnly?: boolean
}): CellChange[] {
  const changes: CellChange[] = []

  if (!isValidRange(source) || !isValidRange(target))
    return changes

  for (let rowIndex = target.startRowIndex; rowIndex <= target.endRowIndex; rowIndex++) {
    for (let colIndex = target.startColIndex; colIndex <= target.endColIndex; colIndex++) {
      const column = colgroups[colIndex]

      if (!isWritableColumn(column, editableOnly))
        continue

      const sourceCell = getSourceCellIndex({ direction, source, rowIndex, colIndex })
      const sourceColumn = sourceCell && colgroups[sourceCell.colIndex]
      const sourceRow = sourceCell && tableData[sourceCell.rowIndex]

      // 源列不对应数据字段（横向填充时）：没有可填充的值，目标单元格保持不变
      if (!sourceRow || !isDataColumn(sourceColumn))
        continue

      changes.push({ rowIndex, column, value: sourceRow[sourceColumn.field] })
    }
  }

  return changes
}

/**
 * 区域内的数据（beforeAutofill / afterAutofill 的 sourceSelectionData、targetSelectionData）
 * 只包含对应数据字段的列，不再出现 "undefined" 之类的键（FILL-04）
 */
function getRangeData({
  tableData,
  colgroups,
  rowKeyFieldName,
  range,
}: {
  tableData: Record<string, any>[]
  colgroups: ColgroupsParam
  rowKeyFieldName: string
  range: AutofillRangeIndexes
}) {
  const fieldNames: string[] = colgroups
    .slice(range.startColIndex, range.endColIndex + 1)
    .filter(x => isDataColumn(x))
    .map(x => x.field)

  return tableData
    .slice(range.startRowIndex, range.endRowIndex + 1)
    .map((rowData) => {
      const newData: Record<string, any> = {
        [rowKeyFieldName]: rowData[rowKeyFieldName],
      }
      fieldNames.forEach((fieldName) => {
        newData[fieldName] = rowData[fieldName]
      })
      return newData
    })
}

/***
 * @cellAutofill
 * @desc cell auto fill
 * @param {bool} isReplaceData 为 false 时只计算区域（beforeAutofill 的参数），不写入
 * @param {array<object>} tableData
 * @param {array<any>} allRowKeys
 * @param {array<object>} colgroups
 * @param {string} direction
 * @param {string} rowKeyFieldName
 * @param {object} nextCurrentCell next current cell
 * @param {object} nextNormalEndCell next normal end cell
 * @param {bool} editableOnly 设置了 editOption 时为 true：只写入 edit: true 的列（FILL-03）
 * @param {function} canChange 逐单元格检查（beforeCellValueChange），返回 false 时跳过该单元格
 * @return {response, applied} response 为 beforeAutofill / afterAutofill 的参数，
 *   applied 为实际写入的单元格（用于 afterCellValueChange）
 */
export function cellAutofill({
  isReplaceData,
  tableData,
  allRowKeys,
  colgroups,
  direction,
  rowKeyFieldName,
  cellSelectionRangeData,
  nextCurrentCell,
  nextNormalEndCell,
  editableOnly = false,
  canChange,
}: {
  isReplaceData: boolean
  tableData: any[]
  allRowKeys: RowKeysParam
  colgroups: ColgroupsParam
  direction: string
  rowKeyFieldName: string
  cellSelectionRangeData: CellSelectionRangeData
  nextCurrentCell: CellKey
  nextNormalEndCell: CellKey
  editableOnly?: boolean
  canChange?: CanChangeCell
}): { response: AutofillResponse, applied: AppliedCellChange[] } {
  const { leftColKey, rightColKey, topRowKey, bottomRowKey }
        = cellSelectionRangeData

  // source selection range
  const sourceSelectionRangeIndexes: AutofillRangeIndexes = {
    startRowIndex: allRowKeys.indexOf(topRowKey),
    endRowIndex: allRowKeys.indexOf(bottomRowKey),
    startColIndex: colgroups.findIndex(x => x.key === leftColKey),
    endColIndex: colgroups.findIndex(x => x.key === rightColKey),
  }
  // target selection range
  const targetSelectionRangeIndexes: AutofillRangeIndexes = {
    startRowIndex: -1,
    endRowIndex: -1,
    startColIndex: -1,
    endColIndex: -1,
  }

  if (direction === AUTOFILLING_DIRECTION.UP) {
    targetSelectionRangeIndexes.startRowIndex = allRowKeys.indexOf(nextCurrentCell.rowKey)
    targetSelectionRangeIndexes.endRowIndex = sourceSelectionRangeIndexes.startRowIndex - 1
    targetSelectionRangeIndexes.startColIndex = sourceSelectionRangeIndexes.startColIndex
    targetSelectionRangeIndexes.endColIndex = sourceSelectionRangeIndexes.endColIndex
  }
  else if (direction === AUTOFILLING_DIRECTION.DOWN) {
    targetSelectionRangeIndexes.startRowIndex = sourceSelectionRangeIndexes.endRowIndex + 1
    targetSelectionRangeIndexes.endRowIndex = allRowKeys.indexOf(nextNormalEndCell.rowKey)
    targetSelectionRangeIndexes.startColIndex = sourceSelectionRangeIndexes.startColIndex
    targetSelectionRangeIndexes.endColIndex = sourceSelectionRangeIndexes.endColIndex
  }
  else if (direction === AUTOFILLING_DIRECTION.LEFT) {
    targetSelectionRangeIndexes.startRowIndex = sourceSelectionRangeIndexes.startRowIndex
    targetSelectionRangeIndexes.endRowIndex = sourceSelectionRangeIndexes.endRowIndex
    targetSelectionRangeIndexes.startColIndex = colgroups.findIndex(
      x => x.key === nextCurrentCell.colKey,
    )
    targetSelectionRangeIndexes.endColIndex = sourceSelectionRangeIndexes.startColIndex - 1
  }
  else if (direction === AUTOFILLING_DIRECTION.RIGHT) {
    targetSelectionRangeIndexes.startRowIndex = sourceSelectionRangeIndexes.startRowIndex
    targetSelectionRangeIndexes.endRowIndex = sourceSelectionRangeIndexes.endRowIndex
    targetSelectionRangeIndexes.startColIndex = sourceSelectionRangeIndexes.endColIndex + 1
    targetSelectionRangeIndexes.endColIndex = colgroups.findIndex(
      x => x.key === nextNormalEndCell.colKey,
    )
  }

  let applied: AppliedCellChange[] = []

  if (isReplaceData) {
    // 先算出全部要写入的值再写入：源区域与目标区域不重叠，写入不会影响后续读取
    const changes = getAutofillChanges({
      tableData,
      colgroups,
      direction,
      sourceSelectionRangeIndexes,
      targetSelectionRangeIndexes,
      editableOnly,
    })
    applied = applyCellChanges({ tableData, changes, canChange })
  }

  const response: AutofillResponse = {
    direction,
    sourceSelectionRangeIndexes,
    targetSelectionRangeIndexes,
    sourceSelectionData: getRangeData({
      tableData,
      colgroups,
      rowKeyFieldName,
      range: sourceSelectionRangeIndexes,
    }),
    targetSelectionData: getRangeData({
      tableData,
      colgroups,
      rowKeyFieldName,
      range: targetSelectionRangeIndexes,
    }),
  }

  return { response, applied }
}
