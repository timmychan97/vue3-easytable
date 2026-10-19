import type { ColumnOption } from '@/ve-table/src/ve-table-types'
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
