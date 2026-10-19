import type { ColumnOption } from '@/ve-table/src/ve-table-types'
import veTable from '@/ve-table'
import { later, mockVirtualScrollLayout } from '@test-utils'
import { mount } from '@vue/test-utils'

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
})
