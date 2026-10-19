import veTable from '@/ve-table'
import { later, wrapMount } from '@test-utils'
import { mount } from '@vue/test-utils'

describe('veTable column fixed', () => {
  const TABLE_DATA = [
    {
      col1: '1',
      col2: '2',
      col3: '3',
      col4: '4',
      col5: '5',
      col6: '6',
      col7: '7',
      col8: '8',
      col9: '9',
      col10: '10',
    },
    {
      col1: '1',
      col2: '2',
      col3: '3',
      col4: '4',
      col5: '5',
      col6: '6',
      col7: '7',
      col8: '8',
      col9: '9',
      col10: '10',
    },
    {
      col1: '1',
      col2: '2',
      col3: '3',
      col4: '4',
      col5: '5',
      col6: '6',
      col7: '7',
      col8: '8',
      col9: '9',
      col10: '10',
    },
    {
      col1: '1',
      col2: '2',
      col3: '3',
      col4: '4',
      col5: '5',
      col6: '6',
      col7: '7',
      col8: '8',
      col9: '9',
      col10: '10',
    },
    {
      col1: '1',
      col2: '2',
      col3: '3',
      col4: '4',
      col5: '5',
      col6: '6',
      col7: '7',
      col8: '8',
      col9: '9',
      col10: '10',
    },
  ]

  const COLUMNS = [
    {
      field: 'col1',
      key: 'a',
      title: 'Title1',
      fixed: 'left',
    },
    {
      field: 'col2',
      key: 'b',
      title: 'Title2',
      fixed: 'left',
    },
    {
      field: 'col3',
      key: 'c',
      title: 'Title3',
    },
    { field: 'col4', key: 'd', title: 'Title4' },
    { field: 'col5', key: 'e', title: 'Title5' },
    { field: 'col6', key: 'f', title: 'Title6' },
    {
      field: 'col7',
      key: 'g',
      title: 'Title7',
    },
    {
      field: 'col8',
      key: 'h',
      title: 'Title8',
    },
    {
      field: 'col9',
      key: 'i',
      title: 'Title9',
      fixed: 'right',
    },
    {
      field: 'col10',
      key: 'j',
      title: 'Title10',
      fixed: 'right',
    },
  ]

  // 固定列改变
  const COLUMNS_FIXED_CHANGE = [
    {
      field: 'col1',
      key: 'a',
      title: 'Title1',
      fixed: 'left',
    },
    {
      field: 'col2',
      key: 'b',
      title: 'Title2',
    },
    {
      field: 'col3',
      key: 'c',
      title: 'Title3',
    },
    { field: 'col4', key: 'd', title: 'Title4' },
    { field: 'col5', key: 'e', title: 'Title5' },
    { field: 'col6', key: 'f', title: 'Title6' },
    {
      field: 'col7',
      key: 'g',
      title: 'Title7',
    },
    {
      field: 'col8',
      key: 'h',
      title: 'Title8',
    },
    {
      field: 'col9',
      key: 'i',
      title: 'Title9',
    },
    {
      field: 'col10',
      key: 'j',
      title: 'Title10',
      fixed: 'right',
    },
  ]

  it('renders normal', () => {
    const wrapper = mount({
      render() {
        return <veTable columns={COLUMNS} tableData={TABLE_DATA} />
      },
    })

    expect(wrapper.html()).toMatchSnapshot()
  })

  it('header fixed left', async () => {
    const wrapper = mount(veTable, {
      propsData: {
        columns: COLUMNS,
        tableData: TABLE_DATA,
      },
    })

    const thEls = wrapper.findAll(
      '.ve-table-header .ve-table-header-tr .ve-table-header-th',
    )

    expect(thEls[0].classes()).toContain('ve-table-fixed-left')
    expect(thEls[1].classes()).toEqual(
      expect.arrayContaining([
        've-table-fixed-left',
        've-table-last-left-fixed-column',
      ]),
    )

    await wrapper.setProps({ columns: COLUMNS_FIXED_CHANGE })

    const thEls2 = wrapper.findAll(
      '.ve-table-header .ve-table-header-tr .ve-table-header-th',
    )

    expect(thEls2[0].classes()).toEqual(
      expect.arrayContaining([
        've-table-fixed-left',
        've-table-last-left-fixed-column',
      ]),
    )
  })

  it('header fixed right', async () => {
    const wrapper = mount(veTable, {
      propsData: {
        columns: COLUMNS,
        tableData: TABLE_DATA,
      },
    })

    const thEls = wrapper.findAll(
      '.ve-table-header .ve-table-header-tr .ve-table-header-th',
    )

    expect(thEls.at(9 - 1)!.classes()).toEqual(
      expect.arrayContaining([
        've-table-first-right-fixed-column',
        've-table-fixed-right',
      ]),
    )
    expect(thEls.at(9 - 0)!.classes()).toContain('ve-table-fixed-right')

    await wrapper.setProps({ columns: COLUMNS_FIXED_CHANGE })

    const thEls2 = wrapper.findAll(
      '.ve-table-header .ve-table-header-tr .ve-table-header-th',
    )

    expect(thEls2.at(9 - 0)!.classes()).toEqual(
      expect.arrayContaining([
        've-table-first-right-fixed-column',
        've-table-fixed-right',
      ]),
    )
  })

  it('column fixed left', async () => {
    const wrapper = mount(veTable, {
      propsData: {
        columns: COLUMNS,
        tableData: TABLE_DATA,
      },
    })

    const tdEls = wrapper
      .findAll('.ve-table-body .ve-table-body-tr')[0]
      .findAll('.ve-table-body-td')

    expect(tdEls[0].classes()).toContain('ve-table-fixed-left')
    expect(tdEls[1].classes()).toEqual(
      expect.arrayContaining([
        've-table-last-left-fixed-column',
        've-table-fixed-left',
      ]),
    )

    await wrapper.setProps({ columns: COLUMNS_FIXED_CHANGE })

    const tdEls2 = wrapper
      .findAll('.ve-table-body .ve-table-body-tr')[0]
      .findAll('.ve-table-body-td')

    expect(tdEls2[0].classes()).toEqual(
      expect.arrayContaining([
        've-table-last-left-fixed-column',
        've-table-fixed-left',
      ]),
    )
  })

  it('column fixed right', async () => {
    const wrapper = mount(veTable, {
      propsData: {
        columns: COLUMNS,
        tableData: TABLE_DATA,
      },
    })

    const tdEls = wrapper
      .findAll('.ve-table-body .ve-table-body-tr')[0]
      .findAll('.ve-table-body-td')

    expect(tdEls.at(9 - 1)!.classes()).toEqual(
      expect.arrayContaining([
        've-table-first-right-fixed-column',
        've-table-fixed-right',
      ]),
    )
    expect(tdEls.at(9 - 0)!.classes()).toContain('ve-table-fixed-right')

    await wrapper.setProps({ columns: COLUMNS_FIXED_CHANGE })

    const _tdEls2 = wrapper
      .findAll('.ve-table-body .ve-table-body-tr')[0]
      .findAll('.ve-table-body-td')

    expect(tdEls.at(9 - 0)!.classes()).toEqual(
      expect.arrayContaining([
        've-table-first-right-fixed-column',
        've-table-fixed-right',
      ]),
    )
  })
  // COL-06：固定列边界（阴影 class、选区左边框修正）按 key 判断，而不是 field
  describe('fixed edge detection by key (COL-06)', () => {
    const renderCell = ({ rowIndex }) => rowIndex
    // 两个左固定列、两个右固定列都没有 field（如复选框列、序号列、操作按钮列）
    const COLUMNS_WITHOUT_FIELD = [
      { key: 'l1', title: 'L1', width: 50, fixed: 'left', renderBodyCell: renderCell },
      { key: 'l2', title: 'L2', width: 50, fixed: 'left', renderBodyCell: renderCell },
      { field: 'col3', key: 'c', title: 'Title3', width: 100 },
      { field: 'col4', key: 'd', title: 'Title4', width: 100 },
      { key: 'r1', title: 'R1', width: 50, fixed: 'right', renderBodyCell: renderCell },
      { key: 'r2', title: 'R2', width: 50, fixed: 'right', renderBodyCell: renderCell },
    ]

    const getEdgeClasses = (tdEls: any[]) =>
      tdEls.map(td => ({
        lastLeft: td.classes().includes('ve-table-last-left-fixed-column'),
        firstRight: td.classes().includes('ve-table-first-right-fixed-column'),
      }))

    const EXPECTED_EDGES = [
      { lastLeft: false, firstRight: false },
      { lastLeft: true, firstRight: false },
      { lastLeft: false, firstRight: false },
      { lastLeft: false, firstRight: false },
      { lastLeft: false, firstRight: true },
      { lastLeft: false, firstRight: false },
    ]

    it('body cells of fixed columns without field', () => {
      const wrapper = mount(veTable, {
        props: {
          columns: COLUMNS_WITHOUT_FIELD,
          tableData: TABLE_DATA,
        },
      })

      const tdEls = wrapper
        .findAll('.ve-table-body .ve-table-body-tr')[0]
        .findAll('.ve-table-body-td')

      expect(getEdgeClasses(tdEls)).toEqual(EXPECTED_EDGES)
    })

    it('footer cells of fixed columns without field', () => {
      const wrapper = mount(veTable, {
        props: {
          columns: COLUMNS_WITHOUT_FIELD,
          tableData: TABLE_DATA,
          footerData: [{ col3: 'sum', col4: 'sum', rowKey: 'f1' }],
          rowKeyFieldName: 'rowKey',
        },
      })

      const tdEls = wrapper
        .findAll('.ve-table-footer .ve-table-footer-tr')[0]
        .findAll('.ve-table-footer-td')

      expect(getEdgeClasses(tdEls)).toEqual(EXPECTED_EDGES)
    })

    it('selection treats the first not-fixed column by key when key differs from field', async () => {
      const wrapper = wrapMount(veTable, {
        props: {
          columns: [
            { field: 'col1', key: 'k1', title: 'Title1', width: 100, fixed: 'left' },
            { field: 'col2', key: 'k2', title: 'Title2', width: 100 },
            { field: 'col3', key: 'k3', title: 'Title3', width: 100 },
          ],
          tableData: TABLE_DATA.map((row, index) => ({ ...row, rowKey: index })),
          rowKeyFieldName: 'rowKey',
        },
      })
      await later()

      ;(wrapper.vm as any).setCellSelection({ rowKey: 1, colKey: 'k2' })
      await later()

      const selection = wrapper.findComponent({ name: 'VeTableSelection' }).vm as any
      expect(selection.isFirstNotFixedSelectionCol).toBe(true)

      ;(wrapper.vm as any).setCellSelection({ rowKey: 1, colKey: 'k3' })
      await later()
      expect(selection.isFirstNotFixedSelectionCol).toBe(false)

      wrapper.unmount()
    })
  })
})
