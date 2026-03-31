/**
 * Clipboard methods extracted from ve-table.
 * Spread into defineComponent({ methods: { ...clipboardMethods } })
 */
import { isBoolean, isFunction } from '@vue3-easytable/common/utils'
import {
  onAfterCopy,
  onAfterCut,
  onAfterDelete,
  onAfterPaste,
  onBeforeCopy,
  onBeforeCut,
  onBeforeDelete,
  onBeforePaste,
} from '../util/clipboard.js'
import { HOOKS_NAME } from '../util/constant.js'
import { getSelectionRangeData } from '../util/index.js'

export const clipboardMethods = {
  // editor copy
  editorCopy(this: any, event: any) {
    const {
      isCellEditing,
      enableClipboard,
      clipboardOption,
      cellSelectionRangeData,
      tableData,
      colgroups,
      allRowKeys,
    } = this

    if (!enableClipboard)
      return false

    // 正在编辑的单元格不进行自定义复制功能
    if (isCellEditing)
      return false

    const {
      copy,
      beforeCopy: beforeCopyCallback,
      afterCopy: afterCopyCallback,
    } = clipboardOption || {}

    if (isBoolean(copy) && !copy)
      return false

    event.preventDefault()

    const selectionRangeData = getSelectionRangeData({
      cellSelectionRangeData,
      resultType: 'flat',
      tableData,
      colgroups,
      allRowKeys,
    })

    const response = onBeforeCopy({
      cellSelectionRangeData,
      selectionRangeData,
      colgroups,
      allRowKeys,
    })

    if (isFunction(beforeCopyCallback)) {
      const allowCoping = beforeCopyCallback(response)
      if (isBoolean(allowCoping) && !allowCoping)
        return false
    }

    onAfterCopy({ event, selectionRangeData })

    if (isFunction(afterCopyCallback))
      afterCopyCallback(response)
  },

  // editor paste
  editorPaste(this: any, event: any) {
    const { isCellEditing, enableClipboard, clipboardOption } = this

    if (!enableClipboard)
      return false

    // 正在编辑的单元格不进行自定义粘贴功能
    if (isCellEditing)
      return false

    const {
      paste,
      beforePaste: beforePasteCallback,
      afterPaste: afterPasteCallback,
    } = clipboardOption || {}

    if (isBoolean(paste) && !paste)
      return false

    event.preventDefault()

    const response = onBeforePaste({
      event,
      cellSelectionRangeData: this.cellSelectionRangeData,
      colgroups: this.colgroups,
      allRowKeys: this.allRowKeys,
      rowKeyFieldName: this.rowKeyFieldName,
    })

    if (
      response
      && Array.isArray(response.data)
      && response.data.length
    ) {
      if (isFunction(beforePasteCallback)) {
        const allowPasting = beforePasteCallback(response)
        if (isBoolean(allowPasting) && !allowPasting)
          return false
      }
      // change table cell data
      onAfterPaste({
        tableData: this.tableData,
        beforePasteResponse: response,
      })

      if (isFunction(afterPasteCallback))
        afterPasteCallback(response)

      const { startColKey, endColKey, startRowKey, endRowKey }
                  = response.selectionRangeKeys

      this.cellSelectionCurrentCellChange({
        rowKey: startRowKey,
        colKey: startColKey,
      })

      this.cellSelectionNormalEndCellChange({
        rowKey: endRowKey,
        colKey: endColKey,
      })

      // clipboard cell value change
      this.hooks.triggerHook(HOOKS_NAME.CLIPBOARD_CELL_VALUE_CHANGE)
    }
  },

  // editor cut
  editorCut(this: any, event: any) {
    const {
      isCellEditing,
      enableClipboard,
      clipboardOption,
      cellSelectionRangeData,
      tableData,
      colgroups,
      allRowKeys,
    } = this

    if (!enableClipboard)
      return false

    // 正在编辑的单元格不进行自定义剪切功能
    if (isCellEditing)
      return false

    const {
      cut,
      beforeCut: beforeCutCallback,
      afterCut: afterCutCallback,
    } = clipboardOption || {}

    if (isBoolean(cut) && !cut)
      return false

    event.preventDefault()

    const selectionRangeData = getSelectionRangeData({
      cellSelectionRangeData,
      resultType: 'flat',
      tableData,
      colgroups,
      allRowKeys,
    })

    const response = onBeforeCut({
      cellSelectionRangeData,
      selectionRangeData,
      colgroups,
      allRowKeys,
    })

    if (isFunction(beforeCutCallback)) {
      const allowCuting = beforeCutCallback(response)
      if (isBoolean(allowCuting) && !allowCuting)
        return false
    }

    onAfterCut({
      event,
      tableData,
      colgroups,
      selectionRangeData,
      selectionRangeIndexes: response.selectionRangeIndexes,
    })

    if (isFunction(afterCutCallback))
      afterCutCallback(response)
  },

  // delete selection cell value
  deleteCellSelectionRangeValue(this: any) {
    const {
      isCellEditing,
      enableClipboard,
      clipboardOption,
      cellSelectionRangeData,
      tableData,
      colgroups,
      allRowKeys,
    } = this

    if (!enableClipboard)
      return false

    // 正在编辑的单元格不进行删除区域单元格功能
    if (isCellEditing)
      return false

    const {
      // delete is key word
      delete: delete2,
      beforeDelete: beforeDeleteCallback,
      afterDelete: afterDeleteCallback,
    } = clipboardOption || {}

    if (isBoolean(delete2) && !delete2)
      return false

    const selectionRangeData = getSelectionRangeData({
      cellSelectionRangeData,
      resultType: 'flat',
      tableData,
      colgroups,
      allRowKeys,
    })

    const response = onBeforeDelete({
      cellSelectionRangeData,
      selectionRangeData,
      colgroups,
      allRowKeys,
    })

    if (isFunction(beforeDeleteCallback)) {
      const allowDeleting = beforeDeleteCallback(response)
      if (isBoolean(allowDeleting) && !allowDeleting)
        return false
    }

    onAfterDelete({
      tableData,
      colgroups,
      selectionRangeIndexes: response.selectionRangeIndexes,
    })

    if (isFunction(afterDeleteCallback))
      afterDeleteCallback(response)
  },
}
