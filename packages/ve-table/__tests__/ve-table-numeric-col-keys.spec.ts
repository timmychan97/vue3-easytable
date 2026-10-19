import veTable from '@/ve-table'
import { setColumnFixed } from '@/ve-table/src/util'
import { later } from '@test-utils'
import { mount } from '@vue/test-utils'

/*
 * COL-10：表头按 _keys（字符串）处理列 key，数字列 key 也要能匹配
 * （最后一列 class、固定列偏移、分组表头的选区指示、分组表头“固定列至”）
 */
describe('numeric column keys in the header (COL-10)', () => {
  const TABLE_DATA = [
    { rowKey: 'r1', a: 'a1', b: 'b1', c: 'c1', d: 'd1' },
    { rowKey: 'r2', a: 'a2', b: 'b2', c: 'c2', d: 'd2' },
  ]

  function mountTable(columns: any[]) {
    return mount(veTable, {
      props: {
        columns,
        tableData: TABLE_DATA,
        rowKeyFieldName: 'rowKey',
      },
    })
  }

  const headerTh = (wrapper: any, title: string) =>
    wrapper.findAll('.ve-table-header-th').find((x: any) => x.text() === title)

  it('the last header cell gets the last-column class', () => {
    const wrapper = mountTable([
      { field: 'a', key: 1, title: 'A' },
      { field: 'b', key: 2, title: 'B' },
    ])

    expect(headerTh(wrapper, 'B').classes()).toContain('ve-table-last-column')
    expect(headerTh(wrapper, 'A').classes()).not.toContain('ve-table-last-column')

    wrapper.unmount()
  })

  it('a group header ending with the last column gets the last-column class', () => {
    const wrapper = mountTable([
      { field: 'a', key: 1, title: 'A' },
      {
        key: 'g',
        title: 'G',
        children: [
          { field: 'b', key: 2, title: 'B' },
          { field: 'c', key: 3, title: 'C' },
        ],
      },
    ])

    expect(headerTh(wrapper, 'G').classes()).toContain('ve-table-last-column')
    expect(headerTh(wrapper, 'C').classes()).toContain('ve-table-last-column')

    wrapper.unmount()
  })

  it('fixed header cells get their offset and edge class', () => {
    const wrapper = mountTable([
      { field: 'a', key: 1, title: 'A', width: 50, fixed: 'left' },
      { field: 'b', key: 2, title: 'B', width: 60, fixed: 'left' },
      { field: 'c', key: 3, title: 'C', width: 70 },
      { field: 'd', key: 4, title: 'D', width: 80, fixed: 'right' },
    ])

    const th = headerTh(wrapper, 'B')
    expect((th.element as HTMLElement).style.left).toBe('50px')
    expect(th.classes()).toContain('ve-table-last-left-fixed-column')
    expect(headerTh(wrapper, 'D').classes()).toContain('ve-table-first-right-fixed-column')

    // 与表体单元格一致
    const td = wrapper.findAll('.ve-table-body-td')[1]
    expect((td.element as HTMLElement).style.left).toBe('50px')

    wrapper.unmount()
  })

  it('a group header of numeric leaf keys shows the selection indicator', async () => {
    const wrapper = mountTable([
      { field: 'a', key: 1, title: 'A' },
      {
        key: 'g',
        title: 'G',
        children: [
          { field: 'b', key: 2, title: 'B' },
          { field: 'c', key: 3, title: 'C' },
        ],
      },
    ])

    ;(wrapper.vm as any).setRangeCellSelection({
      startRowKey: 'r1',
      startColKey: 2,
      endRowKey: 'r2',
      endColKey: 3,
    })
    await later()

    expect(headerTh(wrapper, 'G').classes()).toContain('ve-table-cell-indicator')
    expect(headerTh(wrapper, 'A').classes()).not.toContain('ve-table-cell-indicator')

    wrapper.unmount()
  })

  it('setColumnFixed finds a group header by its numeric leaf keys', () => {
    const cloneColumns: any[] = [
      { key: 'g', _level: 1, _keys: '1|2|', children: [{ key: 1, _level: 2, _keys: '1' }, { key: 2, _level: 2, _keys: '2' }] },
      { key: 3, _level: 1, _keys: '3' },
      { key: 4, _level: 1, _keys: '4' },
    ]

    const result = setColumnFixed({
      cloneColumns,
      cellSelectionRangeData: { leftColKey: 2, rightColKey: 2 },
      fixedType: 'left',
      colgroups: [],
      enableColumnResize: false,
    })

    expect(result.map(x => x.fixed)).toEqual(['left', undefined, undefined])
  })
})

