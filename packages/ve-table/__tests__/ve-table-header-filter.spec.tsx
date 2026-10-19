import type { ColumnOption } from '@/ve-table/src/ve-table-types'
import veTable from '@/ve-table'
import { later } from '@test-utils'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'

interface FilterItem {
  value: number
  label: string
  selected: boolean
}

describe('veTable header filter', () => {
  const TABLE_DATA = [
    {
      name: 'John',
      date: '1900-05-20',
      hobby: 'coding and coding repeat',
      address: 'No.1 Century Avenue, Shanghai',
      rowkey: 0,
    },
    {
      name: 'Dickerson',
      date: '1910-06-20',
      hobby: 'coding and coding repeat',
      address: 'No.1 Century Avenue, Beijing',
      rowkey: 1,
    },
    {
      name: 'Larsen',
      date: '2000-07-20',
      hobby: 'coding and coding repeat',
      address: 'No.1 Century Avenue, Chongqing',
      rowkey: 2,
    },
    {
      name: 'Geneva',
      date: '2010-08-20',
      hobby: 'coding and coding repeat',
      address: 'No.1 Century Avenue, Xiamen',
      rowkey: 3,
    },
    {
      name: 'Jami',
      date: '2020-09-20',
      hobby: 'coding and coding repeat',
      address: 'No.1 Century Avenue, Shenzhen',
      rowkey: 4,
    },
  ]

  const mockFilterFn = vi.fn()
  const mockBeforeVisibleChangeFn = vi.fn()

  beforeEach(() => {
    mockFilterFn.mockClear()
    mockBeforeVisibleChangeFn.mockClear()
  })

  // filter single
  const TABLE_COLUMNS_FILTER_SINGLE: ColumnOption[] = [
    {
      field: 'name',
      key: 'a',
      title: 'Name',
      align: 'left',
      width: '15%',
    },
    {
      field: 'date',
      key: 'b',
      title: 'Date',
      align: 'left',
      width: '15%',
      // filter
      filter: {
        beforeVisibleChange: ({ nextVisible }: { nextVisible: boolean }) => {
          mockBeforeVisibleChangeFn({ nextVisible })
        },
        filterList: [
          { value: 0, label: '1900-05-20', selected: false },
          { value: 1, label: '1910-06-20', selected: false },
          { value: 2, label: '2000-07-20', selected: false },
          { value: 3, label: '2010-08-20', selected: false },
          { value: 4, label: '2020-09-20', selected: false },
        ],
        // filter confirm hook
        filterConfirm: (filterList: FilterItem[]) => {
          mockFilterFn(filterList)
        },
        // filter reset hook
        filterReset: (filterList: FilterItem[]) => {
          mockFilterFn(filterList)
        },
      },
    },
    {
      field: 'hobby',
      key: 'c',
      title: 'Hobby',
      align: 'center',
      width: '30%',
    },
    {
      field: 'address',
      key: 'd',
      title: 'Address',
      align: 'left',
      width: '40%',
    },
  ]

  // filter multiple
  const TABLE_COLUMNS_FILTER_MULTIPLE: ColumnOption[] = [
    {
      field: 'name',
      key: 'a',
      title: 'Name',
      align: 'left',
      width: '15%',
      // filter
      filter: {
        filterList: [
          { value: 0, label: 'John', selected: true },
          { value: 1, label: 'Dickerson', selected: false },
          { value: 2, label: 'Larsen', selected: false },
          { value: 3, label: 'Geneva', selected: false },
          { value: 4, label: 'Jami', selected: false },
        ],
        isMultiple: true,
        // filter confirm hook
        filterConfirm: (filterList: FilterItem[]) => {
          mockFilterFn(filterList)
        },
        // filter reset hook
        filterReset: (filterList: FilterItem[]) => {
          mockFilterFn(filterList)
        },
        // max height
        maxHeight: 120,
      },
    },
    {
      field: 'date',
      key: 'b',
      title: 'Date',
      align: 'left',
      width: '15%',
    },
    {
      field: 'hobby',
      key: 'c',
      title: 'Hobby',
      align: 'center',
      width: '30%',
    },
    {
      field: 'address',
      key: 'd',
      title: 'Address',
      align: 'left',
      width: '40%',
    },
  ]

  // filter custom icon
  const TABLE_COLUMNS_CUSTOM_ICON: ColumnOption[] = [
    {
      field: 'name',
      key: 'a',
      title: 'Name',
      align: 'left',
      width: '15%',
    },
    {
      field: 'date',
      key: 'b',
      title: 'Date',
      align: 'left',
      width: '15%',
      // filter
      filter: {
        filterList: [
          { value: 0, label: '1900-05-20', selected: false },
          { value: 1, label: '1910-06-20', selected: false },
          { value: 2, label: '2000-07-20', selected: false },
          { value: 3, label: '2010-08-20', selected: false },
          { value: 4, label: '2020-09-20', selected: false },
        ],
        // filter confirm hook
        filterConfirm: (_filterList: FilterItem[]) => {
          // snapshot test only — callback not asserted
        },
        // filter reset hook
        filterReset: (_filterList: FilterItem[]) => {
          // reset
        },
        // custom filter icon
        filterIcon: (_h: unknown) => {
          return <veIcon name="search" />
        },
      },
    },
    {
      field: 'hobby',
      key: 'c',
      title: 'Hobby',
      align: 'center',
      width: '30%',
    },
    {
      field: 'address',
      key: 'd',
      title: 'Address',
      align: 'left',
      width: '40%',
    },
  ]

  it('render single filter', () => {
    const wrapper = mount(veTable, {
      props: {
        columns: TABLE_COLUMNS_FILTER_SINGLE,
        tableData: TABLE_DATA,
        rowKeyFieldName: 'rowkey',
      },
    })

    expect(wrapper.html()).toMatchSnapshot()
  })

  it('render multiple filter', () => {
    const wrapper = mount(veTable, {
      props: {
        columns: TABLE_COLUMNS_FILTER_MULTIPLE,
        tableData: TABLE_DATA,
        rowKeyFieldName: 'rowkey',
      },
    })

    expect(wrapper.html()).toMatchSnapshot()
  })

  it('render filter custom icon', () => {
    const wrapper = mount(veTable, {
      props: {
        columns: TABLE_COLUMNS_CUSTOM_ICON,
        tableData: TABLE_DATA,
        rowKeyFieldName: 'rowkey',
      },
    })

    expect(wrapper.html()).toMatchSnapshot()
  })

  it('single filter', async () => {
    const wrapper = mount(veTable, {
      props: {
        columns: TABLE_COLUMNS_FILTER_SINGLE,
        tableData: TABLE_DATA,
        rowKeyFieldName: 'rowkey',
      },
    })

    const callBackConfirmData = [
      { value: 0, label: '1900-05-20', selected: true },
      { value: 1, label: '1910-06-20', selected: false },
      { value: 2, label: '2000-07-20', selected: false },
      { value: 3, label: '2010-08-20', selected: false },
      { value: 4, label: '2020-09-20', selected: false },
    ]

    const callBackResetData = [
      { value: 0, label: '1900-05-20', selected: false },
      { value: 1, label: '1910-06-20', selected: false },
      { value: 2, label: '2000-07-20', selected: false },
      { value: 3, label: '2010-08-20', selected: false },
      { value: 4, label: '2020-09-20', selected: false },
    ]

    // 改变选项
    wrapper.findAll('.ve-dropdown-items-li')[0].trigger('click')

    await later()

    // confirm btn click
    wrapper.findAll('.ve-dropdown-operation-item')[1].trigger('click')

    await later()

    expect(mockFilterFn).toBeCalled()
    expect(mockFilterFn).toHaveBeenCalledWith(callBackConfirmData)

    // reset btn click
    wrapper.findAll('.ve-dropdown-operation-item')[0].trigger('click')

    await later()

    expect(mockFilterFn).toBeCalled()
    expect(mockFilterFn).toHaveBeenCalledWith(callBackResetData)
  })

  it('multiple filter', async () => {
    const wrapper = mount(veTable, {
      props: {
        columns: TABLE_COLUMNS_FILTER_MULTIPLE,
        tableData: TABLE_DATA,
        rowKeyFieldName: 'rowkey',
      },
    })

    const callBackConfirmData = [
      { value: 0, label: 'John', selected: true },
      { value: 1, label: 'Dickerson', selected: true },
      { value: 2, label: 'Larsen', selected: false },
      { value: 3, label: 'Geneva', selected: false },
      { value: 4, label: 'Jami', selected: false },
    ]

    const callBackResetData = [
      { value: 0, label: 'John', selected: false },
      { value: 1, label: 'Dickerson', selected: false },
      { value: 2, label: 'Larsen', selected: false },
      { value: 3, label: 'Geneva', selected: false },
      { value: 4, label: 'Jami', selected: false },
    ]

    // 改变选项 - click the input inside the second checkbox to trigger change
    const checkboxInput = wrapper.findAll('.ve-checkbox-input')[1];
    (checkboxInput.element as HTMLInputElement).checked = true
    checkboxInput.trigger('change')

    await later()

    // confirm btn click
    wrapper.findAll('.ve-dropdown-operation-item')[1].trigger('click')

    await later()

    expect(mockFilterFn).toBeCalled()
    expect(mockFilterFn).toHaveBeenCalledWith(callBackConfirmData)

    // reset btn click
    wrapper.findAll('.ve-dropdown-operation-item')[0].trigger('click')

    await later()

    expect(mockFilterFn).toBeCalled()
    expect(mockFilterFn).toHaveBeenCalledWith(callBackResetData)
  })

  it('beforeVisibleChange callback method', async () => {
    const wrapper = mount(defineComponent({
      render() {
        return (
          <ve-table
            columns={this.columns}
            tableData={this.tableData}
          />
        )
      },
      data() {
        return {
          columns: TABLE_COLUMNS_FILTER_SINGLE,
          tableData: TABLE_DATA,
        }
      },
    }))

    // icon-vet-filter
    wrapper.find('.icon-vet-filter').trigger('click')
    await later()

    expect(mockBeforeVisibleChangeFn).toBeCalled()
    expect(mockBeforeVisibleChangeFn).toHaveBeenCalledWith({
      nextVisible: true,
    })

    // 打开后下拉框由 <Teleport> 渲染到 body，不在组件自身的 DOM 中
    // 改变选项
    ;(document.querySelectorAll('.ve-dropdown-popper .ve-dropdown-items-li')[0] as HTMLElement).click()

    await later()

    // confirm btn click
    ;(document.querySelectorAll('.ve-dropdown-popper .ve-dropdown-operation-item')[1] as HTMLElement).click()

    await later()

    expect(mockBeforeVisibleChangeFn).toBeCalled()
    expect(mockBeforeVisibleChangeFn).toHaveBeenCalledWith({
      nextVisible: false,
    })
  })

  // DD-07：未确认的勾选在关闭后不能保留到下次打开
  describe('unconfirmed changes are dropped on close (DD-07)', () => {
    async function mountTable(columns: any[]) {
      const wrapper = mount(veTable, {
        props: { columns, tableData: TABLE_DATA, rowKeyFieldName: 'rowkey' },
        attachTo: document.body,
      })
      await later()
      return wrapper
    }

    // 打开的下拉框（已移到 body 中）
    const popper = () => document.querySelector('.ve-dropdown-popper')!

    async function toggleFilter(wrapper: any) {
      wrapper.find('.ve-table-filter-icon').trigger('click')
      await later()
    }

    async function clickOutside() {
      document.body.click()
      await later()
    }

    const checkedLabels = () => [...popper().querySelectorAll('.ve-checkbox')]
      .filter(el => el.querySelector('.ve-checkbox-checked'))
      .map(el => el.textContent)
    const activeLabels = () => [...popper().querySelectorAll('.ve-dropdown-items-li.active')]
      .map(el => el.textContent)

    it('a ticked checkbox is not shown again after closing without confirming', async () => {
      const wrapper = await mountTable(TABLE_COLUMNS_FILTER_MULTIPLE)

      await toggleFilter(wrapper)
      expect(checkedLabels()).toEqual(['John'])
      ;(popper().querySelectorAll('.ve-checkbox')[1] as HTMLElement).click()
      await later()
      expect(checkedLabels()).toEqual(['John', 'Dickerson'])

      await clickOutside()
      await toggleFilter(wrapper)

      expect(checkedLabels()).toEqual(['John'])
      expect(mockFilterFn).not.toHaveBeenCalled()
      wrapper.unmount()
    })

    it('a clicked single-select item is not shown again after closing without confirming', async () => {
      const wrapper = await mountTable(TABLE_COLUMNS_FILTER_SINGLE)

      await toggleFilter(wrapper)
      ;(popper().querySelectorAll('.ve-dropdown-items-li')[2] as HTMLElement).click()
      await later()
      expect(activeLabels()).toEqual(['2000-07-20'])

      await clickOutside()
      await toggleFilter(wrapper)

      expect(activeLabels()).toEqual([])
      expect(mockFilterFn).not.toHaveBeenCalled()
      wrapper.unmount()
    })

    it('a confirmed selection is still shown after reopening', async () => {
      const wrapper = await mountTable(TABLE_COLUMNS_FILTER_MULTIPLE)

      await toggleFilter(wrapper)
      ;(popper().querySelectorAll('.ve-checkbox')[1] as HTMLElement).click()
      await later()
      ;(popper().querySelectorAll('.ve-dropdown-operation-item')[1] as HTMLElement).click()
      await later()
      expect(mockFilterFn).toHaveBeenCalledTimes(1)

      await toggleFilter(wrapper)
      expect(checkedLabels()).toEqual(['John', 'Dickerson'])

      // 再改动但不确认：回到上次确认的状态
      ;(popper().querySelectorAll('.ve-checkbox')[0] as HTMLElement).click()
      await later()
      await clickOutside()
      await toggleFilter(wrapper)
      expect(checkedLabels()).toEqual(['John', 'Dickerson'])
      wrapper.unmount()
    })
  })
})
