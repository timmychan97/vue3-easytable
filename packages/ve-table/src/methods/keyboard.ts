/**
 * Keyboard handling methods extracted from ve-table.
 * Spread into defineComponent({ methods: { ...keyboardMethods } })
 */

import { isEmptyValue } from '@vue3-easytable/common/utils'
import { KEY_CODES } from '@vue3-easytable/common/utils/constant'
import { isInputKeyCode } from '@vue3-easytable/common/utils/event-key-codes'
import { CELL_SELECTION_DIRECTION, INSTANCE_METHODS, KEYBOARD_MODE } from '../util/constant.js'

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

export const keyboardMethods = {
  /*
   * @getEditorTextareaEl
   * @desc 本表格的编辑框（textarea），单元格导航时由它持有焦点
   */
  getEditorTextareaEl(this: any): HTMLTextAreaElement | null {
    const editor = this.$refs[this.editInputRef] as any
    return editor?.$refs?.textareaInputRef ?? null
  },

  /*
   * @getCellWidgetElement
   * @desc 目标所在的、表格内部的可交互元素（单元格中渲染的输入框、按钮、复选框，嵌套的表格等）（SEL-10）
   * 表格根元素与本表格的编辑框属于表格自身，不算
   * @return {Element|null}
   */
  getCellWidgetElement(this: any, target: EventTarget | null): Element | null {
    const rootEl = this.$refs[this.tableRootRef] as HTMLElement | undefined
    if (!rootEl || !(target instanceof Element))
      return null

    const el = target.closest(INTERACTIVE_SELECTOR)
    if (!el || el === rootEl || !rootEl.contains(el) || el === this.getEditorTextareaEl())
      return null

    return el
  },

  /*
   * @dealFocusin
   * @desc 焦点进入表格内部的可交互元素（点击、Tab、程序聚焦）时，单元格导航休眠（SEL-10）：
   * 按键交给该元素，编辑框不再抢焦点。点击单元格、或在根元素上按 Enter / 方向键恢复
   */
  dealFocusin(this: any, event: FocusEvent) {
    if (this.getCellWidgetElement(event.target))
      this.keyboardMode = KEYBOARD_MODE.TABLE
  },

  dealKeydownEvent(this: any, event: KeyboardEvent) {
    const {
      colgroups,
      cellSelectionData,
      enableStopEditing,
      isCellEditing,
      keyboardMode,
    } = this

    const rootEl = this.$refs[this.tableRootRef] as HTMLElement | undefined
    const path = getEventPath(event)

    // SEL-02：忽略来自表格外部（其他输入框等）的按键
    if (!rootEl || !isKeydownForTable(path, rootEl))
      return

    // SEL-10：单元格中渲染的输入框、按钮等（以及嵌套的表格）自己处理按键
    if (this.getCellWidgetElement(path[0]))
      return

    const { keyCode, ctrlKey, shiftKey, altKey } = event

    const { rowKey, colKey } = cellSelectionData.currentCell

    const hasCurrentCell = !isEmptyValue(rowKey) && !isEmptyValue(colKey)

    // SEL-08：表格模式（或没有活动单元格）时，单元格键盘处理休眠，只响应表格根元素本身的按键
    if (keyboardMode === KEYBOARD_MODE.TABLE || !hasCurrentCell) {
      if (path[0] === rootEl)
        this.dealTableModeKeydown(event)
      return
    }

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
            // 列可能已被隐藏（SEL-01）
            if (currentColumn?.edit) {
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
        case KEY_CODES.ESC: {
          if (isCellEditing) {
            // D6：编辑中按 Esc 放弃未提交的值，回到同一单元格的单元格导航
            this.discardEditingCell()
          }
          else {
            // SEL-08：离开单元格导航，焦点移到表格根元素，之后 Tab 交给浏览器
            this.leaveCellKeyboardMode()
          }
          event.preventDefault()
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

  /*
   * @dealTableModeKeydown
   * @desc 表格模式下（焦点在表格根元素上）的按键（SEL-08）
   * Enter / 方向键恢复单元格导航；Tab / Shift+Tab 不拦截，由浏览器移动焦点
   */
  dealTableModeKeydown(this: any, event: KeyboardEvent) {
    switch (event.keyCode) {
      case KEY_CODES.ENTER:
      case KEY_CODES.ARROW_LEFT:
      case KEY_CODES.ARROW_RIGHT:
      case KEY_CODES.ARROW_UP:
      case KEY_CODES.ARROW_DOWN: {
        if (this.resumeCellKeyboardMode())
          event.preventDefault()
        break
      }
      default:
        break
    }
  },

  /*
   * @syncKeyboardModeByCurrentCell
   * @desc 活动单元格变化时同步键盘模式（SEL-08）：有活动单元格 → 单元格导航，清空 → 表格模式
   */
  syncKeyboardModeByCurrentCell(this: any) {
    const { rowKey, colKey } = this.cellSelectionData.currentCell
    this.keyboardMode = !isEmptyValue(rowKey) && !isEmptyValue(colKey)
      ? KEYBOARD_MODE.CELL
      : KEYBOARD_MODE.TABLE
  },

  /*
   * @leaveCellKeyboardMode
   * @desc 离开单元格导航：进入表格模式并聚焦表格根元素（SEL-08）
   * 活动单元格保留（弱化显示），以便恢复时回到原位置
   */
  leaveCellKeyboardMode(this: any) {
    this.keyboardMode = KEYBOARD_MODE.TABLE

    const rootEl = this.$refs[this.tableRootRef] as HTMLElement | undefined
    // 编辑框（tabindex=-1）持有焦点，必须显式把焦点移到根元素；避免滚动跳到表格顶部
    rootEl?.focus({ preventScroll: true })
  },

  /*
   * @resumeCellKeyboardMode
   * @desc 恢复单元格导航：回到上次的活动单元格，没有则选中第一个单元格（SEL-08）
   * @return {boolean} 是否已恢复
   */
  resumeCellKeyboardMode(this: any) {
    const { cellSelectionData, colgroups, allRowKeys, enableCellSelection } = this

    if (!enableCellSelection)
      return false

    const { rowKey, colKey } = cellSelectionData.currentCell

    if (isEmptyValue(rowKey) || isEmptyValue(colKey)) {
      const firstColumn = colgroups.find(x => !x.operationColumn)
      const firstRowKey = allRowKeys[0]

      if (!firstColumn || isEmptyValue(firstRowKey))
        return false

      this[INSTANCE_METHODS.SET_CELL_SELECTION]({
        rowKey: firstRowKey,
        colKey: firstColumn.key,
      })
    }

    // 编辑框随模式变化重新渲染时会重新获得焦点（v-focus）
    this.keyboardMode = KEYBOARD_MODE.CELL
    return true
  },

  /*
   * @discardEditingCell
   * @desc 放弃编辑（D6）：关闭编辑框但不保存，单元格保持原值，
   * 不触发 beforeCellValueChange / afterCellValueChange
   */
  discardEditingCell(this: any) {
    if (!this.isCellEditing)
      return false

    // 与 stopEditingCell 一致：清空编辑框初始值
    this.editorInputStartValue = ''
    // editingCell.row 是行数据的副本，清空即丢弃未提交的值
    this.clearEditingCell()
    // reset status
    this.enableStopEditing = true
  },

  selectCellByDirection(this: any, { direction }: { direction: string }) {
    const { colgroups, allRowKeys, cellSelectionData } = this

    // 键盘导航把选区收缩为单个单元格，整列 / 整行选择的指示器随之清除（SEL-09）
    this.clearIndicatorKeys()

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
