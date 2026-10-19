import veTable from '@/ve-table'
import { later } from '@test-utils'
import { mount } from '@vue/test-utils'

/*
 * ROW-07：全选 / 取消全选只影响当前数据（当前页）中的行，
 * 不在当前数据中的已选 key（例如其他页）保持不变，可以跨页勾选。
 */
describe('veTable select all keeps keys outside the current data (ROW-07)', () => {
  function pageData(page: number) {
    return [1, 2, 3].map(i => ({ rowKey: page * 1000 + i, name: `name-${page}-${i}` }))
  }

  const COLUMNS = [
    { field: '', key: 'a', type: 'checkbox', title: '', width: 50 },
    { field: 'name', key: 'b', title: 'Name', width: 200 },
  ]

  async function clickHeaderCheckbox(wrapper: any, value: boolean) {
    await wrapper.find('.ve-table-header-tr .ve-checkbox input[type=\'checkbox\']').setValue(value)
    await later()
  }

  async function clickRowCheckbox(wrapper: any, rowIndex: number, value: boolean) {
    await wrapper.findAll('.ve-table-body-tr')[rowIndex].find('.ve-checkbox input[type=\'checkbox\']').setValue(value)
    await later()
  }

  function checkedRows(wrapper: any) {
    return wrapper
      .findAll('.ve-table-body-tr')
      .filter((tr: any) => tr.find('.ve-checkbox-content').classes().includes('ve-checkbox-checked'))
      .map((tr: any) => Number(tr.attributes('row-key')))
  }

  it('controlled: select all / deselect all keep the other page\'s keys', async () => {
    const selectedAllChange = vi.fn()
    // 与分页 demo 相同的写法：回调里把 selectedRowKeys 写回
    const wrapper = mount({
      components: { veTable },
      template: `
        <ve-table
          :columns="columns"
          :table-data="tableData"
          :checkbox-option="checkboxOption"
          row-key-field-name="rowKey"
        />
      `,
      data() {
        return {
          columns: COLUMNS,
          tableData: pageData(1),
          checkboxOption: {
            selectedRowKeys: [2002, 1002],
            selectedAllChange: (params) => {
              selectedAllChange(params)
              this.checkboxOption.selectedRowKeys = params.selectedRowKeys
            },
          },
        }
      },
    })
    await later()

    await clickHeaderCheckbox(wrapper, true)
    expect(selectedAllChange).toHaveBeenLastCalledWith({
      isSelected: true,
      selectedRowKeys: [2002, 1001, 1002, 1003],
    })
    expect(checkedRows(wrapper)).toEqual([1001, 1002, 1003])

    await clickHeaderCheckbox(wrapper, false)
    expect(selectedAllChange).toHaveBeenLastCalledWith({ isSelected: false, selectedRowKeys: [2002] })
    expect(checkedRows(wrapper)).toEqual([])

    // 切到第 2 页：之前在第 2 页勾选的行仍然勾选
    const vm = wrapper.vm as any
    vm.tableData = pageData(2)
    await later()
    expect(checkedRows(wrapper)).toEqual([2002])

    wrapper.unmount()
  })

  it('uncontrolled: the selection survives switching pages', async () => {
    const selectedAllChange = vi.fn()
    const wrapper = mount(veTable, {
      props: {
        columns: COLUMNS,
        tableData: pageData(1),
        rowKeyFieldName: 'rowKey',
        checkboxOption: { selectedAllChange },
      },
    })
    await later()

    await clickRowCheckbox(wrapper, 1, true)

    await wrapper.setProps({ tableData: pageData(2) })
    await later()
    await clickHeaderCheckbox(wrapper, true)
    expect(selectedAllChange).toHaveBeenLastCalledWith({
      isSelected: true,
      selectedRowKeys: [1002, 2001, 2002, 2003],
    })

    await wrapper.setProps({ tableData: pageData(1) })
    await later()
    expect(checkedRows(wrapper)).toEqual([1002])

    await clickHeaderCheckbox(wrapper, true)
    await clickHeaderCheckbox(wrapper, false)
    expect(selectedAllChange).toHaveBeenLastCalledWith({
      isSelected: false,
      selectedRowKeys: [2001, 2002, 2003],
    })

    await wrapper.setProps({ tableData: pageData(2) })
    await later()
    expect(checkedRows(wrapper)).toEqual([2001, 2002, 2003])

    wrapper.unmount()
  })

  it('disabled rows of the current data keep their state', async () => {
    const selectedAllChange = vi.fn()
    const wrapper = mount(veTable, {
      props: {
        columns: COLUMNS,
        tableData: pageData(1),
        rowKeyFieldName: 'rowKey',
        checkboxOption: {
          defaultSelectedRowKeys: [9999, 1003],
          disableSelectedRowKeys: [1002, 1003],
          selectedAllChange,
        },
      },
    })
    await later()

    await clickHeaderCheckbox(wrapper, true)
    // 禁用且未选中的 1002 不会被选上
    expect(selectedAllChange).toHaveBeenLastCalledWith({ isSelected: true, selectedRowKeys: [9999, 1001, 1003] })

    await clickHeaderCheckbox(wrapper, false)
    // 禁用且已选中的 1003 保持选中，其他页的 9999 保留
    expect(selectedAllChange).toHaveBeenLastCalledWith({ isSelected: false, selectedRowKeys: [9999, 1003] })

    wrapper.unmount()
  })
})
