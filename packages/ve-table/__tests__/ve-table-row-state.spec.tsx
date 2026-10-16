import veTable from '@/ve-table'
import { later } from '@test-utils'
import { mount } from '@vue/test-utils'
import { expect, vi } from 'vitest'

/*
 * 行勾选 / 单选 / 展开的派生状态（MOD-08, ROW-01 … ROW-05）。
 * 宿主组件用 data() 持有选项，与官方 demo 一样原地修改（push / splice）用户的数组。
 */
describe('veTable row state (selection / expand)', () => {
  function createTableData() {
    return [1001, 1002, 1003, 1004, 1005].map(rowKey => ({
      rowKey,
      name: `name-${rowKey}`,
      hobby: 'coding',
    }))
  }

  const CHECKBOX_COLUMNS = [
    { field: '', key: 'a', type: 'checkbox', title: '', width: 50 },
    { field: 'name', key: 'b', title: 'Name', width: 200 },
    { field: 'hobby', key: 'c', title: 'Hobby', width: 200 },
  ]

  const EXPAND_COLUMNS = [
    { field: '', key: 'a', type: 'expand', title: '', width: 50 },
    { field: 'name', key: 'b', title: 'Name', width: 200 },
    { field: 'hobby', key: 'c', title: 'Hobby', width: 200 },
  ]

  const RADIO_COLUMNS = [
    { field: '', key: 'a', type: 'radio', title: '', width: 50 },
    { field: 'name', key: 'b', title: 'Name', width: 200 },
  ]

  const TEMPLATE = `
    <ve-table
      :columns="columns"
      :table-data="tableData"
      :checkbox-option="checkboxOption"
      :expand-option="expandOption"
      :radio-option="radioOption"
      row-key-field-name="rowKey"
    />
  `

  // 挂载一个宿主组件（与官方 demo 相同的写法：选项放在 data() 里）
  function mountHost(state: {
    columns: any[]
    checkboxOption?: any
    expandOption?: any
    radioOption?: any
  }) {
    return mount({
      template: TEMPLATE,
      data() {
        return {
          tableData: createTableData(),
          columns: state.columns,
          checkboxOption: state.checkboxOption ?? null,
          expandOption: state.expandOption ?? null,
          radioOption: state.radioOption ?? null,
        }
      },
    })
  }

  function headerCheckbox(wrapper: any) {
    return wrapper.find('.ve-table-header-tr .ve-checkbox-content')
  }

  function headerState(wrapper: any) {
    const classes = headerCheckbox(wrapper).classes()
    return {
      checked: classes.includes('ve-checkbox-checked'),
      indeterminate: classes.includes('ve-checkbox-indeterminate'),
    }
  }

  // 已勾选行的 rowKey（按渲染顺序）
  function checkedRowKeys(wrapper: any) {
    const vm = wrapper.vm as any
    return wrapper
      .findAll('.ve-table-body-tr')
      .map((tr: any, index: number) => ({ tr, rowKey: vm.tableData[index].rowKey }))
      .filter(({ tr }: any) =>
        tr.find('.ve-checkbox-content').classes().includes('ve-checkbox-checked'),
      )
      .map(({ rowKey }: any) => rowKey)
  }

  async function clickHeaderCheckbox(wrapper: any, value: boolean) {
    await wrapper
      .find('.ve-table-header-tr .ve-checkbox input[type=\'checkbox\']')
      .setValue(value)
    await later()
  }

  async function clickRowCheckbox(wrapper: any, rowIndex: number, value: boolean) {
    await wrapper
      .findAll('.ve-table-body-tr')[rowIndex]
      .find('.ve-checkbox input[type=\'checkbox\']')
      .setValue(value)
    await later()
  }

  async function clickExpandIcon(wrapper: any, rowIndex: number) {
    await wrapper
      .findAll('.ve-table-body-tr')[rowIndex]
      .find('.ve-table-row-expand-icon')
      .trigger('click')
    await later()
  }

  function renderExpand({ row }: any) {
    return <p class="expand-content">{row.name}</p>
  }

  describe('in-place mutation of controlled arrays (ROW-03)', () => {
    it('push / splice on controlled selectedRowKeys updates the rows and the header', async () => {
      const wrapper = mountHost({
        columns: CHECKBOX_COLUMNS,
        checkboxOption: { selectedRowKeys: [] },
      })
      await later()

      const vm = wrapper.vm as any
      expect(checkedRowKeys(wrapper)).toEqual([])
      expect(headerState(wrapper)).toEqual({ checked: false, indeterminate: false })

      vm.checkboxOption.selectedRowKeys.push(1002)
      await later()
      expect(checkedRowKeys(wrapper)).toEqual([1002])
      expect(headerState(wrapper).indeterminate).toBe(true)

      vm.checkboxOption.selectedRowKeys.push(1001, 1003, 1004, 1005)
      await later()
      expect(checkedRowKeys(wrapper)).toEqual([1001, 1002, 1003, 1004, 1005])
      expect(headerState(wrapper)).toEqual({ checked: true, indeterminate: false })

      vm.checkboxOption.selectedRowKeys.splice(0, 1)
      await later()
      expect(checkedRowKeys(wrapper)).toEqual([1001, 1003, 1004, 1005])
      expect(headerState(wrapper)).toEqual({ checked: false, indeterminate: true })
    })

    it('selectedRowChange receives keys based on the mutated array (pagination demo flow)', async () => {
      const selectedRowChange = vi.fn()
      const wrapper = mountHost({
        columns: CHECKBOX_COLUMNS,
        checkboxOption: { selectedRowKeys: [], selectedRowChange },
      })
      await later()

      const vm = wrapper.vm as any
      vm.checkboxOption.selectedRowKeys.push(1003)
      await later()

      await clickRowCheckbox(wrapper, 0, true)

      expect(selectedRowChange).toHaveBeenCalledTimes(1)
      const { row, isSelected, selectedRowKeys } = selectedRowChange.mock.calls[0][0]
      expect(row.rowKey).toBe(1001)
      expect(isSelected).toBe(true)
      expect(selectedRowKeys).toEqual([1003, 1001])
      // 回调里拿到的是新数组，不是用户的数组本身
      expect(selectedRowKeys).not.toBe(vm.checkboxOption.selectedRowKeys)
    })

    it('push / splice on controlled expandedRowKeys, and the next click uses the mutated keys', async () => {
      const afterExpandRowChange = vi.fn()
      const wrapper = mountHost({
        columns: EXPAND_COLUMNS,
        expandOption: {
          expandedRowKeys: [1001],
          render: renderExpand,
          afterExpandRowChange,
        },
      })
      await later()

      const vm = wrapper.vm as any
      expect(wrapper.findAll('.expand-content').map(x => x.text())).toEqual(['name-1001'])

      vm.expandOption.expandedRowKeys.push(1003)
      await later()
      expect(wrapper.findAll('.expand-content').map(x => x.text())).toEqual(['name-1001', 'name-1003'])

      vm.expandOption.expandedRowKeys.splice(0, 1)
      await later()
      expect(wrapper.findAll('.expand-content').map(x => x.text())).toEqual(['name-1003'])

      await clickExpandIcon(wrapper, 1)
      expect(afterExpandRowChange).toHaveBeenCalledTimes(1)
      expect(afterExpandRowChange.mock.calls[0][0].afterExpandedRowKeys).toEqual([1003, 1002])

      // 受控：用户没有回写，展开状态不变
      expect(wrapper.findAll('.expand-content').map(x => x.text())).toEqual(['name-1003'])
    })
  })

  describe('defaultExpandAllRows (ROW-01, ROW-02)', () => {
    it('clicking a row collapses it and does not touch the table allRowKeys', async () => {
      const wrapper = mount(veTable, {
        props: {
          columns: EXPAND_COLUMNS,
          tableData: createTableData(),
          rowKeyFieldName: 'rowKey',
          expandOption: { defaultExpandAllRows: true, render: renderExpand },
        },
      })
      await later()

      expect(wrapper.findAll('.expand-content').length).toBe(5)

      await clickExpandIcon(wrapper, 1)

      // ROW-01：表格自身的 allRowKeys 不能被改动
      expect((wrapper.vm as any).allRowKeys).toEqual([1001, 1002, 1003, 1004, 1005])
      // ROW-02：该行确实被折叠
      expect(wrapper.findAll('.expand-content').map(x => x.text())).toEqual([
        'name-1001',
        'name-1003',
        'name-1004',
        'name-1005',
      ])

      await clickExpandIcon(wrapper, 1)
      expect(wrapper.findAll('.expand-content').length).toBe(5)
      expect((wrapper.vm as any).allRowKeys).toEqual([1001, 1002, 1003, 1004, 1005])
    })

    it('controlled expandedRowKeys wins over defaultExpandAllRows', async () => {
      const wrapper = mount(veTable, {
        props: {
          columns: EXPAND_COLUMNS,
          tableData: createTableData(),
          rowKeyFieldName: 'rowKey',
          expandOption: {
            defaultExpandAllRows: true,
            expandedRowKeys: [1002],
            render: renderExpand,
          },
        },
      })
      await later()

      expect(wrapper.findAll('.expand-content').map(x => x.text())).toEqual(['name-1002'])
    })

    it('row keys reported by afterExpandRowChange are a new array', async () => {
      const afterExpandRowChange = vi.fn()
      const wrapper = mount(veTable, {
        props: {
          columns: EXPAND_COLUMNS,
          tableData: createTableData(),
          rowKeyFieldName: 'rowKey',
          expandOption: { defaultExpandAllRows: true, render: renderExpand, afterExpandRowChange },
        },
      })
      await later()

      await clickExpandIcon(wrapper, 0)
      const keys = afterExpandRowChange.mock.calls[0][0].afterExpandedRowKeys
      expect(keys).toEqual([1002, 1003, 1004, 1005])
      expect(keys).not.toBe((wrapper.vm as any).allRowKeys)
    })
  })

  describe('header select-all state stays in sync (ROW-04)', () => {
    it('select all, then add a row: header is no longer checked', async () => {
      const wrapper = mountHost({ columns: CHECKBOX_COLUMNS, checkboxOption: {} })
      await later()

      await clickHeaderCheckbox(wrapper, true)
      expect(headerState(wrapper)).toEqual({ checked: true, indeterminate: false })

      const vm = wrapper.vm as any
      vm.tableData.push({ rowKey: 1006, name: 'name-1006', hobby: 'coding' })
      await later()

      expect(headerState(wrapper)).toEqual({ checked: false, indeterminate: true })
    })

    it('controlled: select all, then add a row', async () => {
      const wrapper = mountHost({
        columns: CHECKBOX_COLUMNS,
        checkboxOption: { selectedRowKeys: [1001, 1002, 1003, 1004, 1005] },
      })
      await later()
      expect(headerState(wrapper)).toEqual({ checked: true, indeterminate: false })

      const vm = wrapper.vm as any
      vm.tableData.push({ rowKey: 1006, name: 'name-1006', hobby: 'coding' })
      await later()

      expect(headerState(wrapper)).toEqual({ checked: false, indeterminate: true })
    })

    it('columns change keeps the header state', async () => {
      const wrapper = mountHost({ columns: CHECKBOX_COLUMNS, checkboxOption: {} })
      await later()

      await clickHeaderCheckbox(wrapper, true)
      expect(headerState(wrapper)).toEqual({ checked: true, indeterminate: false })

      // 换一个 key，表头单元格会重新挂载
      const vm = wrapper.vm as any
      vm.columns = [
        { field: '', key: 'a2', type: 'checkbox', title: '', width: 50 },
        { field: 'name', key: 'b2', title: 'Name', width: 200 },
      ]
      await later()

      expect(checkedRowKeys(wrapper)).toEqual([1001, 1002, 1003, 1004, 1005])
      expect(headerState(wrapper)).toEqual({ checked: true, indeterminate: false })
    })
  })

  describe('select-all compares sets, not counts (ROW-05)', () => {
    it('all rows disabled and none selected: header is not checked', async () => {
      const wrapper = mountHost({
        columns: CHECKBOX_COLUMNS,
        checkboxOption: { disableSelectedRowKeys: [1001, 1002, 1003, 1004, 1005] },
      })
      await later()

      expect(headerState(wrapper)).toEqual({ checked: false, indeterminate: false })
    })

    it('selected keys that are not in the data do not inflate the count', async () => {
      const wrapper = mountHost({
        columns: CHECKBOX_COLUMNS,
        checkboxOption: { selectedRowKeys: [1001, 1002, 1003, 1004, 9999] },
      })
      await later()

      expect(headerState(wrapper)).toEqual({ checked: false, indeterminate: true })
    })

    it('disabled keys that are not in the data do not inflate the count', async () => {
      const wrapper = mountHost({
        columns: CHECKBOX_COLUMNS,
        checkboxOption: {
          selectedRowKeys: [1001, 1002, 1003, 1004],
          disableSelectedRowKeys: [9999],
        },
      })
      await later()

      expect(headerState(wrapper)).toEqual({ checked: false, indeterminate: true })
    })

    it('every enabled row selected, the disabled row unselected: header is checked', async () => {
      const wrapper = mountHost({
        columns: CHECKBOX_COLUMNS,
        checkboxOption: {
          selectedRowKeys: [1001, 1002, 1003, 1004],
          disableSelectedRowKeys: [1005],
        },
      })
      await later()

      expect(headerState(wrapper).checked).toBe(true)
    })
  })

  describe('uncontrolled checkbox and radio', () => {
    it('row clicks and select-all keep rows and header in sync', async () => {
      const selectedAllChange = vi.fn()
      const wrapper = mountHost({
        columns: CHECKBOX_COLUMNS,
        checkboxOption: { selectedAllChange },
      })
      await later()

      await clickRowCheckbox(wrapper, 0, true)
      await clickRowCheckbox(wrapper, 2, true)
      expect(checkedRowKeys(wrapper)).toEqual([1001, 1003])
      expect(headerState(wrapper)).toEqual({ checked: false, indeterminate: true })

      await clickRowCheckbox(wrapper, 0, false)
      expect(checkedRowKeys(wrapper)).toEqual([1003])

      await clickHeaderCheckbox(wrapper, true)
      expect(checkedRowKeys(wrapper)).toEqual([1001, 1002, 1003, 1004, 1005])
      expect(selectedAllChange).toHaveBeenLastCalledWith({
        isSelected: true,
        selectedRowKeys: [1001, 1002, 1003, 1004, 1005],
      })

      await clickHeaderCheckbox(wrapper, false)
      expect(checkedRowKeys(wrapper)).toEqual([])
      expect(headerState(wrapper)).toEqual({ checked: false, indeterminate: false })
    })

    it('controlled radio follows the user value, uncontrolled radio follows clicks', async () => {
      const selectedRowChange = vi.fn()
      const wrapper = mountHost({
        columns: RADIO_COLUMNS,
        radioOption: { selectedRowKey: 1002, selectedRowChange },
      })
      await later()

      const checkedRadioIndexes = () =>
        wrapper
          .findAll('.ve-table-body-tr')
          .map((tr, index) => (tr.find('.ve-radio-checked').exists() ? index : -1))
          .filter(index => index > -1)

      expect(checkedRadioIndexes()).toEqual([1])

      // 受控：点击只触发回调，不改变选中
      await wrapper.findAll('.ve-table-body-tr')[3].find('.ve-radio input').setValue(true)
      await later()
      expect(selectedRowChange.mock.calls[0][0].row.rowKey).toBe(1004)
      expect(checkedRadioIndexes()).toEqual([1])

      const vm = wrapper.vm as any
      vm.radioOption.selectedRowKey = 1004
      await later()
      expect(checkedRadioIndexes()).toEqual([3])

      // 换成非受控
      vm.radioOption = { defaultSelectedRowKey: 1001, selectedRowChange }
      await later()
      expect(checkedRadioIndexes()).toEqual([0])

      await wrapper.findAll('.ve-table-body-tr')[4].find('.ve-radio input').setValue(true)
      await later()
      expect(checkedRadioIndexes()).toEqual([4])
    })
  })
})
