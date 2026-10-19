import type {
  ColumnFilterItem,
  ColumnFilterOption,
  ColumnFixedType,
  ColumnOption,
  RenderBodyCellParams,
  RenderFooterCellParams,
  RenderH,
  RenderHeaderCellParams,
} from '../src/index'
import { expectTypeOf } from 'vitest'
import { h } from 'vue'
import { VeTable } from '../src/index'

/*
 * INFRA-17：列配置的类型从包入口导出（只导出类型），columns prop 的类型是 ColumnOption[]
 * （由 vue-tsc 检查；运行时只确认入口仍然可以导入）
 */
describe('column types from the package entry (INFRA-17)', () => {
  it('exports the column and render callback types', () => {
    expectTypeOf<ColumnOption['fixed']>().toEqualTypeOf<ColumnFixedType | undefined>()
    expectTypeOf<ColumnOption['filter']>().toEqualTypeOf<ColumnFilterOption | undefined>()
    expectTypeOf<ColumnFilterOption['filterList']>().toEqualTypeOf<ColumnFilterItem[]>()
    expectTypeOf<RenderH>().toEqualTypeOf<typeof h>()
    expectTypeOf<RenderBodyCellParams['rowIndex']>().toEqualTypeOf<number>()
    expectTypeOf<RenderHeaderCellParams['column']>().toEqualTypeOf<ColumnOption>()
    expectTypeOf<RenderFooterCellParams['rowIndex']>().toEqualTypeOf<number>()
  })

  it('accepts numeric column keys and group columns without key', () => {
    // 数字列 key（包括 0）也是有效的列 key（SEL-14）；分组表头列可以没有 key
    const columns: ColumnOption[] = [
      { key: 0, field: 'a' },
      { title: 'group', children: [{ key: 'b', field: 'b' }] },
    ]
    expectTypeOf<ColumnOption['key']>().toEqualTypeOf<string | number | undefined>()
    expect(columns.length).toBe(2)
  })

  it('types the columns prop as ColumnOption[]', () => {
    type Props = InstanceType<typeof VeTable>['$props']
    expectTypeOf<Props['columns']>().toEqualTypeOf<ColumnOption[]>()

    // 只做类型检查，不执行
    const typeErrors = () => {
      // @ts-expect-error columns 的元素必须是列配置
      h(VeTable, { columns: [1, 2], tableData: [] })
    }
    expect(typeof typeErrors).toBe('function')
    expect(VeTable).toBeTruthy()
  })
})
