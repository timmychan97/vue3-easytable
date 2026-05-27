/**
 * Instance API methods extracted from ve-table.
 * Spread into defineComponent({ methods: { ...instanceApiMethods } })
 */
import type { scrollTo } from '@vue3-easytable/common/utils'
import {
  isBoolean,
  isDefined,
  isEmptyValue,
  isFunction,
  scrollTo as scrollToUtil,
} from '@vue3-easytable/common/utils'
import { cloneDeep } from 'lodash'
import {
  COMPS_CUSTOM_ATTRS,
  INSTANCE_METHODS,
} from '../util/constant.js'
import {
  getColumnByColkey,
  getSelectionRangeIndexes,
  getSelectionRangeKeys,
} from '../util/index.js'

export const instanceApiMethods = {
  /*
    set cell selection and column to visible
    */
  [INSTANCE_METHODS.SET_CELL_SELECTION](
    this: any,
    {
      rowKey,
      colKey,
      isScrollToRow = true,
    }: { rowKey: string | number, colKey: string, isScrollToRow?: boolean },
  ) {
    const { enableCellSelection } = this

    if (!enableCellSelection)
      return false

    if (!isEmptyValue(rowKey) && !isEmptyValue(colKey)) {
      this.cellSelectionCurrentCellChange({
        rowKey,
        colKey,
      })

      const column = getColumnByColkey(colKey, this.colgroups)
      // column to visible
      this.columnToVisible(column)
      // row to visible
      if (isScrollToRow)
        this[INSTANCE_METHODS.SCROLL_TO_ROW_KEY]({ rowKey })
    }
  },

  /*
    set range cell selection and column to visible
    */
  [INSTANCE_METHODS.SET_RANGE_CELL_SELECTION](
    this: any,
    {
      startRowKey,
      startColKey,
      endRowKey,
      endColKey,
      isScrollToStartCell = false,
    }: { startRowKey: string | number, startColKey: string, endRowKey: string | number, endColKey: string, isScrollToStartCell?: boolean },
  ) {
    const { enableCellSelection } = this

    if (!enableCellSelection)
      return false

    if (
      isEmptyValue(startRowKey)
      || isEmptyValue(startColKey)
      || isEmptyValue(endRowKey)
      || isEmptyValue(endColKey)
    ) {
      return false
    }

    this.cellSelectionCurrentCellChange({
      rowKey: startRowKey,
      colKey: startColKey,
    })

    this.cellSelectionNormalEndCellChange({
      rowKey: endRowKey,
      colKey: endColKey,
    })

    // row to visible
    if (isScrollToStartCell) {
      const column = getColumnByColkey(startColKey, this.colgroups)
      // column to visible
      this.columnToVisible(column)
      this[INSTANCE_METHODS.SCROLL_TO_ROW_KEY]({
        rowKey: startRowKey,
      })
    }
  },

  /*
    get range cell selection
    */
  [INSTANCE_METHODS.GET_RANGE_CELL_SELECTION](this: any) {
    const {
      cellSelectionData,
      cellSelectionRangeData,
      allRowKeys,
      colgroups,
    } = this

    const { rowKey, colKey } = cellSelectionData.currentCell

    if (!isEmptyValue(rowKey) && !isEmptyValue(colKey)) {
      const selectionRangeKeys = getSelectionRangeKeys({
        cellSelectionRangeData,
      })

      const selectionRangeIndexes = getSelectionRangeIndexes({
        cellSelectionRangeData,
        colgroups,
        allRowKeys,
      })

      return {
        selectionRangeKeys,
        selectionRangeIndexes,
      }
    }
  },

  /*
    set all cell selection and column to visible
    */
  [INSTANCE_METHODS.SET_ALL_CELL_SELECTION](this: any) {
    const { enableCellSelection } = this

    if (!enableCellSelection)
      return false

    const { colgroups, allRowKeys } = this

    if (colgroups.length) {
      const colKeys = colgroups
        .filter((x: any) => !x.operationColumn)
        .map((x: any) => x.key)

      if (colKeys.length) {
        this.headerIndicatorColKeysChange({
          startColKey: colKeys[0],
          endColKey: colKeys[colKeys.length - 1],
        })
      }
    }

    if (allRowKeys.length) {
      this.bodyIndicatorRowKeysChange({
        startRowKey: allRowKeys[0],
        endRowKey: allRowKeys[allRowKeys.length - 1],
      })
    }
  },

  // hide columns by keys
  [INSTANCE_METHODS.HIDE_COLUMNS_BY_KEYS](this: any, keys: string[]) {
    if (!Array.isArray(keys) || keys.length === 0)
      return

    /*
            将要隐藏的列添加到 hiddenColumns 中
            Add the columns you want to hide to hidden columns
            */
    this.hiddenColumns = Array.from(
      new Set(this.hiddenColumns.concat(keys)),
    )

    this.showOrHideColumns()
  },

  // show columns by keys
  [INSTANCE_METHODS.SHOW_COLUMNS_BY_KEYS](this: any, keys: string[]) {
    if (!Array.isArray(keys) || keys.length === 0)
      return

    /*
            将要显示的列从 hiddenColumns 中移除
            Remove the columns to show from hidden columns
            */
    for (let i = keys.length - 1; i >= 0; i--) {
      const delIndex = this.hiddenColumns.indexOf(keys[i])
      if (delIndex > -1)
        this.hiddenColumns.splice(delIndex, 1)
    }

    this.showOrHideColumns()
  },

  // table scrollTo
  [INSTANCE_METHODS.SCROLL_TO](this: any, option: Parameters<typeof scrollTo>[1]) {
    scrollToUtil(this.$refs[this.tableContainerRef] as HTMLElement, option)
  },

  // table scroll to rowKey position
  [INSTANCE_METHODS.SCROLL_TO_ROW_KEY](this: any, { rowKey }: { rowKey: string | number }) {
    if (isEmptyValue(rowKey)) {
      console.warn('Row key can\'t be empty!')
      return false
    }

    const { isVirtualScroll, headerTotalHeight, rowKeyFieldName } = this
    const tableContainerRef = this.$refs[this.tableContainerRef] as HTMLElement

    if (isVirtualScroll && this._vs) {
      // Find the row's index in tableData
      const index = this.tableData.findIndex(
        (row: any) => rowKeyFieldName && row[rowKeyFieldName] === rowKey,
      )
      if (index >= 0) {
        this._vs.scrollToIndex(index, { align: 'start', behavior: 'auto' })
      }
    }
    else {
      const rowEl = this.$el.querySelector(
        `tbody tr[${COMPS_CUSTOM_ATTRS.BODY_ROW_KEY}="${rowKey}"]`,
      ) as HTMLElement | null

      const scrollTop = rowEl ? rowEl.offsetTop - headerTotalHeight : 0

      scrollToUtil(tableContainerRef, {
        top: scrollTop,
        behavior: 'smooth',
      })
    }
  },

  // scroll to col key position
  [INSTANCE_METHODS.SCROLL_TO_COL_KEY](this: any, { colKey }: { colKey: string }) {
    const column = getColumnByColkey(colKey, this.colgroups)
    if (column)
      this.columnToVisible(column)
  },

  // start editing cell
  [INSTANCE_METHODS.START_EDITING_CELL](
    this: any,
    {
      rowKey,
      colKey,
      defaultValue,
    }: { rowKey: string | number, colKey: string, defaultValue?: string | number },
  ) {
    const {
      editOption,
      colgroups,
      rowKeyFieldName,
      editingCell,
      cellSelectionData,
    } = this

    if (!editOption)
      return false

    const foundRow = this.tableData.find(
      (x: Record<string, any>) => x[rowKeyFieldName] === rowKey,
    )
    if (!foundRow)
      return false

    const currentRow: Record<string, any> = cloneDeep(foundRow)

    /*
          调用API编辑的情况，需要关闭之前编辑的单元格
          */
    if (
      editingCell.rowKey === rowKey
      && editingCell.colKey === colKey
    ) {
      return false
    }

    const currentColumn = colgroups.find((x: any) => x.key === colKey)
    // 当前列是否可编辑（field is required for editing)
    if (!currentColumn || !currentColumn.edit || !currentColumn.field)
      return false

    const { beforeStartCellEditing } = editOption

    if (isFunction(beforeStartCellEditing)) {
      const allowContinue = beforeStartCellEditing({
        row: cloneDeep(currentRow),
        column: currentColumn,
        cellValue: isDefined(defaultValue)
          ? defaultValue
          : currentRow[currentColumn.field],
      })
      if (isBoolean(allowContinue) && !allowContinue)
        return false
    }

    // 给当前列赋默认值
    if (isDefined(defaultValue)) {
      this.editorInputStartValue = defaultValue
      // doesn't change cell original value
      currentRow[currentColumn.field] = defaultValue
    }
    else {
      this.editorInputStartValue = currentRow[currentColumn.field]
    }

    if (
      cellSelectionData.currentCell.colKey !== colKey
      || cellSelectionData.currentCell.rowKey !== rowKey
    ) {
      this.cellSelectionCurrentCellChange({
        rowKey,
        colKey,
      })
    }

    // set editing cell
    this.setEditingCell({
      rowKey,
      colKey,
      column: currentColumn,
      row: cloneDeep(currentRow),
    })
  },

  // stop editing cell
  [INSTANCE_METHODS.STOP_EDITING_CELL](this: any) {
    const { editOption, isCellEditing } = this

    if (!editOption)
      return false

    // clear editor input start value
    this.editorInputStartValue = ''

    if (isCellEditing)
      this.saveCellWhenStopEditing()
  },

  // set highlight row
  [INSTANCE_METHODS.SET_HIGHLIGHT_ROW](this: any, { rowKey }: { rowKey: string | number }) {
    this.highlightRowKey = rowKey
  },
}
