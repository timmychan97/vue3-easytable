/**
 * Cell selection methods extracted from ve-table.
 * Spread into defineComponent({ methods: { ...cellSelectionMethods } })
 */
import { isBoolean, isEmptyValue, isFunction } from '@vue3-easytable/common/utils'
import { KEY_CODES } from '@vue3-easytable/common/utils/constant'
import {
  AUTOFILLING_DIRECTION,
  CURRENT_CELL_SELECTION_TYPES,
  INSTANCE_METHODS,
} from '../util/constant.js'
import {
  cellAutofill,
  getRowKey,
  isCellInSelectionRange,
} from '../util/index.js'

export const cellSelectionMethods = {
  // cell selection current cell change
  cellSelectionCurrentCellChange(this: any, { rowKey, colKey }: any) {
    this.cellSelectionData.currentCell.colKey = colKey
    this.cellSelectionData.currentCell.rowKey = rowKey
    this.cellSelectionData.currentCell.rowIndex
              = this.allRowKeys.indexOf(rowKey)
  },

  // cell selection end cell change
  cellSelectionNormalEndCellChange(this: any, { rowKey, colKey }: any) {
    this.cellSelectionData.normalEndCell.colKey = colKey
    this.cellSelectionData.normalEndCell.rowKey = rowKey
    this.cellSelectionData.normalEndCell.rowIndex
              = this.allRowKeys.indexOf(rowKey)
  },

  // cell selection auto fill cell change
  cellSelectionAutofillCellChange(this: any, { rowKey, colKey }: any) {
    this.cellSelectionData.autoFillEndCell.colKey = colKey
    this.cellSelectionData.autoFillEndCell.rowKey = rowKey
  },

  // clear cell selection current cell
  clearCellSelectionCurrentCell(this: any) {
    this.cellSelectionCurrentCellChange({
      rowKey: '',
      colKey: '',
      rowIndex: -1,
    })
  },

  // clear cell selection normal end cell
  clearCellSelectionNormalEndCell(this: any) {
    this.cellSelectionNormalEndCellChange({
      rowKey: '',
      colKey: '',
      rowIndex: -1,
    })
  },

  // clear cell selection autofill end cell
  clearCellSelectionAutofillEndCell(this: any) {
    this.cellSelectionAutofillCellChange({ rowKey: '', colKey: '' })
  },

  // header indicator colKeys change
  headerIndicatorColKeysChange(this: any, { startColKey, endColKey }: any) {
    const { colgroups } = this
    this.headerIndicatorColKeys.startColKey = startColKey
    this.headerIndicatorColKeys.startColKeyIndex = colgroups.findIndex(
      (x: any) => x.key === startColKey,
    )
    this.headerIndicatorColKeys.endColKey = endColKey
    this.headerIndicatorColKeys.endColKeyIndex = colgroups.findIndex(
      (x: any) => x.key === endColKey,
    )
  },

  // clear header indicator colKeys
  clearHeaderIndicatorColKeys(this: any) {
    this.headerIndicatorColKeys.startColKey = ''
    this.headerIndicatorColKeys.startColKeyIndex = -1
    this.headerIndicatorColKeys.endColKey = ''
    this.headerIndicatorColKeys.endColKeyIndex = -1
  },

  // body indicator rowKeys change
  bodyIndicatorRowKeysChange(this: any, { startRowKey, endRowKey }: any) {
    const { allRowKeys } = this
    this.bodyIndicatorRowKeys.startRowKey = startRowKey
    this.bodyIndicatorRowKeys.startRowKeyIndex
              = allRowKeys.indexOf(startRowKey)
    this.bodyIndicatorRowKeys.endRowKey = endRowKey
    this.bodyIndicatorRowKeys.endRowKeyIndex
              = allRowKeys.indexOf(endRowKey)
  },

  // clear body indicator RowKeys
  clearBodyIndicatorRowKeys(this: any) {
    this.bodyIndicatorRowKeys.startRowKey = ''
    this.bodyIndicatorRowKeys.startRowKeyIndex = -1
    this.bodyIndicatorRowKeys.endRowKey = ''
    this.bodyIndicatorRowKeys.endRowKeyIndex = -1
  },

  // set cell selection by autofill
  setCellSelectionByAutofill(this: any) {
    const {
      cellAutofillOption,
      cellSelectionRangeData,
      colgroups,
      allRowKeys,
      autofillingDirection,
      currentCellSelectionType,
    } = this
    const { autoFillEndCell, currentCell } = this.cellSelectionData

    const { rowKey, colKey } = autoFillEndCell

    if (isEmptyValue(rowKey) || isEmptyValue(colKey))
      return false

    let currentCellData: any = {}
    let normalEndCellData: any = {}

    const { leftColKey, rightColKey, topRowKey, bottomRowKey }
              = cellSelectionRangeData

    // cell selection range auto fill
    if (
      currentCellSelectionType === CURRENT_CELL_SELECTION_TYPES.RANGE
    ) {
      if (
        !isCellInSelectionRange({
          cellData: autoFillEndCell,
          cellSelectionRangeData,
          colgroups,
          allRowKeys,
        })
      ) {
        if (autofillingDirection === AUTOFILLING_DIRECTION.RIGHT) {
          currentCellData = {
            rowKey: topRowKey,
            colKey: leftColKey,
          }
          normalEndCellData = { rowKey: bottomRowKey, colKey }
        }
        else if (
          autofillingDirection === AUTOFILLING_DIRECTION.DOWN
        ) {
          currentCellData = {
            rowKey: topRowKey,
            colKey: leftColKey,
          }
          normalEndCellData = { rowKey, colKey: rightColKey }
        }
        else if (
          autofillingDirection === AUTOFILLING_DIRECTION.UP
        ) {
          currentCellData = {
            rowKey,
            colKey: leftColKey,
          }
          normalEndCellData = {
            rowKey: bottomRowKey,
            colKey: rightColKey,
          }
        }
        else if (
          autofillingDirection === AUTOFILLING_DIRECTION.LEFT
        ) {
          currentCellData = { rowKey: topRowKey, colKey }
          normalEndCellData = {
            rowKey: bottomRowKey,
            colKey: rightColKey,
          }
        }
      }
      else {
        // return if within the range
        return false
      }
    }
    // cell selection single auto fill
    else if (
      currentCellSelectionType === CURRENT_CELL_SELECTION_TYPES.SINGLE
    ) {
      if (
        currentCell.rowKey !== rowKey
        || currentCell.colKey !== colKey
      ) {
        if (autofillingDirection === AUTOFILLING_DIRECTION.RIGHT) {
          currentCellData = {
            rowKey,
            colKey: leftColKey,
          }
          normalEndCellData = {
            rowKey,
            colKey,
          }
        }
        else if (
          autofillingDirection === AUTOFILLING_DIRECTION.DOWN
        ) {
          currentCellData = {
            rowKey: topRowKey,
            colKey: leftColKey,
          }
          normalEndCellData = {
            rowKey,
            colKey: leftColKey,
          }
        }
        else if (
          autofillingDirection === AUTOFILLING_DIRECTION.UP
        ) {
          currentCellData = {
            rowKey,
            colKey: leftColKey,
          }
          normalEndCellData = {
            rowKey: bottomRowKey,
            colKey: leftColKey,
          }
        }
        else if (
          autofillingDirection === AUTOFILLING_DIRECTION.LEFT
        ) {
          currentCellData = {
            rowKey,
            colKey,
          }
          normalEndCellData = {
            rowKey,
            colKey: rightColKey,
          }
        }
      }
      else {
        // return if within the range
        return false
      }
    }

    const cellAutofillParams = {
      tableData: this.tableData,
      allRowKeys: this.allRowKeys,
      colgroups: this.colgroups,
      rowKeyFieldName: this.rowKeyFieldName,
      direction: autofillingDirection,
      currentCellSelectionType,
      cellSelectionRangeData,
      nextCurrentCell: currentCellData,
      nextNormalEndCell: normalEndCellData,
    }

    if (cellAutofillOption) {
      const { beforeAutofill, afterAutofill } = cellAutofillOption

      if (isFunction(beforeAutofill)) {
        // before autofill
        const autofillResponse = cellAutofill({
          isReplaceData: false,
          ...cellAutofillParams,
        })
        const callback = beforeAutofill(autofillResponse)
        if (isBoolean(callback) && !callback)
          return false
      }

      // after autofill
      const autofillResponse = cellAutofill({
        isReplaceData: true,
        ...cellAutofillParams,
      })
      if (isFunction(afterAutofill))
        afterAutofill(autofillResponse)
    }

    if (!isEmptyValue(currentCellData.rowKey)) {
      this.cellSelectionCurrentCellChange({
        rowKey: currentCellData.rowKey,
        colKey: currentCellData.colKey,
      })
    }

    if (!isEmptyValue(normalEndCellData.rowKey)) {
      this.cellSelectionNormalEndCellChange({
        rowKey: normalEndCellData.rowKey,
        colKey: normalEndCellData.colKey,
      })
    }
  },

  // cell selection range data change
  cellSelectionRangeDataChange(this: any, newData: any) {
    this.cellSelectionRangeData = Object.assign(
      this.cellSelectionRangeData,
      newData,
    )
  },

  // autofilling direction change
  autofillingDirectionChange(this: any, direction: any) {
    this.autofillingDirection = direction
  },

  // set current cell selection type
  setCurrentCellSelectionType(this: any) {
    const { currentCell, normalEndCell } = this.cellSelectionData

    let result

    if (
      isEmptyValue(currentCell.rowKey)
      || isEmptyValue(currentCell.colKey)
    ) {
      result = ''
    }
    else {
      if (
        !isEmptyValue(normalEndCell.rowKey)
        && !isEmptyValue(normalEndCell.colKey)
      ) {
        result = CURRENT_CELL_SELECTION_TYPES.RANGE
      }

      else {
        result = CURRENT_CELL_SELECTION_TYPES.SINGLE
      }
    }

    this.currentCellSelectionType = result
  },

  // cell selection by click
  cellSelectionByClick(this: any, { rowData, column }: any) {
    const { rowKeyFieldName } = this

    const rowKey = getRowKey(rowData, rowKeyFieldName)

    // set cell selection and column to visible
    this[INSTANCE_METHODS.SET_CELL_SELECTION]({
      rowKey,
      colKey: column.key,
      isScrollToRow: false,
    })
    // row to visible
    this.rowToVisible(KEY_CODES.ARROW_UP, rowKey)
    this.rowToVisible(KEY_CODES.ARROW_DOWN, rowKey)
  },

  // set range cell selection by header indicator
  setRangeCellSelectionByHeaderIndicator(this: any) {
    const { headerIndicatorColKeys, allRowKeys } = this
    const { startColKey, endColKey } = headerIndicatorColKeys

    if (isEmptyValue(startColKey) || isEmptyValue(endColKey))
      return false

    this.cellSelectionCurrentCellChange({
      rowKey: allRowKeys[0],
      colKey: startColKey,
    })

    this.cellSelectionNormalEndCellChange({
      rowKey: allRowKeys[allRowKeys.length - 1],
      colKey: endColKey,
    })
  },

  // set range cell selection by body indicator
  setRangeCellSelectionByBodyIndicator(this: any) {
    const { bodyIndicatorRowKeys, colgroups } = this
    const { startRowKey, endRowKey } = bodyIndicatorRowKeys

    if (isEmptyValue(startRowKey) || isEmptyValue(endRowKey))
      return false

    if (colgroups.length > 1) {
      this.cellSelectionCurrentCellChange({
        rowKey: startRowKey,
        colKey: colgroups[1].key,
      })

      this.cellSelectionNormalEndCellChange({
        rowKey: endRowKey,
        colKey: colgroups[colgroups.length - 1].key,
      })
    }
  },

  /*
   * @cellSelectionCornerMousedown
   * @desc  recieve cell selection corner mousedown
   */
  cellSelectionCornerMousedown(this: any, { event: _event }: any) {
    this.isAutofillStarting = true
  },

  /*
   * @cellSelectionCornerMouseup
   * @desc  recieve cell selection corner mouseup
   */
  cellSelectionCornerMouseup(this: any, { event: _event }: any) {
    this.isAutofillStarting = false
  },
}
