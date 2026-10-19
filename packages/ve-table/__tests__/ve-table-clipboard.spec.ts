/*
剪贴板单元测试：handlers 与 ve-table 的复制/剪切/粘贴/删除
（CLIP-01 … CLIP-03、CLIP-05 … CLIP-10，以及 INFRA-07 的剪贴板部分）

jsdom 没有真实的 ClipboardEvent 数据，这里用普通 Event 加一个假的 clipboardData。
*/

import type { Mock } from 'vitest'
import veTable from '@/ve-table'
import {
  onBeforeCopy,
  onBeforeCut,
  onBeforeDelete,
  onBeforePaste,
} from '@/ve-table/src/util/clipboard/index'
import { CONTEXTMENU_NODE_TYPES, HOOKS_NAME } from '@/ve-table/src/util/constant'
import { later } from '@test-utils'
import { mount } from '@vue/test-utils'
import { cloneDeep } from 'lodash'
import { toRaw } from 'vue'

const COLUMNS = [
  { field: 'name', key: 'a', title: 'Name' },
  { field: 'date', key: 'b', title: 'Date' },
  { field: 'hobby', key: 'c', title: 'Hobby' },
]

const TABLE_DATA = [
  { name: 'John', date: '1900-05-20', hobby: 'coding', rowKey: '1' },
  { name: 'Dickerson', date: '1910-06-20', hobby: 'reading', rowKey: '2' },
  { name: 'Larsen', date: '2000-07-20', hobby: 'running', rowKey: '3' },
  { name: 'Geneva', date: '2010-08-20', hobby: 'cooking', rowKey: '4' },
]

const ALL_ROW_KEYS = TABLE_DATA.map(x => x.rowKey)

// 含非数据列：操作列（有 field）与没有 field 的列（CLIP-07）
const COLUMNS_WITH_NON_DATA = [
  { field: 'index', key: 'op', title: '#', operationColumn: true },
  { field: 'name', key: 'a', title: 'Name' },
  { key: 'x', title: 'Actions' },
  { field: 'date', key: 'b', title: 'Date' },
]

function createClipboardEvent(type: string, text = '') {
  const store: Record<string, string> = { 'text/plain': text }
  const clipboardData = {
    getData: vi.fn((format: string) => store[format] ?? ''),
    setData: vi.fn((format: string, value: string) => {
      store[format] = value
    }),
  }
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'clipboardData', { value: clipboardData })
  return { event, clipboardData }
}

function range(topRowKey: string, leftColKey: string, bottomRowKey = topRowKey, rightColKey = leftColKey) {
  return { topRowKey, leftColKey, bottomRowKey, rightColKey }
}

describe('clipboard handlers', () => {
  const staleRanges: Array<[string, ReturnType<typeof range>]> = [
    ['top row', range('gone', 'a', '2', 'b')],
    ['bottom row', range('1', 'a', 'gone', 'b')],
    ['left column', range('1', 'gone', '2', 'b')],
    ['right column', range('1', 'a', '2', 'gone')],
    ['empty keys', range('', '', '', '')],
  ]

  describe.each([
    ['onBeforeCopy', onBeforeCopy],
    ['onBeforeCut', onBeforeCut],
    ['onBeforeDelete', onBeforeDelete],
  ])('%s', (_name, handler: any) => {
    it.each(staleRanges)('returns null for a stale %s (CLIP-01)', (_label, cellSelectionRangeData) => {
      expect(
        handler({
          cellSelectionRangeData,
          selectionRangeData: [],
          colgroups: COLUMNS,
          allRowKeys: ALL_ROW_KEYS,
        }),
      ).toBeNull()
    })

    it('returns null when there is no range (CLIP-01)', () => {
      expect(
        handler({
          cellSelectionRangeData: undefined,
          selectionRangeData: [],
          colgroups: COLUMNS,
          allRowKeys: ALL_ROW_KEYS,
        }),
      ).toBeNull()
    })

    it('returns the indexes, keys and data for a valid range', () => {
      const data = [['x']]
      expect(
        handler({
          cellSelectionRangeData: range('2', 'b', '3', 'c'),
          selectionRangeData: data,
          colgroups: COLUMNS,
          allRowKeys: ALL_ROW_KEYS,
        }),
      ).toEqual({
        selectionRangeIndexes: { startColIndex: 1, endColIndex: 2, startRowIndex: 1, endRowIndex: 2 },
        selectionRangeKeys: { startColKey: 'b', endColKey: 'c', startRowKey: '2', endRowKey: '3' },
        data,
      })
    })
  })

  describe('onBeforePaste', () => {
    function paste(text: string, cellSelectionRangeData: any = range('2', 'a')) {
      const { event } = createClipboardEvent('paste', text)
      return onBeforePaste({
        event,
        cellSelectionRangeData,
        colgroups: COLUMNS,
        allRowKeys: ALL_ROW_KEYS,
      })
    }

    it('returns null for a stale top row or left column instead of throwing (CLIP-01)', () => {
      expect(paste('x', range('gone', 'a'))).toBeNull()
      expect(paste('x', range('1', 'gone'))).toBeNull()
      expect(paste('x', null)).toBeNull()
    })

    it('returns null when the clipboard has no text, e.g. an image (CLIP-02)', () => {
      expect(paste('')).toBeNull()
    })

    it('uses the longest row for the column count (CLIP-05)', () => {
      const response = paste('a\nb\tc')
      expect(response!.selectionRangeIndexes).toEqual({
        startColIndex: 0,
        endColIndex: 1,
        startRowIndex: 1,
        endRowIndex: 2,
      })
      expect(response!.data).toEqual([{ name: 'a' }, { name: 'b', date: 'c' }])
    })

    it('clips the pasted block to the table', () => {
      const response = paste('1\t2\t3\t4\n5\n6\n7\n')
      expect(response!.selectionRangeKeys).toEqual({
        startColKey: 'a',
        endColKey: 'c',
        startRowKey: '2',
        endRowKey: '4',
      })
      expect(response!.data).toEqual([
        { name: '1', date: '2', hobby: '3' },
        { name: '5' },
        { name: '6' },
      ])
    })

    // CLIP-07
    it('skips operation columns and columns without field', () => {
      const { event } = createClipboardEvent('paste', 'p\tq\tr\ts\n')
      const response = onBeforePaste({
        event,
        cellSelectionRangeData: range('1', 'op'),
        colgroups: COLUMNS_WITH_NON_DATA,
        allRowKeys: ALL_ROW_KEYS,
      })
      expect(response!.selectionRangeKeys).toMatchObject({ startColKey: 'op', endColKey: 'b' })
      expect(response!.data).toEqual([{ name: 'q', date: 's' }])
    })
  })
})

