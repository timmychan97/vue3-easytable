/**
 * 剪贴板（MOD-02）：编辑框上的复制、粘贴、剪切，Delete 清空选区，右键菜单的复制、剪切
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
 *    触发该 hook（CLIP-08），自动填充也会（FILL-06，见 useAutofill），
 *    以便单元格内容变化后重新定位选区边框。
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
import type { ComputedRef, Ref } from 'vue'
import type { VeTableProps } from '../../ve-table-props'
import type { CellKey, CellSelectionRangeData, ColgroupData } from '../../ve-table-types'
import type { TableContext } from '../table-context'
import { isBoolean } from '@vue3-easytable/common/utils'
import { computed } from 'vue'
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
} from '../../util/clipboard/index'
import { HOOKS_NAME } from '../../util/constant'
import { getSelectionRangeData } from '../../util/index'
import { safeCall } from '../../util/safe-call'
import { getCellValueCallbacks, isCancelledByCallback } from '../cell-value-change'

type RowKey = string | number

type CopyKind = 'copy' | 'cut'

const COPY_KINDS = {
  copy: { before: 'beforeCopy', after: 'afterCopy', onBefore: onBeforeCopy },
  cut: { before: 'beforeCut', after: 'afterCut', onBefore: onBeforeCut },
} as const

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

export interface UseClipboardOptions {
  props: Pick<VeTableProps, 'clipboardOption' | 'tableData' | 'editOption' | 'rowKeyFieldName'>
  colgroups: Ref<ColgroupData[]>
  allRowKeys: ComputedRef<RowKey[]>
  cellSelectionRangeData: Ref<CellSelectionRangeData>
  cellSelectionCurrentCellChange: (cell: CellKey) => void
  cellSelectionNormalEndCellChange: (cell: CellKey) => void
  // 正在编辑的单元格使用原生的复制、粘贴、剪切
  isCellEditing: ComputedRef<boolean>
  tableContext: TableContext
}

export interface UseClipboard {
  enableClipboard: ComputedRef<boolean>
  editorCopy: (event: ClipboardEvent) => false | void
  editorPaste: (event: ClipboardEvent) => false | void
  editorCut: (event: ClipboardEvent) => false | void
  contextmenuCopyOrCut: (kind: CopyKind) => Promise<boolean>
  deleteCellSelectionRangeValue: () => false | void
}

export function useClipboard(options: UseClipboardOptions): UseClipboard {
  const {
    props,
    colgroups,
    allRowKeys,
    cellSelectionRangeData,
    cellSelectionCurrentCellChange,
    cellSelectionNormalEndCellChange,
    isCellEditing,
    tableContext,
  } = options

  // 剪贴板依赖行 key
  const enableClipboard = computed(() => !!props.rowKeyFieldName)

  // 选区内的数据（二维数组，按行、列）
  function getFlatSelectionRangeData() {
    // getSelectionRangeData 尚未标注类型（返回值被推断为 null），flat 模式下实际为二维数组
    return getSelectionRangeData({
      cellSelectionRangeData: cellSelectionRangeData.value,
      resultType: 'flat',
      tableData: props.tableData,
      colgroups: colgroups.value,
      allRowKeys: allRowKeys.value,
    }) as unknown as unknown[][]
  }

  /**
   * 复制、剪切共用的前置检查：功能开关、编辑状态与选区（CLIP-01）
   * @return 不由表格处理时返回 null
   */
  function prepareCopyOrCut(kind: CopyKind) {
    if (!enableClipboard.value)
      return null

    // 正在编辑的单元格不进行自定义复制、剪切功能
    if (isCellEditing.value)
      return null

    const option: Record<string, any> = props.clipboardOption || {}

    if (isBoolean(option[kind]) && !option[kind])
      return null

    const selectionRangeData = getFlatSelectionRangeData()

    const response = COPY_KINDS[kind].onBefore({
      cellSelectionRangeData: cellSelectionRangeData.value,
      selectionRangeData,
      colgroups: colgroups.value,
      allRowKeys: allRowKeys.value,
    })

    if (!response)
      return null

    return { option, response, selectionRangeData }
  }

  function editorCopy(event: ClipboardEvent) {
    const prepared = prepareCopyOrCut('copy')

    // 选区失效：不拦截原生复制（CLIP-01）
    if (!prepared)
      return false

    const { option, response, selectionRangeData } = prepared

    event.preventDefault()

    if (isCancelledByCallback('beforeCopy', option.beforeCopy, response))
      return false

    onAfterCopy({ event, selectionRangeData })

    safeCall('afterCopy', option.afterCopy, response)
  }

  function editorPaste(event: ClipboardEvent) {
    if (!enableClipboard.value)
      return false

    // 正在编辑的单元格不进行自定义粘贴功能
    if (isCellEditing.value)
      return false

    const {
      paste,
      beforePaste: beforePasteCallback,
      afterPaste: afterPasteCallback,
    } = props.clipboardOption || {}

    if (isBoolean(paste) && !paste)
      return false

    const cellValueCallbacks = getCellValueCallbacks(props.editOption)

    const response = onBeforePaste({
      event,
      cellSelectionRangeData: cellSelectionRangeData.value,
      colgroups: colgroups.value,
      allRowKeys: allRowKeys.value,
      rowKeyFieldName: props.rowKeyFieldName,
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
      tableData: props.tableData,
      colgroups: colgroups.value,
      beforePasteResponse: response,
      canChange: cellValueCallbacks.canChange,
    })

    const { startColKey, endColKey, startRowKey, endRowKey } = response.selectionRangeKeys

    cellSelectionCurrentCellChange({ rowKey: startRowKey, colKey: startColKey })
    cellSelectionNormalEndCellChange({ rowKey: endRowKey, colKey: endColKey })

    // clipboard cell value change
    tableContext.emit(HOOKS_NAME.CLIPBOARD_CELL_VALUE_CHANGE)

    // 内部状态已更新完毕，after 回调抛出异常不会留下“改了一半”的状态（INFRA-07）
    cellValueCallbacks.fireAfter(applied)
    safeCall('afterPaste', afterPasteCallback, response)
  }

  function editorCut(event: ClipboardEvent) {
    const prepared = prepareCopyOrCut('cut')

    // 选区失效：不拦截原生剪切（CLIP-01）
    if (!prepared)
      return false

    const { option, response, selectionRangeData } = prepared

    event.preventDefault()

    if (isCancelledByCallback('beforeCut', option.beforeCut, response))
      return false

    const { editableOnly, canChange, fireAfter } = getCellValueCallbacks(props.editOption)

    const applied = onAfterCut({
      event,
      tableData: props.tableData,
      colgroups: colgroups.value,
      selectionRangeData,
      selectionRangeIndexes: response.selectionRangeIndexes,
      editableOnly,
      canChange,
    })

    // 单元格内容已清空，刷新选区位置（CLIP-08）
    tableContext.emit(HOOKS_NAME.CLIPBOARD_CELL_VALUE_CHANGE)

    fireAfter(applied)
    safeCall('afterCut', option.afterCut, response)
  }

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
  function contextmenuCopyOrCut(kind: CopyKind): Promise<boolean> {
    const prepared = prepareCopyOrCut(kind)

    if (!prepared)
      return Promise.resolve(false)

    const { option, response, selectionRangeData } = prepared
    const { before, after } = COPY_KINDS[kind]

    if (isCancelledByCallback(before, option[before], response))
      return Promise.resolve(false)

    // 选区对象会被原地修改，写入期间可能变化，先保存一份
    const rangeData = { ...cellSelectionRangeData.value }
    const text = encodeToSpreadsheetStr(selectionRangeData)

    return writeClipboardText(text).then(
      () => {
        if (kind === 'cut') {
          // 写入期间行、列可能已变化：按 key 重新定位，找不到就不清空（CLIP-01）
          const current = onBeforeCut({
            cellSelectionRangeData: rangeData,
            selectionRangeData,
            colgroups: colgroups.value,
            allRowKeys: allRowKeys.value,
          })

          if (current) {
            const { editableOnly, canChange, fireAfter } = getCellValueCallbacks(props.editOption)
            const applied = clearRangeValues({
              tableData: props.tableData,
              colgroups: colgroups.value,
              selectionRangeIndexes: current.selectionRangeIndexes,
              editableOnly,
              canChange,
            })
            tableContext.emit(HOOKS_NAME.CLIPBOARD_CELL_VALUE_CHANGE)
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
  }

  // Delete：清空选区内的值
  function deleteCellSelectionRangeValue() {
    if (!enableClipboard.value)
      return false

    // 正在编辑的单元格不进行删除区域单元格功能
    if (isCellEditing.value)
      return false

    const {
      // delete is key word
      delete: delete2,
      beforeDelete: beforeDeleteCallback,
      afterDelete: afterDeleteCallback,
    } = props.clipboardOption || {}

    if (isBoolean(delete2) && !delete2)
      return false

    const selectionRangeData = getFlatSelectionRangeData()

    const response = onBeforeDelete({
      cellSelectionRangeData: cellSelectionRangeData.value,
      selectionRangeData,
      colgroups: colgroups.value,
      allRowKeys: allRowKeys.value,
    })

    // 选区失效：不删除任何数据（CLIP-01）
    if (!response)
      return false

    if (isCancelledByCallback('beforeDelete', beforeDeleteCallback, response))
      return false

    const { editableOnly, canChange, fireAfter } = getCellValueCallbacks(props.editOption)

    const applied = onAfterDelete({
      tableData: props.tableData,
      colgroups: colgroups.value,
      selectionRangeIndexes: response.selectionRangeIndexes,
      editableOnly,
      canChange,
    })

    // 单元格内容已清空，刷新选区位置（CLIP-08）
    tableContext.emit(HOOKS_NAME.CLIPBOARD_CELL_VALUE_CHANGE)

    fireAfter(applied)
    safeCall('afterDelete', afterDeleteCallback, response)
  }

  return {
    enableClipboard,
    editorCopy,
    editorPaste,
    editorCut,
    contextmenuCopyOrCut,
    deleteCellSelectionRangeValue,
  }
}
