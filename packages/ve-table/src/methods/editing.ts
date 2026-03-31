/**
 * Editing methods extracted from ve-table.
 * Spread into defineComponent({ methods: { ...editingMethods } })
 */
import { isBoolean, isEmptyValue, isFunction } from '@vue3-easytable/common/utils'
import { cloneDeep } from 'lodash'
import { HOOKS_NAME, INSTANCE_METHODS } from '../util/constant.js'

export const editingMethods = {
  // save cell when stop editing
  saveCellWhenStopEditing(this: any) {
    const {
      colgroups,
      rowKeyFieldName,
      editOption,
      editingCell,
      isCellEditing,
    } = this

    const {
      cellValueChange,
      beforeCellValueChange,
      afterCellValueChange,
    } = editOption

    if (isCellEditing) {
      const { rowKey, colKey } = editingCell

      const currentRow = this.tableData.find(
        x => x[rowKeyFieldName] === rowKey,
      )

      if (currentRow) {
        const currentColumn = colgroups.find(
          x => x.key === colKey,
        )

        if (!currentColumn?.field) {
          this.clearEditingCell()
          return false
        }

        const changeValue = editingCell.row[currentColumn.field]

        if (isFunction(beforeCellValueChange)) {
          const allowChange = beforeCellValueChange({
            row: cloneDeep(currentRow),
            column: currentColumn,
            changeValue,
          })
          if (isBoolean(allowChange) && !allowChange) {
            this.clearEditingCell()
            return false
          }
        }

        currentRow[currentColumn.field] = changeValue

        // 同 afterCellValueChange，未来被移除
        cellValueChange
        && cellValueChange({
          row: currentRow,
          column: currentColumn,
          changeValue,
        })

        afterCellValueChange
        && afterCellValueChange({
          row: currentRow,
          column: currentColumn,
          changeValue,
        })

        // celar editing cell
        this.clearEditingCell()

        // trigger cell value change hook to refresh selection positions
        // this ensures the selection highlight updates after the cell content changes
        this.$nextTick(() => {
          this.hooks.triggerHook(HOOKS_NAME.CLIPBOARD_CELL_VALUE_CHANGE)
        })
      }

      // reset status
      this.enableStopEditing = true
    }
  },

  // is edit column
  isEditColumn(this: any, colKey: any) {
    return this.colgroups.some(x => x.key === colKey && x.edit)
  },

  /*
   * @editCellByClick
   * @desc  recieve td click event
   * @param {boolean} isDblclick - is dblclick
   */
  editCellByClick(this: any, { isDblclick, rowKey, colKey }: any) {
    const {
      editOption,
      isCellEditing,
      hasEditColumn,
      editingCell,
      isEditColumn,
    } = this

    if (!editOption)
      return false

    // has edit column
    if (!hasEditColumn)
      return false

    if (isEmptyValue(rowKey) || isEmptyValue(colKey))
      return false

    if (
      editingCell
      && editingCell.rowKey === rowKey
      && editingCell.colKey === colKey
    ) {
      return false
    }

    if (isCellEditing)
      this[INSTANCE_METHODS.STOP_EDITING_CELL]()

    if (isDblclick && isEditColumn(colKey)) {
      this.enableStopEditing = false

      this[INSTANCE_METHODS.START_EDITING_CELL]({
        rowKey,
        colKey,
      })
    }
    else {
      this.enableStopEditing = true
    }
  },

  /*
   * @setEditingCell
   * @desc  add editing cells
   * @param {object} rowKey - row key
   * @param {object} colKey - col key
   * @param {object} column - column
   * @param {object} row - row data
   */
  setEditingCell(this: any, { rowKey, colKey, column, row }: any) {
    this.editingCell = {
      rowKey,
      row: cloneDeep(row),
      colKey,
      column,
    }
  },

  // update editing cell value
  updateEditingCellValue(this: any, value: any) {
    const { editingCell } = this
    const { row, column } = editingCell
    row[column.field] = value
    this.editingCell.row = row
  },

  /*
   * @clearEditingCell
   * @desc clear editing cell
   */
  clearEditingCell(this: any) {
    this.editingCell = {
      rowKey: '',
      colKey: '',
      row: null,
      column: null,
    }
  },
}
