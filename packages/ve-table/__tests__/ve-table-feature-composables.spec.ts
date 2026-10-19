import type { ColumnOption } from '@/ve-table/src/ve-table-types'
import { useCellSelectionState } from '@/ve-table/src/features/cell-selection/useCellSelectionState'
import { useColumns } from '@/ve-table/src/features/columns/useColumns'
import { useEditing } from '@/ve-table/src/features/editing/useEditing'
import { useTableLayout } from '@/ve-table/src/features/layout/useTableLayout'
import { useScrolling } from '@/ve-table/src/features/scrolling/useScrolling'
import { createTableContext } from '@/ve-table/src/features/table-context'
import { useVirtualScroll } from '@/ve-table/src/features/virtual-scroll/useVirtualScroll'
import { HOOKS_NAME } from '@/ve-table/src/util/constant'
import { mount } from '@vue/test-utils'
import { computed, defineComponent, effectScope, nextTick, reactive, ref, shallowRef } from 'vue'

/*
 * MOD-02：ve-table 拆出的功能组合式函数，脱离组件单独测试（只依赖显式传入的参数）
 */

// 在独立的 effect scope 中运行组合式函数，测试结束时停止
function runInScope<T>(fn: () => T) {
  const scope = effectScope()
  const result = scope.run(fn)!
  return { result, stop: () => scope.stop() }
}

// 使用了生命周期钩子的组合式函数：在一个空组件的 setup() 中运行
function withSetup<T>(fn: () => T) {
  let result!: T
  const wrapper = mount(defineComponent({
    setup() {
      result = fn()
      return () => null
    },
  }))
  return { result, wrapper }
}

describe('useColumns', () => {
  const COLUMNS: ColumnOption[] = [
    { field: 'name', key: 'a', title: 'Name', width: 100 },
    {
      title: 'Group',
      children: [
        { field: 'age', key: 'b', title: 'Age', width: 80 },
        { field: 'hobby', key: 'c', title: 'Hobby' },
      ],
    },
    { field: 'address', key: 'd', title: 'Address', width: 120, fixed: 'right' },
  ]

  function setup(extraProps: Record<string, any> = {}) {
    const props = reactive({
      columns: COLUMNS,
      columnHiddenOption: null,
      columnWidthResizeOption: null,
      ...extraProps,
    }) as any
    const tableContext = createTableContext()
    const order: string[] = []
    tableContext.on(HOOKS_NAME.TABLE_CELL_WIDTH_CHANGE, () => order.push('emit'))
    const { result, stop } = runInScope(() => useColumns({
      props,
      tableContext,
      onColumnWidthResize: () => order.push('resize'),
    }))
    return { props, columns: result, order, stop }
  }

  it('builds the group header and the leaf columns immediately', () => {
    const { columns, stop } = setup()

    expect(columns.isGroupHeader.value).toBe(true)
    expect(columns.colgroups.value.map(x => x.key)).toEqual(['a', 'b', 'c', 'd'])
    expect(columns.groupColumns.value.length).toBe(2)
    expect(columns.hasFixedColumn.value).toBe(true)
    expect(columns.hasLeftFixedColumn.value).toBe(false)
    expect(columns.hasRightFixedColumn.value).toBe(true)
    expect(columns.columnsOptionResetTime.value).toBe(0)
    stop()
  })

  it('rebuilds once per columns change and bumps the reset time', async () => {
    const { props, columns, stop } = setup()

    props.columns = COLUMNS.slice(0, 1)
    await nextTick()

    expect(columns.colgroups.value.map(x => x.key)).toEqual(['a'])
    expect(columns.isGroupHeader.value).toBe(false)
    expect(columns.columnsOptionResetTime.value).toBe(1)
    stop()
  })

  it('applies defaultHiddenColumnKeys once and hides / shows columns by key', async () => {
    const { props, columns, stop } = setup({ columnHiddenOption: { defaultHiddenColumnKeys: ['b'] } })
    expect(columns.colgroups.value.map(x => x.key)).toEqual(['a', 'c', 'd'])

    columns.showColumnsByKeys(['b'])
    columns.hideColumnsByKeys(['d'])
    await nextTick()
    expect(columns.colgroups.value.map(x => x.key)).toEqual(['a', 'b', 'c'])

    // columns 变化时保留运行时的隐藏状态（COL-09）
    props.columns = COLUMNS.map(col => ({ ...col }))
    await nextTick()
    expect(columns.colgroups.value.map(x => x.key)).toEqual(['a', 'b', 'c'])
    expect(columns.hiddenColumns.value).toEqual(['d'])
    stop()
  })

  it('sets the column resize widths and reports a resize before notifying the table', () => {
    const { columns, order, stop } = setup({ columnWidthResizeOption: { enable: true } })

    expect(columns.enableColumnResize.value).toBe(true)
    expect(columns.colgroups.value.map(x => x._columnResizeWidth)).toEqual([100, 80, 50, 120])

    columns.setColumnWidth({ colKey: 'c', width: 66 })
    expect(columns.colgroups.value.find(x => x.key === 'c')!._columnResizeWidth).toBe(66)
    expect(order).toEqual(['resize', 'emit'])
    stop()
  })
})

