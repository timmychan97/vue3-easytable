import veTable from '@/ve-table'
import { queryBodyRows } from '@/ve-table/src/util/cell-dom'
import {
  CELL_RECT_OFFSET,
  getVirtualRenderRange,
  later,
  mockCellRects,
  mockVirtualScrollLayout,
} from '@test-utils'
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
    const spacers = wrapper.findAll('tbody[aria-hidden="true"] td[colspan]')
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
    const spacers = wrapper.findAll('tbody[aria-hidden="true"] td[colspan]')
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

  // VS-05：虚拟滚动下每行一个 <tbody>，body 的 class、单元格查找、斑马纹、插入行指示器都必须照常工作
  describe('body behaviour in virtual mode (VS-05)', () => {
    const BODY_CLASSES = [
      've-table-body',
      've-table-stripe',
      've-table-row-hover',
      've-table-row-highlight',
    ]

    function mountVirtual(extraProps: Record<string, unknown> = {}) {
      return mount(veTable, {
        propsData: {
          columns: COLUMNS,
          tableData: TABLE_DATA_SAME_ROW_HEIGHT,
          virtualScrollOption: {
            enable: true,
          },
          maxHeight: MAX_HEIGHT,
          rowKeyFieldName: 'rowKey',
          ...extraProps,
        },
        attachTo: document.body,
      })
    }

    async function scrollContainer(wrapper, scrollTop: number) {
      const containerEl = wrapper.find('.ve-table-container').element as HTMLElement
      containerEl.scrollTop = scrollTop
      containerEl.dispatchEvent(new Event('scroll'))
      await settle()
    }

    it('every rendered row <tbody> carries the body classes', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const wrapper = mountVirtual({ rowStyleOption: { stripe: true } })
      wrapper.triggerResizeObserver({ width: MAX_HEIGHT })
      await settle()

      const rowTbodies = wrapper.findAll('tbody[data-index]')
      expect(rowTbodies.length).toBe(getExpectedRowCount())
      rowTbodies.forEach((tbody) => {
        expect(tbody.classes()).toEqual(expect.arrayContaining(BODY_CLASSES))
      })

      // 占位 <tbody>（以及列宽测量行的 <tbody>）不参与 body 样式
      const hiddenTbodies = wrapper.findAll('table.ve-table-content > tbody[aria-hidden="true"]')
      const spacerTbodies = hiddenTbodies.filter(tbody => tbody.find('td[colspan]').exists())
      expect(spacerTbodies.length).toBe(1)
      hiddenTbodies.forEach((tbody) => {
        expect(tbody.classes()).not.toContain('ve-table-body')
      })

      // class 不再依赖 fall-through（片段根节点会丢弃它并告警）
      const fallThroughWarnings = warnSpy.mock.calls.filter(args =>
        String(args[0]).includes('Extraneous non-'),
      )
      expect(fallThroughWarnings).toEqual([])

      warnSpy.mockRestore()
      wrapper.unmount()
    })

    it('stripes rows by data index, not by DOM position', async () => {
      const wrapper = mountVirtual({ rowStyleOption: { stripe: true } })
      wrapper.triggerResizeObserver({ width: MAX_HEIGHT })
      await settle()

      // 滚动到一个奇数起始行，确保与 DOM 位置无关
      await scrollContainer(wrapper, 42 * MIN_ROW_HEIGHT)

      const rows = wrapper.findAll('.ve-table-body-tr')
      expect(Number(rows[0].attributes('row-key')) % 2).toBe(1)
      rows.forEach((tr) => {
        const rowIndex = Number(tr.attributes('row-key'))
        expect(tr.classes().includes('ve-table-body-tr-stripe')).toBe(rowIndex % 2 === 0)
      })

      wrapper.unmount()
    })

    it('does not add the stripe row class when stripe is off', async () => {
      const wrapper = mountVirtual()
      wrapper.triggerResizeObserver({ width: MAX_HEIGHT })
      await settle()

      expect(wrapper.findAll('.ve-table-body-tr-stripe').length).toBe(0)

      wrapper.unmount()
    })

    it('clicking a row highlights it', async () => {
      const wrapper = mountVirtual()
      wrapper.triggerResizeObserver({ width: MAX_HEIGHT })
      await settle()

      await wrapper.find('tbody[data-index="2"] td[col-key="b"]').trigger('click')
      await settle()

      const highlighted = wrapper.findAll('.ve-table-tr-highlight')
      expect(highlighted.length).toBe(1)
      expect(highlighted[0].attributes('row-key')).toBe('2')

      wrapper.unmount()
    })

    it('cell selection finds the selected cell element', async () => {
      const wrapper = mountVirtual()
      wrapper.triggerResizeObserver({ width: MAX_HEIGHT })
      await settle()

      const tdEl = wrapper.find('tbody[data-index="3"] td[col-key="c"]')
      await tdEl.trigger('mousedown')
      await settle()

      const selection = wrapper.findComponent({ name: 'VeTableSelection' })
      expect((selection.vm as any).currentCellEl).toBe(tdEl.element)

      // 首行 / 末行（已渲染）单元格，用于区域选择位置校准
      const rows = wrapper.findAll('.ve-table-body-tr')
      expect((selection.vm as any).getTableFirstRowCellByColKey('c')).toBe(
        rows[0].find('td[col-key="c"]').element,
      )
      expect((selection.vm as any).getTableLastRowCellByColKey('c')).toBe(
        rows[rows.length - 1].find('td[col-key="c"]').element,
      )

      wrapper.unmount()
    })

    it('the editor finds the selected cell element', async () => {
      // 编辑框只有在单元格有尺寸时才保留 cellEl 并定位（jsdom 中默认全为 0）
      const rectSpy = mockCellRects()

      const wrapper = mountVirtual({
        editOption: {
          cellValueChange: () => {},
        },
      })
      wrapper.triggerResizeObserver({ width: MAX_HEIGHT })
      await settle()

      const tdEl = wrapper.find('tbody[data-index="5"] td[col-key="b"]')
      await tdEl.trigger('mousedown')
      await settle()

      const editor = wrapper.findComponent({ name: 'VeTableEditInput' })
      expect((editor.vm as any).cellEl).toBe(tdEl.element)
      expect((editor.vm as any).overflowViewport).toBe(false)
      expect((editor.vm as any).textareaRect).toEqual(CELL_RECT_OFFSET)

      wrapper.unmount()
      rectSpy.mockRestore()
    })

    it('the row insert indicator sees every rendered row', async () => {
      const wrapper = mountVirtual({
        rowInsertOption: { enable: true },
      })
      wrapper.triggerResizeObserver({ width: MAX_HEIGHT })
      await settle()

      const tableEl = wrapper.find('table.ve-table-content').element as HTMLTableElement
      const rows = queryBodyRows(tableEl)

      expect(rows.length).toBe(getExpectedRowCount())
      expect(rows.map(tr => tr.getAttribute('row-key'))).toEqual(
        wrapper.findAll('.ve-table-body-tr').map(tr => tr.attributes('row-key')),
      )

      wrapper.unmount()
    })
  })
})