/*
 * COL-13：分组表头的列选择（mousedown / mouseover）要使用 colgroups 中真实的列 key，
 * 不能直接使用 _keys 拆出来的字符串，否则数字列 key（包括 0）匹配不到任何列
 */
describe('header column selection with numeric keys (COL-13)', () => {
  const TABLE_DATA = [
    { rowKey: 'r1', a: 'a1', b: 'b1', c: 'c1', d: 'd1' },
    { rowKey: 'r2', a: 'a2', b: 'b2', c: 'c2', d: 'd2' },
  ]

  const COLUMNS = [
    { field: 'a', key: 'a', title: 'A' },
    {
      key: 'g',
      title: 'G',
      children: [
        { field: 'b', key: 0, title: 'B' },
        { field: 'c', key: 1, title: 'C' },
      ],
    },
    { field: 'd', key: 2, title: 'D' },
  ]

  let wrapper: any = null

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
  })

  function mountTable() {
    wrapper = mount(veTable, {
      props: {
        columns: COLUMNS,
        tableData: TABLE_DATA,
        rowKeyFieldName: 'rowKey',
      },
    })
    return wrapper.vm as any
  }

  const headerTh = (title: string) =>
    wrapper.findAll('.ve-table-header-th').find((x: any) => x.text() === title)

  const mouseup = () => wrapper.find('.ve-table-container').trigger('mouseup')

  it('clicking a group header over numeric columns selects them', async () => {
    const vm = mountTable()

    await headerTh('G').trigger('mousedown')
    await mouseup()
    await later()

    expect(vm.headerIndicatorColKeys).toMatchObject({ startColKey: 0, endColKey: 1 })
    expect(vm.cellSelectionRangeData).toMatchObject({
      leftColKey: 0,
      rightColKey: 1,
      topRowKey: 'r1',
      bottomRowKey: 'r2',
    })
  })

  it('clicking a leaf header with key 0 under a group header selects that column', async () => {
    const vm = mountTable()

    await headerTh('B').trigger('mousedown')
    await mouseup()
    await later()

    expect(vm.headerIndicatorColKeys).toMatchObject({ startColKey: 0, endColKey: 0 })
    expect(vm.cellSelectionRangeData).toMatchObject({ leftColKey: 0, rightColKey: 0 })
  })

  it('dragging from a group header to a numeric column extends the selection', async () => {
    const vm = mountTable()

    await headerTh('G').trigger('mousedown')
    await headerTh('D').trigger('mouseover', { buttons: 1 })
    await mouseup()
    await later()

    expect(vm.headerIndicatorColKeys).toMatchObject({ startColKey: 0, endColKey: 2 })
    expect(vm.cellSelectionRangeData).toMatchObject({ leftColKey: 0, rightColKey: 2 })
  })

  it('dragging from a numeric column onto a group header to its left extends the selection', async () => {
    const vm = mountTable()

    await headerTh('D').trigger('mousedown')
    await headerTh('G').trigger('mouseover', { buttons: 1 })
    await mouseup()
    await later()

    expect(vm.headerIndicatorColKeys).toMatchObject({ startColKey: 2, endColKey: 0 })
    expect(vm.cellSelectionRangeData).toMatchObject({ leftColKey: 0, rightColKey: 2 })
  })

  it('shift-clicking a group header extends from the current cell', async () => {
    const vm = mountTable()

    vm.setCellSelection({ rowKey: 'r1', colKey: 2 })
    await later()

    await headerTh('G').trigger('mousedown', { shiftKey: true })
    await mouseup()
    await later()

    expect(vm.headerIndicatorColKeys).toMatchObject({ startColKey: 2, endColKey: 0 })
    expect(vm.cellSelectionRangeData).toMatchObject({ leftColKey: 0, rightColKey: 2 })
  })
})
