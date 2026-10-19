import type { ColumnOption } from '@/ve-table/src/ve-table-types'
import veTable from '@/ve-table'
import { mount } from '@vue/test-utils'
import { cloneDeep } from 'lodash'
import { nextTick } from 'vue'

// RENDER-12：列配置变化（新的 columns、隐藏 / 显示列）时表头行不再重新创建，
// 表头组件的局部状态保留，表头行高仍然正确
describe('veTable header rows survive column changes (RENDER-12)', () => {
  const TABLE_DATA = [
    { rowKey: 1001, name: 'John', hobby: 'coding', address: 'Shanghai' },
    { rowKey: 1002, name: 'Dickerson', hobby: 'reading', address: 'Beijing' },
  ]

  // 两行表头：Name 跨两行，Info 分组下有 Hobby、Address
  function createColumns(): ColumnOption[] {
    return [
      {
        field: 'name',
        key: 'a',
        title: 'Name',
        align: 'left',
        // 不设置 defaultVisible：下拉框的显示状态只保存在组件的 internalVisible 中
        filterCustom: {
          render: () => <div class="custom-filter">custom</div>,
        },
      },
      {
        title: 'Info',
        key: 'g',
        children: [
          { field: 'hobby', key: 'c', title: 'Hobby', align: 'left' },
          { field: 'address', key: 'd', title: 'Address', align: 'left' },
        ],
      },
    ]
  }

  function mountTable() {
    return mount(veTable, {
      props: {
        columns: createColumns(),
        tableData: TABLE_DATA,
        rowKeyFieldName: 'rowKey',
      },
    })
  }

  function getHeaderTrObservers(wrapper) {
    return wrapper
      .findAllComponents({ name: 'VueDomResizeObserver' })
      .filter(comp => comp.element.classList?.contains('ve-table-header-tr'))
  }

  // 模拟 ResizeObserver 报告表头行高度
  async function reportHeaderRowHeights(wrapper, heights: number[]) {
    const observers = getHeaderTrObservers(wrapper)
    expect(observers).toHaveLength(heights.length)
    observers.forEach((comp, index) => {
      comp.vm.resizeListener({ left: 0, top: 0, width: 100, height: heights[index] })
    })
    await nextTick()
  }

  function getHeaderRowHeights(wrapper) {
    return (wrapper.vm as any).headerRows.map(row => row.rowHeight)
  }

  // 第二行表头单元格的 sticky top 等于第一行的高度
  function getSecondRowThTop(wrapper) {
    const secondRow = wrapper.findAll('.ve-table-header-tr')[1]
    return (secondRow.find('th').element as HTMLElement).style.top
  }

  function findCustomFilter(wrapper) {
    return wrapper.findComponent({ name: 'VeTableHeaderFilterCustomContent' })
  }

  it('keeps header components and their local state when columns get a new array', async () => {
    const wrapper = mountTable()
    const trEls = wrapper.findAll('.ve-table-header-tr').map(tr => tr.element)

    await wrapper.find('.ve-table-filter-icon').trigger('click')
    await nextTick()
    const filter = findCustomFilter(wrapper)
    expect((filter.vm as any).internalVisible).toBe(true)

    await wrapper.setProps({ columns: createColumns() })
    await nextTick()

    expect(findCustomFilter(wrapper).vm).toBe(filter.vm)
    expect((filter.vm as any).internalVisible).toBe(true)
    expect(wrapper.findAll('.ve-table-header-tr').map(tr => tr.element)).toEqual(trEls)
  })

  it('keeps header components and their local state when another column is hidden or shown', async () => {
    const wrapper = mountTable()

    await wrapper.find('.ve-table-filter-icon').trigger('click')
    await nextTick()
    const filter = findCustomFilter(wrapper)
    expect((filter.vm as any).internalVisible).toBe(true)

    ;(wrapper.vm as any).hideColumnsByKeys(['d'])
    await nextTick()
    await nextTick()
    expect(wrapper.findAll('.ve-table-header-th').map(th => th.text())).not.toContain('Address')
    expect(findCustomFilter(wrapper).vm).toBe(filter.vm)
    expect((filter.vm as any).internalVisible).toBe(true)

    ;(wrapper.vm as any).showColumnsByKeys(['d'])
    await nextTick()
    await nextTick()
    expect(wrapper.findAll('.ve-table-header-th').map(th => th.text())).toContain('Address')
    expect(findCustomFilter(wrapper).vm).toBe(filter.vm)
    expect((filter.vm as any).internalVisible).toBe(true)
  })

  it('keeps the measured header row heights after a column change', async () => {
    const wrapper = mountTable()

    await reportHeaderRowHeights(wrapper, [30, 40])
    expect(getHeaderRowHeights(wrapper)).toEqual([30, 40])
    expect(getSecondRowThTop(wrapper)).toBe('30px')

    // 新的 columns 数组：表格把 headerRows 重置为 0，表头行重新上报最近测得的高度
    await wrapper.setProps({ columns: cloneDeep(createColumns()) })
    await nextTick()
    expect(getHeaderRowHeights(wrapper)).toEqual([30, 40])
    expect(getSecondRowThTop(wrapper)).toBe('30px')

    // 隐藏列
    ;(wrapper.vm as any).hideColumnsByKeys(['d'])
    await nextTick()
    await nextTick()
    expect(getHeaderRowHeights(wrapper)).toEqual([30, 40])
    expect(getSecondRowThTop(wrapper)).toBe('30px')

    // 之后的高度变化照常生效
    await reportHeaderRowHeights(wrapper, [50, 40])
    expect(getHeaderRowHeights(wrapper)).toEqual([50, 40])
    expect(getSecondRowThTop(wrapper)).toBe('50px')
  })

  it('a header row that is added later reports its own height', async () => {
    const wrapper = mount(veTable, {
      props: {
        columns: [
          { field: 'name', key: 'a', title: 'Name', align: 'left' },
          { field: 'hobby', key: 'c', title: 'Hobby', align: 'left' },
        ] as ColumnOption[],
        tableData: TABLE_DATA,
        rowKeyFieldName: 'rowKey',
      },
    })

    await reportHeaderRowHeights(wrapper, [30])
    expect(getHeaderRowHeights(wrapper)).toEqual([30])

    // 改为两行表头：第一行沿用测得的高度，新的第二行由它自己的 ResizeObserver 上报
    await wrapper.setProps({ columns: createColumns() })
    await nextTick()
    expect(getHeaderRowHeights(wrapper)).toEqual([30, 0])

    await reportHeaderRowHeights(wrapper, [30, 40])
    expect(getHeaderRowHeights(wrapper)).toEqual([30, 40])
    expect(getSecondRowThTop(wrapper)).toBe('30px')
  })
})
