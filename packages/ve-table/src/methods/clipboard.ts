/**
 * Clipboard methods extracted from ve-table.
 * Spread into defineComponent({ methods: { ...clipboardMethods } })
 *
 * 执行顺序（CLIP-01、INFRA-07）：
 * 1. 先用 onBefore* 校验选区；选区失效（或粘贴内容不是文本）时直接返回，
 *    不调用 preventDefault，保留浏览器原生行为，也不会用空字符串覆盖用户剪贴板；
 *    例外：选区失效时的文本粘贴仍调用 preventDefault（CLIP-09）。未编辑时原生粘贴
 *    只会把文本写进隐藏的编辑 textarea，没有任何用处；
 * 2. 选区有效后调用 preventDefault：此后由表格接管这次操作；
 * 3. before* 回调通过 safeCall 调用：返回 false 或抛出异常都视为取消。
 *    取消时 preventDefault 已生效且未写入任何数据，剪贴板与表格数据都保持不变
 *    （放行原生行为只会作用于隐藏的 textarea，并不是用户想要的结果）；
 * 4. 先完成内部状态更新（数据、选区、CLIPBOARD_CELL_VALUE_CHANGE hook），最后才调用
 *    after* 回调，after* 抛出异常只会被记录，不影响表格状态。粘贴、剪切、删除都会
 *    触发该 hook（CLIP-08），以便单元格内容变化后重新定位选区边框。
 *
 * 设置了 editOption 时（CLIP-10，D12）：粘贴、剪切、删除（含右键菜单的剪切、清空）
 * 只写入 edit: true 的列，并对每个值有变化（!==）的单元格调用编辑回调，参数与单元格
 * 编辑相同（{ row, column, changeValue }，before 中的 row 为修改前的副本）。完整顺序：
 *   before*（整个操作，可取消）
 *   → 逐单元格 beforeCellValueChange 并写入（返回 false 或抛出异常只跳过该单元格）
 *   → 选区更新、CLIPBOARD_CELL_VALUE_CHANGE hook
 *   → 逐单元格 cellValueChange、afterCellValueChange（只针对实际写入的单元格）
 *   → after*（最后）
 * before* 收到的 data 已去掉不可编辑的列（粘贴）；剪切仍把整个选区写入剪贴板。
 * 未设置 editOption 时保持原行为：写入所有数据列，不调用编辑回调。
 * 粘贴区域内没有任何可写入的列时（CLIP-11）不执行粘贴：不调用 beforePaste / afterPaste、
 * 不改选区，但仍调用 preventDefault，避免文本落进隐藏的编辑 textarea（CLIP-09）。
 * 可写入列的判断、逐单元格写入与编辑回调在 features/cell-value-change 中，与自动填充共用。
 *
 * 右键菜单的复制、剪切（contextmenuCopyOrCut，CLIP-06）没有 copy 事件，
 * 通过 writeClipboardText 主动写入，开关、校验和回调与键盘操作相同，见该方法的说明。
 */
import { isBoolean } from '@vue3-easytable/common/utils'
import {
  getCellValueCallbacks,
  isCancelledByCallback,
} from '../features/cell-value-change/index.js'
import {
  clearRangeValues,
  encodeToSpreadsheetStr,
  getClipboardText,
  onAfterCopy,
  onAfterCut,
  onAfterDelete,
  onAfterPaste,
  onBeforeCopy,
  onBeforeCut,
  onBeforeDelete,
  onBeforePaste,
  writeClipboardText,
} from '../util/clipboard/index.js'
import { HOOKS_NAME } from '../util/constant.js'
import { getSelectionRangeData } from '../util/index.js'
import { safeCall } from '../util/safe-call.js'

type CopyKind = 'copy' | 'cut'

const COPY_KINDS = {
  copy: { before: 'beforeCopy', after: 'afterCopy', onBefore: onBeforeCopy },
  cut: { before: 'beforeCut', after: 'afterCut', onBefore: onBeforeCut },
} as const

/**
 * 复制、剪切共用的前置检查：功能开关、编辑状态与选区（CLIP-01）
 * @return 不由表格处理时返回 null
 */