describe('veTable clipboard', () => {
  let tableData: typeof TABLE_DATA

  beforeEach(() => {
    tableData = cloneDeep(TABLE_DATA)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  async function mountTable(clipboardOption: Record<string, any> = {}, props: Record<string, any> = {}) {
    const wrapper = mount(veTable, {
      props: {
        columns: COLUMNS,
        tableData,
        rowKeyFieldName: 'rowKey',
        clipboardOption,
        ...props,
      },
    })
    await later()
    return wrapper
  }

  async function select(wrapper: any, topRowKey: string, leftColKey: string, bottomRowKey = topRowKey, rightColKey = leftColKey) {
    wrapper.vm.setRangeCellSelection({
      startRowKey: topRowKey,
      startColKey: leftColKey,
      endRowKey: bottomRowKey,
      endColKey: rightColKey,
    })
    await later()
  }

  function textarea(wrapper: any): HTMLTextAreaElement {
    return wrapper.find('textarea.ve-table-edit-input').element
  }

  it('copies the selection as TSV through the editor textarea', async () => {
    const wrapper = await mountTable()
    await select(wrapper, '1', 'a', '2', 'b')

    const { event, clipboardData } = createClipboardEvent('copy')
    textarea(wrapper).dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(clipboardData.setData).toHaveBeenCalledWith(
      'text/plain',
      'John\t1900-05-20\nDickerson\t1910-06-20\n',
    )
    wrapper.unmount()
  })

  it('pastes TSV through the editor textarea and selects the pasted block', async () => {
    const wrapper = await mountTable()
    await select(wrapper, '2', 'b')
    const triggerHook = vi.spyOn(wrapper.vm.hooks, 'triggerHook')

    const { event } = createClipboardEvent('paste', 'x\ty\nz\tw\n')
    textarea(wrapper).dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(tableData[1]).toMatchObject({ date: 'x', hobby: 'y' })
    expect(tableData[2]).toMatchObject({ date: 'z', hobby: 'w' })
    expect(wrapper.vm.cellSelectionData.currentCell).toMatchObject({ rowKey: '2', colKey: 'b' })
    expect(wrapper.vm.cellSelectionData.normalEndCell).toMatchObject({ rowKey: '3', colKey: 'c' })
    expect(triggerHook).toHaveBeenCalledWith(HOOKS_NAME.CLIPBOARD_CELL_VALUE_CHANGE)
    wrapper.unmount()
  })

  // CLIP-03
  it('copy then paste round-trips an empty last row and special characters', async () => {
    tableData[0].name = 'tab\there'
    tableData[0].date = '"quoted"'
    tableData[1].name = ''
    tableData[1].date = 'line 1\r\nline 2'
    const wrapper = await mountTable()
    await select(wrapper, '1', 'a', '2', 'b')

    const copy = createClipboardEvent('copy')
    wrapper.vm.editorCopy(copy.event)
    const copied = copy.clipboardData.setData.mock.calls[0][1]

    await select(wrapper, '3', 'a')
    const paste = createClipboardEvent('paste', copied)
    wrapper.vm.editorPaste(paste.event)

    expect(tableData[2]).toMatchObject({ name: 'tab\there', date: '"quoted"' })
    expect(tableData[3]).toMatchObject({ name: '', date: 'line 1\r\nline 2' })
    wrapper.unmount()
  })

  // CLIP-05
  it('pastes every column of a ragged block', async () => {
    const wrapper = await mountTable()
    await select(wrapper, '1', 'a')

    wrapper.vm.editorPaste(createClipboardEvent('paste', 'a\nb\tc').event)

    expect(tableData[0]).toMatchObject({ name: 'a', date: '1900-05-20' })
    expect(tableData[1]).toMatchObject({ name: 'b', date: 'c' })
    wrapper.unmount()
  })

  // CLIP-02
  it('pasting a clipboard without text (an image) leaves the cell and the native paste alone', async () => {
    const beforePaste = vi.fn()
    const wrapper = await mountTable({ beforePaste })
    await select(wrapper, '1', 'a')

    const { event } = createClipboardEvent('paste', '')
    wrapper.vm.editorPaste(event)

    expect(tableData[0].name).toBe('John')
    expect(beforePaste).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
    wrapper.unmount()
  })

  describe('a stale or missing selection (CLIP-01)', () => {
    async function mountWithStaleRange(clipboardOption: Record<string, any> = {}) {
      const wrapper = await mountTable(clipboardOption)
      await select(wrapper, '2', 'a', '3', 'b')
      // 直接写入失效的 key（例如行已被删除），模拟 SEL-01 的失效选区
      wrapper.vm.cellSelectionRangeData = range('gone', 'a', '3', 'b')
      return wrapper
    }

    it('copy does not prevent the native copy or write an empty string', async () => {
      const beforeCopy = vi.fn()
      const wrapper = await mountWithStaleRange({ beforeCopy })

      const { event, clipboardData } = createClipboardEvent('copy')
      wrapper.vm.editorCopy(event)

      expect(event.defaultPrevented).toBe(false)
      expect(clipboardData.setData).not.toHaveBeenCalled()
      expect(beforeCopy).not.toHaveBeenCalled()
      wrapper.unmount()
    })

    it('copy with no selection at all does not prevent the native copy', async () => {
      const wrapper = await mountTable()

      const { event, clipboardData } = createClipboardEvent('copy')
      wrapper.vm.editorCopy(event)

      expect(event.defaultPrevented).toBe(false)
      expect(clipboardData.setData).not.toHaveBeenCalled()
      wrapper.unmount()
    })

    it('paste does not throw, call beforePaste or change data', async () => {
      const beforePaste = vi.fn()
      const wrapper = await mountWithStaleRange({ beforePaste })
      const snapshot = cloneDeep(tableData)

      const { event } = createClipboardEvent('paste', 'x')
      expect(() => wrapper.vm.editorPaste(event)).not.toThrow()

      expect(tableData).toEqual(snapshot)
      expect(beforePaste).not.toHaveBeenCalled()
      wrapper.unmount()
    })

    // CLIP-09
    it('paste keeps the text out of the hidden editor textarea', async () => {
      const wrapper = await mountWithStaleRange()
      const snapshot = cloneDeep(tableData)

      const { event } = createClipboardEvent('paste', 'x')
      textarea(wrapper).dispatchEvent(event)

      // 未编辑时原生粘贴只会落进隐藏的 textarea，因此阻止
      expect(event.defaultPrevented).toBe(true)
      expect(tableData).toEqual(snapshot)
      wrapper.unmount()
    })

    // CLIP-09
    it('paste with no selection at all keeps the text out of the hidden editor textarea', async () => {
      const wrapper = await mountTable()

      const { event } = createClipboardEvent('paste', 'x')
      textarea(wrapper).dispatchEvent(event)

      expect(event.defaultPrevented).toBe(true)
      wrapper.unmount()
    })

    it('cut does not prevent the native cut, write the clipboard or clear data', async () => {
      const wrapper = await mountWithStaleRange()
      const snapshot = cloneDeep(tableData)

      const { event, clipboardData } = createClipboardEvent('cut')
      wrapper.vm.editorCut(event)

      expect(event.defaultPrevented).toBe(false)
      expect(clipboardData.setData).not.toHaveBeenCalled()
      expect(tableData).toEqual(snapshot)
      wrapper.unmount()
    })

    it('delete does not clear any data', async () => {
      const beforeDelete = vi.fn()
      const wrapper = await mountWithStaleRange({ beforeDelete })
      const snapshot = cloneDeep(tableData)

      wrapper.vm.deleteCellSelectionRangeValue()

      expect(tableData).toEqual(snapshot)
      expect(beforeDelete).not.toHaveBeenCalled()
      wrapper.unmount()
    })
  })

  describe('throwing user callbacks (INFRA-07)', () => {
    function throwing(name: string) {
      return vi.fn(() => {
        throw new Error(`${name} failed`)
      })
    }

    let consoleError: { mock: { calls: unknown[][] } }

    beforeEach(() => {
      consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    function expectLogged(name: string) {
      expect(consoleError).toHaveBeenCalled()
      expect(String(consoleError.mock.calls[0][0])).toContain(name)
    }

    it('afterPaste: the data, the selection and the hook are all updated', async () => {
      const afterPaste = throwing('afterPaste')
      const wrapper = await mountTable({ afterPaste })
      await select(wrapper, '1', 'a')
      const triggerHook = vi.spyOn(wrapper.vm.hooks, 'triggerHook')

      expect(() =>
        wrapper.vm.editorPaste(createClipboardEvent('paste', 'x\ty\nz\tw').event),
      ).not.toThrow()

      expect(afterPaste).toHaveBeenCalledTimes(1)
      expect(tableData[0]).toMatchObject({ name: 'x', date: 'y' })
      expect(tableData[1]).toMatchObject({ name: 'z', date: 'w' })
      expect(wrapper.vm.cellSelectionData.currentCell).toMatchObject({ rowKey: '1', colKey: 'a' })
      expect(wrapper.vm.cellSelectionData.normalEndCell).toMatchObject({ rowKey: '2', colKey: 'b' })
      expect(triggerHook).toHaveBeenCalledWith(HOOKS_NAME.CLIPBOARD_CELL_VALUE_CHANGE)
      expectLogged('afterPaste')
      wrapper.unmount()
    })

    it('beforePaste: the paste is cancelled and nothing changes', async () => {
      const afterPaste = vi.fn()
      const wrapper = await mountTable({ beforePaste: throwing('beforePaste'), afterPaste })
      await select(wrapper, '1', 'a')
      const snapshot = cloneDeep(tableData)

      const { event } = createClipboardEvent('paste', 'x')
      expect(() => wrapper.vm.editorPaste(event)).not.toThrow()

      expect(tableData).toEqual(snapshot)
      expect(afterPaste).not.toHaveBeenCalled()
      // 取消的粘贴仍阻止原生粘贴，避免文本落进隐藏的 textarea
      expect(event.defaultPrevented).toBe(true)
      expectLogged('beforePaste')
      wrapper.unmount()
    })

    it('beforeCopy: the copy is cancelled and the clipboard is left untouched', async () => {
      const afterCopy = vi.fn()
      const wrapper = await mountTable({ beforeCopy: throwing('beforeCopy'), afterCopy })
      await select(wrapper, '1', 'a')

      const { event, clipboardData } = createClipboardEvent('copy')
      expect(() => wrapper.vm.editorCopy(event)).not.toThrow()

      expect(clipboardData.setData).not.toHaveBeenCalled()
      expect(afterCopy).not.toHaveBeenCalled()
      expect(event.defaultPrevented).toBe(true)
      expectLogged('beforeCopy')
      wrapper.unmount()
    })

    it('beforeCopy returning false still cancels the copy', async () => {
      const wrapper = await mountTable({ beforeCopy: () => false })
      await select(wrapper, '1', 'a')

      const { event, clipboardData } = createClipboardEvent('copy')
      wrapper.vm.editorCopy(event)

      expect(clipboardData.setData).not.toHaveBeenCalled()
      expect(event.defaultPrevented).toBe(true)
      wrapper.unmount()
    })

    it('afterCopy: the clipboard is still written', async () => {
      const wrapper = await mountTable({ afterCopy: throwing('afterCopy') })
      await select(wrapper, '1', 'a')

      const { event, clipboardData } = createClipboardEvent('copy')
      expect(() => wrapper.vm.editorCopy(event)).not.toThrow()

      expect(clipboardData.setData).toHaveBeenCalledWith('text/plain', 'John\n')
      expectLogged('afterCopy')
      wrapper.unmount()
    })

    it('beforeCut: the cut is cancelled and nothing changes', async () => {
      const wrapper = await mountTable({ beforeCut: throwing('beforeCut') })
      await select(wrapper, '1', 'a')
      const snapshot = cloneDeep(tableData)

      const { event, clipboardData } = createClipboardEvent('cut')
      expect(() => wrapper.vm.editorCut(event)).not.toThrow()

      expect(tableData).toEqual(snapshot)
      expect(clipboardData.setData).not.toHaveBeenCalled()
      expectLogged('beforeCut')
      wrapper.unmount()
    })

    it('afterCut: the data is cleared and the clipboard written', async () => {
      const wrapper = await mountTable({ afterCut: throwing('afterCut') })
      await select(wrapper, '1', 'a')

      const { event, clipboardData } = createClipboardEvent('cut')
      expect(() => wrapper.vm.editorCut(event)).not.toThrow()

      expect(tableData[0].name).toBe('')
      expect(clipboardData.setData).toHaveBeenCalledWith('text/plain', 'John\n')
      expectLogged('afterCut')
      wrapper.unmount()
    })

    it('beforeDelete: the delete is cancelled', async () => {
      const wrapper = await mountTable({ beforeDelete: throwing('beforeDelete') })
      await select(wrapper, '1', 'a')

      expect(() => wrapper.vm.deleteCellSelectionRangeValue()).not.toThrow()

      expect(tableData[0].name).toBe('John')
      expectLogged('beforeDelete')
      wrapper.unmount()
    })

    it('afterDelete: the data is still cleared', async () => {
      const wrapper = await mountTable({ afterDelete: throwing('afterDelete') })
      await select(wrapper, '1', 'a')

      expect(() => wrapper.vm.deleteCellSelectionRangeValue()).not.toThrow()

      expect(tableData[0].name).toBe('')
      expectLogged('afterDelete')
      wrapper.unmount()
    })
  })

  describe('columns that hold no data (CLIP-07)', () => {
    async function mountWithNonDataColumns() {
      const wrapper = await mountTable({}, { columns: COLUMNS_WITH_NON_DATA })
      await select(wrapper, '1', 'op', '2', 'b')
      return wrapper
    }

    function expectNoForeignKeys(row: Record<string, any>) {
      expect(row).not.toHaveProperty('undefined')
      expect(row).not.toHaveProperty('index')
    }

    it('paste skips them and keeps the remaining cells in place', async () => {
      const wrapper = await mountWithNonDataColumns()

      wrapper.vm.editorPaste(createClipboardEvent('paste', 'p\tq\tr\ts\n').event)

      expect(tableData[0]).toMatchObject({ name: 'q', date: 's' })
      expectNoForeignKeys(tableData[0])
      wrapper.unmount()
    })

    it('cut copies them as empty cells and clears only data columns', async () => {
      const wrapper = await mountWithNonDataColumns()

      const { event, clipboardData } = createClipboardEvent('cut')
      wrapper.vm.editorCut(event)

      expect(clipboardData.setData).toHaveBeenCalledWith(
        'text/plain',
        '\tJohn\t\t1900-05-20\n\tDickerson\t\t1910-06-20\n',
      )
      expect(tableData[0]).toMatchObject({ name: '', date: '' })
      expect(tableData[1]).toMatchObject({ name: '', date: '' })
      expectNoForeignKeys(tableData[0])
      expectNoForeignKeys(tableData[1])
      wrapper.unmount()
    })

    it('delete clears only data columns', async () => {
      const wrapper = await mountWithNonDataColumns()

      wrapper.vm.deleteCellSelectionRangeValue()

      expect(tableData[0]).toMatchObject({ name: '', date: '' })
      expectNoForeignKeys(tableData[0])
      expectNoForeignKeys(tableData[1])
      wrapper.unmount()
    })
  })

  describe('cut and delete refresh the selection (CLIP-08)', () => {
    /**
     * 记录 hook 与 after 回调的调用顺序
     */
    function recordOrder(wrapper: any, calls: string[]) {
      const original = wrapper.vm.hooks.triggerHook.bind(wrapper.vm.hooks)
      return vi.spyOn(wrapper.vm.hooks, 'triggerHook').mockImplementation((name: any, ...args: any[]) => {
        calls.push(name)
        return original(name, ...args)
      })
    }

    it('cut triggers the cell value change hook before afterCut', async () => {
      const calls: string[] = []
      const wrapper = await mountTable({ afterCut: () => calls.push('afterCut') })
      await select(wrapper, '1', 'a', '2', 'b')
      recordOrder(wrapper, calls)

      wrapper.vm.editorCut(createClipboardEvent('cut').event)

      expect(calls).toEqual([HOOKS_NAME.CLIPBOARD_CELL_VALUE_CHANGE, 'afterCut'])
      wrapper.unmount()
    })

    it('delete triggers the cell value change hook before afterDelete', async () => {
      const calls: string[] = []
      const wrapper = await mountTable({ afterDelete: () => calls.push('afterDelete') })
      await select(wrapper, '1', 'a', '2', 'b')
      recordOrder(wrapper, calls)

      wrapper.vm.deleteCellSelectionRangeValue()

      expect(calls).toEqual([HOOKS_NAME.CLIPBOARD_CELL_VALUE_CHANGE, 'afterDelete'])
      wrapper.unmount()
    })

    it('a cancelled cut or delete does not trigger the hook', async () => {
      const wrapper = await mountTable({ beforeCut: () => false, beforeDelete: () => false })
      await select(wrapper, '1', 'a')
      const triggerHook = vi.spyOn(wrapper.vm.hooks, 'triggerHook')

      wrapper.vm.editorCut(createClipboardEvent('cut').event)
      wrapper.vm.deleteCellSelectionRangeValue()

      expect(triggerHook).not.toHaveBeenCalledWith(HOOKS_NAME.CLIPBOARD_CELL_VALUE_CHANGE)
      wrapper.unmount()
    })
  })

  describe('contextmenu copy and cut (CLIP-06)', () => {
    const CONTEXTMENU_BODY_OPTION = {
      contextmenus: [{ type: 'COPY' }, { type: 'CUT' }],
    }
    const COPIED_TEXT = 'John\t1900-05-20\nDickerson\t1910-06-20\n'

    let writeText: Mock<[text: string], Promise<void>>
    let execCommand: Mock<[command: string], boolean>
    // execCommand('copy') 触发的 copy 事件中写入的数据
    let execCommandData: Record<string, string>

    function setAsyncClipboard(clipboard: any) {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clipboard })
    }

    /**
     * 模拟 execCommand('copy')：在当前焦点元素上派发 copy 事件，
     * 浏览器在命令执行后返回 true（是否写入由 copy 事件的处理决定）
     */
    function mockExecCommand(supported = true) {
      execCommand = vi.fn((command: string) => {
        if (!supported || command !== 'copy')
          return false
        const { event, clipboardData } = createClipboardEvent('copy')
        clipboardData.setData = vi.fn((format: string, value: string) => {
          execCommandData[format] = value
        })
        ;(document.activeElement || document.body).dispatchEvent(event)
        return true
      })
      Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand })
    }

    beforeEach(() => {
      execCommandData = {}
      writeText = vi.fn((_text: string) => Promise.resolve())
      setAsyncClipboard({ writeText })
      mockExecCommand()
    })

    afterEach(() => {
      delete (navigator as any).clipboard
      delete (document as any).execCommand
    })

    async function mountWithMenu(clipboardOption: Record<string, any> = {}) {
      const wrapper = await mountTable(clipboardOption, {
        contextmenuBodyOption: CONTEXTMENU_BODY_OPTION,
      })
      await select(wrapper, '1', 'a', '2', 'b')
      return wrapper
    }

    async function clickMenu(wrapper: any, type: string) {
      wrapper.vm.contextmenuItemClick(type)
      // 等待异步写入完成
      await later()
    }

    it('copy writes the selection with navigator.clipboard', async () => {
      const beforeCopy = vi.fn()
      const afterCopy = vi.fn()
      const wrapper = await mountWithMenu({ beforeCopy, afterCopy })

      await clickMenu(wrapper, CONTEXTMENU_NODE_TYPES.COPY)

      expect(writeText).toHaveBeenCalledWith(COPIED_TEXT)
      expect(execCommand).not.toHaveBeenCalled()
      expect(beforeCopy).toHaveBeenCalledTimes(1)
      expect(afterCopy).toHaveBeenCalledTimes(1)
      expect(tableData).toEqual(TABLE_DATA)
      wrapper.unmount()
    })

    it('cut writes the clipboard, then clears the cells and refreshes the selection', async () => {
      const afterCut = vi.fn()
      const wrapper = await mountWithMenu({ afterCut })
      const triggerHook = vi.spyOn(wrapper.vm.hooks, 'triggerHook')

      await clickMenu(wrapper, CONTEXTMENU_NODE_TYPES.CUT)

      expect(writeText).toHaveBeenCalledWith(COPIED_TEXT)
      expect(tableData[0]).toMatchObject({ name: '', date: '', hobby: 'coding' })
      expect(tableData[1]).toMatchObject({ name: '', date: '', hobby: 'reading' })
      expect(triggerHook).toHaveBeenCalledWith(HOOKS_NAME.CLIPBOARD_CELL_VALUE_CHANGE)
      expect(afterCut).toHaveBeenCalledTimes(1)
      wrapper.unmount()
    })

    it('falls back to execCommand without navigator.clipboard (insecure context)', async () => {
      setAsyncClipboard(undefined)
      const beforeCopy = vi.fn()
      const wrapper = await mountWithMenu({ beforeCopy })

      await clickMenu(wrapper, CONTEXTMENU_NODE_TYPES.COPY)

      expect(execCommand).toHaveBeenCalledWith('copy')
      expect(execCommandData['text/plain']).toBe(COPIED_TEXT)
      // 回退写入不会再次走表格自身的 copy 处理
      expect(beforeCopy).toHaveBeenCalledTimes(1)
      wrapper.unmount()
    })

    it('falls back to execCommand when navigator.clipboard rejects', async () => {
      writeText.mockImplementation(() => Promise.reject(new Error('NotAllowedError')))
      const afterCut = vi.fn()
      const writeError = vi.fn()
      const wrapper = await mountWithMenu({ afterCut, writeError })

      await clickMenu(wrapper, CONTEXTMENU_NODE_TYPES.CUT)

      expect(execCommandData['text/plain']).toBe(COPIED_TEXT)
      expect(tableData[0].name).toBe('')
      expect(afterCut).toHaveBeenCalledTimes(1)
      expect(writeError).not.toHaveBeenCalled()
      wrapper.unmount()
    })

    it('reports a failed write through writeError and keeps the cut cells', async () => {
      const error = new Error('NotAllowedError')
      writeText.mockImplementation(() => Promise.reject(error))
      mockExecCommand(false)
      const afterCut = vi.fn()
      const writeError = vi.fn()
      const wrapper = await mountWithMenu({ afterCut, writeError })

      await clickMenu(wrapper, CONTEXTMENU_NODE_TYPES.CUT)

      expect(writeError).toHaveBeenCalledTimes(1)
      expect(writeError).toHaveBeenCalledWith({
        type: 'cut',
        error,
        text: COPIED_TEXT,
        data: [['John', '1900-05-20'], ['Dickerson', '1910-06-20']],
        selectionRangeIndexes: { startColIndex: 0, endColIndex: 1, startRowIndex: 0, endRowIndex: 1 },
        selectionRangeKeys: { startColKey: 'a', endColKey: 'b', startRowKey: '1', endRowKey: '2' },
      })
      // 写入失败时不能清空单元格，否则数据就丢了
      expect(tableData).toEqual(TABLE_DATA)
      expect(afterCut).not.toHaveBeenCalled()
      wrapper.unmount()
    })

    it('logs a failed write when there is no writeError callback', async () => {
      setAsyncClipboard(undefined)
      mockExecCommand(false)
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const wrapper = await mountWithMenu()

      await clickMenu(wrapper, CONTEXTMENU_NODE_TYPES.COPY)

      expect(consoleWarn).toHaveBeenCalledTimes(1)
      expect(String(consoleWarn.mock.calls[0][0])).toContain('clipboard')
      wrapper.unmount()
    })

    it('a throwing writeError is logged, not thrown', async () => {
      setAsyncClipboard(undefined)
      mockExecCommand(false)
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const wrapper = await mountWithMenu({
        writeError: () => {
          throw new Error('writeError failed')
        },
      })

      await clickMenu(wrapper, CONTEXTMENU_NODE_TYPES.COPY)

      expect(consoleError).toHaveBeenCalled()
      expect(String(consoleError.mock.calls[0][0])).toContain('writeError')
      wrapper.unmount()
    })

    it('beforeCopy returning false cancels the menu copy', async () => {
      const wrapper = await mountWithMenu({ beforeCopy: () => false })

      await clickMenu(wrapper, CONTEXTMENU_NODE_TYPES.COPY)

      expect(writeText).not.toHaveBeenCalled()
      expect(execCommand).not.toHaveBeenCalled()
      wrapper.unmount()
    })

    it('copy: false disables the menu copy', async () => {
      const wrapper = await mountWithMenu({ copy: false })

      await clickMenu(wrapper, CONTEXTMENU_NODE_TYPES.COPY)

      expect(writeText).not.toHaveBeenCalled()
      expect(execCommand).not.toHaveBeenCalled()
      wrapper.unmount()
    })
  })

  describe('editOption and the column edit flag (CLIP-10)', () => {
    // name、hobby 可编辑，date 不可编辑
    const EDIT_COLUMNS = [
      { field: 'name', key: 'a', title: 'Name', edit: true },
      { field: 'date', key: 'b', title: 'Date' },
      { field: 'hobby', key: 'c', title: 'Hobby', edit: true },
    ]

    function editCallbacks(overrides: Record<string, any> = {}) {
      return {
        beforeCellValueChange: vi.fn(),
        cellValueChange: vi.fn(),
        afterCellValueChange: vi.fn(),
        ...overrides,
      }
    }

    async function mountEditable(
      editOption: Record<string, any> | null = editCallbacks(),
      clipboardOption: Record<string, any> = {},
      props: Record<string, any> = {},
    ) {
      return mountTable(clipboardOption, {
        columns: EDIT_COLUMNS,
        ...(editOption ? { editOption } : {}),
        ...props,
      })
    }

    /**
     * 记录 editOption 回调（默认的 vi.fn）与 hook 的调用顺序： "回调名:列 key:changeValue"，hook 记录其名称
     */
    function recordCalls(wrapper: any, editOption: Record<string, any>, calls: string[]) {
      for (const name of ['beforeCellValueChange', 'cellValueChange', 'afterCellValueChange']) {
        editOption[name].mockImplementation((params: any) => {
          calls.push(`${name}:${params.column.key}:${params.changeValue}`)
        })
      }
      const triggerHook = wrapper.vm.hooks.triggerHook.bind(wrapper.vm.hooks)
      vi.spyOn(wrapper.vm.hooks, 'triggerHook').mockImplementation((name: any, ...args: any[]) => {
        calls.push(name)
        return triggerHook(name, ...args)
      })
    }

    it('paste skips columns without edit: true', async () => {
      const wrapper = await mountEditable()
      await select(wrapper, '1', 'a')

      wrapper.vm.editorPaste(createClipboardEvent('paste', 'x\ty\tz\n').event)

      expect(tableData[0]).toMatchObject({ name: 'x', date: '1900-05-20', hobby: 'z' })
      wrapper.unmount()
    })

    it('beforePaste only sees the editable columns', async () => {
      const beforePaste = vi.fn()
      const wrapper = await mountEditable(editCallbacks(), { beforePaste })
      await select(wrapper, '1', 'a')

      wrapper.vm.editorPaste(createClipboardEvent('paste', 'x\ty\tz\n').event)

      expect(beforePaste.mock.calls[0][0].data).toEqual([{ name: 'x', hobby: 'z' }])
      wrapper.unmount()
    })

    it('paste fires the cell value callbacks once per changed cell, with the editing payload', async () => {
      const editOption = editCallbacks()
      const wrapper = await mountEditable(editOption)
      await select(wrapper, '1', 'a')

      // name 不变（John）：不触发回调
      wrapper.vm.editorPaste(createClipboardEvent('paste', 'John\ty\tz\n').event)

      expect(editOption.beforeCellValueChange).toHaveBeenCalledTimes(1)
      const beforeParams = editOption.beforeCellValueChange.mock.calls[0][0]
      expect(beforeParams.column).toMatchObject({ key: 'c', field: 'hobby' })
      expect(beforeParams.changeValue).toBe('z')
      // before 回调拿到的是修改前的行副本
      expect(beforeParams.row).toEqual(TABLE_DATA[0])
      expect(beforeParams.row).not.toBe(tableData[0])

      for (const callback of [editOption.cellValueChange, editOption.afterCellValueChange]) {
        expect(callback).toHaveBeenCalledTimes(1)
        const params = callback.mock.calls[0][0]
        // 与单元格编辑相同，after 回调拿到的是表格中的（响应式）行对象本身
        expect(toRaw(params.row)).toBe(tableData[0])
        expect(params.column).toMatchObject({ key: 'c' })
        expect(params.changeValue).toBe('z')
      }
      wrapper.unmount()
    })

    it('beforeCellValueChange returning false skips that cell only', async () => {
      const editOption = editCallbacks({
        beforeCellValueChange: vi.fn(({ row, column }: any) => !(row.rowKey === '1' && column.key === 'a')),
      })
      const wrapper = await mountEditable(editOption)
      await select(wrapper, '1', 'a')

      wrapper.vm.editorPaste(createClipboardEvent('paste', 'x\ty\tz\nu\tv\tw\n').event)

      expect(tableData[0]).toMatchObject({ name: 'John', hobby: 'z' })
      expect(tableData[1]).toMatchObject({ name: 'u', date: '1910-06-20', hobby: 'w' })
      expect(editOption.beforeCellValueChange).toHaveBeenCalledTimes(4)
      expect(editOption.afterCellValueChange).toHaveBeenCalledTimes(3)
      expect(editOption.cellValueChange).toHaveBeenCalledTimes(3)
      wrapper.unmount()
    })

    it('a throwing beforeCellValueChange skips that cell only and is logged', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const editOption = editCallbacks({
        beforeCellValueChange: vi.fn(({ column }: any) => {
          if (column.key === 'a')
            throw new Error('beforeCellValueChange failed')
        }),
      })
      const wrapper = await mountEditable(editOption)
      await select(wrapper, '1', 'a')

      expect(() =>
        wrapper.vm.editorPaste(createClipboardEvent('paste', 'x\ty\tz\n').event),
      ).not.toThrow()

      expect(tableData[0]).toMatchObject({ name: 'John', hobby: 'z' })
      expect(editOption.afterCellValueChange).toHaveBeenCalledTimes(1)
      expect(String(consoleError.mock.calls[0][0])).toContain('beforeCellValueChange')
      wrapper.unmount()
    })

    it('a throwing afterCellValueChange keeps the change and the remaining callbacks run', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      const afterPaste = vi.fn()
      const editOption = editCallbacks({
        afterCellValueChange: vi.fn(() => {
          throw new Error('afterCellValueChange failed')
        }),
      })
      const wrapper = await mountEditable(editOption, { afterPaste })
      await select(wrapper, '1', 'a')

      wrapper.vm.editorPaste(createClipboardEvent('paste', 'x\ty\tz\n').event)

      expect(tableData[0]).toMatchObject({ name: 'x', hobby: 'z' })
      expect(editOption.afterCellValueChange).toHaveBeenCalledTimes(2)
      expect(afterPaste).toHaveBeenCalledTimes(1)
      wrapper.unmount()
    })

    it('paste order: beforePaste, per-cell before, hook, per-cell after, afterPaste', async () => {
      const calls: string[] = []
      const editOption = editCallbacks()
      const wrapper = await mountEditable(editOption, {
        beforePaste: () => calls.push('beforePaste'),
        afterPaste: () => calls.push('afterPaste'),
      })
      await select(wrapper, '1', 'a')
      recordCalls(wrapper, editOption, calls)

      wrapper.vm.editorPaste(createClipboardEvent('paste', 'x\ty\tz\n').event)

      expect(calls).toEqual([
        'beforePaste',
        'beforeCellValueChange:a:x',
        'beforeCellValueChange:c:z',
        HOOKS_NAME.CLIPBOARD_CELL_VALUE_CHANGE,
        'cellValueChange:a:x',
        'afterCellValueChange:a:x',
        'cellValueChange:c:z',
        'afterCellValueChange:c:z',
        'afterPaste',
      ])
      wrapper.unmount()
    })

    it('beforePaste returning false fires no cell value callback', async () => {
      const editOption = editCallbacks()
      const wrapper = await mountEditable(editOption, { beforePaste: () => false })
      await select(wrapper, '1', 'a')

      wrapper.vm.editorPaste(createClipboardEvent('paste', 'x\ty\tz\n').event)

      expect(tableData).toEqual(TABLE_DATA)
      expect(editOption.beforeCellValueChange).not.toHaveBeenCalled()
      expect(editOption.afterCellValueChange).not.toHaveBeenCalled()
      wrapper.unmount()
    })

    it('cut copies every column but clears only editable cells that are not empty yet', async () => {
      tableData[1].hobby = ''
      const editOption = editCallbacks()
      const wrapper = await mountEditable(editOption)
      await select(wrapper, '1', 'a', '2', 'c')

      const { event, clipboardData } = createClipboardEvent('cut')
      wrapper.vm.editorCut(event)

      expect(clipboardData.setData).toHaveBeenCalledWith(
        'text/plain',
        'John\t1900-05-20\tcoding\nDickerson\t1910-06-20\t\n',
      )
      expect(tableData[0]).toMatchObject({ name: '', date: '1900-05-20', hobby: '' })
      expect(tableData[1]).toMatchObject({ name: '', date: '1910-06-20', hobby: '' })
      // rows 1 name、1 hobby、2 name；2 hobby 原本就是空值
      expect(editOption.beforeCellValueChange).toHaveBeenCalledTimes(3)
      expect(editOption.afterCellValueChange).toHaveBeenCalledTimes(3)
      expect(editOption.afterCellValueChange.mock.calls[0][0]).toMatchObject({ changeValue: '' })
      wrapper.unmount()
    })

    it('cut order: beforeCut, per-cell before, hook, per-cell after, afterCut', async () => {
      const calls: string[] = []
      const editOption = editCallbacks()
      const wrapper = await mountEditable(editOption, {
        beforeCut: () => calls.push('beforeCut'),
        afterCut: () => calls.push('afterCut'),
      })
      await select(wrapper, '1', 'a', '1', 'b')
      recordCalls(wrapper, editOption, calls)

      wrapper.vm.editorCut(createClipboardEvent('cut').event)

      expect(calls).toEqual([
        'beforeCut',
        'beforeCellValueChange:a:',
        HOOKS_NAME.CLIPBOARD_CELL_VALUE_CHANGE,
        'cellValueChange:a:',
        'afterCellValueChange:a:',
        'afterCut',
      ])
      wrapper.unmount()
    })

    it('delete clears only editable cells and respects beforeCellValueChange', async () => {
      const calls: string[] = []
      const editOption = editCallbacks({
        beforeCellValueChange: vi.fn(({ row }: any) => row.rowKey !== '2'),
      })
      const wrapper = await mountEditable(editOption, {
        beforeDelete: () => calls.push('beforeDelete'),
        afterDelete: () => calls.push('afterDelete'),
      })
      await select(wrapper, '1', 'a', '2', 'b')

      wrapper.vm.deleteCellSelectionRangeValue()

      expect(tableData[0]).toMatchObject({ name: '', date: '1900-05-20' })
      expect(tableData[1]).toMatchObject({ name: 'Dickerson', date: '1910-06-20' })
      expect(editOption.beforeCellValueChange).toHaveBeenCalledTimes(2)
      expect(editOption.afterCellValueChange).toHaveBeenCalledTimes(1)
      expect(calls).toEqual(['beforeDelete', 'afterDelete'])
      wrapper.unmount()
    })

    it('the contextmenu empty cell action clears only editable cells and fires the callbacks', async () => {
      const editOption = editCallbacks()
      const wrapper = await mountEditable(editOption, {}, {
        contextmenuBodyOption: { contextmenus: [{ type: CONTEXTMENU_NODE_TYPES.EMPTY_CELL }] },
      })
      await select(wrapper, '1', 'a', '1', 'b')

      wrapper.vm.contextmenuItemClick(CONTEXTMENU_NODE_TYPES.EMPTY_CELL)

      expect(tableData[0]).toMatchObject({ name: '', date: '1900-05-20' })
      expect(editOption.afterCellValueChange).toHaveBeenCalledTimes(1)
      wrapper.unmount()
    })

    it('the contextmenu cut clears only editable cells and fires the callbacks', async () => {
      const writeText = vi.fn((_text: string) => Promise.resolve())
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
      const calls: string[] = []
      const editOption = editCallbacks()
      const wrapper = await mountEditable(editOption, {
        afterCut: () => calls.push('afterCut'),
      }, {
        contextmenuBodyOption: { contextmenus: [{ type: CONTEXTMENU_NODE_TYPES.CUT }] },
      })
      await select(wrapper, '1', 'a', '1', 'b')
      recordCalls(wrapper, editOption, calls)

      try {
        wrapper.vm.contextmenuItemClick(CONTEXTMENU_NODE_TYPES.CUT)
        await later()

        expect(writeText).toHaveBeenCalledWith('John\t1900-05-20\n')
        expect(tableData[0]).toMatchObject({ name: '', date: '1900-05-20' })
        expect(calls).toEqual([
          'beforeCellValueChange:a:',
          HOOKS_NAME.CLIPBOARD_CELL_VALUE_CHANGE,
          'cellValueChange:a:',
          'afterCellValueChange:a:',
          'afterCut',
        ])
      }
      finally {
        delete (navigator as any).clipboard
        wrapper.unmount()
      }
    })

    it('without editOption, paste, cut and delete still write every data column and fire nothing', async () => {
      const wrapper = await mountEditable(null)
      await select(wrapper, '1', 'a')

      wrapper.vm.editorPaste(createClipboardEvent('paste', 'x\ty\tz\n').event)
      expect(tableData[0]).toMatchObject({ name: 'x', date: 'y', hobby: 'z' })

      await select(wrapper, '2', 'a', '2', 'c')
      wrapper.vm.editorCut(createClipboardEvent('cut').event)
      expect(tableData[1]).toMatchObject({ name: '', date: '', hobby: '' })

      await select(wrapper, '3', 'b')
      wrapper.vm.deleteCellSelectionRangeValue()
      expect(tableData[2].date).toBe('')
      wrapper.unmount()
    })
  })
})
