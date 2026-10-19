/**
 * Editing methods extracted from ve-table.
 * Spread into defineComponent({ methods: { ...editingMethods } })
 */
import { isBoolean, isEmptyValue } from '@vue3-easytable/common/utils'
import { cloneDeep } from 'lodash'
import { HOOKS_NAME, INSTANCE_METHODS } from '../util/constant.js'
import { safeCall } from '../util/safe-call.js'

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

      try {
        const currentRow = this.tableData.find(
          x => x[rowKeyFieldName] === rowKey,
        )

        // 编辑中的行已被移除：无处保存，直接清除编辑状态（SEL-01）
        if (!currentRow) {
          this.clearEditingCell()
          return false
        }

        const currentColumn = colgroups.find(
          x => x.key === colKey,
        )

        if (!currentColumn?.field) {
          this.clearEditingCell()
          return false
        }

        const changeValue = editingCell.row[currentColumn.field]

        /*
        beforeCellValueChange 抛出异常时视为“取消修改”（INFRA-07）：
        不写入数据、不触发 after 回调，但仍要清除编辑状态
        */
        const { value: allowChange, threw } = safeCall(
          'beforeCellValueChange',
          beforeCellValueChange,
          {
            row: cloneDeep(currentRow),
            column: currentColumn,
            changeValue,
          },
        )
        if (threw || (isBoolean(allowChange) && !allowChange)) {
          this.clearEditingCell()
          return false
        }

        currentRow[currentColumn.field] = changeValue

        // 先清除编辑状态，再调用 after 回调（INFRA-07）
        this.clearEditingCell()

        // 同 afterCellValueChange，未来被移除
        safeCall('cellValueChange', cellValueChange, {
          row: currentRow,
          column: currentColumn,
          changeValue,
        })

        safeCall('afterCellValueChange', afterCellValueChange, {
          row: currentRow,
          column: currentColumn,
          changeValue,
        })

        // trigger cell value change hook to refresh selection positions
        // this ensures the selection highlight updates after the cell content changes
        this.$nextTick(() => {
          this.tableContext.emit(HOOKS_NAME.CLIPBOARD_CELL_VALUE_CHANGE)
        })
      }
      finally {
        // reset status（无论保存、取消还是异常都要恢复）
        this.enableStopEditing = true
      }
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
