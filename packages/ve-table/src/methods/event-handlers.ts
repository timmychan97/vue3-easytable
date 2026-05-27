/**
 * Event handler methods extracted from ve-table.
 * Spread into defineComponent({ methods: { ...eventHandlerMethods } })
 */
import type { CellEventPayload, HeaderCellEventPayload, SelectionRef } from '../ve-table-types'
import { isEmptyValue } from '@vue3-easytable/common/utils'
import { MOUSE_EVENT_CLICK_TYPE } from '@vue3-easytable/common/utils/constant'
import { getMouseEventClickType } from '@vue3-easytable/common/utils/mouse-event'
import {
  HOOKS_NAME,
  INSTANCE_METHODS,
} from '../util/constant.js'
import {
  getColKeysByHeaderColumn,
  getLeftmostColKey,
  getRowKey,
  isClearSelectionByBodyCellRightClick,
  isOperationColumn,
} from '../util/index.js'

export const eventHandlerMethods = {
  /*
   * @bodyCellContextmenu
   * @desc  recieve td right click\contextmenu event
   * @param {object} rowData - row data
   * @param {object} column - column data
   */
  bodyCellContextmenu(this: any, { event: _event, rowData, column }: CellEventPayload) {
    const { editOption, rowKeyFieldName } = this

    if (editOption) {
      const rowKey = getRowKey(rowData, rowKeyFieldName)
      this.editCellByClick({
        isDblclick: false,
        rowKey,
        colKey: column.key,
      })
    }

    this.setContextmenuOptions(column)
  },

  /*
   * @bodyCellDoubleClick
   * @desc  recieve td double click event
   * @param {object} rowData - row data
   * @param {object} column - column data
   */
  bodyCellDoubleClick(this: any, { event: _event, rowData, column }: CellEventPayload) {
    const { editOption, rowKeyFieldName, colgroups } = this

    if (isOperationColumn(column.key, colgroups)) {
      // clear cell selection
      this.clearCellSelectionCurrentCell()
      this.clearCellSelectionNormalEndCell()

      // stop editing cell
      this[INSTANCE_METHODS.STOP_EDITING_CELL]()
      return false
    }

    if (editOption) {
      const rowKey = getRowKey(rowData, rowKeyFieldName)
      this.editCellByClick({
        isDblclick: true,
        rowKey,
        colKey: column.key,
      })
    }
  },

  /*
   * @bodyCellClick
   * @desc  recieve td click event
   * @param {object} rowData - row data
   * @param {object} column - column data
   */
  bodyCellClick(this: any, { event: _event, rowData: _rowData, column: _column }: CellEventPayload) {
    // feature...
  },

  /*
   * @bodyCellMousedown
   * @desc  recieve td mousedown event
   * @param {object} rowData - row data
   * @param {object} column - column data
   */
  bodyCellMousedown(this: any, { event, rowData, column }: CellEventPayload) {
    if (!this.enableCellSelection)
      return false

    const { shiftKey } = event

    const {
      editOption,
      rowKeyFieldName,
      colgroups,
      cellSelectionData,
      cellSelectionRangeData,
      allRowKeys,
    } = this

    const rowKey = getRowKey(rowData, rowKeyFieldName)!
    const colKey = column.key

    const { currentCell } = cellSelectionData

    const mouseEventClickType = getMouseEventClickType(event)

    if (isOperationColumn(colKey, colgroups)) {
      // clear header indicator colKeys
      this.clearHeaderIndicatorColKeys()

      const { bodyIndicatorRowKeys } = this
      this.isBodyOperationColumnMousedown = true

      const {
        startRowKey,
        endRowKey,
        startRowKeyIndex,
        endRowKeyIndex,
      } = bodyIndicatorRowKeys
      let newStartRowKey = startRowKey
      let newEndRowKey = endRowKey

      if (
        shiftKey
        && (startRowKeyIndex > -1 || currentCell.rowIndex > -1)
      ) {
        newStartRowKey = isEmptyValue(currentCell.rowKey)
          ? startRowKey
          : currentCell.rowKey
        newEndRowKey = rowKey
      }
      else {
        const currentRowIndex = allRowKeys.indexOf(rowKey)

        // 左键点击 || 不在当前选择行内
        if (
          mouseEventClickType
          === MOUSE_EVENT_CLICK_TYPE.LEFT_MOUSE
          || currentRowIndex < startRowKeyIndex
          || currentRowIndex > endRowKeyIndex
        ) {
          newStartRowKey = rowKey
          newEndRowKey = rowKey
        }
      }

      this.bodyIndicatorRowKeysChange({
        startRowKey: newStartRowKey,
        endRowKey: newEndRowKey,
      })
    }
    else {
      // body cell mousedown
      this.isBodyCellMousedown = true

      const isClearByRightClick
                  = isClearSelectionByBodyCellRightClick({
                    mouseEventClickType,
                    cellData: {
                      rowKey,
                      colKey,
                    },
                    cellSelectionData,
                    cellSelectionRangeData,
                    colgroups,
                    allRowKeys,
                  })

      if (isClearByRightClick) {
        // clear header indicator colKeys
        this.clearHeaderIndicatorColKeys()
        // clear body indicator colKeys
        this.clearBodyIndicatorRowKeys()

        if (shiftKey && currentCell.rowIndex > -1) {
          this.cellSelectionNormalEndCellChange({
            rowKey,
            colKey,
          })
        }
        else {
          // cell selection by click
          this.cellSelectionByClick({ rowData, column })
          this.clearCellSelectionNormalEndCell()
        }
      }
    }

    if (editOption) {
      this.editCellByClick({
        isDblclick: false,
        rowKey,
        colKey,
      })
    }
  },

  /*
   * @bodyCellMouseover
   * @desc  recieve td mouseover event
   * @param {object} rowData - row data
   * @param {object} column - column data
   */
  bodyCellMouseover(this: any, { event: _event, rowData, column }: CellEventPayload) {
    const {
      rowKeyFieldName,
      isBodyCellMousedown,
      isAutofillStarting,
      isHeaderCellMousedown,
      isBodyOperationColumnMousedown,
    } = this

    const rowKey = getRowKey(rowData, rowKeyFieldName)
    const colKey = column.key

    if (isBodyCellMousedown) {
      // 操作列不能单元格选中
      if (isOperationColumn(colKey, this.colgroups))
        return false

      this.cellSelectionNormalEndCellChange({
        rowKey,
        colKey,
      })
    }

    if (isBodyOperationColumnMousedown) {
      this.bodyIndicatorRowKeysChange({
        startRowKey: this.bodyIndicatorRowKeys.startRowKey,
        endRowKey: rowKey,
      })
    }

    // 允许在body cell mouseover 里补充 header indicator 信息
    if (isHeaderCellMousedown) {
      this.headerIndicatorColKeysChange({
        startColKey: this.headerIndicatorColKeys.startColKey,
        endColKey: colKey,
      })
    }

    if (isAutofillStarting) {
      // 操作列不能autofilling 效果
      if (isOperationColumn(colKey, this.colgroups))
        return false

      this.cellSelectionAutofillCellChange({
        rowKey,
        colKey,
      })
    }
  },

  /*
   * @bodyCellMousemove
   * @desc  recieve td mousemove event
   * @param {object} rowData - row data
   * @param {object} column - column data
   */
  bodyCellMousemove(this: any, { event, rowData: _rowData, column }: CellEventPayload) {
    this.hooks.triggerHook(HOOKS_NAME.BODY_CELL_MOUSEMOVE, {
      event,
      column,
    })
  },

  /*
   * @bodyCellMouseup
   * @desc  recieve td mouseup event
   * @param {object} rowData - row data
   * @param {object} column - column data
   */
  bodyCellMouseup(this: any, { event: _event, rowData: _rowData, column: _column }: CellEventPayload) {
    // feature...
  },

  // header cell click
  headerCellClick(this: any, { event: _event, column: _column }: HeaderCellEventPayload) {
    // feature...
  },

  // header cell contextmenu
  headerCellContextmenu(this: any, { event: _event, column }: HeaderCellEventPayload) {
    this.setContextmenuOptions(column)
  },

  // header cell mousedown
  headerCellMousedown(this: any, { event, column }: HeaderCellEventPayload) {
    if (!this.enableCellSelection)
      return false

    this.isHeaderCellMousedown = true

    const { shiftKey } = event

    const {
      isGroupHeader,
      colgroups,
      headerIndicatorColKeys,
      cellSelectionData,
    } = this

    // clear body indicator colKeys
    this.clearBodyIndicatorRowKeys()

    let colKeys: Array<string | number>
    if (isGroupHeader) {
      colKeys = getColKeysByHeaderColumn({ headerColumnItem: column }) ?? []
    }
    else {
      colKeys = [column.key]
    }

    const currentCellStartColKey = colKeys[0]
    const currentCellEndColKey = colKeys[colKeys.length - 1]

    const { currentCell } = cellSelectionData

    if (isOperationColumn(column.key, colgroups)) {
      // clear cell selection
      this.clearCellSelectionCurrentCell()
      this.clearCellSelectionNormalEndCell()
      this.$nextTick(() => {
        // select all cell
        this[INSTANCE_METHODS.SET_ALL_CELL_SELECTION]()
      })
      return false
    }

    // 需要先将之前选中单元格元素清空
    if (isEmptyValue(headerIndicatorColKeys.startColKey)) {
      // 值的比较（currentCell.colKey 会变化）
      if (
        JSON.stringify(colKeys)
        !== JSON.stringify([currentCell.colKey])
      ) {
        ;(this.$refs[this.cellSelectionRef] as SelectionRef).clearCurrentCellRect()
      }

      ;(this.$refs[this.cellSelectionRef] as SelectionRef).clearNormalEndCellRect()
    }

    const { startColKey, endColKey, startColKeyIndex, endColKeyIndex }
              = headerIndicatorColKeys

    let newStartColKey = startColKey
    let newEndColKey = endColKey
    if (shiftKey) {
      if (isEmptyValue(startColKey)) {
        if (!isEmptyValue(currentCell.colKey)) {
          const leftColKey = getLeftmostColKey({
            colgroups,
            colKeys: colKeys.concat([currentCell.colKey]),
          })

          newStartColKey = currentCell.colKey
          if (leftColKey === currentCell.colKey)
            newEndColKey = currentCellEndColKey

          else
            newEndColKey = currentCellStartColKey
        }
        else {
          newStartColKey = currentCellStartColKey
          newEndColKey = currentCellEndColKey
        }
      }
      else {
        newStartColKey = startColKey
        const leftColKey = getLeftmostColKey({
          colgroups,
          colKeys: colKeys.concat([startColKey]),
        })

        if (leftColKey === startColKey)
          newEndColKey = currentCellEndColKey

        else
          newEndColKey = currentCellStartColKey
      }
    }
    else {
      const mouseEventClickType = getMouseEventClickType(event)
      const currentCellStartColIndex = colgroups.findIndex(
        (x: any) => x.key === currentCellEndColKey,
      )
      const currentCellEndColIndex = colgroups.findIndex(
        (x: any) => x.key === currentCellStartColKey,
      )
      // 左键点击 || 不在当前选择列内
      if (
        mouseEventClickType === MOUSE_EVENT_CLICK_TYPE.LEFT_MOUSE
        || currentCellStartColIndex < startColKeyIndex
        || currentCellEndColIndex < startColKeyIndex
        || currentCellStartColIndex > endColKeyIndex
        || currentCellEndColIndex > endColKeyIndex
      ) {
        newStartColKey = currentCellStartColKey
        newEndColKey = currentCellEndColKey
      }
    }

    this.headerIndicatorColKeysChange({
      startColKey: newStartColKey,
      endColKey: newEndColKey,
    })
  },

  // header cell mouseover
  headerCellMouseover(this: any, { event: _event, column }: HeaderCellEventPayload) {
    const {
      colgroups,
      isGroupHeader,
      isHeaderCellMousedown,
      headerIndicatorColKeys,
    } = this

    if (
      isHeaderCellMousedown
      && !isOperationColumn(column.key, colgroups)
    ) {
      let colKeys: Array<string | number>
      if (isGroupHeader) {
        colKeys = getColKeysByHeaderColumn({ headerColumnItem: column }) ?? []
      }
      else {
        colKeys = [column.key]
      }

      const leftColKey = getLeftmostColKey({
        colgroups,
        colKeys: colKeys.concat([
          headerIndicatorColKeys.startColKey,
        ]),
      })

      let endColKey: string | number
      if (leftColKey === headerIndicatorColKeys.startColKey)
        endColKey = colKeys[colKeys.length - 1]

      else
        endColKey = colKeys[0]

      this.headerIndicatorColKeysChange({
        startColKey: this.headerIndicatorColKeys.startColKey,
        endColKey,
      })
    }
  },

  // header cell mousemove
  headerCellMousemove(this: any, { event, column }: HeaderCellEventPayload) {
    this.hooks.triggerHook(HOOKS_NAME.HEADER_CELL_MOUSEMOVE, {
      event,
      column,
    })
  },

  // header cell mouseleave
  headerCellMouseleave(this: any, { event: _event, column: _column }: HeaderCellEventPayload) {
    // todo
  },

  // header mouseleave
  headerMouseleave(this: any, _event: MouseEvent) {
    this.setIsColumnResizerHover(false)
  },
}
