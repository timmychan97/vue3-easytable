import { useRowExpand } from '@/ve-table/src/features/row-expand/useRowExpand'
import { useRowRadio, useRowSelection } from '@/ve-table/src/features/row-selection/useRowSelection'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, reactive, ref } from 'vue'

/*
 * useRowSelection / useRowRadio / useRowExpand 的单元测试（MOD-08）。
 * 输入都是响应式数据，模拟用户在 data() 里声明的选项。
 */

// 在独立的 effect scope 中运行，测试结束后停止
const scopes: Array<ReturnType<typeof effectScope>> = []
function runInScope<T>(fn: () => T): T {
  const scope = effectScope()
  scopes.push(scope)
  return scope.run(fn)!
}
afterEach(() => {
  scopes.splice(0).forEach(scope => scope.stop())
})

describe('useRowSelection', () => {
  function setup(checkboxOption: any, keys = [1, 2, 3]) {
    const allRowKeys = ref<Array<string | number>>(keys)
    const option = ref<any>(checkboxOption)
    const selection = runInScope(() =>
      useRowSelection({
        checkboxOption: () => option.value,
        allRowKeys: () => allRowKeys.value,
        getRowByKey: rowKey => ({ rowKey }),
      }),
    )
    return { selection, allRowKeys, option }
  }

  it('controlled: follows in-place push / splice on selectedRowKeys', () => {
    const checkboxOption = reactive({ selectedRowKeys: [] as number[] })
    const { selection } = setup(checkboxOption)

    expect(selection.isRowSelected(1)).toBe(false)
    checkboxOption.selectedRowKeys.push(1)
    expect(selection.isRowSelected(1)).toBe(true)
    expect(selection.isIndeterminate.value).toBe(true)

    checkboxOption.selectedRowKeys.push(2, 3)
    expect(selection.isSelectedAll.value).toBe(true)
    expect(selection.isIndeterminate.value).toBe(false)

    checkboxOption.selectedRowKeys.splice(0, 1)
    expect(selection.isRowSelected(1)).toBe(false)
    expect(selection.isSelectedAll.value).toBe(false)
  })

  it('controlled: selectRow only notifies, with a new array', () => {
    const selectedRowChange = vi.fn()
    const checkboxOption = reactive({ selectedRowKeys: [2], selectedRowChange })
    const { selection } = setup(checkboxOption)

    selection.selectRow(1, true)

    expect(checkboxOption.selectedRowKeys).toEqual([2])
    expect(selection.isRowSelected(1)).toBe(false)
    const params = selectedRowChange.mock.calls[0][0]
    expect(params).toEqual({ row: { rowKey: 1 }, isSelected: true, selectedRowKeys: [2, 1] })
  })

  it('uncontrolled: seeds from defaults and never mutates the inputs', () => {
    const allKeys = [1, 2, 3]
    const { selection } = setup({ defaultSelectedAllRows: true }, allKeys)

    expect(selection.isSelectedAll.value).toBe(true)
    selection.selectRow(2, false)
    expect(selection.isRowSelected(2)).toBe(false)
    expect(allKeys).toEqual([1, 2, 3])

    const defaults = [1]
    const second = setup({ defaultSelectedRowKeys: defaults })
    second.selection.selectRow(3, true)
    expect(second.selection.selectedRowKeys.value).toEqual([1, 3])
    expect(defaults).toEqual([1])
  })

  it('uncontrolled: selectRow without callbacks does not throw', () => {
    const { selection } = setup({})
    expect(() => selection.selectRow(1, true)).not.toThrow()
    expect(() => selection.selectAll(true)).not.toThrow()
    expect(selection.selectedRowKeys.value).toEqual([1, 2, 3])
  })

  it('reseeds when the option object is replaced', async () => {
    const { selection, option } = setup({ defaultSelectedRowKeys: [1] })
    selection.selectRow(2, true)
    expect(selection.selectedRowKeys.value).toEqual([1, 2])

    option.value = { defaultSelectedRowKeys: [3] }
    await nextTick()
    expect(selection.selectedRowKeys.value).toEqual([3])
  })

  it('isSelectedAll compares sets (ROW-05)', () => {
    // 全部禁用且都未选中
    expect(setup({ disableSelectedRowKeys: [1, 2, 3] }).selection.isSelectedAll.value).toBe(false)
    // 不在数据里的已选 key 不算数
    expect(setup({ selectedRowKeys: [1, 2, 99] }).selection.isSelectedAll.value).toBe(false)
    // 不在数据里的禁用 key 不算数
    expect(setup({ selectedRowKeys: [1, 2], disableSelectedRowKeys: [99] }).selection.isSelectedAll.value).toBe(false)
    // 可选的行都已选中，禁用行未选中
    expect(setup({ selectedRowKeys: [1, 2], disableSelectedRowKeys: [3] }).selection.isSelectedAll.value).toBe(true)
    // 没有数据
    expect(setup({ selectedRowKeys: [1] }, []).selection.isSelectedAll.value).toBe(false)
  })

  it('isSelectedAll follows allRowKeys (ROW-04)', () => {
    const { selection, allRowKeys } = setup({ selectedRowKeys: [1, 2, 3] })
    expect(selection.isSelectedAll.value).toBe(true)

    allRowKeys.value = [1, 2, 3, 4]
    expect(selection.isSelectedAll.value).toBe(false)
    expect(selection.isIndeterminate.value).toBe(true)
  })

  it('selectAll keeps disabled rows as they are', () => {
    const selectedAllChange = vi.fn()
    const { selection } = setup({
      defaultSelectedRowKeys: [3],
      disableSelectedRowKeys: [2, 3],
      selectedAllChange,
    })

    selection.selectAll(true)
    // 禁用且未选中的 2 不会被选上
    expect(selection.selectedRowKeys.value).toEqual([1, 3])
    expect(selectedAllChange).toHaveBeenLastCalledWith({ isSelected: true, selectedRowKeys: [1, 3] })

    selection.selectAll(false)
    // 禁用且已选中的 3 保持选中
    expect(selection.selectedRowKeys.value).toEqual([3])
    expect(selectedAllChange).toHaveBeenLastCalledWith({ isSelected: false, selectedRowKeys: [3] })
  })
})

