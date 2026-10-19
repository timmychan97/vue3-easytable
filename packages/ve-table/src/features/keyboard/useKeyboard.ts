/**
 * 键盘（MOD-02）：单元格导航、编辑快捷键，以及单元格导航 / 表格两种模式（SEL-08）
 *
 * keydown 监听在 document 上（挂载时添加、卸载时移除），只处理属于本表格的按键（SEL-02）：
 * - 单元格导航模式：方向键、Tab、Enter 移动活动单元格，直接输入、Space、Backspace、F2 开始编辑，
 *   Delete 清空选区，Esc 放弃编辑（D6）或离开单元格导航（焦点移到表格根元素，D4）
 * - 表格模式：只响应表格根元素本身的 Enter / 方向键，恢复单元格导航
 * 单元格中渲染的输入框、按钮等可交互元素自己处理按键（SEL-10）。
 */
import type { ComputedRef, Ref } from 'vue'
import type { KeyboardMode } from '../../util/constant'
import type { ColgroupData, EditorInstance } from '../../ve-table-types'
import type { UseCellSelection } from '../cell-selection/useCellSelection'
import type { UseCellSelectionState } from '../cell-selection/useCellSelectionState'
import type { UseClipboard } from '../clipboard/useClipboard'
import type { UseEditing } from '../editing/useEditing'
import type { UseScrolling } from '../scrolling/useScrolling'
import { isEmptyValue } from '@vue3-easytable/common/utils'
import { KEY_CODES } from '@vue3-easytable/common/utils/constant'
import { isInputKeyCode } from '@vue3-easytable/common/utils/event-key-codes'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { CELL_SELECTION_DIRECTION, KEYBOARD_MODE } from '../../util/constant'

type RowKey = string | number

// 事件的真实目标（表格位于 shadow DOM 中时，event.target 会被重定向为宿主元素）
function getEventPath(event: KeyboardEvent): EventTarget[] {
  const path = typeof event.composedPath === 'function' ? event.composedPath() : []
  return path.length ? path : [event.target as EventTarget]
}

/*
 * 按键是否属于本表格（SEL-02）
 * keydown 监听在 document 上，页面上任何位置的按键都会到达这里。
 * - 目标在表格根元素内：属于本表格
 * - 没有任何元素获得焦点（目标为 body / html / document）：沿用原有行为，交给表格处理
 * - 其他（页面上的输入框、弹窗等）：忽略
 */
function isKeydownForTable(path: EventTarget[], rootEl: HTMLElement) {
  if (path.includes(rootEl))
    return true

  const target = path[0]
  return target === document
    || target === document.body
    || target === document.documentElement
}

/*
 * 可获得焦点、拥有自己按键的元素（SEL-10）。
 * 用 closest 查找，因此点击按钮中的图标、label 中的文字也算作点击该元素
 */
