/**
 * Context menu methods extracted from ve-table.
 * Spread into defineComponent({ methods: { ...contextmenuMethods } })
 */

import { createI18N } from '@vue3-easytable/common/locale'
import {
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

export const contextmenuMethods = {
  // set contextmenu options
  setContextmenuOptions(this: any, column: any) {
    const { contextMenuType } = this
    // 使用注入的语言包（最近的 ConfigProvider，否则为全局语言包）
    const t = createI18N(LOCALE_COMP_NAME, () => this.veLocale)

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
    // 结束拖动选择，菜单操作后选区不再跟随鼠标；同时移除拖动期间的 mouseup / blur 监听（SEL-19）
    this.endSelectionDrag()
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
      // cut / copy：通过 navigator.clipboard 写入（不可用时退回 execCommand），
      // 失败时调用 clipboardOption.writeError（CLIP-06）
      if (CONTEXTMENU_NODE_TYPES.CUT === type || CONTEXTMENU_NODE_TYPES.COPY === type) {
        // 焦点回到编辑 textarea，菜单关闭后可继续用键盘操作
        this.$refs[this.editInputRef]?.textareaSelect()
        this.contextmenuCopyOrCut(CONTEXTMENU_NODE_TYPES.CUT === type ? 'cut' : 'copy')
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

      // cut / copy：通过 navigator.clipboard 写入（不可用时退回 execCommand），
      // 失败时调用 clipboardOption.writeError（CLIP-06）
      if (CONTEXTMENU_NODE_TYPES.CUT === type || CONTEXTMENU_NODE_TYPES.COPY === type) {
        // 焦点回到编辑 textarea，菜单关闭后可继续用键盘操作
        this.$refs[this.editInputRef]?.textareaSelect()
        this.contextmenuCopyOrCut(CONTEXTMENU_NODE_TYPES.CUT === type ? 'cut' : 'copy')
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
