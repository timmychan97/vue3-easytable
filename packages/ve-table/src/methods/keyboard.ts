/**
 * Keyboard handling methods extracted from ve-table.
 * Spread into defineComponent({ methods: { ...keyboardMethods } })
 */

import { isEmptyValue } from '@vue3-easytable/common/utils'
import { KEY_CODES } from '@vue3-easytable/common/utils/constant'
import { isInputKeyCode } from '@vue3-easytable/common/utils/event-key-codes'
import { CELL_SELECTION_DIRECTION, INSTANCE_METHODS } from '../util/constant.js'

export const keyboardMethods = {
  dealKeydownEvent(this: any, event: KeyboardEvent) {
    const {
      colgroups,
      cellSelectionData,
      enableStopEditing,
      isCellEditing,
    } = this

    const { keyCode, ctrlKey, shiftKey, altKey } = event

    const { rowKey, colKey } = cellSelectionData.currentCell

    const currentColumn = colgroups.find(x => x.key === colKey)

    if (!isEmptyValue(rowKey) && !isEmptyValue(colKey)) {
      switch (keyCode) {
        case KEY_CODES.TAB: {
          let direction
          if (shiftKey)
            direction = CELL_SELECTION_DIRECTION.LEFT

          else
            direction = CELL_SELECTION_DIRECTION.RIGHT

          this.selectCellByDirection({
            direction,
          })

          this.clearCellSelectionNormalEndCell()

          this[INSTANCE_METHODS.STOP_EDITING_CELL]()
          event.preventDefault()
          break
        }
        case KEY_CODES.ARROW_LEFT: {
          const direction = CELL_SELECTION_DIRECTION.LEFT
          if (enableStopEditing) {
            this.selectCellByDirection({
              direction,
            })

            this.clearCellSelectionNormalEndCell()

            this[INSTANCE_METHODS.STOP_EDITING_CELL]()
            event.preventDefault()
          }

          break
        }
        case KEY_CODES.ARROW_RIGHT: {
          const direction = CELL_SELECTION_DIRECTION.RIGHT

          if (enableStopEditing) {
            this.selectCellByDirection({
              direction,
            })

            this.clearCellSelectionNormalEndCell()

            this[INSTANCE_METHODS.STOP_EDITING_CELL]()
            event.preventDefault()
          }
          break
        }
        case KEY_CODES.ARROW_UP: {
          const direction = CELL_SELECTION_DIRECTION.UP

          if (enableStopEditing) {
            this.selectCellByDirection({
              direction,
            })

            this.clearCellSelectionNormalEndCell()

            this[INSTANCE_METHODS.STOP_EDITING_CELL]()
            event.preventDefault()
          }
          break
        }
        case KEY_CODES.ARROW_DOWN: {
          const direction = CELL_SELECTION_DIRECTION.DOWN

          if (enableStopEditing) {
            this.selectCellByDirection({
              direction,
            })

            this.clearCellSelectionNormalEndCell()

            this[INSTANCE_METHODS.STOP_EDITING_CELL]()
            event.preventDefault()
          }
          break
        }
        case KEY_CODES.ENTER: {
          let direction
          // add new line
          if (altKey) {
            const editInputEditor
                              = this.$refs[this.editInputRef]

            editInputEditor.textareaAddNewLine()
          }
          // direction up
          else if (shiftKey) {
            direction = CELL_SELECTION_DIRECTION.UP
            this[INSTANCE_METHODS.STOP_EDITING_CELL]()
          }
          // stop editing and stay in current cell
          else if (ctrlKey) {
            this[INSTANCE_METHODS.STOP_EDITING_CELL]()
          }
          // direction down
          else {
            direction = CELL_SELECTION_DIRECTION.DOWN
            this[INSTANCE_METHODS.STOP_EDITING_CELL]()
          }

          if (direction) {
            this.clearCellSelectionNormalEndCell()
            this.selectCellByDirection({
              direction,
            })
          }
          event.preventDefault()
          break
        }
        case KEY_CODES.SPACE: {
          if (!isCellEditing) {
            // start editing and enter a space
            this[INSTANCE_METHODS.START_EDITING_CELL]({
              rowKey,
              colKey,
              defaultValue: ' ',
            })
            event.preventDefault()
          }

          break
        }
        case KEY_CODES.BACK_SPACE: {
          if (!isCellEditing) {
            // start editing and clear value
            this[INSTANCE_METHODS.START_EDITING_CELL]({
              rowKey,
              colKey,
              defaultValue: '',
            })
            event.preventDefault()
          }

          break
        }
        case KEY_CODES.DELETE: {
          if (!isCellEditing) {
            // delete cell selection range value
            this.deleteCellSelectionRangeValue()
            event.preventDefault()
          }

          break
        }
        case KEY_CODES.F2: {
          if (!isCellEditing) {
            if (currentColumn.edit) {
              // start editing cell and don't allow stop eidting by direction key
              this.enableStopEditing = false
              this[INSTANCE_METHODS.START_EDITING_CELL]({
                rowKey,
                colKey,
              })
            }
            event.preventDefault()
          }

          break
        }
        default: {
          // enter text directly
          if (isInputKeyCode(event)) {
            this[INSTANCE_METHODS.START_EDITING_CELL]({
              rowKey,
              colKey,
              defaultValue: '',
            })
          }
          break
        }
      }
    }
  },

  selectCellByDirection(this: any, { direction }: { direction: string }) {
    const { colgroups, allRowKeys, cellSelectionData } = this

    const { rowKey, colKey } = cellSelectionData.currentCell

    const columnIndex = colgroups.findIndex(x => x.key === colKey)
    const rowIndex = allRowKeys.indexOf(rowKey)

    if (direction === CELL_SELECTION_DIRECTION.LEFT) {
      if (columnIndex > 0) {
        const nextColumn = colgroups[columnIndex - 1]
        this.cellSelectionData.currentCell.colKey = nextColumn.key
        this.columnToVisible(nextColumn)
      }
    }
    else if (direction === CELL_SELECTION_DIRECTION.RIGHT) {
      if (columnIndex < colgroups.length - 1) {
        const nextColumn = colgroups[columnIndex + 1]
        this.cellSelectionData.currentCell.colKey = nextColumn.key
        this.columnToVisible(nextColumn)
      }
    }
    else if (direction === CELL_SELECTION_DIRECTION.UP) {
      if (rowIndex > 0) {
        const nextRowKey = allRowKeys[rowIndex - 1]
        this.rowToVisible(KEY_CODES.ARROW_UP, nextRowKey)
      }
    }
    else if (direction === CELL_SELECTION_DIRECTION.DOWN) {
      if (rowIndex < allRowKeys.length - 1) {
        const nextRowKey = allRowKeys[rowIndex + 1]
        this.rowToVisible(KEY_CODES.ARROW_DOWN, nextRowKey)
      }
    }
  },
}