describe('useTableLayout', () => {
  it('resets the header / footer rows and sums the reported heights', async () => {
    const props = reactive({ showHeader: true, footerData: [{ a: 1 }] }) as any
    const groupColumns = ref<any[]>([[{ key: 'a' }], [{ key: 'b' }]])
    const { result: layout, stop } = runInScope(() => useTableLayout({ props, groupColumns }))

    expect(layout.headerRows.value).toEqual([{ rowHeight: 0 }, { rowHeight: 0 }])
    expect(layout.footerRows.value).toEqual([{ rowHeight: 0 }])

    layout.headerRowHeightChange({ rowIndex: 0, height: 40 })
    layout.headerRowHeightChange({ rowIndex: 1, height: 30 })
    layout.footRowHeightChange({ rowIndex: 0, height: 25 })
    expect(layout.headerTotalHeight.value).toBe(70)
    expect(layout.footerTotalHeight.value).toBe(25)

    // 隐藏表头时表头高度为 0
    props.showHeader = false
    expect(layout.headerTotalHeight.value).toBe(0)

    // 表头行数变化：行高重置，等待表头行重新上报
    groupColumns.value = [[{ key: 'a' }]]
    await nextTick()
    expect(layout.headerRows.value).toEqual([{ rowHeight: 0 }])
    stop()
  })
})

