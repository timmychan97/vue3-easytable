import veTable from '@/ve-table'
import { later, wrapMount as mount } from '@test-utils'
import { afterEach, expect } from 'vitest'

/*
 * 列宽拖动（COL-05）：不覆盖全局的 document.onselectstart / ondragstart，
 * 并且在鼠标已松开（窗口外松开）、窗口失焦、按 Esc 时结束拖动，不会卡在拖动状态
 */
describe('veTable column resize (COL-05)', () => {
  const TABLE_DATA = [
    { name: 'John', age: 20, hobby: 'coding', rowKey: '1' },
    { name: 'Dickerson', age: 30, hobby: 'coding', rowKey: '2' },
  ]

  const COLUMNS = [
    { field: 'name', key: 'a', title: 'Name', width: 100 },
    { field: 'age', key: 'b', title: 'Age', width: 100 },
    { field: 'hobby', key: 'c', title: 'Hobby', width: 100 },
  ]

  afterEach(() => {
    document.onselectstart = null
    document.ondragstart = null
  })

  const mountTable = () =>
    mount(veTable, {
      props: {
        columns: COLUMNS,
        tableData: TABLE_DATA,
        rowKeyFieldName: 'rowKey',
        columnWidthResizeOption: { enable: true },
      },
    })

  // 在第一列表头上开始拖动（jsdom 中 rect 都是 0，起点 x = 0 + 列宽 100）
  const startDrag = async (wrapper: any) => {
    const th = wrapper.findAll('.ve-table-header-th')[0]
    await th.trigger('mousemove')
    const handler = wrapper.find('.ve-table-column-resizer-handler')
    await handler.trigger('mouseenter')
    await handler.trigger('mousedown')
  }

  const mousemove = (clientX: number, buttons: number) =>
    document.dispatchEvent(new MouseEvent('mousemove', { clientX, buttons, bubbles: true }))

  const mouseup = (clientX: number) =>
    document.dispatchEvent(new MouseEvent('mouseup', { clientX, bubbles: true }))

  const widthOf = (wrapper: any, key = 'a') =>
    (wrapper.vm as any).colgroups.find((x: any) => x.key === key)._columnResizeWidth

  const isResizing = (wrapper: any) => (wrapper.vm as any).isColumnResizing

  const isPrevented = (type: string) => {
    const event = new Event(type, { bubbles: true, cancelable: true })
    document.body.dispatchEvent(event)
    return event.defaultPrevented
  }

  it('resizes a column by dragging', async () => {
    const wrapper = mountTable()
    await later()

    await startDrag(wrapper)
    expect(isResizing(wrapper)).toBe(true)
    mousemove(150, 1)
    mouseup(150)
    await later()

    expect(isResizing(wrapper)).toBe(false)
    expect(widthOf(wrapper)).toBe(150)

    wrapper.unmount()
  })

  it('does not overwrite the app\'s document.onselectstart / ondragstart', async () => {
    const onselectstart = () => true
    const ondragstart = () => true
    document.onselectstart = onselectstart
    document.ondragstart = ondragstart

    const wrapper = mountTable()
    await later()

    await startDrag(wrapper)
    expect(document.onselectstart).toBe(onselectstart)
    expect(document.ondragstart).toBe(ondragstart)
    // 拖动中仍然禁止选中文本和拖拽
    expect(isPrevented('selectstart')).toBe(true)
    expect(isPrevented('dragstart')).toBe(true)

    mouseup(150)
    await later()

    expect(document.onselectstart).toBe(onselectstart)
    expect(document.ondragstart).toBe(ondragstart)
    expect(isPrevented('selectstart')).toBe(false)
    expect(isPrevented('dragstart')).toBe(false)

    wrapper.unmount()
  })

  it('ends the drag when the mouse button was released outside the window', async () => {
    const wrapper = mountTable()
    await later()

    await startDrag(wrapper)
    mousemove(160, 1)
    // 鼠标在窗口外松开，回到窗口时 mousemove 没有按键
    mousemove(400, 0)
    await later()

    expect(isResizing(wrapper)).toBe(false)
    // 按最后一次拖动的位置提交
    expect(widthOf(wrapper)).toBe(160)

    // 之后的移动不再影响列宽
    mousemove(300, 1)
    mouseup(300)
    await later()
    expect(widthOf(wrapper)).toBe(160)

    wrapper.unmount()
  })

  // SEL-11：在表格外松开时，浏览器在公共祖先（这里是 body）上触发 click，不应清除单元格选区
  it('releasing the drag outside the table keeps the cell selection (SEL-11)', async () => {
    const wrapper = mountTable()
    await later()

    ;(wrapper.vm as any).setCellSelection({ rowKey: '2', colKey: 'b' })
    await later()

    await startDrag(wrapper)
    mousemove(150, 1)
    document.body.dispatchEvent(new MouseEvent('mouseup', { clientX: 150, bubbles: true }))
    document.body.dispatchEvent(new MouseEvent('click', { clientX: 150, bubbles: true, detail: 1 }))
    await later()

    expect(isResizing(wrapper)).toBe(false)
    expect(widthOf(wrapper)).toBe(150)
    expect((wrapper.vm as any).cellSelectionData.currentCell).toMatchObject({ rowKey: '2', colKey: 'b' })

    wrapper.unmount()
  })

  it('cancels the drag on Escape', async () => {
    const wrapper = mountTable()
    await later()

    await startDrag(wrapper)
    mousemove(170, 1)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await later()

    expect(isResizing(wrapper)).toBe(false)
    expect(isPrevented('selectstart')).toBe(false)

    mouseup(170)
    await later()
    expect(widthOf(wrapper)).toBe(100)

    wrapper.unmount()
  })

  it('cancels the drag when the window loses focus', async () => {
    const wrapper = mountTable()
    await later()

    await startDrag(wrapper)
    mousemove(170, 1)
    window.dispatchEvent(new Event('blur'))
    await later()

    expect(isResizing(wrapper)).toBe(false)

    mouseup(170)
    await later()
    expect(widthOf(wrapper)).toBe(100)

    wrapper.unmount()
  })
})
