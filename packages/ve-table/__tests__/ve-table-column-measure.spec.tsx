import type { ColumnOption } from '@/ve-table/src/ve-table-types'
import veTable from '@/ve-table'
import { later, mockVirtualScrollLayout } from '@test-utils'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// COL-07：列宽必须在真实表格里测量（隐藏的独立表格没有内容，自动布局时宽度与真实表格不一致）
describe('veTable column width measurement', () => {
  const COLUMNS: ColumnOption[] = [
    { field: 'name', key: 'a', title: 'Name', width: 120, fixed: 'left' },
    { field: 'hobby', key: 'b', title: 'Hobby' },
    { field: 'address', key: 'c', title: 'Address', width: 200 },
    { field: 'address', key: 'd', title: 'Right', width: 90, fixed: 'right' },
  ]

  const TABLE_DATA = Array.from({ length: 30 }, (_, i) => ({
    rowKey: i,
    name: `name ${i}`,
    hobby: `hobby ${i}`,
    address: `address ${i}`,
  }))

  function getMeasureObservers(wrapper) {
    return wrapper
      .findAllComponents({ name: 'VueDomResizeObserver' })
      .filter(comp => comp.element.tagName === 'TD')
  }

  it('measures in a hidden row of the real table, outside the body rows', async () => {
    const wrapper = mount(veTable, {
      props: {
        columns: COLUMNS,
        tableData: TABLE_DATA,
        rowKeyFieldName: 'rowKey',
      },
    })

    await later()

    // 没有额外的隐藏表格
    expect(wrapper.findAll('table').length).toBe(1)

    const contentTable = wrapper.find('table.ve-table-content')
    const measureCells = contentTable.findAll('tbody[aria-hidden="true"] > tr > td')
    expect(measureCells.length).toBe(COLUMNS.length)
    measureCells.forEach((td) => {
      expect(td.attributes('style')).toContain('height: 0px')
    })

    // 测量单元格不在 body 行里，body 行数不变
    expect(contentTable.findAll('tbody.ve-table-body td:not(.ve-table-body-td)').length).toBe(0)
    expect(wrapper.findAll('.ve-table-body-tr').length).toBe(TABLE_DATA.length)

    // 每个测量单元格对应一列（顺序与 colgroups 一致）
    const observers = getMeasureObservers(wrapper)
    expect(observers.map(comp => comp.element)).toEqual(measureCells.map(td => td.element))
  })

  it('writes the measured widths into colgroups[]._realTimeWidth', async () => {
    const wrapper = mount(veTable, {
      props: {
        columns: COLUMNS,
        tableData: TABLE_DATA,
        rowKeyFieldName: 'rowKey',
      },
    })

    await later()

    const widths = [146, 300, 200, 90]
    getMeasureObservers(wrapper).forEach((comp, index) => {
      ;(comp.vm as any).resizeListener({ left: 0, top: 0, width: widths[index], height: 0 })
    })

    // debounce(0)
    await later()

    const colgroups = (wrapper.vm as any).colgroups
    expect(colgroups.map(col => col._realTimeWidth)).toEqual(widths)
  })

  it('keeps the measurement row out of the virtual rows', async () => {
    const layout = mockVirtualScrollLayout({
      containerHeight: 500,
      rowHeight: () => 40,
    })

    const wrapper = mount(veTable, {
      props: {
        columns: COLUMNS,
        tableData: TABLE_DATA,
        rowKeyFieldName: 'rowKey',
        maxHeight: 500,
        virtualScrollOption: { enable: true },
      },
    })

    await later()
    await later()

    const contentTable = wrapper.find('table.ve-table-content')
    expect(contentTable.findAll('tbody[aria-hidden="true"] > tr > td[colspan]').length).toBe(1)
    expect(getMeasureObservers(wrapper).length).toBe(COLUMNS.length)
    // 每个虚拟行一个 tbody，测量行不在其中
    const rowTbodies = contentTable.findAll('tbody[data-index]')
    expect(rowTbodies.length).toBe(wrapper.findAll('.ve-table-body-tr').length)
    rowTbodies.forEach((tbody) => {
      expect(tbody.findAll('tr').every(tr => tr.classes('ve-table-body-tr') || tr.classes('ve-table-expand-tr'))).toBe(true)
    })

    layout.restore()
  })

  // COL-15：列变化（新的 columns、隐藏 / 显示列）不再重新创建测量单元格；
  // 宽度没有变化时 ResizeObserver 不会回调，所以表格重新上报最近测得的宽度
  describe('column changes (COL-15)', () => {
    async function mountMeasured() {
      const wrapper = mount(veTable, {
        props: {
          columns: COLUMNS,
          tableData: TABLE_DATA,
          rowKeyFieldName: 'rowKey',
        },
      })
      await later()

      const widths = [146, 300, 200, 90]
      getMeasureObservers(wrapper).forEach((comp, index) => {
        ;(comp.vm as any).resizeListener({ left: 0, top: 0, width: widths[index], height: 0 })
      })
      await later()
      return wrapper
    }

    const widthsOf = (wrapper: any) =>
      (wrapper.vm as any).colgroups.map((col: any) => [col.key, col._realTimeWidth])

    it('keeps the measuring cells and the measured widths when the columns prop changes', async () => {
      const wrapper = await mountMeasured()
      const cellsBefore = getMeasureObservers(wrapper).map(comp => comp.element)

      await wrapper.setProps({ columns: COLUMNS.map(col => ({ ...col })) })
      await later()

      const cellsAfter = getMeasureObservers(wrapper).map(comp => comp.element)
      expect(cellsAfter.length).toBe(cellsBefore.length)
      cellsAfter.forEach((el, index) => expect(el).toBe(cellsBefore[index]))
      expect(widthsOf(wrapper)).toEqual([['a', 146], ['b', 300], ['c', 200], ['d', 90]])
    })

    it('re-reports the widths after hiding and showing a column, without recreating the other cells', async () => {
      const wrapper = await mountMeasured()
      const vm = wrapper.vm as any
      const observerOf = (key: string) => getMeasureObservers(wrapper).find(comp => comp.props('id') === key)!
      const cellOf = (key: string) => observerOf(key).element
      const cellA = cellOf('a')

      vm.hideColumnsByKeys(['b'])
      // 等待本次更新（post watcher 中重新上报），再等待 0ms 防抖
      await nextTick()
      await later()
      expect(cellOf('a')).toBe(cellA)
      expect(widthsOf(wrapper)).toEqual([['a', 146], ['c', 200], ['d', 90]])

      vm.showColumnsByKeys(['b'])
      await nextTick()
      await later()
      expect(cellOf('a')).toBe(cellA)
      // b 的单元格是新建的，测量之前保持列配置的宽度（没有配置时为 undefined），不使用隐藏前的旧值
      expect(widthsOf(wrapper)).toEqual([['a', 146], ['b', undefined], ['c', 200], ['d', 90]])

      ;(observerOf('b').vm as any).resizeListener({ left: 0, top: 0, width: 280, height: 0 })
      await later()
      expect(widthsOf(wrapper)).toEqual([['a', 146], ['b', 280], ['c', 200], ['d', 90]])
    })

    it('notifies the table parts after re-reporting the widths', async () => {
      const wrapper = await mountMeasured()
      const vm = wrapper.vm as any
      const emitSpy = vi.spyOn(vm.tableContext, 'emit')

      await wrapper.setProps({ columns: COLUMNS.map(col => ({ ...col })) })
      await later()

      expect(emitSpy).toHaveBeenCalledWith('table-cell-width-change')
    })
  })
})
