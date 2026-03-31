/**
 * Context menu methods extracted from ve-table.
 * Spread into defineComponent({ methods: { ...contextmenuMethods } })
 */

import {
  createLocale,
  isBoolean,
  isEmptyValue,
  isFunction,
} from '@vue3-easytable/common/utils'
import {
  COLUMN_FIXED_TYPE,
  CONTEXTMENU_NODE_TYPES,
  CONTEXTMENU_TYPES,
  HOOKS_NAME,
  LOCALE_COMP_NAME,
} from '../util/constant.js'
import {
  cancelColumnFixed,
  createEmptyRowData,
  getSelectionRangeIndexes,
  getSelectionRangeKeys,
  setBodyContextmenuOptions,
  setColumnFixed,
  setHeaderContextmenuOptions,
} from '../util/index.js'

const t = createLocale(LOCALE_COMP_NAME)

export const contextmenuMethods = {
  // set contextmenu options
  setContextmenuOptions(this: any, column: any) {
    const { contextMenuType } = this

    // header contextmenu
    if (contextMenuType === CONTEXTMENU_TYPES.HEADER_CONTEXTMENU) {
      // set header contextmenu options before contextmen show
      this.contextmenuOptions = setHeaderContextmenuOptions({
        column,
        contextmenuHeaderOption: this.contextmenuHeaderOption,
        cellSelectionRangeData: this.cellSelectionRangeData,
        colgroups: this.colgroups,
        allRowKeys: this.allRowKeys,
        headerIndicatorColKeys: this.headerIndicatorColKeys,
        enableHeaderContextmenu: this.enableHeaderContextmenu,
        t,
      })
    }
    // body contextmenu
    else {
      // set body contextmenu options before contextmen show
      this.contextmenuOptions = setBodyContextmenuOptions({
        enableBodyContextmenu: this.enableBodyContextmenu,
        contextmenuBodyOption: this.contextmenuBodyOption,
        cellSelectionRangeData: this.cellSelectionRangeData,
        colgroups: this.colgroups,
        allRowKeys: this.allRowKeys,
        bodyIndicatorRowKeys: this.bodyIndicatorRowKeys,
        t,
      })
    }
  },

  // contextmenu item click
  contextmenuItemClick(this: any, type: any) {
    // Reset mouse state flags to prevent selection from following mouse
    // after context menu action is performed
    this.isHeaderCellMousedown = false
    this.isBodyCellMousedown = false
    this.isBodyOperationColumnMousedown = false
    this.isAutofillStarting = false

    // header contextmenu
    if (this.contextMenuType === CONTEXTMENU_TYPES.HEADER_CONTEXTMENU)
      this.headerContextmenuItemClick(type)

    // body contextmenu
    else
      this.bodyContextmenuItemClick(type)
  },

  // header contextmenu item click
  headerContextmenuItemClick(this: any, type: any) {
    const {
      contextmenuHeaderOption,
      cellSelectionData,
      cellSelectionRangeData,
      allRowKeys,
      colgroups,
      enableColumnResize,
    } = this

    const { rowKey, colKey } = cellSelectionData.currentCell
    const { afterMenuClick } = contextmenuHeaderOption

    if (!isEmptyValue(rowKey) && !isEmptyValue(colKey)) {
      const selectionRangeKeys = getSelectionRangeKeys({
        cellSelectionRangeData,
      })

      const selectionRangeIndexes = getSelectionRangeIndexes({
        cellSelectionRangeData,
        colgroups,
        allRowKeys,
      })

      if (isFunction(afterMenuClick)) {
        const callback = afterMenuClick({
          type,
          selectionRangeKeys,
          selectionRangeIndexes,
        })
        if (isBoolean(callback) && !callback)
          return false
      }
      const editInputEditor = this.$refs[this.editInputRef]

      // cut
      if (CONTEXTMENU_NODE_TYPES.CUT === type) {
        editInputEditor.textareaSelect()
        document.execCommand('cut')
      }
      // copy
      else if (CONTEXTMENU_NODE_TYPES.COPY === type) {
        editInputEditor.textareaSelect()
        document.execCommand('copy')
      }
      // empty column
      else if (CONTEXTMENU_NODE_TYPES.EMPTY_COLUMN === type) {
        this.deleteCellSelectionRangeValue()
      }
      // left fixed column to
      else if (CONTEXTMENU_NODE_TYPES.LEFT_FIXED_COLUMN_TO === type) {
        this.cloneColumns = setColumnFixed({
          cloneColumns: this.cloneColumns,
          cellSelectionRangeData,
          fixedType: COLUMN_FIXED_TYPE.LEFT,
          colgroups,
          enableColumnResize,
        })
      }
      // cancel left fixed column to
      else if (
        CONTEXTMENU_NODE_TYPES.CANCEL_LEFT_FIXED_COLUMN_TO === type
      ) {
        this.cloneColumns = cancelColumnFixed({
          cloneColumns: this.cloneColumns,
          colgroups,
          fixedType: COLUMN_FIXED_TYPE.LEFT,
          enableColumnResize,
        })
      }
      // right fixed column to
      else if (
        CONTEXTMENU_NODE_TYPES.RIGHT_FIXED_COLUMN_TO === type
      ) {
        this.cloneColumns = setColumnFixed({
          cloneColumns: this.cloneColumns,
          cellSelectionRangeData,
          fixedType: COLUMN_FIXED_TYPE.RIGHT,
          colgroups,
          enableColumnResize,
        })
      }
      // cancel right fixed column to
      else if (
        CONTEXTMENU_NODE_TYPES.CANCEL_RIGHT_FIXED_COLUMN_TO === type
      ) {
        this.cloneColumns = cancelColumnFixed({
          cloneColumns: this.cloneColumns,
          colgroups,
          fixedType: COLUMN_FIXED_TYPE.RIGHT,
          enableColumnResize,
        })
      }
    }
  },

  // body contextmenu item click
  bodyContextmenuItemClick(this: any, type: any) {
    const {
      contextmenuBodyOption,
      cellSelectionData,
      cellSelectionRangeData,
      tableData,
      allRowKeys,
      colgroups,
      rowKeyFieldName,
    } = this

    const { rowKey, colKey } = cellSelectionData.currentCell
    const { afterMenuClick } = contextmenuBodyOption

    if (!isEmptyValue(rowKey) && !isEmptyValue(colKey)) {
      const selectionRangeKeys = getSelectionRangeKeys({
        cellSelectionRangeData,
      })

      const selectionRangeIndexes = getSelectionRangeIndexes({
        cellSelectionRangeData,
        colgroups,
        allRowKeys,
      })

      if (isFunction(afterMenuClick)) {
        const callback = afterMenuClick({
          type,
          selectionRangeKeys,
          selectionRangeIndexes,
        })
        if (isBoolean(callback) && !callback)
          return false
      }

      const { startRowIndex, endRowIndex } = selectionRangeIndexes

      const currentRowIndex = allRowKeys.findIndex(
        (x: any) => x === rowKey,
      )

      const editInputEditor = this.$refs[this.editInputRef]

      // cut
      if (CONTEXTMENU_NODE_TYPES.CUT === type) {
        editInputEditor.textareaSelect()
        document.execCommand('cut')
      }
      // copy
      else if (CONTEXTMENU_NODE_TYPES.COPY === type) {
        editInputEditor.textareaSelect()
        document.execCommand('copy')
      }
      // paste todo
      // else if (CONTEXTMENU_NODE_TYPES.PASTE === type) {
      //     editInputEditor.textareaSelect();
      //     document.execCommand("paste", null, null);
      // }
      // remove rows
      else if (CONTEXTMENU_NODE_TYPES.REMOVE_ROW === type) {
        tableData.splice(
          startRowIndex,
          endRowIndex - startRowIndex + 1,
        )
        // Clear selection since the selected rows are removed
        this.clearCellSelectionCurrentCell()
        this.clearCellSelectionNormalEndCell()
      }
      // empty rows
      else if (CONTEXTMENU_NODE_TYPES.EMPTY_ROW === type) {
        this.deleteCellSelectionRangeValue()
      }
      // empty rows
      else if (CONTEXTMENU_NODE_TYPES.EMPTY_CELL === type) {
        this.deleteCellSelectionRangeValue()
      }
      // insert row above
      else if (CONTEXTMENU_NODE_TYPES.INSERT_ROW_ABOVE === type) {
        tableData.splice(
          currentRowIndex,
          0,
          createEmptyRowData({ colgroups, rowKeyFieldName }),
        )
        // Trigger selection position refresh after DOM updates
        this.$nextTick(() => {
          this.hooks.triggerHook(HOOKS_NAME.CLIPBOARD_CELL_VALUE_CHANGE)
        })
      }
      // insert row below
      else if (CONTEXTMENU_NODE_TYPES.INSERT_ROW_BELOW === type) {
        tableData.splice(
          currentRowIndex + 1,
          0,
          createEmptyRowData({ colgroups, rowKeyFieldName }),
        )
        // Trigger selection position refresh after DOM updates
        this.$nextTick(() => {
          this.hooks.triggerHook(HOOKS_NAME.CLIPBOARD_CELL_VALUE_CHANGE)
        })
      }
    }
  },
}