describe('useRowRadio', () => {
  it('controlled vs uncontrolled', () => {
    const selectedRowChange = vi.fn()
    const radioOption = reactive<any>({ selectedRowKey: 2, selectedRowChange })
    const radio = runInScope(() =>
      useRowRadio({ radioOption: () => radioOption, getRowByKey: rowKey => ({ rowKey }) }),
    )

    expect(radio.isRowSelected(2)).toBe(true)
    radio.selectRow(1)
    expect(radio.isRowSelected(2)).toBe(true)
    expect(selectedRowChange).toHaveBeenCalledWith({ row: { rowKey: 1 } })

    radioOption.selectedRowKey = 1
    expect(radio.isRowSelected(1)).toBe(true)

    const uncontrolled = runInScope(() =>
      useRowRadio({ radioOption: () => ({ defaultSelectedRowKey: 3, disableSelectedRowKeys: [1] }) }),
    )
    expect(uncontrolled.isRowSelected(3)).toBe(true)
    expect(uncontrolled.isRowDisabled(1)).toBe(true)
    uncontrolled.selectRow(2)
    expect(uncontrolled.isRowSelected(2)).toBe(true)
    expect(uncontrolled.isRowSelected(3)).toBe(false)
  })
})

describe('useRowExpand', () => {
  function setup(expandOption: any, keys = [1, 2, 3]) {
    const allRowKeys = ref(keys)
    const expand = runInScope(() =>
      useRowExpand({ expandOption: () => expandOption, allRowKeys: () => allRowKeys.value }),
    )
    return { expand, allRowKeys }
  }

  it('defaultExpandAllRows copies allRowKeys and rows can collapse (ROW-01, ROW-02)', () => {
    const keys = [1, 2, 3]
    const { expand, allRowKeys } = setup({ defaultExpandAllRows: true }, keys)

    expect(expand.isRowExpanded(2)).toBe(true)
    expand.toggleRowExpand({ row: {}, rowKey: 2, rowIndex: 1 })
    expect(expand.isRowExpanded(2)).toBe(false)
    expect(allRowKeys.value).toEqual([1, 2, 3])
    expect(keys).toEqual([1, 2, 3])
  })

  it('controlled: follows in-place mutation and toggles from the current keys (ROW-03)', () => {
    const afterExpandRowChange = vi.fn()
    const expandOption = reactive({ expandedRowKeys: [1], afterExpandRowChange })
    const { expand } = setup(expandOption)

    expandOption.expandedRowKeys.push(3)
    expect(expand.isRowExpanded(3)).toBe(true)

    expand.toggleRowExpand({ row: { rowKey: 2 }, rowKey: 2, rowIndex: 1 })
    // 受控：不改用户的数组
    expect(expandOption.expandedRowKeys).toEqual([1, 3])
    expect(afterExpandRowChange).toHaveBeenCalledWith({
      afterExpandedRowKeys: [1, 3, 2],
      row: { rowKey: 2 },
      rowIndex: 1,
    })
  })

  it('beforeExpandRowChange can cancel', () => {
    const afterExpandRowChange = vi.fn()
    const { expand } = setup({
      defaultExpandedRowKeys: [1],
      beforeExpandRowChange: ({ beforeExpandedRowKeys }: any) => {
        expect(beforeExpandedRowKeys).toEqual([1])
        return false
      },
      afterExpandRowChange,
    })

    expect(expand.toggleRowExpand({ row: {}, rowKey: 2, rowIndex: 1 })).toBe(false)
    expect(expand.isRowExpanded(2)).toBe(false)
    expect(afterExpandRowChange).not.toHaveBeenCalled()
  })
})
