/**
 * Clipboard methods extracted from ve-table.
 * Spread into defineComponent({ methods: { ...clipboardMethods } })
 *
 * 执行顺序（CLIP-01、INFRA-07）：
 * 1. 先用 onBefore* 校验选区；选区失效（或粘贴内容不是文本）时直接返回，
 *    不调用 preventDefault，保留浏览器原生行为，也不会用空字符串覆盖用户剪贴板；
 * 2. 选区有效后调用 preventDefault：此后由表格接管这次操作；
 * 3. before* 回调通过 safeCall 调用：返回 false 或抛出异常都视为取消。
 *    取消时 preventDefault 已生效且未写入任何数据，剪贴板与表格数据都保持不变
 *    （放行原生行为只会作用于隐藏的 textarea，并不是用户想要的结果）；
 * 4. 先完成内部状态更新（数据、选区、hook），最后才调用 after* 回调，
 *    after* 抛出异常只会被记录，不影响表格状态。
 */
import { isBoolean } from '@vue3-easytable/common/utils'
import {
  onAfterCopy,
  onAfterCut,
  onAfterDelete,
  onAfterPaste,
  onBeforeCopy,
  onBeforeCut,
  onBeforeDelete,
  onBeforePaste,
} from '../util/clipboard/index.js'
import { HOOKS_NAME } from '../util/constant.js'
import { getSelectionRangeData } from '../util/index.js'
import { safeCall } from '../util/safe-call.js'

/**
 * 调用 before* 回调：返回 false 或抛出异常时视为取消
 */
function isCancelledByCallback(name: string, callback: any, response: any): boolean {
  const { value, threw } = safeCall(name, callback, response)
  return threw || (isBoolean(value) && !value)
}

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

    // 选区失效：不拦截原生复制（CLIP-01）
    if (!response)
      return false

    event.preventDefault()

    if (isCancelledByCallback('beforeCopy', beforeCopyCallback, response))
      return false

    onAfterCopy({ event, selectionRangeData })

    safeCall('afterCopy', afterCopyCallback, response)
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

    const response = onBeforePaste({
      event,
      cellSelectionRangeData: this.cellSelectionRangeData,
      colgroups: this.colgroups,
      allRowKeys: this.allRowKeys,
      rowKeyFieldName: this.rowKeyFieldName,
    })

    // 选区失效（CLIP-01）或剪贴板中没有文本（CLIP-02）：不拦截原生粘贴
    if (!response || !response.data.length)
      return false

    event.preventDefault()

    if (isCancelledByCallback('beforePaste', beforePasteCallback, response))
      return false

    // change table cell data
    onAfterPaste({
      tableData: this.tableData,
      beforePasteResponse: response,
    })

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

    // 内部状态已更新完毕，after 回调抛出异常不会留下“改了一半”的状态（INFRA-07）
    safeCall('afterPaste', afterPasteCallback, response)
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

    // 选区失效：不拦截原生剪切（CLIP-01）
    if (!response)
      return false

    event.preventDefault()

    if (isCancelledByCallback('beforeCut', beforeCutCallback, response))
      return false

    onAfterCut({
      event,
      tableData,
      colgroups,
      selectionRangeData,
      selectionRangeIndexes: response.selectionRangeIndexes,
    })

    safeCall('afterCut', afterCutCallback, response)
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

    // 选区失效：不删除任何数据（CLIP-01）
    if (!response)
      return false

    if (isCancelledByCallback('beforeDelete', beforeDeleteCallback, response))
      return false

    onAfterDelete({
      tableData,
      colgroups,
      selectionRangeIndexes: response.selectionRangeIndexes,
    })

    safeCall('afterDelete', afterDeleteCallback, response)
  },
}