function prepareCopyOrCut(vm: any, kind: CopyKind) {
  const {
    isCellEditing,
    enableClipboard,
    clipboardOption,
    cellSelectionRangeData,
    tableData,
    colgroups,
    allRowKeys,
  } = vm

  if (!enableClipboard)
    return null

  // 正在编辑的单元格不进行自定义复制、剪切功能
  if (isCellEditing)
    return null

  const option = clipboardOption || {}

  if (isBoolean(option[kind]) && !option[kind])
    return null

  // getSelectionRangeData 尚未标注类型（返回值被推断为 null），flat 模式下实际为二维数组
  const selectionRangeData = getSelectionRangeData({
    cellSelectionRangeData,
    resultType: 'flat',
    tableData,
    colgroups,
    allRowKeys,
  }) as unknown as unknown[][]

  const response = COPY_KINDS[kind].onBefore({
    cellSelectionRangeData,
    selectionRangeData,
    colgroups,
    allRowKeys,
  })

  if (!response)
    return null

  return { option, response, selectionRangeData }
}

/**
 * 剪贴板写入失败（CLIP-06）：调用 clipboardOption.writeError，未提供时输出警告，不再静默失败
 */
function reportWriteError(callback: any, payload: { type: CopyKind, error: unknown, [key: string]: any }) {
  if (typeof callback === 'function') {
    safeCall('writeError', callback, payload)
    return
  }

  console.warn(
    `[vue3-easytable] Failed to write to the clipboard (${payload.type}). Use clipboardOption.writeError to handle this.`,
    payload.error,
  )
}

