import type { Option as VeContextmenuOption } from '@/ve-contextmenu/src'
import type { ColumnOption, ContextmenuOption } from '@/ve-table/src/ve-table-types'
import { cancelColumnFixed, restoreColumnsState, setColumnFixed } from '@/ve-table/src/util'
import { expectTypeOf } from 'vitest'
import { h } from 'vue'

/*
 * RENDER-08：渲染回调的类型（由 vue-tsc 检查；运行时只确认回调可以调用）
 * - 第二个参数是 Vue 的 h；
 * - renderFooterCell、filter.filterIcon 有声明，参数有具体的结构。
 */
describe('column render callback types (RENDER-08)', () => {
  it('types h and the params of every render callback', () => {
    const column: ColumnOption = {
      key: 'a',
      field: 'a',
      renderBodyCell: ({ row, column, rowIndex }, h) => {
        expectTypeOf(h).toEqualTypeOf<typeof import('vue').h>()
        expectTypeOf(rowIndex).toEqualTypeOf<number>()
        expectTypeOf(column).toEqualTypeOf<ColumnOption>()
        return h('span', String(row.a))
      },
      renderHeaderCell: ({ column }, h) => {
        expectTypeOf(h).toEqualTypeOf<typeof import('vue').h>()
        return h('b', column.title)
      },
      renderFooterCell: ({ row, rowIndex }, h) => {
        expectTypeOf(h).toEqualTypeOf<typeof import('vue').h>()
        expectTypeOf(rowIndex).toEqualTypeOf<number>()
        return h('i', String(row.a))
      },
      filter: {
        filterList: [{ value: 1, label: 'one', selected: false }],
        filterConfirm: (filterList) => {
          expectTypeOf(filterList[0].selected).toEqualTypeOf<boolean>()
        },
        filterIcon: (h) => {
          expectTypeOf(h).toEqualTypeOf<typeof import('vue').h>()
          return h('i')
        },
      },
    }

    // 只做类型检查，不执行
    const typeErrors = () => {
      // @ts-expect-error h 不再是 any
      column.renderBodyCell!({ row: {}, column, rowIndex: 0 }, 1)
      // @ts-expect-error renderFooterCell 的参数需要 rowIndex
      column.renderFooterCell!({ row: {}, column }, h)
      // @ts-expect-error filterIcon 的参数是 h
      column.filter!.filterIcon!('h')
    }
    expect(typeof typeErrors).toBe('function')

    expect(column.renderFooterCell!({ row: { a: 1 }, column, rowIndex: 0 }, h)).toBeTruthy()
    expect(column.filter!.filterIcon!(h)).toBeTruthy()
  })
})

/*
 * COL-11：fixed 可以是 ''（右键菜单取消固定列、恢复列状态时写入），固定列工具函数使用 ColumnOption[]
 */
describe('column fixed type (COL-11)', () => {
  it('allows \'\' for a column that is not fixed', () => {
    expectTypeOf<ColumnOption['fixed']>().toEqualTypeOf<'left' | 'right' | '' | undefined>()

    const column: ColumnOption = { key: 'a', fixed: '' }
    // @ts-expect-error 只能是 'left' | 'right' | ''
    column.fixed = 'center'

    expect(column.fixed).toBe('center')
  })

  it('types the column fixed helpers with ColumnOption[]', () => {
    expectTypeOf(setColumnFixed).returns.toEqualTypeOf<ColumnOption[]>()
    expectTypeOf(cancelColumnFixed).returns.toEqualTypeOf<ColumnOption[]>()
    expectTypeOf(restoreColumnsState).returns.toEqualTypeOf<ColumnOption[]>()
    expectTypeOf(setColumnFixed).parameter(0).toHaveProperty('cloneColumns').toEqualTypeOf<ColumnOption[]>()

    const columns: ColumnOption[] = [{ key: 'a', fixed: 'left' }, { key: 'b' }]
    const result = cancelColumnFixed({ cloneColumns: columns, colgroups: [], fixedType: 'left', enableColumnResize: false })
    expect(result.map(x => x.fixed)).toEqual(['', undefined])
  })
})

/*
 * MENU-11：ve-table 的右键菜单选项（ContextmenuOption）可以直接传给 VeContextmenu 的 options（Option[]），
 * ve-table.tsx 不再需要 as any
 */
describe('table contextmenu options type (MENU-11)', () => {
  it('contextmenuOption[] is assignable to the VeContextmenu Option[]', () => {
    expectTypeOf<ContextmenuOption[]>().toMatchTypeOf<VeContextmenuOption[]>()

    const tableOptions: ContextmenuOption[] = [
      { type: 'CUT', label: 'Cut', icon: 'cut' },
      { type: 'SEPARATOR' },
      { label: 'More', children: [{ type: 'COPY', label: 'Copy' }] },
    ]
    const menuOptions: VeContextmenuOption[] = tableOptions

    expect(menuOptions).toHaveLength(3)
  })
})
