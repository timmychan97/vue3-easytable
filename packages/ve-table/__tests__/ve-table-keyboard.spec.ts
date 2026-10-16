import veTable from '@/ve-table'
import { later, wrapMount as mount } from '@test-utils'
import { KEY_CODES } from '@test-utils/constant'
import { cloneDeep } from 'lodash'
import { afterEach, expect, vi } from 'vitest'

/*
 * SEL-02：document 上的 keydown 只处理发生在本表格内的按键
 * SEL-08：键盘模式（单元格导航 / 表格），Esc 离开单元格导航，Enter / 方向键 / 点击恢复
 * D6：编辑中按 Esc 放弃未提交的值
 */
describe('veTable keyboard', () => {
  const TABLE_DATA = [
    { name: 'John', date: '1900-05-20', hobby: 'coding', rowKey: '1' },
    { name: 'Dickerson', date: '1910-06-20', hobby: 'coding', rowKey: '2' },
    { name: 'Larsen', date: '2000-07-20', hobby: 'coding', rowKey: '3' },
    { name: 'Geneva', date: '2010-08-20', hobby: 'coding', rowKey: '4' },
  ]

  const COLUMNS = [
    { field: 'name', key: 'a', title: 'Name', width: '30%', edit: true },
    { field: 'date', key: 'b', title: 'Date', width: '30%', edit: true },
    { field: 'hobby', key: 'c', title: 'Hobby', width: '40%', edit: true },
  ]

  let wrapper: any = null
  const extraEls: HTMLElement[] = []

  afterEach(() => {
    // 卸载以移除 document 上的 keydown 监听，避免影响其他用例
    wrapper?.unmount()
    wrapper = null
    extraEls.splice(0).forEach(el => el.remove())
  })

  function mountTable(props: Record<string, any> = {}) {
    wrapper = mount(veTable, {
      propsData: {
        columns: COLUMNS,
        tableData: cloneDeep(TABLE_DATA),
        rowKeyFieldName: 'rowKey',
        ...props,
      },
    })
    return wrapper
  }

  function mountEditableTable() {
    const beforeCellValueChange = vi.fn()
    const afterCellValueChange = vi.fn()
    mountTable({
      editOption: { beforeCellValueChange, afterCellValueChange },
    })
    return { beforeCellValueChange, afterCellValueChange }
  }

  function getCell(rowIndex: number, colIndex: number) {
    return wrapper
      .findAll('.ve-table-body-tr')[rowIndex]
      .findAll('.ve-table-body-td')[colIndex]
  }

  function isSelected(rowIndex: number, colIndex: number) {
    return getCell(rowIndex, colIndex).classes().includes('ve-table-cell-selection')
  }

  function getRootEl(): HTMLElement {
    return wrapper.element as HTMLElement
  }

  function getTextareaEl(): HTMLTextAreaElement {
    return wrapper.find('.ve-table-edit-input').element
  }

  function isEditing() {
    return wrapper.find('.ve-table-container').classes().includes('ve-table-is-cell-editing')
  }

  // 在指定元素上派发可取消、可冒泡的 keydown，返回事件以检查 defaultPrevented
  function keydown(target: EventTarget, keyCode: number, init: KeyboardEventInit = {}) {
    const event = new KeyboardEvent('keydown', {
      keyCode,
      bubbles: true,
      cancelable: true,
      ...init,
    } as KeyboardEventInit)
    target.dispatchEvent(event)
    return event
  }

  function createOutsideInput() {
    const input = document.createElement('input')
    document.body.appendChild(input)
    extraEls.push(input)
    input.focus()
    return input
  }

  async function selectCell(rowIndex: number, colIndex: number) {
    getCell(rowIndex, colIndex).trigger('mousedown')
    await later()
    // 等待编辑框的聚焦定时器
    await later()
  }

  describe('keys from outside the table (SEL-02)', () => {
    it('ignores arrow keys and Enter typed into an input outside the table', async () => {
      mountTable()
      await selectCell(1, 1)
      expect(isSelected(1, 1)).toBe(true)

      const input = createOutsideInput()

      const up = keydown(input, KEY_CODES.ARROW_UP)
      const enter = keydown(input, KEY_CODES.ENTER)
      await later()

      expect(up.defaultPrevented).toBe(false)
      expect(enter.defaultPrevented).toBe(false)
      expect(isSelected(1, 1)).toBe(true)
    })

    it('does not swallow Tab, Space or Backspace, nor start editing from an outside input', async () => {
      mountEditableTable()
      await selectCell(1, 1)

      const input = createOutsideInput()

      const tab = keydown(input, KEY_CODES.TAB)
      const space = keydown(input, KEY_CODES.SPACE)
      const backspace = keydown(input, KEY_CODES.BACK_SPACE)
      keydown(input, 65) // "A"
      await later()

      expect(tab.defaultPrevented).toBe(false)
      expect(space.defaultPrevented).toBe(false)
      expect(backspace.defaultPrevented).toBe(false)
      expect(isEditing()).toBe(false)
      expect(isSelected(1, 1)).toBe(true)
    })

    it('still handles keys inside the table', async () => {
      mountTable()
      await selectCell(1, 1)

      const event = keydown(getTextareaEl(), KEY_CODES.ARROW_DOWN)
      await later()

      expect(event.defaultPrevented).toBe(true)
      expect(isSelected(2, 1)).toBe(true)
    })
  })

  describe('keyboard mode (SEL-08)', () => {
    it('makes the table root focusable when cell selection is enabled', () => {
      mountTable()
      expect(getRootEl().getAttribute('tabindex')).toBe('0')
    })

    it('does not add a tab stop when cell selection is disabled', () => {
      mountTable({ cellSelectionOption: { enable: false } })
      expect(getRootEl().hasAttribute('tabindex')).toBe(false)
    })

    it('traps Tab in cell mode', async () => {
      mountTable()
      await selectCell(1, 1)

      const tab = keydown(getTextareaEl(), KEY_CODES.TAB)
      await later()

      expect(tab.defaultPrevented).toBe(true)
      expect(isSelected(1, 2)).toBe(true)

      const shiftTab = keydown(getTextareaEl(), KEY_CODES.TAB, { shiftKey: true })
      await later()

      expect(shiftTab.defaultPrevented).toBe(true)
      expect(isSelected(1, 1)).toBe(true)
    })

    it('esc while editing closes the editor, discards the value and stays on the cell (D6)', async () => {
      const { beforeCellValueChange, afterCellValueChange } = mountEditableTable()
      await selectCell(1, 1)

      // 直接输入开始编辑
      keydown(getTextareaEl(), 65)
      await later()
      expect(isEditing()).toBe(true)

      await wrapper.find('.ve-table-edit-input').setValue('changed')
      await later()

      const esc = keydown(getTextareaEl(), KEY_CODES.ESC)
      await later()

      expect(esc.defaultPrevented).toBe(true)
      expect(isEditing()).toBe(false)
      expect(getCell(1, 1).text()).toBe('1910-06-20')
      expect(beforeCellValueChange).not.toHaveBeenCalled()
      expect(afterCellValueChange).not.toHaveBeenCalled()
      expect(isSelected(1, 1)).toBe(true)

      // 仍处于单元格导航：Tab 依旧被拦截并移动
      const tab = keydown(getTextareaEl(), KEY_CODES.TAB)
      await later()
      expect(tab.defaultPrevented).toBe(true)
      expect(isSelected(1, 2)).toBe(true)
    })

    it('esc in cell mode focuses the table root, and Tab is then not intercepted', async () => {
      mountTable()
      await selectCell(1, 1)

      const esc = keydown(getTextareaEl(), KEY_CODES.ESC)
      await later()

      expect(esc.defaultPrevented).toBe(true)
      expect(document.activeElement).toBe(getRootEl())
      // 活动单元格保留，但被弱化
      expect(isSelected(1, 1)).toBe(true)
      expect(getRootEl().classList.contains('ve-table-keyboard-dormant')).toBe(true)

      const tab = keydown(getRootEl(), KEY_CODES.TAB)
      const shiftTab = keydown(getRootEl(), KEY_CODES.TAB, { shiftKey: true })
      await later()

      expect(tab.defaultPrevented).toBe(false)
      expect(shiftTab.defaultPrevented).toBe(false)
      expect(isSelected(1, 1)).toBe(true)
      expect(isSelected(1, 2)).toBe(false)
    })

    it('keeps cell handling dormant in table mode', async () => {
      mountEditableTable()
      await selectCell(1, 1)

      keydown(getTextareaEl(), KEY_CODES.ESC)
      await later()

      const space = keydown(getRootEl(), KEY_CODES.SPACE)
      keydown(getRootEl(), 65)
      await later()
      // 编辑框不会把焦点抢回去
      await later(10)

      expect(space.defaultPrevented).toBe(false)
      expect(isEditing()).toBe(false)
      expect(document.activeElement).toBe(getRootEl())
    })

    it('enter on the focused root resumes cell navigation at the last active cell', async () => {
      mountTable()
      await selectCell(1, 1)

      keydown(getTextareaEl(), KEY_CODES.ESC)
      await later()

      const enter = keydown(getRootEl(), KEY_CODES.ENTER)
      await later()

      expect(enter.defaultPrevented).toBe(true)
      // 恢复时不移动
      expect(isSelected(1, 1)).toBe(true)
      expect(getRootEl().classList.contains('ve-table-keyboard-dormant')).toBe(false)
      // 焦点回到编辑框
      expect(document.activeElement).toBe(getTextareaEl())

      const down = keydown(getTextareaEl(), KEY_CODES.ARROW_DOWN)
      await later()
      expect(down.defaultPrevented).toBe(true)
      expect(isSelected(2, 1)).toBe(true)
    })

    it('an arrow key on the focused root also resumes without moving', async () => {
      mountTable()
      await selectCell(1, 1)

      keydown(getTextareaEl(), KEY_CODES.ESC)
      await later()

      const down = keydown(getRootEl(), KEY_CODES.ARROW_DOWN)
      await later()

      expect(down.defaultPrevented).toBe(true)
      expect(isSelected(1, 1)).toBe(true)

      keydown(getTextareaEl(), KEY_CODES.ARROW_DOWN)
      await later()
      expect(isSelected(2, 1)).toBe(true)
    })

    it('enter on the focused root starts at the first cell when there is no active cell', async () => {
      mountTable()
      getRootEl().focus()

      const enter = keydown(getRootEl(), KEY_CODES.ENTER)
      await later()

      expect(enter.defaultPrevented).toBe(true)
      expect(isSelected(0, 0)).toBe(true)

      keydown(getTextareaEl(), KEY_CODES.ARROW_RIGHT)
      await later()
      expect(isSelected(0, 1)).toBe(true)
    })

    it('clicking a cell resumes cell navigation', async () => {
      mountTable()
      await selectCell(1, 1)

      keydown(getTextareaEl(), KEY_CODES.ESC)
      await later()

      // 点击同一个单元格
      await selectCell(1, 1)
      expect(getRootEl().classList.contains('ve-table-keyboard-dormant')).toBe(false)

      const tab = keydown(getTextareaEl(), KEY_CODES.TAB)
      await later()
      expect(tab.defaultPrevented).toBe(true)
      expect(isSelected(1, 2)).toBe(true)
    })
  })
})