export const clipboardMethods = {
  // editor copy
  editorCopy(this: any, event: any) {
    const prepared = prepareCopyOrCut(this, 'copy')

    // 选区失效：不拦截原生复制（CLIP-01）
    if (!prepared)
      return false

    const { option, response, selectionRangeData } = prepared

    event.preventDefault()

    if (isCancelledByCallback('beforeCopy', option.beforeCopy, response))
      return false

    onAfterCopy({ event, selectionRangeData })

    safeCall('afterCopy', option.afterCopy, response)
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

    const cellValueCallbacks = getCellValueCallbacks(this.editOption)

    const response = onBeforePaste({
      event,
      cellSelectionRangeData: this.cellSelectionRangeData,
      colgroups: this.colgroups,
      allRowKeys: this.allRowKeys,
      rowKeyFieldName: this.rowKeyFieldName,
      editableOnly: cellValueCallbacks.editableOnly,
    })

    // 粘贴区域只覆盖不可写入的列（操作列、没有 field 的列，设置了 editOption 时还有
    // 不可编辑的列）时，data 的每一行都是空对象：没有可写入的内容，不执行粘贴（CLIP-11）
    const hasWritableCell = !!response && response.data.some(row => Object.keys(row).length > 0)

    if (!response || !hasWritableCell) {
      // 选区失效或没有选区（CLIP-01），或没有可写入的列（CLIP-11）：不改任何数据，
      // 不调用 beforePaste / afterPaste，也不改选区。此时并未在编辑，
      // 原生粘贴只会把文本写进隐藏的编辑 textarea，因此阻止（CLIP-09）。
      // 剪贴板中没有文本（CLIP-02，如图片）时原生粘贴不会写入 textarea，保持不拦截。
      if (getClipboardText(event))
        event.preventDefault()
      return false
    }

    event.preventDefault()

    if (isCancelledByCallback('beforePaste', beforePasteCallback, response))
      return false

    // change table cell data（逐单元格 beforeCellValueChange，CLIP-10）
    const applied = onAfterPaste({
      tableData: this.tableData,
      colgroups: this.colgroups,
      beforePasteResponse: response,
      canChange: cellValueCallbacks.canChange,
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
    this.tableContext.emit(HOOKS_NAME.CLIPBOARD_CELL_VALUE_CHANGE)

    // 内部状态已更新完毕，after 回调抛出异常不会留下“改了一半”的状态（INFRA-07）
    cellValueCallbacks.fireAfter(applied)
    safeCall('afterPaste', afterPasteCallback, response)
  },

  // editor cut
  editorCut(this: any, event: any) {
    const prepared = prepareCopyOrCut(this, 'cut')

    // 选区失效：不拦截原生剪切（CLIP-01）
    if (!prepared)
      return false

    const { option, response, selectionRangeData } = prepared

    event.preventDefault()

    if (isCancelledByCallback('beforeCut', option.beforeCut, response))
      return false

    const { editableOnly, canChange, fireAfter } = getCellValueCallbacks(this.editOption)

    const applied = onAfterCut({
      event,
      tableData: this.tableData,
      colgroups: this.colgroups,
      selectionRangeData,
      selectionRangeIndexes: response.selectionRangeIndexes,
      editableOnly,
      canChange,
    })

    // 单元格内容已清空，刷新选区位置（CLIP-08）
    this.tableContext.emit(HOOKS_NAME.CLIPBOARD_CELL_VALUE_CHANGE)

    fireAfter(applied)
    safeCall('afterCut', option.afterCut, response)
  },

  /**
   * 右键菜单复制、剪切（CLIP-06）
   * 与键盘复制、剪切共用功能开关、选区校验以及 before* / after* 回调，区别在于：
   * - 没有 copy 事件可用，通过 writeClipboardText 主动写入
   *   （navigator.clipboard，不可用或被拒绝时退回 execCommand('copy')），写入是异步的；
   * - 剪切在写入成功之后才清空单元格。写入失败时表格数据保持不变，不调用 after*，
   *   而是调用 clipboardOption.writeError（未提供时 console.warn），不再静默失败；
   * - 必须在菜单点击的同一调用栈内调用（用户手势），写入之前不能有 await。
   * @return Promise<boolean> 是否已写入剪贴板
   */
  contextmenuCopyOrCut(this: any, kind: CopyKind): Promise<boolean> {
    const prepared = prepareCopyOrCut(this, kind)

    if (!prepared)
      return Promise.resolve(false)

    const { option, response, selectionRangeData } = prepared
    const { before, after } = COPY_KINDS[kind]

    if (isCancelledByCallback(before, option[before], response))
      return Promise.resolve(false)

    // 选区对象会被原地修改，写入期间可能变化，先保存一份
    const cellSelectionRangeData = { ...this.cellSelectionRangeData }
    const text = encodeToSpreadsheetStr(selectionRangeData)

    return writeClipboardText(text).then(
      () => {
        if (kind === 'cut') {
          // 写入期间行、列可能已变化：按 key 重新定位，找不到就不清空（CLIP-01）
          const current = onBeforeCut({
            cellSelectionRangeData,
            selectionRangeData,
            colgroups: this.colgroups,
            allRowKeys: this.allRowKeys,
          })

          if (current) {
            const { editableOnly, canChange, fireAfter } = getCellValueCallbacks(this.editOption)
            const applied = clearRangeValues({
              tableData: this.tableData,
              colgroups: this.colgroups,
              selectionRangeIndexes: current.selectionRangeIndexes,
              editableOnly,
              canChange,
            })
            this.tableContext.emit(HOOKS_NAME.CLIPBOARD_CELL_VALUE_CHANGE)
            fireAfter(applied)
          }
        }

        safeCall(after, option[after], response)
        return true
      },
      (error) => {
        reportWriteError(option.writeError, { ...response, type: kind, error, text })
        return false
      },
    )
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

    const { editableOnly, canChange, fireAfter } = getCellValueCallbacks(this.editOption)

    const applied = onAfterDelete({
      tableData,
      colgroups,
      selectionRangeIndexes: response.selectionRangeIndexes,
      editableOnly,
      canChange,
    })

    // 单元格内容已清空，刷新选区位置（CLIP-08）
    this.tableContext.emit(HOOKS_NAME.CLIPBOARD_CELL_VALUE_CHANGE)

    fireAfter(applied)
    safeCall('afterDelete', afterDeleteCallback, response)
  },
}