describe('useVirtualScroll', () => {
  function setup(extraProps: Record<string, any> = {}) {
    const tableData = Array.from({ length: 50 }, (_, i) => ({ id: `k${i}` }))
    const props = reactive({
      virtualScrollOption: { enable: true, minRowHeight: 30, bufferScale: 2 },
      tableData,
      rowKeyFieldName: 'id',
      maxHeight: 300,
      fixedHeader: true,
      fixedFooter: true,
      ...extraProps,
    }) as any
    const headerHeight = ref(40)
    const footerHeight = ref(20)
    // 没有滚动容器：实例不会创建，只测试创建之前的预估
    const { result, wrapper } = withSetup(() => useVirtualScroll({
      props,
      allRowKeys: computed(() => props.tableData.map((x: any) => x.id)),
      headerTotalHeight: computed(() => headerHeight.value),
      footerTotalHeight: computed(() => footerHeight.value),
      scrollElement: shallowRef(null),
    }))
    return { props, vs: result, wrapper, headerHeight }
  }

  it('maps the legacy options to TanStack options', () => {
    const { vs, props } = setup()
    expect(vs.isVirtualScroll.value).toBe(true)
    expect(vs.virtualScrollEstimateSize.value).toBe(30)
    expect(vs.virtualScrollOverscan.value).toBe(10)

    props.virtualScrollOption = { enable: true, bufferScale: 0.1 }
    expect(vs.virtualScrollEstimateSize.value).toBe(40)
    expect(vs.virtualScrollOverscan.value).toBe(3)
    props.virtualScrollOption = null
    expect(vs.isVirtualScroll.value).toBe(false)
    expect(vs.virtualItems.value).toEqual([])
  })

  it('lays out the first rows by the estimated height before the virtualizer exists (VS-06)', () => {
    const { vs } = setup()
    expect(vs.virtualScroll.value).toBeNull()

    // 300 / 30 + overscan 10 = 20 行，key 为行 key
    expect(vs.virtualItems.value.length).toBe(20)
    expect(vs.virtualItems.value[1]).toEqual({ index: 1, key: 'k1', start: 30, size: 30, end: 60, lane: 0 })
    expect(vs.actualRenderTableData.value.map((x: any) => x.id)).toEqual(vs.virtualItems.value.map(x => x.key))
    expect(vs.virtualPaddingTop.value).toBe(0)
    expect(vs.virtualPaddingBottom.value).toBe(30 * 30)
    expect(vs.virtualTotalSize.value).toBe(50 * 30)
  })

  it('waits for the virtualizer when maxHeight is not in px', () => {
    const { vs } = setup({ maxHeight: '50%' })
    expect(vs.virtualItems.value).toEqual([])
  })

  it('turns a sticky or a scrolling header into the viewport offsets', () => {
    const { vs, props, headerHeight } = setup()
    expect(vs.virtualScrollViewportOffsets.value).toEqual({ scrollMargin: 0, stickyStart: 40, stickyEnd: 20 })

    props.fixedHeader = false
    props.fixedFooter = false
    headerHeight.value = 50
    expect(vs.virtualScrollViewportOffsets.value).toEqual({ scrollMargin: 50, stickyStart: 0, stickyEnd: 0 })
  })

  it('falls back to the row index as key without rowKeyFieldName', () => {
    const { vs } = setup({ rowKeyFieldName: null })
    expect(vs.getVirtualRowKey(3)).toBe(3)
  })
})

describe('useCellSelectionState', () => {
  function setup(extraProps: Record<string, any> = {}) {
    const props = reactive({ cellSelectionOption: null, rowKeyFieldName: 'id', ...extraProps }) as any
    const colgroups = ref<any[]>([
      { key: 'op', operationColumn: true },
      { key: 'a' },
      { key: 'b' },
      { key: 'c' },
    ])
    const rowKeys = ref(['r0', 'r1', 'r2'])
    const { result, stop } = runInScope(() => useCellSelectionState({
      props,
      colgroups,
      allRowKeys: computed(() => rowKeys.value),
    }))
    return { props, state: result, rowKeys, stop }
  }

  it('enables cell selection only with a row key field and without enable: false', () => {
    expect(setup().state.enableCellSelection.value).toBe(true)
    expect(setup({ rowKeyFieldName: '' }).state.enableCellSelection.value).toBe(false)
    expect(setup({ cellSelectionOption: { enable: false } }).state.enableCellSelection.value).toBe(false)
  })

  it('keeps the row index and the selection type in sync with the cells', async () => {
    const { state, stop } = setup()
    expect(state.currentCellSelectionType.value).toBe('')

    state.cellSelectionCurrentCellChange({ rowKey: 'r1', colKey: 'a' })
    await nextTick()
    expect(state.cellSelectionData.value.currentCell).toEqual({ rowKey: 'r1', colKey: 'a', rowIndex: 1 })
    expect(state.currentCellSelectionType.value).toBe('single')

    state.cellSelectionNormalEndCellChange({ rowKey: 'r2', colKey: 'b' })
    await nextTick()
    expect(state.currentCellSelectionType.value).toBe('range')

    state.clearCellSelectionCurrentCell()
    state.clearCellSelectionNormalEndCell()
    await nextTick()
    expect(state.currentCellSelectionType.value).toBe('')
    stop()
  })

  it('turns the header / body indicators into a range and recomputes their indexes by key (SEL-09)', async () => {
    const { state, rowKeys, stop } = setup()

    state.headerIndicatorColKeysChange({ startColKey: 'b', endColKey: 'a' })
    await nextTick()
    expect(state.cellSelectionData.value.currentCell).toMatchObject({ rowKey: 'r0', colKey: 'b' })
    expect(state.cellSelectionData.value.normalEndCell).toMatchObject({ rowKey: 'r2', colKey: 'a' })

    state.clearHeaderIndicatorColKeys()
    state.bodyIndicatorRowKeysChange({ startRowKey: 'r1', endRowKey: 'r2' })
    await nextTick()
    // 整行选择不包含操作列（SEL-03）
    expect(state.cellSelectionData.value.currentCell).toMatchObject({ rowKey: 'r1', colKey: 'a' })
    expect(state.cellSelectionData.value.normalEndCell).toMatchObject({ rowKey: 'r2', colKey: 'c' })

    rowKeys.value = ['new', 'r0', 'r1', 'r2']
    expect(state.getIndicatorIndexes()).toEqual({ startColIndex: -1, endColIndex: -1, startRowIndex: 2, endRowIndex: 3 })
    stop()
  })
})

