import type { ColumnOption } from '@/ve-table/src/ve-table-types'
import { useColumns } from '@/ve-table/src/features/columns/useColumns'
import { createTableContext } from '@/ve-table/src/features/table-context'
import { HOOKS_NAME } from '@/ve-table/src/util/constant'
import { effectScope, nextTick, reactive } from 'vue'

/*
 * MOD-02：ve-table 拆出的功能组合式函数，脱离组件单独测试（只依赖显式传入的参数）
 */

// 在独立的 effect scope 中运行组合式函数，测试结束时停止
function runInScope<T>(fn: () => T) {
  const scope = effectScope()
  const result = scope.run(fn)!
  return { result, stop: () => scope.stop() }
}

describe('useColumns', () => {
  const COLUMNS: ColumnOption[] = [
    { field: 'name', key: 'a', title: 'Name', width: 100 },
    {
      title: 'Group',
      children: [
        { field: 'age', key: 'b', title: 'Age', width: 80 },
        { field: 'hobby', key: 'c', title: 'Hobby' },
      ],
    },
    { field: 'address', key: 'd', title: 'Address', width: 120, fixed: 'right' },
  ]

  function setup(extraProps: Record<string, any> = {}) {
    const props = reactive({
      columns: COLUMNS,
      columnHiddenOption: null,
      columnWidthResizeOption: null,
      ...extraProps,
    }) as any
    const tableContext = createTableContext()
    const order: string[] = []
    tableContext.on(HOOKS_NAME.TABLE_CELL_WIDTH_CHANGE, () => order.push('emit'))
    const { result, stop } = runInScope(() => useColumns({
      props,
      tableContext,
      onColumnWidthResize: () => order.push('resize'),
    }))
    return { props, columns: result, order, stop }
  }

  it('builds the group header and the leaf columns immediately', () => {
    const { columns, stop } = setup()

    expect(columns.isGroupHeader.value).toBe(true)
    expect(columns.colgroups.value.map(x => x.key)).toEqual(['a', 'b', 'c', 'd'])
    expect(columns.groupColumns.value.length).toBe(2)
    expect(columns.hasFixedColumn.value).toBe(true)
    expect(columns.hasLeftFixedColumn.value).toBe(false)
    expect(columns.hasRightFixedColumn.value).toBe(true)
    expect(columns.columnsOptionResetTime.value).toBe(0)
    stop()
  })

  it('rebuilds once per columns change and bumps the reset time', async () => {
    const { props, columns, stop } = setup()

    props.columns = COLUMNS.slice(0, 1)
    await nextTick()

    expect(columns.colgroups.value.map(x => x.key)).toEqual(['a'])
    expect(columns.isGroupHeader.value).toBe(false)
    expect(columns.columnsOptionResetTime.value).toBe(1)
    stop()
  })

  it('applies defaultHiddenColumnKeys once and hides / shows columns by key', async () => {
    const { props, columns, stop } = setup({ columnHiddenOption: { defaultHiddenColumnKeys: ['b'] } })
    expect(columns.colgroups.value.map(x => x.key)).toEqual(['a', 'c', 'd'])

    columns.showColumnsByKeys(['b'])
    columns.hideColumnsByKeys(['d'])
    await nextTick()
    expect(columns.colgroups.value.map(x => x.key)).toEqual(['a', 'b', 'c'])

    // columns 变化时保留运行时的隐藏状态（COL-09）
    props.columns = COLUMNS.map(col => ({ ...col }))
    await nextTick()
    expect(columns.colgroups.value.map(x => x.key)).toEqual(['a', 'b', 'c'])
    expect(columns.hiddenColumns.value).toEqual(['d'])
    stop()
  })

  it('sets the column resize widths and reports a resize before notifying the table', () => {
    const { columns, order, stop } = setup({ columnWidthResizeOption: { enable: true } })

    expect(columns.enableColumnResize.value).toBe(true)
    expect(columns.colgroups.value.map(x => x._columnResizeWidth)).toEqual([100, 80, 50, 120])

    columns.setColumnWidth({ colKey: 'c', width: 66 })
    expect(columns.colgroups.value.find(x => x.key === 'c')!._columnResizeWidth).toBe(66)
    expect(order).toEqual(['resize', 'emit'])
    stop()
  })
})
