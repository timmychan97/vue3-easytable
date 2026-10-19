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
              ;(this as any).checkboxOption.selectedRowKeys = params.selectedRowKeys
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

  /*
   * ROW-08（决定：保持 D7 的规则并写进文档）：从 tableData 删除已选中的行后，它的 key 仍然保留在已选 key 中。
   * 非受控模式无法区分“删除的行”和“其他页的行”；需要清除时使用受控的 selectedRowKeys，删除行时一并移除 key。
   */
  describe('keys of removed rows (ROW-08)', () => {
    it('uncontrolled: a removed row\'s key stays selected, like another page\'s key', async () => {
      const selectedRowChange = vi.fn()
      const wrapper = mount(veTable, {
        props: {
          columns: COLUMNS,
          tableData: pageData(1),
          rowKeyFieldName: 'rowKey',
          checkboxOption: { selectedRowChange },
        },
      })
      await later()

      await clickRowCheckbox(wrapper, 1, true)
      await wrapper.setProps({ tableData: pageData(1).filter(row => row.rowKey !== 1002) })
      await later()

      await clickRowCheckbox(wrapper, 0, true)
      expect(selectedRowChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ isSelected: true, selectedRowKeys: [1002, 1001] }),
      )

      // 同一个 key 的行再次出现时仍是勾选状态
      await wrapper.setProps({ tableData: pageData(1) })
      await later()
      expect(checkedRows(wrapper)).toEqual([1001, 1002])

      wrapper.unmount()
    })

    it('controlled: removing the key together with the row clears it', async () => {
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
              selectedRowKeys: [1001, 1002],
              selectedRowChange: ({ selectedRowKeys }) => {
                ;(this as any).checkboxOption.selectedRowKeys = selectedRowKeys
              },
            },
          }
        },
        methods: {
          // 文档中推荐的写法：删除行时同时移除它的 key
          removeRow(rowKey: number) {
            const vm = this as any
            vm.tableData = vm.tableData.filter(row => row.rowKey !== rowKey)
            vm.checkboxOption.selectedRowKeys = vm.checkboxOption.selectedRowKeys.filter(key => key !== rowKey)
          },
        },
      })
      await later()
      const vm = wrapper.vm as any

      vm.removeRow(1002)
      await later()
      vm.tableData = pageData(1)
      await later()

      expect(checkedRows(wrapper)).toEqual([1001])
      expect(vm.checkboxOption.selectedRowKeys).toEqual([1001])

      wrapper.unmount()
    })
  })
})
