import veTable from '@/ve-table'
import { later } from '@test-utils'
import { mount } from '@vue/test-utils'

// ROW-06：点击展开图标时 BODY_CELL_CLICK 只能派发一次
describe('veTable expand icon click (ROW-06)', () => {
  const TABLE_DATA = [1001, 1002, 1003].map(rowKey => ({ rowKey, name: `name-${rowKey}` }))
  const COLUMNS = [
    { field: '', key: 'a', type: 'expand', title: '', width: 50 },
    { field: 'name', key: 'b', title: 'Name', width: 200 },
  ]

  function mountTable(trigger?: string) {
    const afterExpandRowChange = vi.fn()
    const cellClick = vi.fn()
    const rowClick = vi.fn()
    const wrapper = mount(veTable, {
      props: {
        columns: COLUMNS,
        tableData: TABLE_DATA,
        rowKeyFieldName: 'rowKey',
        expandOption: {
          trigger,
          afterExpandRowChange,
          render: ({ row }) => <p class="expand-content">{row.name}</p>,
        },
        eventCustomOption: {
          bodyCellEvents: ({ column }) => ({
            click: () => cellClick(column.key),
          }),
          bodyRowEvents: () => ({
            click: () => rowClick(),
          }),
        },
      },
    })

    // 统计表格收到的 BODY_CELL_CLICK 次数（监听器在调用时才读取该方法）
    const bodyCellClick = vi.fn()
    ;(wrapper.vm as any).bodyCellClick = bodyCellClick

    return { wrapper, afterExpandRowChange, cellClick, rowClick, bodyCellClick }
  }

  async function clickIcon(wrapper: any, rowIndex: number) {
    await wrapper.findAll('.ve-table-body-tr')[rowIndex].find('.ve-table-row-expand-icon').trigger('click')
    await later()
  }

  it('trigger row: an icon click dispatches BODY_CELL_CLICK once and expands once', async () => {
    const { wrapper, afterExpandRowChange, cellClick, rowClick, bodyCellClick } = mountTable('row')

    await clickIcon(wrapper, 0)

    expect(bodyCellClick).toHaveBeenCalledTimes(1)
    expect(cellClick).toHaveBeenCalledTimes(1)
    expect(rowClick).toHaveBeenCalledTimes(1)
    expect(afterExpandRowChange).toHaveBeenCalledTimes(1)
    expect(wrapper.findAll('.expand-content').map(w => w.text())).toEqual(['name-1001'])

    wrapper.unmount()
  })

  it('trigger icon (default): an icon click dispatches once and expands once', async () => {
    const { wrapper, afterExpandRowChange, bodyCellClick } = mountTable()

    await clickIcon(wrapper, 1)

    expect(bodyCellClick).toHaveBeenCalledTimes(1)
    expect(afterExpandRowChange).toHaveBeenCalledTimes(1)
    expect(wrapper.findAll('.expand-content').map(w => w.text())).toEqual(['name-1002'])

    wrapper.unmount()
  })

  it('trigger cell: an icon click dispatches once and expands once', async () => {
    const { wrapper, afterExpandRowChange, bodyCellClick } = mountTable('cell')

    await clickIcon(wrapper, 2)

    expect(bodyCellClick).toHaveBeenCalledTimes(1)
    expect(afterExpandRowChange).toHaveBeenCalledTimes(1)
    expect(wrapper.findAll('.expand-content').map(w => w.text())).toEqual(['name-1003'])

    wrapper.unmount()
  })
})
