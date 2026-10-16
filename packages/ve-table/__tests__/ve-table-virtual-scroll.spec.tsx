import veTable from '@/ve-table'
import { getVirtualRenderRange, later, mockVirtualScrollLayout } from '@test-utils'
import { mount } from '@vue/test-utils'

describe('veTable virtual scroll', () => {
  // same row height
  const TABLE_DATA_SAME_ROW_HEIGHT: Array<Record<string, unknown>> = []
  for (let i = 0; i < 1000; i++) {
    TABLE_DATA_SAME_ROW_HEIGHT.push({
      rowKey: i,
      name: i,
      date: i,
      hobby: i,
      address: i,
    })
  }

  // different row height（偶数行内容更多，对应下方 mock 的行高 120px）
  const TABLE_DATA_DIFFERENT_ROW_HEIGHT: Array<Record<string, unknown>> = []

  for (let i = 0; i < 1000; i++) {
    let value: string | number = i
    if (i % 2 === 0) {
      for (let j = 0; j < 3; j++) {
        value = `${value}this is the long word.<br />`
      }
    }

    TABLE_DATA_DIFFERENT_ROW_HEIGHT.push({
      rowKey: i,
      name: value,
      date: i,
      hobby: i,
      address: i,
    })
  }

  const MAX_HEIGHT = 500
  const MIN_ROW_HEIGHT = 40
  const TALL_ROW_HEIGHT = 120

  const sameRowHeight = () => MIN_ROW_HEIGHT
  const differentRowHeight = (index: number) => (index % 2 === 0 ? TALL_ROW_HEIGHT : MIN_ROW_HEIGHT)

  // jsdom 没有布局：模拟滚动容器高度与每行高度，TanStack 才会产出可视行
  let layout: ReturnType<typeof mockVirtualScrollLayout>
  beforeAll(() => {
    layout = mockVirtualScrollLayout({
      containerHeight: MAX_HEIGHT,
      rowHeight: sameRowHeight,
    })
  })
  afterEach(() => {
    layout.setRowHeight(sameRowHeight)
  })
  afterAll(() => {
    layout.restore()
  })

  // bufferScale → TanStack overscan（与 ve-table.tsx virtualScrollOverscan 一致）
  function getOverscan(bufferScale = 1) {
    return Math.max(Math.ceil(bufferScale * 5), 3)
  }

  // 应渲染的行数（可视区 + overscan）
  function getExpectedRowCount({
    rowHeight = sameRowHeight,
    bufferScale = 1,
    scrollTop = 0,
  }: { rowHeight?: (index: number) => number, bufferScale?: number, scrollTop?: number } = {}) {
    const range = getVirtualRenderRange({
      count: 1000,
      viewportHeight: MAX_HEIGHT,
      rowHeight,
      overscan: getOverscan(bufferScale),
      scrollTop,
    })
    return range.renderEndIndex - range.renderStartIndex + 1
  }

  // 等待：nextTick 创建虚拟滚动实例 → 渲染 → 行测量 → 再次渲染
  async function settle() {
    await later()
    await later()
  }

  const COLUMNS = [
    {
      field: 'name',
      key: 'b',
      title: 'Name',
      width: 200,
      align: 'left',
    },
    {
      field: 'hobby',
      key: 'c',
      title: 'Hobby',
      width: 300,
      align: 'left',
    },
    {
      field: 'address',
      key: 'd',
      title: 'Address',
      width: '',
      align: 'left',
    },
  ]

  function getRenderedRowKeys(wrapper) {
    return wrapper
      .findAll('.ve-table-body-tr')
      .map(tr => Number(tr.attributes('row-key')))
  }

  it('render same row height', async () => {
    const wrapper = mount(veTable, {
      propsData: {
        columns: COLUMNS,
        tableData: TABLE_DATA_SAME_ROW_HEIGHT,
        virtualScrollOption: {
          // 是否开启
          enable: true,
        },
        maxHeight: MAX_HEIGHT,
        rowKeyFieldName: 'rowKey',
      },
    })

    wrapper.triggerResizeObserver({ width: MAX_HEIGHT })

    await settle()

    expect(wrapper.html()).toMatchSnapshot()
  })

  it('dynamically turns virtual scrolling on', async () => {
    const wrapper = mount(veTable, {
      propsData: {
        columns: COLUMNS,
        tableData: TABLE_DATA_SAME_ROW_HEIGHT,
        virtualScrollOption: {
          // 是否开启
          enable: false,
        },
        maxHeight: MAX_HEIGHT,
        rowKeyFieldName: 'rowKey',
      },
    })

    wrapper.triggerResizeObserver({ width: MAX_HEIGHT })

    await settle()

    expect(wrapper.find('.ve-table-virtual-scroll').exists()).toBe(false)
    // 非虚拟滚动：渲染全部行
    expect(wrapper.findAll('.ve-table-body-tr').length).toBe(1000)

    await wrapper.setProps({
      virtualScrollOption: {
        // 是否开启
        enable: true,
      },
    })

    await settle()

    const tableContainerEl = wrapper.find('.ve-table-container')

    expect(tableContainerEl.attributes('style')).toBe(
      'max-height: 500px; height: 500px;',
    )

    expect(wrapper.find('.ve-table-virtual-scroll').exists()).toBe(true)
    expect(wrapper.findAll('.ve-table-body-tr').length).toBe(
      getExpectedRowCount(),
    )
  })

  it('same row height', async () => {
    const wrapper = mount(veTable, {
      propsData: {
        columns: COLUMNS,
        tableData: TABLE_DATA_SAME_ROW_HEIGHT,
        virtualScrollOption: {
          // 是否开启
          enable: true,
        },
        maxHeight: MAX_HEIGHT,
        rowKeyFieldName: 'rowKey',
      },
    })

    wrapper.triggerResizeObserver({ width: MAX_HEIGHT })

    await settle()

    const rowCount = getExpectedRowCount()
    // 13 行可视 + 5 行 overscan
    expect(rowCount).toBe(18)
    expect(getRenderedRowKeys(wrapper)).toEqual(
      Array.from({ length: rowCount }, (_, i) => i),
    )

    // 每一行包在自己的 <tbody data-index> 中，供 TanStack 测量
    const rowTbodies = wrapper.findAll('tbody[data-index]')
    expect(rowTbodies.length).toBe(rowCount)
    expect(rowTbodies[0].attributes('data-index')).toBe('0')

    // 顶部不需要占位；底部占位 = 总高度 - 已渲染行高度
    const spacers = wrapper.findAll('tbody[aria-hidden="true"] td')
    expect(spacers.length).toBe(1)
    expect(spacers[0].attributes('style')).toContain(
      `height: ${(1000 - rowCount) * MIN_ROW_HEIGHT}px`,
    )
  })

  it('scrolls to the middle and renders the rows around the scroll offset', async () => {
    const wrapper = mount(veTable, {
      propsData: {
        columns: COLUMNS,
        tableData: TABLE_DATA_SAME_ROW_HEIGHT,
        virtualScrollOption: {
          // 是否开启
          enable: true,
        },
        maxHeight: MAX_HEIGHT,
        rowKeyFieldName: 'rowKey',
      },
    })

    wrapper.triggerResizeObserver({ width: MAX_HEIGHT })

    await settle()

    const scrollTop = 4000
    const containerEl = wrapper.find('.ve-table-container').element as HTMLElement
    containerEl.scrollTop = scrollTop
    containerEl.dispatchEvent(new Event('scroll'))

    await settle()

    const range = getVirtualRenderRange({
      count: 1000,
      viewportHeight: MAX_HEIGHT,
      rowHeight: sameRowHeight,
      overscan: getOverscan(),
      scrollTop,
    })

    const rowKeys = getRenderedRowKeys(wrapper)
    expect(rowKeys[0]).toBe(range.renderStartIndex)
    expect(rowKeys[rowKeys.length - 1]).toBe(range.renderEndIndex)

    // 顶部与底部各有一个占位 <tbody>
    const spacers = wrapper.findAll('tbody[aria-hidden="true"] td')
    expect(spacers.length).toBe(2)
    expect(spacers[0].attributes('style')).toContain(
      `height: ${range.renderStartIndex * MIN_ROW_HEIGHT}px`,
    )
    expect(spacers[1].attributes('style')).toContain(
      `height: ${(1000 - range.renderEndIndex - 1) * MIN_ROW_HEIGHT}px`,
    )
  })

  it('different row height', async () => {
    layout.setRowHeight(differentRowHeight)

    const wrapper = mount(veTable, {
      propsData: {
        columns: COLUMNS,
        tableData: TABLE_DATA_DIFFERENT_ROW_HEIGHT,
        virtualScrollOption: {
          // 是否开启
          enable: true,
        },
        maxHeight: MAX_HEIGHT,
        rowKeyFieldName: 'rowKey',
      },
    })

    wrapper.triggerResizeObserver({ width: MAX_HEIGHT })

    await settle()

    const rowCount = getExpectedRowCount({ rowHeight: differentRowHeight })
    // 实际测量的行高更大 → 可视区内的行数少于同行高的情况
    expect(rowCount).toBeLessThan(getExpectedRowCount())
    expect(wrapper.findAll('.ve-table-body-tr').length).toBe(rowCount)
  })

  it('buffer scale', async () => {
    const bufferCount = 10

    const wrapper = mount(veTable, {
      propsData: {
        columns: COLUMNS,
        tableData: TABLE_DATA_SAME_ROW_HEIGHT,
        virtualScrollOption: {
          // 是否开启
          enable: true,
          bufferScale: bufferCount,
        },
        maxHeight: MAX_HEIGHT,
        rowKeyFieldName: 'rowKey',
      },
    })

    wrapper.triggerResizeObserver({ width: MAX_HEIGHT })

    await settle()

    const rowCount = getExpectedRowCount({ bufferScale: bufferCount })
    expect(rowCount).toBeGreaterThan(getExpectedRowCount())
    expect(wrapper.findAll('.ve-table-body-tr').length).toBe(rowCount)
  })

  it('with row checkbox', async () => {
    const wrapper = mount(veTable, {
      propsData: {
        columns: [
          {
            field: 'name',
            key: 'b',
            title: 'Name',
            width: 200,
            align: 'left',
            // type=checkbox
            type: 'checkbox',
          },
          ...COLUMNS.slice(1),
        ],
        tableData: TABLE_DATA_SAME_ROW_HEIGHT,
        virtualScrollOption: {
          // 是否开启
          enable: true,
        },
        checkboxOption: {},
        maxHeight: MAX_HEIGHT,
        rowKeyFieldName: 'rowKey',
      },
    })

    wrapper.triggerResizeObserver({ width: MAX_HEIGHT })

    await settle()

    expect(wrapper.findAll('.ve-table-body-tr .ve-checkbox').length).toBe(
      getExpectedRowCount(),
    )

    expect(wrapper.findAll('.ve-table-body-tr').length).toBe(
      getExpectedRowCount(),
    )
  })

  it('with row radio', async () => {
    const wrapper = mount(veTable, {
      propsData: {
        columns: [
          {
            field: 'name',
            key: 'b',
            title: 'Name',
            width: 200,
            align: 'left',
            // type=radio
            type: 'radio',
          },
          ...COLUMNS.slice(1),
        ],
        tableData: TABLE_DATA_SAME_ROW_HEIGHT,
        virtualScrollOption: {
          // 是否开启
          enable: true,
        },
        radioOption: {},
        maxHeight: MAX_HEIGHT,
        rowKeyFieldName: 'rowKey',
      },
    })

    wrapper.triggerResizeObserver({ width: MAX_HEIGHT })

    await settle()

    expect(wrapper.findAll('.ve-table-body-tr .ve-radio').length).toBe(
      getExpectedRowCount(),
    )

    expect(wrapper.findAll('.ve-table-body-tr').length).toBe(
      getExpectedRowCount(),
    )
  })

  it('with row expand', async () => {
    const wrapper = mount(veTable, {
      propsData: {
        columns: [
          {
            field: 'name',
            key: 'b',
            title: 'Name',
            width: 200,
            align: 'left',
            // type=expand
            type: 'expand',
          },
          ...COLUMNS.slice(1),
        ],
        tableData: TABLE_DATA_SAME_ROW_HEIGHT,
        virtualScrollOption: {
          // 是否开启
          enable: true,
        },
        expandOption: {
          defaultExpandedRowKeys: [1],
          render: ({ row, _column, _rowIndex }, _h) => {
            return (
              <p>
                My name is
                {' '}
                <span style="color:#1890ff;">{row.name}</span>
                ,I'm living in
                {' '}
                {row.address}
              </p>
            )
          },
        },
        maxHeight: MAX_HEIGHT,
        rowKeyFieldName: 'rowKey',
      },
    })

    wrapper.triggerResizeObserver({ width: MAX_HEIGHT })

    await settle()

    expect(wrapper.findAll('.ve-table-row-expand-icon').length).toBe(
      getExpectedRowCount(),
    )

    expect(wrapper.findAll('.ve-table-body-tr').length).toBe(
      getExpectedRowCount(),
    )

    // 展开行与其所属行在同一个 <tbody data-index> 中，一起被测量
    const expandedTbody = wrapper.find('tbody[data-index="1"]')
    expect(expandedTbody.find('.ve-table-body-tr').attributes('row-key')).toBe('1')
    expect(expandedTbody.find('.ve-table-expand-tr').exists()).toBe(true)
  })

  it('with column fixed', async () => {
    const wrapper = mount(veTable, {
      propsData: {
        columns: [
          {
            field: 'name',
            key: 'b',
            title: 'Name',
            width: 200,
            align: 'left',
            fixed: 'left',
          },
          {
            field: 'hobby',
            key: 'c',
            title: 'Hobby',
            width: 300,
            align: 'left',
          },
          {
            field: 'address',
            key: 'd',
            title: 'Address',
            width: '',
            align: 'left',
            fixed: 'right',
          },
        ],
        tableData: TABLE_DATA_SAME_ROW_HEIGHT,
        virtualScrollOption: {
          // 是否开启
          enable: true,
        },
        maxHeight: MAX_HEIGHT,
        rowKeyFieldName: 'rowKey',
      },
    })

    wrapper.triggerResizeObserver({ width: MAX_HEIGHT })

    await settle()

    const thEls = wrapper.findAll(
      '.ve-table-header .ve-table-header-tr .ve-table-header-th',
    )

    expect(thEls[0].classes()).toContain('ve-table-fixed-left')
    expect(thEls[0].classes()).toContain(
      've-table-last-left-fixed-column',
    )

    expect(thEls[2].classes()).toContain('ve-table-fixed-right')
    expect(thEls[2].classes()).toContain(
      've-table-first-right-fixed-column',
    )

    // body 中的固定列（虚拟行）
    const firstRowTds = wrapper.find('.ve-table-body-tr').findAll('.ve-table-body-td')

    expect(firstRowTds[0].classes()).toContain('ve-table-fixed-left')
    expect(firstRowTds[2].classes()).toContain('ve-table-fixed-right')

    expect(wrapper.findAll('.ve-table-body-tr').length).toBe(
      getExpectedRowCount(),
    )
  })

  it('with column footer', async () => {
    const wrapper = mount(veTable, {
      propsData: {
        columns: [
          {
            field: 'name',
            key: 'b',
            title: 'Name',
            width: 200,
            align: 'left',
            fixed: 'left',
          },
          {
            field: 'hobby',
            key: 'c',
            title: 'Hobby',
            width: 300,
            align: 'left',
          },
          {
            field: 'address',
            key: 'd',
            title: 'Address',
            width: '',
            align: 'left',
            fixed: 'right',
          },
        ],
        tableData: TABLE_DATA_SAME_ROW_HEIGHT,
        footerData: [
          {
            rowKey: 0,
            name: '平均值',
            date: 1100,
            hobby: 1200,
            address: 1300,
          },
          {
            rowKey: 1,
            name: '汇总值',
            date: 701000,
            hobby: 801000,
            address: 801000,
          },
        ],
        virtualScrollOption: {
          // 是否开启
          enable: true,
        },
        maxHeight: MAX_HEIGHT,
        rowKeyFieldName: 'rowKey',
      },
    })

    wrapper.triggerResizeObserver({ width: MAX_HEIGHT })

    await settle()

    expect(
      wrapper.findAll('.ve-table-footer-tr .ve-table-footer-td').length,
    ).toBe(6)

    expect(wrapper.findAll('.ve-table-body-tr').length).toBe(
      getExpectedRowCount(),
    )
  })

  it('scrolling callback', async () => {
    const mockFn = vi.fn()
    const wrapper = mount(veTable, {
      propsData: {
        columns: COLUMNS,
        tableData: TABLE_DATA_SAME_ROW_HEIGHT,
        virtualScrollOption: {
          // 是否开启
          enable: true,
          scrolling: mockFn,
        },
        maxHeight: MAX_HEIGHT,
        rowKeyFieldName: 'rowKey',
      },
    })

    wrapper.triggerResizeObserver({ width: MAX_HEIGHT })

    await settle()

    const range = getVirtualRenderRange({
      count: 1000,
      viewportHeight: MAX_HEIGHT,
      rowHeight: sameRowHeight,
      overscan: getOverscan(),
    })

    expect(mockFn).toHaveBeenCalled()
    expect(mockFn).toHaveBeenLastCalledWith({
      startRowIndex: 0,
      visibleStartIndex: 0,
      visibleEndIndex: range.visibleEndIndex,
      visibleAboveCount: 0,
      visibleBelowCount: range.renderEndIndex - range.visibleEndIndex,
    })

    // 滚动后回调收到新的区间
    const scrollTop = 4000
    const containerEl = wrapper.find('.ve-table-container').element as HTMLElement
    containerEl.scrollTop = scrollTop
    containerEl.dispatchEvent(new Event('scroll'))

    await settle()

    const scrolledRange = getVirtualRenderRange({
      count: 1000,
      viewportHeight: MAX_HEIGHT,
      rowHeight: sameRowHeight,
      overscan: getOverscan(),
      scrollTop,
    })

    expect(mockFn).toHaveBeenLastCalledWith({
      startRowIndex: scrolledRange.renderStartIndex,
      visibleStartIndex: scrolledRange.visibleStartIndex,
      visibleEndIndex: scrolledRange.visibleEndIndex,
      visibleAboveCount: scrolledRange.visibleStartIndex - scrolledRange.renderStartIndex,
      visibleBelowCount: scrolledRange.renderEndIndex - scrolledRange.visibleEndIndex,
    })
  })

  it('minRowHeight prop', async () => {
    const minRowHeight = 50
    layout.setRowHeight(() => minRowHeight)

    const wrapper = mount(veTable, {
      propsData: {
        columns: COLUMNS,
        tableData: TABLE_DATA_SAME_ROW_HEIGHT,
        virtualScrollOption: {
          // 是否开启
          enable: true,
          minRowHeight,
        },
        maxHeight: MAX_HEIGHT,
        rowKeyFieldName: 'rowKey',
      },
    })

    wrapper.triggerResizeObserver({ width: MAX_HEIGHT })

    await settle()

    // minRowHeight 作为 TanStack 的预估行高
    expect((wrapper.vm as any)._vs.virtualizer.options.estimateSize(0)).toBe(minRowHeight)

    const rowCount = getExpectedRowCount({ rowHeight: () => minRowHeight })
    expect(wrapper.findAll('.ve-table-body-tr').length).toBe(rowCount)
  })
})
