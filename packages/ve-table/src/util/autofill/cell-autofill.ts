/**
 * 单元格自动填充（MOD-03）
 */
import type { CellKey, CellSelectionRangeData } from '../../ve-table-types'
import type { ColgroupsParam, RowKeysParam } from '../core'
import { AUTOFILLING_DIRECTION } from '../constant'

/***
 * @cellAutofill
 * @desc cell auto fill
 * @param {bool} isReplaceData
 * @param {array<object>} tableData
 * @param {array<any>} allRowKeys
 * @param {array<object>} colgroups
 * @param {string} direction
 * @param {string} rowKeyFieldName
 * @param {object} nextCurrentCell next current cell
 * @param {object} nextNormalEndCell next normal end cell
 * @return autofillChangeDatas
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
}) {
  let cellSelectionTableData: any[] = []

  const { leftColKey, rightColKey, topRowKey, bottomRowKey }
        = cellSelectionRangeData

  // source selection range
  const sourceSelectionRangeIndexes = {
    startRowIndex: -1,
    endRowIndex: -1,
    startColIndex: -1,
    endColIndex: -1,
  }
  // target selection range
  const targetSelectionRangeIndexes = {
    startRowIndex: -1,
    endRowIndex: -1,
    startColIndex: -1,
    endColIndex: -1,
  }

  sourceSelectionRangeIndexes.startRowIndex = allRowKeys.indexOf(topRowKey)
  sourceSelectionRangeIndexes.endRowIndex = allRowKeys.indexOf(bottomRowKey)
  sourceSelectionRangeIndexes.startColIndex = colgroups.findIndex(
    x => x.key === leftColKey,
  )
  sourceSelectionRangeIndexes.endColIndex = colgroups.findIndex(
    x => x.key === rightColKey,
  )

  cellSelectionTableData = tableData.slice(
    sourceSelectionRangeIndexes.startRowIndex,
    sourceSelectionRangeIndexes.endRowIndex + 1,
  )

  if (direction === AUTOFILLING_DIRECTION.UP) {
    //
    targetSelectionRangeIndexes.startRowIndex = allRowKeys.indexOf(
      nextCurrentCell.rowKey,
    )
    targetSelectionRangeIndexes.endRowIndex
            = sourceSelectionRangeIndexes.startRowIndex - 1
    targetSelectionRangeIndexes.startColIndex
            = sourceSelectionRangeIndexes.startColIndex
    targetSelectionRangeIndexes.endColIndex
            = sourceSelectionRangeIndexes.endColIndex

    if (isReplaceData) {
      let cellSelectionTableDataRowIndex
                = cellSelectionTableData.length - 1
      for (
        let rowIndex = targetSelectionRangeIndexes.endRowIndex;
        rowIndex >= targetSelectionRangeIndexes.startRowIndex;
        rowIndex--
      ) {
        for (
          let colIndex = targetSelectionRangeIndexes.startColIndex;
          colIndex <= targetSelectionRangeIndexes.endColIndex;
          colIndex++
        ) {
          const fieldName = colgroups[colIndex].field

          // repeat autofill cell selection data
          if (cellSelectionTableDataRowIndex < 0) {
            cellSelectionTableDataRowIndex
                            = cellSelectionTableData.length - 1
          }
          tableData[rowIndex][fieldName]
                        = cellSelectionTableData[cellSelectionTableDataRowIndex][
              fieldName
            ]
        }

        --cellSelectionTableDataRowIndex
      }
    }
  }
  else if (direction === AUTOFILLING_DIRECTION.DOWN) {
    //
    targetSelectionRangeIndexes.startRowIndex
            = sourceSelectionRangeIndexes.endRowIndex + 1
    targetSelectionRangeIndexes.endRowIndex = allRowKeys.indexOf(
      nextNormalEndCell.rowKey,
    )
    targetSelectionRangeIndexes.startColIndex
            = sourceSelectionRangeIndexes.startColIndex
    targetSelectionRangeIndexes.endColIndex
            = sourceSelectionRangeIndexes.endColIndex

    if (isReplaceData) {
      let cellSelectionTableDataRowIndex = 0
      for (
        let rowIndex = targetSelectionRangeIndexes.startRowIndex;
        rowIndex <= targetSelectionRangeIndexes.endRowIndex;
        rowIndex++
      ) {
        for (
          let colIndex = targetSelectionRangeIndexes.startColIndex;
          colIndex <= targetSelectionRangeIndexes.endColIndex;
          colIndex++
        ) {
          const fieldName = colgroups[colIndex].field

          // repeat autofill cell selection data
          if (
            cellSelectionTableDataRowIndex
            > cellSelectionTableData.length - 1
          ) {
            cellSelectionTableDataRowIndex = 0
          }

          tableData[rowIndex][fieldName]
                        = cellSelectionTableData[cellSelectionTableDataRowIndex][
              fieldName
            ]
        }

        ++cellSelectionTableDataRowIndex
      }
    }
  }
  else if (direction === AUTOFILLING_DIRECTION.LEFT) {
    //
    targetSelectionRangeIndexes.startRowIndex
            = sourceSelectionRangeIndexes.startRowIndex
    targetSelectionRangeIndexes.endRowIndex
            = sourceSelectionRangeIndexes.endRowIndex
    targetSelectionRangeIndexes.startColIndex = colgroups.findIndex(
      x => x.key === nextCurrentCell.colKey,
    )
    targetSelectionRangeIndexes.endColIndex
            = sourceSelectionRangeIndexes.startColIndex - 1

    if (isReplaceData) {
      let cellSelectionTableDataRowIndex = 0
      for (
        let rowIndex = targetSelectionRangeIndexes.startRowIndex;
        rowIndex <= targetSelectionRangeIndexes.endRowIndex;
        rowIndex++
      ) {
        let cellSelectionTableDataColIndex
                    = sourceSelectionRangeIndexes.endColIndex

        for (
          let colIndex = targetSelectionRangeIndexes.endColIndex;
          colIndex >= targetSelectionRangeIndexes.startColIndex;
          colIndex--
        ) {
          const fieldName = colgroups[colIndex].field

          // repeat autofill cell selection data
          if (
            cellSelectionTableDataColIndex
            < sourceSelectionRangeIndexes.startColIndex
          ) {
            cellSelectionTableDataColIndex
                            = sourceSelectionRangeIndexes.endColIndex
          }

          tableData[rowIndex][fieldName]
                        = cellSelectionTableData[cellSelectionTableDataRowIndex][
              colgroups[cellSelectionTableDataColIndex].field
            ]
          --cellSelectionTableDataColIndex
        }
        ++cellSelectionTableDataRowIndex
      }
    }
  }
  else if (direction === AUTOFILLING_DIRECTION.RIGHT) {
    //
    targetSelectionRangeIndexes.startRowIndex
            = sourceSelectionRangeIndexes.startRowIndex
    targetSelectionRangeIndexes.endRowIndex
            = sourceSelectionRangeIndexes.endRowIndex
    targetSelectionRangeIndexes.startColIndex
            = sourceSelectionRangeIndexes.endColIndex + 1
    targetSelectionRangeIndexes.endColIndex = colgroups.findIndex(
      x => x.key === nextNormalEndCell.colKey,
    )

    if (isReplaceData) {
      let cellSelectionTableDataRowIndex = 0
      for (
        let rowIndex = targetSelectionRangeIndexes.startRowIndex;
        rowIndex <= targetSelectionRangeIndexes.endRowIndex;
        rowIndex++
      ) {
        let cellSelectionTableDataColIndex
                    = sourceSelectionRangeIndexes.startColIndex

        for (
          let colIndex = targetSelectionRangeIndexes.startColIndex;
          colIndex <= targetSelectionRangeIndexes.endColIndex;
          colIndex++
        ) {
          const fieldName = colgroups[colIndex].field

          // repeat autofill cell selection data
          if (
            cellSelectionTableDataColIndex
            > sourceSelectionRangeIndexes.startColIndex
            + (sourceSelectionRangeIndexes.endColIndex
              - sourceSelectionRangeIndexes.startColIndex)
          ) {
            cellSelectionTableDataColIndex
                            = sourceSelectionRangeIndexes.startColIndex
          }

          tableData[rowIndex][fieldName]
                        = cellSelectionTableData[cellSelectionTableDataRowIndex][
              colgroups[cellSelectionTableDataColIndex].field
            ]
          ++cellSelectionTableDataColIndex
        }
        ++cellSelectionTableDataRowIndex
      }
    }
  }

  const response = {
    direction,
    sourceSelectionRangeIndexes,
    targetSelectionRangeIndexes,
    sourceSelectionData: [] as Record<string, any>[],
    targetSelectionData: [] as Record<string, any>[],
  }

  const sourceFieldNames = colgroups
    .slice(
      sourceSelectionRangeIndexes.startColIndex,
      sourceSelectionRangeIndexes.endColIndex + 1,
    )
    .map(x => x.field)
  response.sourceSelectionData = tableData
    .slice(
      sourceSelectionRangeIndexes.startRowIndex,
      sourceSelectionRangeIndexes.endRowIndex + 1,
    )
    .map((rowData) => {
      const newData: Record<string, any> = {
        [rowKeyFieldName]: rowData[rowKeyFieldName],
      }
      sourceFieldNames.forEach((fieldName) => {
        newData[fieldName as string] = rowData[fieldName as string]
      })
      return newData
    })

  const targetFieldNames = colgroups
    .slice(
      targetSelectionRangeIndexes.startColIndex,
      targetSelectionRangeIndexes.endColIndex + 1,
    )
    .map(x => x.field)
  response.targetSelectionData = tableData
    .slice(
      targetSelectionRangeIndexes.startRowIndex,
      targetSelectionRangeIndexes.endRowIndex + 1,
    )
    .map((rowData) => {
      const newData: Record<string, any> = {
        [rowKeyFieldName]: rowData[rowKeyFieldName],
      }
      targetFieldNames.forEach((fieldName) => {
        newData[fieldName as string] = rowData[fieldName as string]
      })
      return newData
    })

  return response
}