const INTERACTIVE_SELECTOR = [
  'input',
  'textarea',
  'select',
  'button',
  'label',
  'a[href]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(', ')

export interface UseKeyboardOptions {
  rootElement: Ref<HTMLElement | null>
  editor: Ref<EditorInstance | null>
  colgroups: Ref<ColgroupData[]>
  allRowKeys: ComputedRef<RowKey[]>
  state: Pick<
    UseCellSelectionState,
    'enableCellSelection' | 'cellSelectionData' | 'clearCellSelectionNormalEndCell' | 'clearIndicatorKeys'
  >
  selection: Pick<UseCellSelection, 'setCellSelection'>
  editing: Pick<
    UseEditing,
    'enableStopEditing' | 'isCellEditing' | 'startEditingCell' | 'stopEditingCell' | 'discardEditingCell'
  >
  clipboard: Pick<UseClipboard, 'deleteCellSelectionRangeValue'>
  scrolling: Pick<UseScrolling, 'columnToVisible' | 'rowToVisible'>
}

export interface UseKeyboard {
  // 键盘模式（SEL-08）：单元格导航 / 表格（焦点在根元素上，Tab 交给浏览器）
  keyboardMode: Ref<KeyboardMode>
  getEditorTextareaEl: () => HTMLTextAreaElement | null
  getCellWidgetElement: (target: EventTarget | null) => Element | null
  dealFocusin: (event: FocusEvent) => void
  dealKeydownEvent: (event: KeyboardEvent) => void
  dealTableModeKeydown: (event: KeyboardEvent) => void
  syncKeyboardModeByCurrentCell: () => void
  leaveCellKeyboardMode: () => void
  resumeCellKeyboardMode: () => boolean
  selectCellByDirection: (params: { direction: string }) => void
}

export function useKeyboard(options: UseKeyboardOptions): UseKeyboard {
  const { rootElement, editor, colgroups, allRowKeys, state, selection, editing, clipboard, scrolling } = options
  const { cellSelectionData } = state

  const keyboardMode = ref<KeyboardMode>(KEYBOARD_MODE.TABLE)

  // 本表格的编辑框（textarea），单元格导航时由它持有焦点
  function getEditorTextareaEl(): HTMLTextAreaElement | null {
    return editor.value?.$refs?.textareaInputRef ?? null
  }

  /*
   * 目标所在的、表格内部的可交互元素（单元格中渲染的输入框、按钮、复选框，嵌套的表格等）（SEL-10）
   * 表格根元素与本表格的编辑框属于表格自身，不算
   */
  function getCellWidgetElement(target: EventTarget | null): Element | null {
    const rootEl = rootElement.value
    if (!rootEl || !(target instanceof Element))
      return null

    const el = target.closest(INTERACTIVE_SELECTOR)
    if (!el || el === rootEl || !rootEl.contains(el) || el === getEditorTextareaEl())
      return null

    return el
  }

  /*
   * 焦点进入表格内部的可交互元素（点击、Tab、程序聚焦）时，单元格导航休眠（SEL-10）：
   * 按键交给该元素，编辑框不再抢焦点。点击单元格、或在根元素上按 Enter / 方向键恢复
   */
  function dealFocusin(event: FocusEvent) {
    if (getCellWidgetElement(event.target))
      keyboardMode.value = KEYBOARD_MODE.TABLE
  }

  // 活动单元格变化时同步键盘模式（SEL-08）：有活动单元格 → 单元格导航，清空 → 表格模式
  function syncKeyboardModeByCurrentCell() {
    const { rowKey, colKey } = cellSelectionData.value.currentCell
    keyboardMode.value = !isEmptyValue(rowKey) && !isEmptyValue(colKey)
      ? KEYBOARD_MODE.CELL
      : KEYBOARD_MODE.TABLE
  }

  /*
   * 离开单元格导航：进入表格模式并聚焦表格根元素（SEL-08）
   * 活动单元格保留（弱化显示），以便恢复时回到原位置
   */
  function leaveCellKeyboardMode() {
    keyboardMode.value = KEYBOARD_MODE.TABLE
    // 编辑框（tabindex=-1）持有焦点，必须显式把焦点移到根元素；避免滚动跳到表格顶部
    rootElement.value?.focus({ preventScroll: true })
  }

  /*
   * 恢复单元格导航：回到上次的活动单元格，没有则选中第一个单元格（SEL-08）
   * @return 是否已恢复
   */
  function resumeCellKeyboardMode() {
    if (!state.enableCellSelection.value)
      return false

    const { rowKey, colKey } = cellSelectionData.value.currentCell

    if (isEmptyValue(rowKey) || isEmptyValue(colKey)) {
      const firstColumn = colgroups.value.find(x => !x.operationColumn)
      const firstRowKey = allRowKeys.value[0]

      if (!firstColumn || isEmptyValue(firstRowKey))
        return false

      selection.setCellSelection({ rowKey: firstRowKey, colKey: firstColumn.key })
    }

    // 编辑框随模式变化重新渲染时会重新获得焦点（v-focus）
    keyboardMode.value = KEYBOARD_MODE.CELL
    return true
  }

  // 方向键 / Tab / Enter 移动活动单元格
  function selectCellByDirection({ direction }: { direction: string }) {
    // 键盘导航把选区收缩为单个单元格，整列 / 整行选择的指示器随之清除（SEL-09）
    state.clearIndicatorKeys()

    const { currentCell } = cellSelectionData.value
    const { rowKey, colKey } = currentCell
    const columns = colgroups.value
    const rowKeys = allRowKeys.value

    const columnIndex = columns.findIndex(x => x.key === colKey)
    const rowIndex = rowKeys.indexOf(rowKey)

    if (direction === CELL_SELECTION_DIRECTION.LEFT) {
      if (columnIndex > 0) {
        const nextColumn = columns[columnIndex - 1]
        currentCell.colKey = nextColumn.key
        scrolling.columnToVisible(nextColumn)
      }
    }
    else if (direction === CELL_SELECTION_DIRECTION.RIGHT) {
      if (columnIndex < columns.length - 1) {
        const nextColumn = columns[columnIndex + 1]
        currentCell.colKey = nextColumn.key
        scrolling.columnToVisible(nextColumn)
      }
    }
    else if (direction === CELL_SELECTION_DIRECTION.UP) {
      if (rowIndex > 0)
        scrolling.rowToVisible(KEY_CODES.ARROW_UP, rowKeys[rowIndex - 1])
    }
    else if (direction === CELL_SELECTION_DIRECTION.DOWN) {
      if (rowIndex < rowKeys.length - 1)
        scrolling.rowToVisible(KEY_CODES.ARROW_DOWN, rowKeys[rowIndex + 1])
    }
  }

  // 移动活动单元格并结束编辑（方向键、Tab）
  function moveAndStopEditing(direction: string, event: KeyboardEvent) {
    selectCellByDirection({ direction })
    state.clearCellSelectionNormalEndCell()
    editing.stopEditingCell()
    event.preventDefault()
  }

  /*
   * 表格模式下（焦点在表格根元素上）的按键（SEL-08）
   * Enter / 方向键恢复单元格导航；Tab / Shift+Tab 不拦截，由浏览器移动焦点
   */
  function dealTableModeKeydown(event: KeyboardEvent) {
    switch (event.keyCode) {
      case KEY_CODES.ENTER:
      case KEY_CODES.ARROW_LEFT:
      case KEY_CODES.ARROW_RIGHT:
      case KEY_CODES.ARROW_UP:
      case KEY_CODES.ARROW_DOWN: {
        if (resumeCellKeyboardMode())
          event.preventDefault()
        break
      }
      default:
        break
    }
  }

  function dealKeydownEvent(event: KeyboardEvent) {
    const rootEl = rootElement.value
    const path = getEventPath(event)

    // SEL-02：忽略来自表格外部（其他输入框等）的按键
    if (!rootEl || !isKeydownForTable(path, rootEl))
      return

    // SEL-10：单元格中渲染的输入框、按钮等（以及嵌套的表格）自己处理按键
    if (getCellWidgetElement(path[0]))
      return

    const { keyCode, ctrlKey, shiftKey, altKey } = event
    const { rowKey, colKey } = cellSelectionData.value.currentCell
    const hasCurrentCell = !isEmptyValue(rowKey) && !isEmptyValue(colKey)

    // SEL-08：表格模式（或没有活动单元格）时，单元格键盘处理休眠，只响应表格根元素本身的按键
    if (keyboardMode.value === KEYBOARD_MODE.TABLE || !hasCurrentCell) {
      if (path[0] === rootEl)
        dealTableModeKeydown(event)
      return
    }

    const currentColumn = colgroups.value.find(x => x.key === colKey)
    const isCellEditing = editing.isCellEditing.value
    const enableStopEditing = editing.enableStopEditing.value

    switch (keyCode) {
      case KEY_CODES.TAB: {
        moveAndStopEditing(shiftKey ? CELL_SELECTION_DIRECTION.LEFT : CELL_SELECTION_DIRECTION.RIGHT, event)
        break
      }
      case KEY_CODES.ARROW_LEFT: {
        if (enableStopEditing)
          moveAndStopEditing(CELL_SELECTION_DIRECTION.LEFT, event)
        break
      }
      case KEY_CODES.ARROW_RIGHT: {
        if (enableStopEditing)
          moveAndStopEditing(CELL_SELECTION_DIRECTION.RIGHT, event)
        break
      }
      case KEY_CODES.ARROW_UP: {
        if (enableStopEditing)
          moveAndStopEditing(CELL_SELECTION_DIRECTION.UP, event)
        break
      }
      case KEY_CODES.ARROW_DOWN: {
        if (enableStopEditing)
          moveAndStopEditing(CELL_SELECTION_DIRECTION.DOWN, event)
        break
      }
      case KEY_CODES.ENTER: {
        let direction: string | undefined
        // add new line
        if (altKey) {
          editor.value?.textareaAddNewLine()
        }
        // direction up
        else if (shiftKey) {
          direction = CELL_SELECTION_DIRECTION.UP
          editing.stopEditingCell()
        }
        // stop editing and stay in current cell
        else if (ctrlKey) {
          editing.stopEditingCell()
        }
        // direction down
        else {
          direction = CELL_SELECTION_DIRECTION.DOWN
          editing.stopEditingCell()
        }

        if (direction) {
          state.clearCellSelectionNormalEndCell()
          selectCellByDirection({ direction })
        }
        event.preventDefault()
        break
      }
      case KEY_CODES.SPACE: {
        if (!isCellEditing) {
          // start editing and enter a space
          editing.startEditingCell({ rowKey, colKey, defaultValue: ' ' })
          event.preventDefault()
        }
        break
      }
      case KEY_CODES.BACK_SPACE: {
        if (!isCellEditing) {
          // start editing and clear value
          editing.startEditingCell({ rowKey, colKey, defaultValue: '' })
          event.preventDefault()
        }
        break
      }
      case KEY_CODES.DELETE: {
        if (!isCellEditing) {
          // delete cell selection range value
          clipboard.deleteCellSelectionRangeValue()
          event.preventDefault()
        }
        break
      }
      case KEY_CODES.F2: {
        if (!isCellEditing) {
          // 列可能已被隐藏（SEL-01）
          if (currentColumn?.edit) {
            // start editing cell and don't allow stop eidting by direction key
            editing.enableStopEditing.value = false
            editing.startEditingCell({ rowKey, colKey })
          }
          event.preventDefault()
        }
        break
      }
      case KEY_CODES.ESC: {
        if (isCellEditing) {
          // D6：编辑中按 Esc 放弃未提交的值，回到同一单元格的单元格导航
          editing.discardEditingCell()
        }
        else {
          // SEL-08：离开单元格导航，焦点移到表格根元素，之后 Tab 交给浏览器
          leaveCellKeyboardMode()
        }
        event.preventDefault()
        break
      }
      default: {
        // enter text directly
        if (isInputKeyCode(event))
          editing.startEditingCell({ rowKey, colKey, defaultValue: '' })
        break
      }
    }
  }

  // SEL-08：活动单元格变化（点击、API、键盘）时进入单元格导航（编辑框会获得焦点），清空时回到表格模式。
  // 只监听 key，rowIndex 因排序等变化时不切换模式
  watch(() => cellSelectionData.value.currentCell.rowKey, syncKeyboardModeByCurrentCell)
  watch(() => cellSelectionData.value.currentCell.colKey, syncKeyboardModeByCurrentCell)

  onMounted(() => {
    document.addEventListener('keydown', dealKeydownEvent)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', dealKeydownEvent)
  })

  return {
    keyboardMode,
    getEditorTextareaEl,
    getCellWidgetElement,
    dealFocusin,
    dealKeydownEvent,
    dealTableModeKeydown,
    syncKeyboardModeByCurrentCell,
    leaveCellKeyboardMode,
    resumeCellKeyboardMode,
    selectCellByDirection,
  }
}
