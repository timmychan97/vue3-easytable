/*
剪贴板单元测试：handlers 与 ve-table 的复制/剪切/粘贴/删除
（CLIP-01、CLIP-02、CLIP-03、CLIP-05，以及 INFRA-07 的剪贴板部分）

jsdom 没有真实的 ClipboardEvent 数据，这里用普通 Event 加一个假的 clipboardData。
*/

import veTable from '@/ve-table'
import {
  onBeforeCopy,
  onBeforeCut,
  onBeforeDelete,
  onBeforePaste,
} from '@/ve-table/src/util/clipboard/index'
import { HOOKS_NAME } from '@/ve-table/src/util/constant'
import { later } from '@test-utils'
import { mount } from '@vue/test-utils'
import { cloneDeep } from 'lodash'

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

  async function mountTable(clipboardOption: Record<string, any> = {}) {
    const wrapper = mount(veTable, {
      props: {
        columns: COLUMNS,
        tableData,
        rowKeyFieldName: 'rowKey',
        clipboardOption,
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

    it('paste does not throw, prevent the native paste or change data', async () => {
      const wrapper = await mountWithStaleRange()
      const snapshot = cloneDeep(tableData)

      const { event } = createClipboardEvent('paste', 'x')
      expect(() => wrapper.vm.editorPaste(event)).not.toThrow()

      expect(event.defaultPrevented).toBe(false)
      expect(tableData).toEqual(snapshot)
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
})
