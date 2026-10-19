import type { ColumnOption } from '@/ve-table/src/ve-table-types'
import veTable from '@/ve-table'
import { later } from '@test-utils'
import { mount } from '@vue/test-utils'

describe('veTable header sort', () => {
  const TABLE_DATA = [
    {
      name: 'John',
      age: 25,
      weight: 66,
      hobby: 'coding and coding repeat',
      address: 'No.1 Century Avenue, Shanghai',
    },
    {
      name: 'Dickerson',
      age: 20,
      weight: 70,
      hobby: 'coding and coding repeat',
      address: 'No.1 Century Avenue, Beijing',
    },
    {
      name: 'Larsen',
      age: 18,
      weight: 65,
      hobby: 'coding and coding repeat',
      address: 'No.1 Century Avenue, Chongqing',
    },
    {
      name: 'Geneva',
      age: 17,
      weight: 80,
      hobby: 'coding and coding repeat',
      address: 'No.1 Century Avenue, Xiamen',
    },
    {
      name: 'Jami',
      age: 26,
      weight: 72,
      hobby: 'coding and coding repeat',
      address: 'No.1 Century Avenue, Shenzhen',
    },
  ]

  it('render single field sort', () => {
    const columns: ColumnOption[] = [
      {
        field: 'name',
        key: 'a',
        title: 'Name',
        align: 'left',
      },
      {
        field: 'age',
        key: 'b',
        title: 'Age',
        align: 'center',
        sortBy: '',
      },
      {
        field: 'weight',
        key: 'c',
        title: 'Weight(kg)',
        align: 'center',
        sortBy: 'asc',
      },
      {
        field: 'hobby',
        key: 'd',
        title: 'Hobby',
        align: 'center',
      },
      { field: 'address', key: 'e', title: 'Address', align: 'left' },
    ]

    const wrapper = mount({
      render() {
        return (
          <veTable
            sortOption={(this as any).sortOption}
            columns={(this as any).columns}
            tableData={(this as any).tableData}
            rowKeyFieldName="rowkey"
          />
        )
      },
      data() {
        return {
          columns,
          tableData: TABLE_DATA,
          sortOption: {
            sortChange: (_params) => {},
          },
        }
      },
    })

    expect(wrapper.html()).toMatchSnapshot()
  })

  it('render multiple field sort', () => {
    const columns: ColumnOption[] = [
      {
        field: 'name',
        key: 'a',
        title: 'Name',
        align: 'left',
      },
      {
        field: 'age',
        key: 'b',
        title: 'Age',
        align: 'center',
        sortBy: '',
      },
      {
        field: 'weight',
        key: 'c',
        title: 'Weight(kg)',
        align: 'center',
        sortBy: 'asc',
      },
      {
        field: 'hobby',
        key: 'd',
        title: 'Hobby',
        align: 'center',
      },
      { field: 'address', key: 'e', title: 'Address', align: 'left' },
    ]

    const wrapper = mount({
      render() {
        return (
          <veTable
            sortOption={(this as any).sortOption}
            columns={(this as any).columns}
            tableData={(this as any).tableData}
            rowKeyFieldName="rowkey"
          />
        )
      },
      data() {
        return {
          columns,
          tableData: TABLE_DATA,
          sortOption: {
            multipleSort: true,
            sortChange: (_params) => {},
          },
        }
      },
    })

    expect(wrapper.html()).toMatchSnapshot()
  })

  it('single field sort', async () => {
    const columns: ColumnOption[] = [
      {
        field: 'name',
        key: 'a',
        title: 'Name',
        align: 'left',
        fixed: 'left', // combine with column fixed issue #454
      },
      {
        field: 'age',
        key: 'b',
        title: 'Age',
        align: 'center',
        sortBy: '',
      },
      {
        field: 'weight',
        key: 'c',
        title: 'Weight(kg)',
        align: 'center',
        sortBy: 'asc',
      },
      {
        field: 'hobby',
        key: 'd',
        title: 'Hobby',
        align: 'center',
      },
      { field: 'address', key: 'e', title: 'Address', align: 'left' },
    ]

    const mockFn = vi.fn()
    const callBackData = {
      age: 'asc',
      weight: '',
    }

    const wrapper = mount(veTable, {
      props: {
        columns,
        tableData: TABLE_DATA,
        sortOption: {
          sortChange: (params) => {
            mockFn(params)
          },
        },
        rowKeyFieldName: 'rowkey',
      },
    })

    const thEls = wrapper.findAll('.ve-table-header-tr th')
    expect(thEls[1].find('.ve-table-sort').exists()).toBe(true)

    expect(
      thEls[2]
        .findAll('.ve-table-sort .ve-table-sort-icon')[0]
        .classes(),
    ).toContain('active')

    thEls[1].find('.ve-table-sort').trigger('click')

    await later()

    expect(mockFn).toBeCalled()
    expect(mockFn).toHaveBeenCalledWith(callBackData)

    // 只能单个字段排序
    // COL-08：排序状态只保存在表头，colgroups[].sortBy 保持配置值，因此这里检查表头图标
    expect(
      wrapper.findAll('.ve-table-sort .ve-table-sort-icon.active').length,
    ).toBe(1)

    // COL-08：点击排序不再改写 colgroups[].sortBy（之前写成 age: 'asc'、weight: ''），保持列配置
    expect(wrapper.vm.colgroups).toEqual([
      {
        _colspan: 1,
        _keys: 'a',
        _level: 1,
        _realTimeWidth: undefined,
        _rowspan: 1,
        align: 'left',
        field: 'name',
        fixed: 'left',
        key: 'a',
        title: 'Name',
      },
      {
        _colspan: 1,
        _keys: 'b',
        _level: 1,
        _realTimeWidth: undefined,
        _rowspan: 1,
        align: 'center',
        field: 'age',
        key: 'b',
        sortBy: '',
        title: 'Age',
      },
      {
        _colspan: 1,
        _keys: 'c',
        _level: 1,
        _realTimeWidth: undefined,
        _rowspan: 1,
        align: 'center',
        field: 'weight',
        key: 'c',
        sortBy: 'asc',
        title: 'Weight(kg)',
      },
      {
        _colspan: 1,
        _keys: 'd',
        _level: 1,
        _realTimeWidth: undefined,
        _rowspan: 1,
        align: 'center',
        field: 'hobby',
        key: 'd',
        title: 'Hobby',
      },
      {
        _colspan: 1,
        _keys: 'e',
        _level: 1,
        _realTimeWidth: undefined,
        _rowspan: 1,
        align: 'left',
        field: 'address',
        key: 'e',
        title: 'Address',
      },
    ])

    expect(
      thEls[1]
        .findAll('.ve-table-sort .ve-table-sort-icon')[0]
        .classes(),
    ).toContain('active')
  })

  it('multiple field sort', async () => {
    const columns: ColumnOption[] = [
      {
        field: 'name',
        key: 'a',
        title: 'Name',
        align: 'left',
      },
      {
        field: 'age',
        key: 'b',
        title: 'Age',
        align: 'center',
        sortBy: '',
      },
      {
        field: 'weight',
        key: 'c',
        title: 'Weight(kg)',
        align: 'center',
        sortBy: 'asc',
      },
      {
        field: 'hobby',
        key: 'd',
        title: 'Hobby',
        align: 'center',
      },
      { field: 'address', key: 'e', title: 'Address', align: 'left' },
    ]

    const mockFn = vi.fn()
    const callBackData = {
      age: 'asc',
      weight: 'asc',
    }

    const wrapper = mount(veTable, {
      props: {
        columns,
        tableData: TABLE_DATA,
        sortOption: {
          multipleSort: true,
          sortChange: (params) => {
            mockFn(params)
          },
        },
        rowKeyFieldName: 'rowkey',
      },
    })

    const thEls = wrapper.findAll('.ve-table-header-tr th')
    expect(thEls[1].find('.ve-table-sort').exists()).toBe(true)

    expect(
      thEls[2]
        .findAll('.ve-table-sort .ve-table-sort-icon')[0]
        .classes(),
    ).toContain('active')

    thEls[1].find('.ve-table-sort').trigger('click')

    await later()

    expect(mockFn).toBeCalled()
    expect(mockFn).toHaveBeenCalledWith(callBackData)

    expect(
      wrapper.findAll('.ve-table-sort .ve-table-sort-icon.active').length,
    ).toBe(2)

    // 多个字段排序（COL-08：colgroups[].sortBy 保持配置值，排序状态见上面的表头图标）
    expect((wrapper.vm as any).colgroups.filter((x: any) => x.sortBy).length).toEqual(1)
  })

  it('sort always', async () => {
    const columns: ColumnOption[] = [
      {
        field: 'name',
        key: 'a',
        title: 'Name',
        align: 'left',
      },
      {
        field: 'age',
        key: 'b',
        title: 'Age',
        align: 'center',
        sortBy: '',
      },
      {
        field: 'weight',
        key: 'c',
        title: 'Weight(kg)',
        align: 'center',
        sortBy: 'asc',
      },
      {
        field: 'hobby',
        key: 'd',
        title: 'Hobby',
        align: 'center',
      },
      { field: 'address', key: 'e', title: 'Address', align: 'left' },
    ]

    const mockFn = vi.fn()

    const wrapper = mount(veTable, {
      props: {
        columns,
        tableData: TABLE_DATA,
        sortOption: {
          sortAlways: true,
          sortChange: (params) => {
            mockFn(params)
          },
        },
        rowKeyFieldName: 'rowkey',
      },
    })

    const thEls = wrapper.findAll('.ve-table-header-tr th')

    thEls[1].find('.ve-table-sort').trigger('click')

    await later()

    expect(mockFn).toHaveBeenCalledWith({
      age: 'asc',
      weight: '',
    })

    thEls[1].find('.ve-table-sort').trigger('click')

    await later()

    expect(mockFn).toHaveBeenCalledWith({
      age: 'desc',
      weight: '',
    })
  })

  // COL-12：排序状态按列 key 保存；同一个 field 的多列、没有 field 的列各自排序
  describe('sort state by column key (COL-12)', () => {
    function mountSort(columns: any[], sortOption: Record<string, any> = {}) {
      return mount(veTable, {
        props: {
          columns,
          tableData: TABLE_DATA,
          sortOption,
          rowKeyFieldName: 'name',
        },
      })
    }

    // 每个可排序表头单元格的状态：'asc' | 'desc' | ''
    function sortStates(wrapper: any) {
      return wrapper.findAll('.ve-table-header-th')
        .filter((th: any) => th.find('.ve-table-sort').exists())
        .map((th: any) => {
          if (th.find('.ve-table-sort-icon-top').classes().includes('active'))
            return 'asc'
          if (th.find('.ve-table-sort-icon-bottom').classes().includes('active'))
            return 'desc'
          return ''
        })
    }

    async function clickSort(wrapper: any, index: number) {
      await wrapper.findAll('.ve-table-sort')[index].trigger('click')
      await later()
    }

    it('two columns with the same field sort independently', async () => {
      const sortChange = vi.fn()
      const wrapper = mountSort([
        { field: 'name', key: 'a', title: 'Name' },
        { field: 'age', key: 'b', title: 'Age', sortBy: '' },
        { field: 'age', key: 'c', title: 'Age again', sortBy: '' },
      ], { sortChange })

      await clickSort(wrapper, 0)

      expect(sortStates(wrapper)).toEqual(['asc', ''])
      // payload 仍按 field：同一个 field 取有排序方向的列
      expect(sortChange).toHaveBeenLastCalledWith({ age: 'asc' })

      await clickSort(wrapper, 1)

      // 单列排序：点击另一列会清除前一列
      expect(sortStates(wrapper)).toEqual(['', 'asc'])
      expect(sortChange).toHaveBeenLastCalledWith({ age: 'asc' })

      wrapper.unmount()
    })

    it('the configured sortBy of columns with the same field is kept per column', () => {
      const wrapper = mountSort([
        { field: 'age', key: 'b', title: 'Age', sortBy: 'asc' },
        { field: 'age', key: 'c', title: 'Age again', sortBy: '' },
      ])

      expect(sortStates(wrapper)).toEqual(['asc', ''])

      wrapper.unmount()
    })

    it('columns without field sort independently', async () => {
      const renderBodyCell = ({ rowIndex }: { rowIndex: number }) => rowIndex
      const wrapper = mountSort([
        { key: 'x', title: 'X', sortBy: '', renderBodyCell },
        { key: 'y', title: 'Y', sortBy: '', renderBodyCell },
      ], { multipleSort: true })

      await clickSort(wrapper, 0)
      expect(sortStates(wrapper)).toEqual(['asc', ''])

      await clickSort(wrapper, 1)
      await clickSort(wrapper, 1)
      expect(sortStates(wrapper)).toEqual(['asc', 'desc'])

      wrapper.unmount()
    })

    it('numeric column keys work', async () => {
      const sortChange = vi.fn()
      const wrapper = mountSort([
        { field: 'age', key: 1, title: 'Age', sortBy: '' },
        { field: 'weight', key: 2, title: 'Weight', sortBy: 'desc' },
      ], { sortChange })

      expect(sortStates(wrapper)).toEqual(['', 'desc'])

      await clickSort(wrapper, 0)

      expect(sortStates(wrapper)).toEqual(['asc', ''])
      expect(sortChange).toHaveBeenLastCalledWith({ age: 'asc', weight: '' })

      wrapper.unmount()
    })
  })
})
