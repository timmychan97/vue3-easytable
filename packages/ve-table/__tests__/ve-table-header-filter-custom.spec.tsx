import veTable from '@/ve-table'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

describe('veTable header filter custom', () => {
  const TABLE_DATA = [
    { name: 'John', date: '1900-05-20', hobby: 'coding', address: 'Shanghai', rowkey: 0 },
    { name: 'Dickerson', date: '1910-06-20', hobby: 'coding', address: 'Beijing', rowkey: 1 },
    { name: 'Larsen', date: '2000-07-20', hobby: 'coding', address: 'Chongqing', rowkey: 2 },
  ]

  afterEach(() => {
    document.querySelectorAll('.ve-dropdown-popper').forEach(el => el.remove())
  })

  it('renders custom filter icon', () => {
    const wrapper = mount(veTable, {
      props: {
        columns: [
          {
            field: 'name',
            key: 'a',
            title: 'Name',
            align: 'left',
            width: '15%',
            filterCustom: {
              defaultVisible: false,
              render: ({ _showFn, _closeFn }, _h) => <div class="custom-filter">custom</div>,
              filterIcon: _h => <span class="my-filter-icon">F</span>,
            },
          },
          { field: 'date', key: 'b', title: 'Date', align: 'left', width: '15%' },
        ],
        tableData: TABLE_DATA,
        rowKeyFieldName: 'rowkey',
      },
    })

    // 自定义过滤图标应该渲染
    expect(wrapper.find('.my-filter-icon').exists()).toBe(true)
    expect(wrapper.find('.my-filter-icon').text()).toBe('F')

    // 过滤图标容器应该存在
    expect(wrapper.find('.ve-table-filter-icon').exists()).toBe(true)

    wrapper.unmount()
  })

  it('renders default filter icon when no custom filterIcon', () => {
    const wrapper = mount(veTable, {
      props: {
        columns: [
          {
            field: 'name',
            key: 'a',
            title: 'Name',
            align: 'left',
            width: '15%',
            filterCustom: {
              defaultVisible: false,
              render: ({ _showFn, _closeFn }, _h) => <div class="custom-filter">custom</div>,
            },
          },
          { field: 'date', key: 'b', title: 'Date', align: 'left', width: '15%' },
        ],
        tableData: TABLE_DATA,
        rowKeyFieldName: 'rowkey',
      },
    })

    // 默认过滤图标应该渲染
    expect(wrapper.find('.icon-vet-filter').exists()).toBe(true)

    wrapper.unmount()
  })

  it('beforeVisibleChange callback is called on filter icon click', async () => {
    const mockBeforeVisibleChange = vi.fn()

    const wrapper = mount(veTable, {
      props: {
        columns: [
          {
            field: 'name',
            key: 'a',
            title: 'Name',
            align: 'left',
            width: '15%',
            filterCustom: {
              defaultVisible: false,
              beforeVisibleChange: ({ nextVisible }) => {
                mockBeforeVisibleChange({ nextVisible })
              },
              render: ({ _showFn, _closeFn }, _h) => <div class="custom-filter">custom</div>,
            },
          },
          { field: 'date', key: 'b', title: 'Date', align: 'left', width: '15%' },
        ],
        tableData: TABLE_DATA,
        rowKeyFieldName: 'rowkey',
      },
    })

    wrapper.find('.ve-table-filter-icon').trigger('click')
    await nextTick()
    await nextTick()

    expect(mockBeforeVisibleChange).toHaveBeenCalledWith({ nextVisible: true })

    wrapper.unmount()
  })

  it('only renders filterCustom on columns that have it', () => {
    const wrapper = mount(veTable, {
      props: {
        columns: [
          {
            field: 'name',
            key: 'a',
            title: 'Name',
            align: 'left',
            width: '15%',
            filterCustom: {
              defaultVisible: false,
              render: ({ _showFn, _closeFn }, _h) => <div class="custom-filter">custom</div>,
            },
          },
          { field: 'date', key: 'b', title: 'Date', align: 'left', width: '30%' },
          { field: 'hobby', key: 'c', title: 'Hobby', align: 'left', width: '30%' },
        ],
        tableData: TABLE_DATA,
        rowKeyFieldName: 'rowkey',
      },
    })

    // 只有第一列有过滤图标
    const filterIcons = wrapper.findAll('.ve-table-filter-icon')
    expect(filterIcons.length).toBe(1)

    wrapper.unmount()
  })
})
