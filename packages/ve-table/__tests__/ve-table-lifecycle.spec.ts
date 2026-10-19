import veTable from '@/ve-table'
import { HOOKS_NAME } from '@/ve-table/src/util/constant'
import { later, wrapMount as mount } from '@test-utils'
import { afterEach, expect, vi } from 'vitest'

/*
 * 卸载 / 重新挂载（toggle）场景：
 * 子组件卸载后不应再响应 hooks / 事件总线，也不应留下定时器。
 */
describe('veTable lifecycle (remount / toggle)', () => {
  const TABLE_DATA = [
    { name: 'John', age: 20, hobby: 'coding', rowKey: '1' },
    { name: 'Dickerson', age: 30, hobby: 'coding', rowKey: '2' },
    { name: 'Larsen', age: 40, hobby: 'reading', rowKey: '3' },
  ]

  const COLUMNS = [
    { field: 'name', key: 'a', title: 'Name', width: 100 },
    { field: 'age', key: 'b', title: 'Age', width: 100, sortBy: '' },
    { field: 'hobby', key: 'c', title: 'Hobby', width: 100 },
  ]

  // 统计所有已注册 hook 回调的数量
  function countHooks(wrapper: any) {
    const hooks = wrapper.vm.hooks.hooks as Record<string, unknown[]>
    return Object.values(hooks).reduce((sum, list) => sum + list.length, 0)
  }

  // jsdom 没有布局，所有 rect 都是 0；这里给出非零尺寸，让编辑器真正去定位 textarea
  function mockNonZeroRect() {
    return vi
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockReturnValue({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        width: 100,
        height: 30,
        right: 100,
        bottom: 30,
        toJSON: () => {},
      } as DOMRect)
  }

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('toggling cellSelectionOption.enable removes the old hooks (INFRA-01)', async () => {
    mockNonZeroRect()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const wrapper = mount(veTable, {
      props: {
        columns: COLUMNS,
        tableData: TABLE_DATA,
        rowKeyFieldName: 'rowKey',
        cellSelectionOption: { enable: true },
      },
    })
    await later()

    // 选中一个单元格，让编辑器拿到 cellEl
    wrapper.findAll('.ve-table-body-tr')[1].findAll('.ve-table-body-td')[1].trigger('mousedown')
    await later()

    const initialCount = countHooks(wrapper)
    expect(initialCount).toBeGreaterThan(0)

    for (let i = 0; i < 3; i++) {
      await wrapper.setProps({ cellSelectionOption: { enable: false } })
      await later()
      await wrapper.setProps({ cellSelectionOption: { enable: true } })
      await later()
    }

    // 回调数量不应随 toggle 增长
    expect(countHooks(wrapper)).toBe(initialCount)

    // 关闭后触发滚动 hook：已卸载的编辑器 / 选区不应再执行
    await wrapper.setProps({ cellSelectionOption: { enable: false } })
    await later()

    const containerEl = wrapper.find('.ve-table-container').element
    expect(() => {
      (wrapper.vm as any).hooks.triggerHook(HOOKS_NAME.TABLE_CONTAINER_SCROLL, containerEl)
      ;(wrapper.vm as any).hooks.triggerHook(HOOKS_NAME.TABLE_SIZE_CHANGE)
    }).not.toThrow()
    expect(errorSpy).not.toHaveBeenCalled()

    wrapper.unmount()
  })

  it('toggling rowInsertOption.enable removes the old scroll hook (INFRA-01)', async () => {
    const wrapper = mount(veTable, {
      props: {
        columns: COLUMNS,
        tableData: TABLE_DATA,
        rowKeyFieldName: 'rowKey',
        rowInsertOption: { enable: true },
      },
    })
    await later()

    const scrollHooks = () => ((wrapper.vm as any).hooks.hooks[HOOKS_NAME.TABLE_CONTAINER_SCROLL] ?? []).length
    const initialCount = scrollHooks()
    expect(initialCount).toBeGreaterThan(0)

    for (let i = 0; i < 3; i++) {
      await wrapper.setProps({ rowInsertOption: { enable: false } })
      await later()
      await wrapper.setProps({ rowInsertOption: { enable: true } })
      await later()
    }

    expect(scrollHooks()).toBe(initialCount)

    await wrapper.setProps({ rowInsertOption: { enable: false } })
    await later()
    expect(scrollHooks()).toBe(initialCount - 1)

    wrapper.unmount()
  })

  it('toggling showHeader does not leave a dead SORT_CHANGE handler (INFRA-02)', async () => {
    const sortChange = vi.fn()

    const wrapper = mount(veTable, {
      props: {
        columns: COLUMNS,
        tableData: TABLE_DATA,
        rowKeyFieldName: 'rowKey',
        showHeader: true,
        sortOption: { sortChange },
      },
    })
    await later()

    for (let i = 0; i < 2; i++) {
      await wrapper.setProps({ showHeader: false })
      await later()
      await wrapper.setProps({ showHeader: true })
      await later()
    }

    wrapper.findAll('.ve-table-header-tr th')[1].find('.ve-table-sort').trigger('click')
    await later()

    expect(sortChange).toHaveBeenCalledTimes(1)
    expect(sortChange).toHaveBeenCalledWith({ age: 'asc' })

    wrapper.unmount()
  })

  it('pending ve-table debounces do not run after unmount (INFRA-03)', async () => {
    const wrapper = mount(veTable, {
      props: {
        columns: COLUMNS,
        tableData: TABLE_DATA,
        rowKeyFieldName: 'rowKey',
      },
    })
    await later()

    vi.useFakeTimers()
    const vm = wrapper.vm as any
    // 两个 0ms 防抖：宽度测量回调
    vm.measureCellSizeChange({ key: 'a', width: 120 })
    vm.debouncedBodyCellWidthChange?.(new Map([['a', 120]]))
    const triggerHookSpy = vi.spyOn(vm.hooks, 'triggerHook')

    wrapper.unmount()

    expect(() => vi.advanceTimersByTime(100)).not.toThrow()
    expect(triggerHookSpy).not.toHaveBeenCalled()
  })

  it('pending selection debounces do not run after unmount (INFRA-03)', async () => {
    const rectSpy = mockNonZeroRect()
    const wrapper = mount(veTable, {
      props: {
        columns: COLUMNS,
        tableData: TABLE_DATA,
        rowKeyFieldName: 'rowKey',
      },
    })
    await later()

    wrapper.findAll('.ve-table-body-tr')[1].findAll('.ve-table-body-td')[1].trigger('mousedown')
    await later()

    expect(wrapper.findComponent({ name: 'VeTableSelection' }).exists()).toBe(true)

    vi.useFakeTimers()
    // 滚动 hook 会排两个防抖：debounceSetCellEls(200ms) 与 debounceResetCellPositions(210ms)
    const containerEl = wrapper.find('.ve-table-container').element
    ;(wrapper.vm as any).hooks.triggerHook(HOOKS_NAME.TABLE_CONTAINER_SCROLL, containerEl)

    await wrapper.setProps({ cellSelectionOption: { enable: false } })
    expect(wrapper.findComponent({ name: 'VeTableSelection' }).exists()).toBe(false)

    /*
    选区层的防抖函数是 useSelectionPositions 内部的闭包，无法在实例上 spy（MOD-05）。
    改为观察效果：未取消的 debounceResetCellPositions 会读取表格与单元格的位置（getBoundingClientRect）
    */
    const rectCallsBefore = rectSpy.mock.calls.length
    expect(() => vi.advanceTimersByTime(1000)).not.toThrow()
    expect(rectSpy.mock.calls.length).toBe(rectCallsBefore)

    wrapper.unmount()
  })

  it('column resizer removes its document listeners on unmount (INFRA-03)', async () => {
    const wrapper = mount(veTable, {
      props: {
        columns: COLUMNS,
        tableData: TABLE_DATA,
        rowKeyFieldName: 'rowKey',
        columnWidthResizeOption: { enable: true },
      },
    })
    await later()

    const added: [string, unknown][] = []
    const removed: [string, unknown][] = []
    const addSpy = vi.spyOn(document, 'addEventListener').mockImplementation(function (this: Document, type: string, fn: any, opts?: any) {
      added.push([type, fn])
      return EventTarget.prototype.addEventListener.call(this, type, fn, opts)
    })
    const removeSpy = vi.spyOn(document, 'removeEventListener').mockImplementation(function (this: Document, type: string, fn: any, opts?: any) {
      removed.push([type, fn])
      return EventTarget.prototype.removeEventListener.call(this, type, fn, opts)
    })

    // 开始拖动列宽（不松开鼠标）
    const handler = wrapper.find('.ve-table-column-resizer-handler')
    await handler.trigger('mouseenter')
    await handler.trigger('mousedown')

    const resizerListeners = added.filter(([type]) => type === 'mousemove' || type === 'mouseup')
    expect(resizerListeners.length).toBe(2)

    // 拖动过程中卸载
    wrapper.unmount()

    for (const [type, fn] of resizerListeners)
      expect(removed).toContainEqual([type, fn])

    // 拖动中设置的全局禁止选中也应恢复
    expect((document.onselectstart as any)?.()).not.toBe(false)

    addSpy.mockRestore()
    removeSpy.mockRestore()
  })

  it('pending editor timers do not run after unmount (EDIT-02)', async () => {
    mockNonZeroRect()
    const wrapper = mount(veTable, {
      props: {
        columns: COLUMNS,
        tableData: TABLE_DATA,
        rowKeyFieldName: 'rowKey',
        editOption: {},
      },
    })
    await later()

    const firstCell = wrapper.findAll('.ve-table-body-tr')[1].findAll('.ve-table-body-td')[1]
    firstCell.trigger('mousedown')
    await later()
    firstCell.trigger('dblclick')
    await later()

    const editor = wrapper.findComponent({ name: 'VeTableEditInput' }).vm as any
    const unObserveSpy = vi.spyOn(editor.autoResize, 'unObserve')

    vi.useFakeTimers()
    // 滚动 hook 会排两个防抖：debounceSetCellEl(200ms) 与 debounceSetTextareaPosition(210ms)
    const containerEl = wrapper.find('.ve-table-container').element
    ;(wrapper.vm as any).hooks.triggerHook(HOOKS_NAME.TABLE_CONTAINER_SCROLL, containerEl)
    // 切换当前单元格会在 nextTick 后排一个聚焦用的 setTimeout
    wrapper.findAll('.ve-table-body-tr')[2].findAll('.ve-table-body-td')[1].trigger('mousedown')
    await nextTick()
    await nextTick()

    unObserveSpy.mockClear()

    await wrapper.setProps({ cellSelectionOption: { enable: false } })

    expect(unObserveSpy).toHaveBeenCalled()
    expect(() => vi.advanceTimersByTime(1000)).not.toThrow()

    wrapper.unmount()
  })
})
