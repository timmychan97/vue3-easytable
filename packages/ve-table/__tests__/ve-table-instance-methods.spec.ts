import type { ColumnOption } from '@/ve-table/src/ve-table-types'
import veTable from '@/ve-table'
import { later, mockScrollTo } from '@test-utils'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { INSTANCE_METHODS } from '../src/util/constant'

describe('veTable instance methods', () => {
  const TABLE_DATA = [
    {
      rowkey: 0,
      name: 'John',
      date: '1900-05-20',
      hobby: 'coding and coding repeat',
      address: 'No.1 Century Avenue, Shanghai',
    },
    {
      rowkey: 1,
      name: 'Dickerson',
      date: '1910-06-20',
      hobby: 'coding and coding repeat',
      address: 'No.1 Century Avenue, Beijing',
    },
    {
      rowkey: 2,
      name: 'Larsen',
      date: '2000-07-20',
      hobby: 'coding and coding repeat',
      address: 'No.1 Century Avenue, Chongqing',
    },
    {
      rowkey: 3,
      name: 'Geneva',
      date: '2010-08-20',
      hobby: 'coding and coding repeat',
      address: 'No.1 Century Avenue, Xiamen',
    },
    {
      rowkey: 4,
      name: 'Jami',
      date: '2020-09-20',
      hobby: 'coding and coding repeat',
      address: 'No.1 Century Avenue, Shenzhen',
    },
  ]

  const COLUMNS: ColumnOption[] = [
    {
      field: 'name',
      key: 'a',
      title: 'Name',
      align: 'center',
    },
    {
      field: 'date',
      key: 'b',
      title: 'Date',
      align: 'left',
    },
    {
      field: 'hobby',
      key: 'c',
      title: 'Hobby',
      align: 'right',
    },
    { field: 'address', key: 'd', title: 'Address' },
  ]

  it('scrollTo method', async () => {
    const wrapper = mount(veTable, {
      propsData: {
        columns: COLUMNS,
        tableData: TABLE_DATA,
        maxHeight: 50,
      },
    })

    await later()

    const scrollToFn = mockScrollTo()

    const option = { top: 100 }

    ;(wrapper.vm as any).scrollTo(option)

    expect(scrollToFn).toBeCalled()
    expect(scrollToFn).toHaveBeenCalledWith(option)
  })

  it('scrollToRowKey method', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const wrapper = mount(veTable, {
      propsData: {
        columns: COLUMNS,
        tableData: TABLE_DATA,
        maxHeight: 50,
        rowKeyFieldName: 'rowkey',
      },
    })

    await later()

    const scrollToFn = mockScrollTo()

    ;(wrapper.vm as any).scrollToRowKey({ rowKey: '' })
    expect(warnSpy).toBeCalledWith(`Row key can't be empty!`)

    ;(wrapper.vm as any).scrollToRowKey({ rowKey: 2 })
    expect(scrollToFn).toBeCalled()

    warnSpy.mockRestore()
  })

  // SEL-14：列 key 为 0 时也能滚动到该列
  it('scrollToColKey method accepts colKey 0 (SEL-14)', async () => {
    const wrapper = mount(veTable, {
      propsData: {
        columns: [
          { field: 'name', key: 'a', title: 'Name', width: 100 },
          { field: 'date', key: 0, title: 'Date', width: 100 },
          { field: 'hobby', key: 'c', title: 'Hobby', width: 100 },
          { field: 'address', key: 'd', title: 'Address', width: 100 },
        ],
        tableData: TABLE_DATA,
        rowKeyFieldName: 'rowkey',
      },
    })

    await later()

    const vm = wrapper.vm as any
    // jsdom 没有布局：模拟出现横向滚动条，且已滚动到最右侧
    vm.hasXScrollBar = true
    const containerEl = wrapper.find('.ve-table-container').element as HTMLElement
    Object.defineProperty(containerEl, 'scrollWidth', { configurable: true, value: 400 })
    Object.defineProperty(containerEl, 'clientWidth', { configurable: true, value: 100 })
    containerEl.scrollLeft = 300

    vm.scrollToColKey({ colKey: 0 })

    // key 为 0 的列在左侧，需要向左滚动
    expect(containerEl.scrollLeft).toBeLessThan(300)
    wrapper.unmount()
  })

  // MOD-02：组件改为 setup() 之后，通过模板 ref 拿到的实例仍然提供全部文档中的实例方法
  it('exposes every instance method through a template ref', async () => {
    const tableRef = ref<any>(null)
    const Parent = defineComponent({
      setup() {
        return () => h(veTable, {
          ref: tableRef,
          columns: COLUMNS,
          tableData: TABLE_DATA,
          rowKeyFieldName: 'rowkey',
        })
      },
    })
    const wrapper = mount(Parent)
    await later()

    const names = Object.values(INSTANCE_METHODS)
    expect(names).toEqual([
      'scrollTo',
      'scrollToRowKey',
      'scrollToColKey',
      'startEditingCell',
      'stopEditingCell',
      'setHighlightRow',
      'setCellSelection',
      'setRangeCellSelection',
      'getRangeCellSelection',
      'setAllCellSelection',
      'hideColumnsByKeys',
      'showColumnsByKeys',
    ])
    names.forEach(name => expect(typeof tableRef.value[name]).toBe('function'))

    // 通过 ref 调用：选区、读取选区、隐藏 / 显示列
    tableRef.value.setRangeCellSelection({ startRowKey: 1, startColKey: 'a', endRowKey: 2, endColKey: 'b' })
    await later()
    expect(tableRef.value.getRangeCellSelection()).toEqual({
      selectionRangeKeys: { startColKey: 'a', endColKey: 'b', startRowKey: 1, endRowKey: 2 },
      selectionRangeIndexes: { startColIndex: 0, endColIndex: 1, startRowIndex: 1, endRowIndex: 2 },
    })
    tableRef.value.hideColumnsByKeys(['b'])
    await later()
    expect(wrapper.findAll('.ve-table-header-th').length).toBe(3)
    tableRef.value.showColumnsByKeys(['b'])
    await later()
    expect(wrapper.findAll('.ve-table-header-th').length).toBe(4)

    wrapper.unmount()
  })
})
