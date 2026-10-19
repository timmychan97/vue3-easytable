import veTable from '@/ve-table'
import { useFixedColumns } from '@/ve-table/src/features/fixed-columns/useFixedColumns'
import { initGroupColumns } from '@/ve-table/src/util'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'

/*
 * MOD-06：固定列的样式与 class 在表格级计算一次，表头、表体、表尾共享
 */
describe('useFixedColumns (MOD-06)', () => {
  const LAST_LEFT = 've-table-last-left-fixed-column'
  const FIRST_RIGHT = 've-table-first-right-fixed-column'

  // 分组列 G（左固定，b、c）、叶子列 a（左固定）、d、分组列 H（右固定，e、f）
  const createColumns = (): any[] => [
    {
      key: 'g',
      title: 'G',
      fixed: 'left',
      children: [
        { key: 'b', field: 'b', title: 'B', width: 50 },
        { key: 'c', field: 'c', title: 'C', width: 60 },
      ],
    },
    { key: 'a', field: 'a', title: 'A', fixed: 'left', width: 70 },
    { key: 'd', field: 'd', title: 'D', width: 100 },
    {
      key: 'h',
      title: 'H',
      fixed: 'right',
      children: [
        { key: 'e', field: 'e', title: 'E', width: 80 },
        { key: 'f', field: 'f', title: 'F', width: 90 },
      ],
    },
  ]

  function setup() {
    const { colgroups, groupColumns } = initGroupColumns(createColumns())
    const colgroupsRef = ref<any[]>(colgroups)
    return { colgroupsRef, groupColumns, fixedColumns: useFixedColumns(colgroupsRef) }
  }

  it('computes the offsets and edge classes of every leaf column by key', () => {
    const { fixedColumns } = setup()
    const info = (key: string) => fixedColumns.getColumnFixedInfo(key)

    expect(info('b').style).toEqual({ left: 0, right: '' })
    expect(info('c').style).toEqual({ left: '50px', right: '' })
    expect(info('a').style).toEqual({ left: '110px', right: '' })
    expect(info('d').style).toEqual({})
    expect(info('e').style).toEqual({ left: '', right: '90px' })
    expect(info('f').style).toEqual({ left: '', right: 0 })

    const edges = (key: string) => [info(key).class[LAST_LEFT], info(key).class[FIRST_RIGHT]]
    expect(edges('b')).toEqual([false, false])
    expect(edges('c')).toEqual([false, false])
    expect(edges('a')).toEqual([true, false])
    expect(edges('d')).toEqual([false, false])
    expect(edges('e')).toEqual([false, true])
    expect(edges('f')).toEqual([false, false])

    expect(info('a').class['ve-table-fixed-left']).toBe(true)
    expect(info('e').class['ve-table-fixed-right']).toBe(true)
    expect(info('unknown').class[LAST_LEFT]).toBe(false)
  })

  it('derives header cells (also group headers) from their first and last leaf', () => {
    const { fixedColumns, groupColumns } = setup()
    const byKey = Object.fromEntries(groupColumns.flat().map((x: any) => [x.key, x]))
    const header = (key: string) => fixedColumns.getHeaderFixedInfo(byKey[key])

    // 分组列 G：left 取第一个叶子列 b，不是最后一个左固定列（a 才是）
    expect(header('g').style).toEqual({ left: 0, right: '' })
    expect(header('g').class[LAST_LEFT]).toBe(false)
    expect(header('a').class[LAST_LEFT]).toBe(true)
    // 第二行的 c 是该行最后一个左固定单元格，但右边还有左固定列 a，不需要阴影
    // （之前表头按行判断，c 也会得到 last-left-fixed-column）
    expect(header('c').class[LAST_LEFT]).toBe(false)
    // 分组列 H：right 取最后一个叶子列 f，第一个叶子列 e 是第一个右固定列
    expect(header('h').style).toEqual({ left: '', right: 0 })
    expect(header('h').class[FIRST_RIGHT]).toBe(true)
    expect(header('e').class[FIRST_RIGHT]).toBe(true)
    expect(header('f').class[FIRST_RIGHT]).toBe(false)
    expect(header('d')).toEqual(fixedColumns.getColumnFixedInfo('d'))
  })

  it('recomputes when the colgroups change', async () => {
    const { colgroupsRef, fixedColumns } = setup()

    colgroupsRef.value = colgroupsRef.value.map((x: any) => x.key === 'b' ? { ...x, _realTimeWidth: 55 } : x)
    await nextTick()

    expect(fixedColumns.getColumnFixedInfo('a').style.left).toBe('115px')
  })

  it('the table renders the same classes in header, body and footer', () => {
    const wrapper = mount(veTable, {
      props: {
        columns: createColumns(),
        tableData: [{ rowKey: 1, a: 'a', b: 'b', c: 'c', d: 'd', e: 'e', f: 'f' }],
        footerData: [{ rowKey: 'sum', a: 'a', b: 'b', c: 'c', d: 'd', e: 'e', f: 'f' }],
        rowKeyFieldName: 'rowKey',
      },
    })

    const edgeKeys = (selector: string, cls: string) =>
      wrapper.findAll(selector).filter(x => x.classes().includes(cls)).map(x => x.text())

    expect(edgeKeys('.ve-table-body-td', LAST_LEFT)).toEqual(['a'])
    expect(edgeKeys('.ve-table-body-td', FIRST_RIGHT)).toEqual(['e'])
    expect(edgeKeys('.ve-table-footer-td', LAST_LEFT)).toEqual(['a'])
    expect(edgeKeys('.ve-table-footer-td', FIRST_RIGHT)).toEqual(['e'])
    expect(edgeKeys('.ve-table-header-th', LAST_LEFT)).toEqual(['A'])
    expect(edgeKeys('.ve-table-header-th', FIRST_RIGHT)).toEqual(['H', 'E'])

    wrapper.unmount()
  })
})
