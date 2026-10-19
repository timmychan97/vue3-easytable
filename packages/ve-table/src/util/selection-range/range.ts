/**
 * 单元格选区范围（MOD-03）：选区内的行 / 列 key、下标与数据
 */
import type { CellKey, CellSelectionData, CellSelectionRangeData } from '../../ve-table-types'
import type { ColgroupsParam, RowKey, RowKeysParam } from '../core'
import { MOUSE_EVENT_CLICK_TYPE } from '@vue3-easytable/common/utils/constant'
import { getColKeysByRangeColKeys } from '../columns/col-keys'

/**
 * @getRowKeysByRangeRowKeys
 * @desc get row keys by range row keys
 * @return Array<colKeys>
 */
export function getRowKeysByRangeRowKeys({
  topRowKey,
  bottomRowKey,
  allRowKeys,
}: {
  topRowKey: RowKey | null | undefined
  bottomRowKey: RowKey | null | undefined
  allRowKeys: RowKeysParam
}): RowKey[] | null {
  let result: RowKey[] | null = null

  const beginIndex = allRowKeys.findIndex(x => x === topRowKey)
  const endIndex = allRowKeys.findIndex(x => x === bottomRowKey)

  if (beginIndex !== -1 && endIndex !== -1)
    result = allRowKeys.slice(beginIndex, endIndex + 1)

  return result
}

/**
 * @isCellInSelectionRange
 * @desc is cell in selection range
 * @return {Array<colKeys>}
 */
export function isCellInSelectionRange({
  cellData,
  cellSelectionRangeData,
  colgroups,
  allRowKeys,
}: {
  cellData: CellKey
  cellSelectionRangeData: CellSelectionRangeData
  colgroups: ColgroupsParam
  allRowKeys: RowKeysParam
}) {
  const { leftColKey, rightColKey, topRowKey, bottomRowKey }
        = cellSelectionRangeData

  const colKeys = getColKeysByRangeColKeys({
    colKey1: leftColKey,
    colKey2: rightColKey,
    colgroups,
  })
  const rowKeys = getRowKeysByRangeRowKeys({
    topRowKey,
    bottomRowKey,
    allRowKeys,
  })

  // range 中的行或列已不存在（SEL-01），视为不在选区内
  if (!colKeys || !rowKeys)
    return false

  if (
    colKeys.includes(cellData.colKey)
    && rowKeys.includes(cellData.rowKey)
  ) {
    return true
  }

  return false
}

/**
 * @isClearSelectionByBodyCellRightClick
 * @desc is clear selection by body cell click
 * @return {bool}
 */
export function isClearSelectionByBodyCellRightClick({
  mouseEventClickType,
  cellData,
  cellSelectionData,
  cellSelectionRangeData,
  colgroups,
  allRowKeys,
}: {
  mouseEventClickType: unknown
  cellData: CellKey
  cellSelectionData: CellSelectionData
  cellSelectionRangeData: CellSelectionRangeData
  colgroups: ColgroupsParam
  allRowKeys: RowKeysParam
}) {
  let result = true
  if (mouseEventClickType === MOUSE_EVENT_CLICK_TYPE.RIGHT_MOUSE) {
    const { normalEndCell } = cellSelectionData
    if (normalEndCell.rowIndex > -1) {
      result = !isCellInSelectionRange({
        cellData,
        cellSelectionRangeData,
        colgroups,
        allRowKeys,
      })
    }
  }
  return result
}

/**
 * @getSelectionRangeKeys
 * @desc get selection range keys
 * @return Array<colKeys>
 */
export function getSelectionRangeKeys({ cellSelectionRangeData }: {
  cellSelectionRangeData: CellSelectionRangeData
}) {
  const { leftColKey, rightColKey, topRowKey, bottomRowKey }
        = cellSelectionRangeData
  return {
    startColKey: leftColKey,
    endColKey: rightColKey,
    startRowKey: topRowKey,
    endRowKey: bottomRowKey,
  }
}

/**
 * @getSelectionRangeIndexes
 * @desc get selection range indexes
 * @return Array<colKeys>
 */
export function getSelectionRangeIndexes({
  cellSelectionRangeData,
  colgroups,
  allRowKeys,
}: {
  cellSelectionRangeData: CellSelectionRangeData
  colgroups: ColgroupsParam
  allRowKeys: RowKeysParam
}) {
  const { leftColKey, rightColKey, topRowKey, bottomRowKey }
        = cellSelectionRangeData
  return {
    startColIndex: colgroups.findIndex(x => x.key === leftColKey),
    endColIndex: colgroups.findIndex(x => x.key === rightColKey),
    startRowIndex: allRowKeys.indexOf(topRowKey),
    endRowIndex: allRowKeys.indexOf(bottomRowKey),
  }
}

/**
 * @getSelectionRangeData
 * @desc get selection range data
 * @return Array<colKeys>
 */
export function getSelectionRangeData({
  cellSelectionRangeData,
  resultType = 'normal',
  tableData,
  colgroups,
  allRowKeys,
}: {
  cellSelectionRangeData: CellSelectionRangeData
  resultType?: 'normal' | 'flat'
  tableData: Record<string, any>[]
  colgroups: ColgroupsParam
  allRowKeys: RowKeysParam
}): Record<string, any>[] | any[][] {
  let result: Record<string, any>[] | any[][]

  const { leftColKey, rightColKey, topRowKey, bottomRowKey }
        = cellSelectionRangeData

  const startColIndex = colgroups.findIndex(x => x.key === leftColKey)
  const endColIndex = colgroups.findIndex(x => x.key === rightColKey)
  const startRowIndex = allRowKeys.indexOf(topRowKey)
  const endRowIndex = allRowKeys.indexOf(bottomRowKey)

  const fieldNames = colgroups
    .slice(startColIndex, endColIndex + 1)
    .map(x => x.field)

  if (resultType === 'normal') {
    result = tableData
      .slice(startRowIndex, endRowIndex + 1)
      .map((rowData) => {
        const newRow: Record<string, any> = {}

        fieldNames.forEach((fieldName) => {
          newRow[fieldName] = rowData[fieldName] ?? ''
        })

        return newRow
      })
  }
  else {
    result = tableData
      .slice(startRowIndex, endRowIndex + 1)
      .map((rowData) => {
        const newRow: any[] = []

        fieldNames.forEach((fieldName) => {
          newRow.push(rowData[fieldName] ?? '')
        })

        return newRow
      })
  }

  return result
}