describe('useScrolling', () => {
  // jsdom 没有布局：用固定的尺寸模拟滚动容器
  function fakeContainer(size: Record<string, number>) {
    const el = document.createElement('div')
    Object.entries(size).forEach(([key, value]) => {
      Object.defineProperty(el, key, { configurable: true, writable: true, value })
    })
    return el
  }

  function setup(container: HTMLElement | null, fixed = true) {
    const props = reactive({ fixedHeader: true, tableData: [], rowKeyFieldName: 'id' }) as any
    const colgroups = ref<any[]>([
      { key: 'a', fixed: fixed ? 'left' : '', _realTimeWidth: 100 },
      { key: 'b', _realTimeWidth: 100 },
      { key: 'c', _realTimeWidth: 100 },
    ])
    const resetTime = ref(0)
    const changes: any[] = []
    const { result } = withSetup(() => useScrolling({
      props,
      rootElement: shallowRef(null),
      containerElement: shallowRef(container),
      contentWrapper: shallowRef(null),
      colgroups,
      hasFixedColumn: computed(() => colgroups.value.some(x => x.fixed)),
      columnsOptionResetTime: resetTime,
      isVirtualScroll: computed(() => false),
      virtualScroll: shallowRef(null),
      headerTotalHeight: computed(() => 40),
      footerTotalHeight: computed(() => 0),
      cellSelectionData: ref({ currentCell: { rowKey: '', colKey: 'a', rowIndex: -1 } } as any),
      cellSelectionCurrentCellChange: cell => changes.push(cell),
    }))
    return { scrolling: result, resetTime }
  }

  it('sets the scroll shadows from the container on mount and after a column reset', async () => {
    const container = fakeContainer({ scrollWidth: 500, clientWidth: 200, scrollLeft: 100, scrollTop: 10 })
    const { scrolling, resetTime } = setup(container)

    expect(scrolling.isLeftScrolling.value).toBe(true)
    expect(scrolling.isRightScrolling.value).toBe(true)
    expect(scrolling.isVerticalScrolling.value).toBe(true)

    ;(container as any).scrollLeft = 300
    resetTime.value++
    await nextTick()
    expect(scrolling.isRightScrolling.value).toBe(false)
  })

  it('detects the scroll bars', () => {
    const container = fakeContainer({ scrollWidth: 500, clientWidth: 200, scrollHeight: 100, clientHeight: 100, scrollLeft: 0, scrollTop: 0 })
    const { scrolling } = setup(container)

    scrolling.setScrollBarStatus()
    expect(scrolling.hasXScrollBar.value).toBe(true)
    expect(scrolling.hasYScrollBar.value).toBe(false)
  })

  it('scrolls a column into view only when there is a horizontal scroll bar', () => {
    const container = fakeContainer({ scrollWidth: 300, clientWidth: 100, scrollLeft: 200, scrollTop: 0 })
    const { scrolling } = setup(container, false)

    expect(scrolling.columnToVisible({ key: 'a' } as any)).toBe(false)
    scrolling.hasXScrollBar.value = true
    scrolling.scrollToColKey({ colKey: 'a' })
    expect(container.scrollLeft).toBe(0)
  })

  it('warns about an empty row key', () => {
    const { scrolling } = setup(fakeContainer({ scrollTop: 0 }), false)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(scrolling.scrollToRowKey({ rowKey: '' })).toBe(false)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('useEditing', () => {
  function setup(editOption: Record<string, any> = {}) {
    const calls: any[] = []
    const props = reactive({
      editOption: {
        beforeCellValueChange: ({ changeValue }: any) => calls.push(['before', changeValue]),
        afterCellValueChange: ({ row, changeValue }: any) => calls.push(['after', row.name, changeValue]),
        ...editOption,
      },
      tableData: [{ id: 1, name: 'a', age: 1 }, { id: 2, name: 'b', age: 2 }],
      rowKeyFieldName: 'id',
    }) as any
    const colgroups = ref<any[]>([
      { key: 'name', field: 'name', edit: true },
      { key: 'age', field: 'age' },
    ])
    const cellSelectionData = ref<any>({ currentCell: { rowKey: '', colKey: '', rowIndex: -1 } })
    const tableContext = createTableContext()
    const { result, stop } = runInScope(() => useEditing({
      props,
      colgroups,
      cellSelectionData,
      cellSelectionCurrentCellChange: ({ rowKey, colKey }) => {
        Object.assign(cellSelectionData.value.currentCell, { rowKey, colKey })
      },
      tableContext,
    }))
    return { props, editing: result, cellSelectionData, calls, stop }
  }

  it('edits a copy of the row and writes it back on stop, calling before then after', () => {
    const { props, editing, cellSelectionData, calls, stop } = setup()

    editing.startEditingCell({ rowKey: 2, colKey: 'name' })
    expect(editing.isCellEditing.value).toBe(true)
    expect(editing.editorInputStartValue.value).toBe('b')
    expect(cellSelectionData.value.currentCell).toMatchObject({ rowKey: 2, colKey: 'name' })

    editing.updateEditingCellValue('B!')
    expect(props.tableData[1].name).toBe('b')

    editing.stopEditingCell()
    expect(props.tableData[1].name).toBe('B!')
    expect(editing.isCellEditing.value).toBe(false)
    expect(calls).toEqual([['before', 'B!'], ['after', 'B!', 'B!']])
    stop()
  })

  it('ignores unknown cells and columns without edit: true', () => {
    const { editing, stop } = setup()
    expect(editing.startEditingCell({ rowKey: 9, colKey: 'name' })).toBe(false)
    expect(editing.startEditingCell({ rowKey: 1, colKey: 'age' })).toBe(false)
    expect(editing.isCellEditing.value).toBe(false)
    stop()
  })

  it('cancels the start when beforeStartCellEditing returns false', () => {
    const { editing, stop } = setup({ beforeStartCellEditing: () => false })
    expect(editing.startEditingCell({ rowKey: 1, colKey: 'name' })).toBe(false)
    expect(editing.isCellEditing.value).toBe(false)
    stop()
  })

  it('discards the uncommitted value (D6)', () => {
    const { props, editing, calls, stop } = setup()
    editing.startEditingCell({ rowKey: 1, colKey: 'name', defaultValue: 'x' })
    expect(editing.editingCell.value.row.name).toBe('x')

    editing.discardEditingCell()
    expect(editing.isCellEditing.value).toBe(false)
    expect(props.tableData[0].name).toBe('a')
    expect(calls).toEqual([])
    stop()
  })

  it('starts editing on a double click on an editable column only', () => {
    const { editing, stop } = setup()

    editing.editCellByClick({ isDblclick: true, rowKey: 1, colKey: 'age' })
    expect(editing.isCellEditing.value).toBe(false)
    expect(editing.enableStopEditing.value).toBe(true)

    editing.editCellByClick({ isDblclick: true, rowKey: 1, colKey: 'name' })
    expect(editing.isCellEditing.value).toBe(true)
    // 双击开始的编辑：方向键不结束编辑
    expect(editing.enableStopEditing.value).toBe(false)
    stop()
  })
})
