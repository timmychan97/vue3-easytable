import veTable from '@/ve-table'
import { later, wrapMount as mount } from '@test-utils'
import { expect, vi } from 'vitest'

/*
 * 列状态：隐藏/显示列、columns 变化时，列宽拖动结果与右键固定列状态的保留
 */
describe('veTable column state', () => {
  const TABLE_DATA = [
    { a: 'a1', b: 'b1', c: 'c1', d: 'd1', e: 'e1', rowKey: '1' },
    { a: 'a2', b: 'b2', c: 'c2', d: 'd2', e: 'e2', rowKey: '2' },
  ]

  const createColumns = (): any[] => [
    { field: 'a', key: 'a', title: 'A', width: 100 },
    { field: 'b', key: 'b', title: 'B', width: 100 },
    { field: 'c', key: 'c', title: 'C', width: 100 },
    { field: 'd', key: 'd', title: 'D', width: 100 },
    { field: 'e', key: 'e', title: 'E', width: 100 },
  ]

  const mountTable = (props: Record<string, any> = {}) =>
    mount(veTable, {
      props: {
        columns: createColumns(),
        tableData: TABLE_DATA,
        rowKeyFieldName: 'rowKey',
        ...props,
      },
    })

  const fixedOf = (vm: any) =>
    Object.fromEntries(vm.colgroups.map((x: any) => [x.key, x.fixed || '']))

  // 通过表头右键菜单执行固定列动作（与用户点击菜单项走同一路径）
  const headerMenuAction = async (vm: any, colKey: string, type: string) => {
    vm.setRangeCellSelection({
      startRowKey: '1',
      startColKey: colKey,
      endRowKey: '2',
      endColKey: colKey,
    })
    await later()
    vm.headerContextmenuItemClick(type)
    await later()
  }

  describe('hide / show columns (COL-03)', () => {
    it('does not mutate the user\'s defaultHiddenColumnKeys', async () => {
      const defaultHiddenColumnKeys = ['b', 'c']
      const wrapper = mountTable({
        columnHiddenOption: { defaultHiddenColumnKeys },
      })
      await later()
      const vm = wrapper.vm as any

      vm.showColumnsByKeys(['b'])
      await later()

      expect(defaultHiddenColumnKeys).toEqual(['b', 'c'])
      expect(vm.colgroups.map((x: any) => x.key)).toEqual(['a', 'b', 'd', 'e'])

      wrapper.unmount()
    })

    it('keeps resized column widths', async () => {
      const wrapper = mountTable({
        columnWidthResizeOption: { enable: true },
      })
      await later()
      const vm = wrapper.vm as any

      vm.setColumnWidth({ colKey: 'a', width: 180 })
      vm.setColumnWidth({ colKey: 'd', width: 60 })
      await later()

      vm.hideColumnsByKeys(['e'])
      await later()

      const widthOf = (key: string) =>
        vm.colgroups.find((x: any) => x.key === key)._columnResizeWidth
      expect(widthOf('a')).toBe(180)
      expect(widthOf('d')).toBe(60)
      expect(widthOf('b')).toBe(100)

      vm.showColumnsByKeys(['e'])
      await later()

      expect(widthOf('a')).toBe(180)
      expect(widthOf('d')).toBe(60)
      expect(widthOf('e')).toBe(100)

      wrapper.unmount()
    })

    it('keeps columns fixed from the contextmenu', async () => {
      const wrapper = mountTable({
        contextmenuHeaderOption: { contextmenus: [] },
      })
      await later()
      const vm = wrapper.vm as any

      await headerMenuAction(vm, 'b', 'LEFT_FIXED_COLUMN_TO')
      await headerMenuAction(vm, 'e', 'RIGHT_FIXED_COLUMN_TO')
      expect(fixedOf(vm)).toEqual({ a: 'left', b: 'left', c: '', d: '', e: 'right' })

      vm.hideColumnsByKeys(['c'])
      await later()
      expect(fixedOf(vm)).toEqual({ a: 'left', b: 'left', d: '', e: 'right' })

      vm.showColumnsByKeys(['c'])
      await later()
      expect(fixedOf(vm)).toEqual({ a: 'left', b: 'left', c: '', d: '', e: 'right' })

      wrapper.unmount()
    })

    it('keeps a fixed column unfixed after "cancel left fixed column to"', async () => {
      const columns = createColumns()
      columns[0].fixed = 'left'
      const wrapper = mountTable({
        columns,
        contextmenuHeaderOption: { contextmenus: [] },
      })
      await later()
      const vm = wrapper.vm as any

      await headerMenuAction(vm, 'c', 'CANCEL_LEFT_FIXED_COLUMN_TO')
      expect(fixedOf(vm).a).toBe('')

      vm.hideColumnsByKeys(['e'])
      await later()
      expect(fixedOf(vm)).toEqual({ a: '', b: '', c: '', d: '' })

      wrapper.unmount()
    })

    // 重新显示的列位于固定区域中间时，跟随相邻列固定，避免固定列不连续
    it('fixes a re-shown column that sits inside a fixed region', async () => {
      const wrapper = mountTable({
        contextmenuHeaderOption: { contextmenus: [] },
      })
      await later()
      const vm = wrapper.vm as any

      vm.hideColumnsByKeys(['b', 'd'])
      await later()
      await headerMenuAction(vm, 'c', 'LEFT_FIXED_COLUMN_TO')
      expect(fixedOf(vm)).toEqual({ a: 'left', c: 'left', e: '' })

      vm.showColumnsByKeys(['b', 'd'])
      await later()
      expect(fixedOf(vm)).toEqual({ a: 'left', b: 'left', c: 'left', d: '', e: '' })

      wrapper.unmount()
    })

    it('keeps the configured fixed of a column shown for the first time', async () => {
      const columns = createColumns()
      columns[0].fixed = 'left'
      columns[4].fixed = 'right'
      const wrapper = mountTable({
        columns,
        columnHiddenOption: { defaultHiddenColumnKeys: ['a', 'e'] },
      })
      await later()
      const vm = wrapper.vm as any

      vm.showColumnsByKeys(['a', 'e'])
      await later()
      expect(fixedOf(vm)).toEqual({ a: 'left', b: '', c: '', d: '', e: 'right' })

      wrapper.unmount()
    })
  })

  describe('columns prop change (COL-04)', () => {
    it('rebuilds the columns once per change', async () => {
      const wrapper = mountTable()
      await later()
      const vm = wrapper.vm as any

      const initGroupColumnsSpy = vi.spyOn(vm, 'initGroupColumns')
      const resetTimeBefore = vm.columnsOptionResetTime

      await wrapper.setProps({ columns: createColumns().slice(0, 3) })
      await later()

      expect(vm.colgroups.map((x: any) => x.key)).toEqual(['a', 'b', 'c'])
      expect(initGroupColumnsSpy).toHaveBeenCalledTimes(1)
      expect(vm.columnsOptionResetTime).toBe(resetTimeBefore + 1)

      wrapper.unmount()
    })

    it('still builds the columns on mount', () => {
      const wrapper = mountTable({ columnWidthResizeOption: { enable: true } })
      const vm = wrapper.vm as any

      expect(vm.colgroups.map((x: any) => x.key)).toEqual(['a', 'b', 'c', 'd', 'e'])
      expect(vm.colgroups.every((x: any) => x._columnResizeWidth === 100)).toBe(true)
      expect(wrapper.findAll('.ve-table-header-th').length).toBe(5)

      wrapper.unmount()
    })
  })

  // COL-09：defaultHiddenColumnKeys 只在首次初始化时生效，columns 变化时保留运行时隐藏 / 显示的列
  describe('columns prop change keeps runtime hidden columns (COL-09)', () => {
    const keysOf = (vm: any) => vm.colgroups.map((x: any) => x.key)

    it('keeps a column hidden at runtime', async () => {
      const wrapper = mountTable({
        columnHiddenOption: { defaultHiddenColumnKeys: ['b'] },
      })
      await later()
      const vm = wrapper.vm as any

      vm.hideColumnsByKeys(['d'])
      await later()
      expect(keysOf(vm)).toEqual(['a', 'c', 'e'])

      await wrapper.setProps({ columns: createColumns() })
      await later()

      expect(keysOf(vm)).toEqual(['a', 'c', 'e'])

      wrapper.unmount()
    })

    it('keeps a default hidden column that was shown at runtime', async () => {
      const wrapper = mountTable({
        columnHiddenOption: { defaultHiddenColumnKeys: ['b'] },
      })
      await later()
      const vm = wrapper.vm as any

      vm.showColumnsByKeys(['b'])
      await later()
      expect(keysOf(vm)).toEqual(['a', 'b', 'c', 'd', 'e'])

      await wrapper.setProps({ columns: createColumns() })
      await later()

      expect(keysOf(vm)).toEqual(['a', 'b', 'c', 'd', 'e'])

      wrapper.unmount()
    })

    it('still applies defaultHiddenColumnKeys on mount', () => {
      const wrapper = mountTable({
        columnHiddenOption: { defaultHiddenColumnKeys: ['b', 'd'] },
      })
      const vm = wrapper.vm as any

      expect(keysOf(vm)).toEqual(['a', 'c', 'e'])

      wrapper.unmount()
    })

    it('behaves the same without defaultHiddenColumnKeys', async () => {
      const wrapper = mountTable()
      await later()
      const vm = wrapper.vm as any

      vm.hideColumnsByKeys(['d'])
      await later()

      await wrapper.setProps({ columns: createColumns() })
      await later()

      expect(keysOf(vm)).toEqual(['a', 'b', 'c', 'e'])

      wrapper.unmount()
    })
  })

  // COL-08：重新生成列（隐藏/显示列、右键固定列、columns 变化）后，表头排序状态不能退回配置值
  describe('sort state across column rebuilds (COL-08)', () => {
    const createSortColumns = (): any[] => {
      const columns = createColumns()
      columns[1].sortBy = ''
      columns[2].sortBy = 'asc'
      return columns
    }

    // 每个可排序列的表头状态：'asc' | 'desc' | ''
    const sortStateOf = (wrapper: any) =>
      Object.fromEntries(
        wrapper
          .findAll('.ve-table-header-th')
          .filter((th: any) => th.find('.ve-table-sort').exists())
          .map((th: any) => {
            const asc = th.find('.ve-table-sort-icon-top').classes().includes('active')
            const desc = th.find('.ve-table-sort-icon-bottom').classes().includes('active')
            return [th.text(), asc ? 'asc' : desc ? 'desc' : '']
          }),
      )

    const clickSort = async (wrapper: any, title: string) => {
      const th = wrapper.findAll('.ve-table-header-th').find((x: any) => x.text() === title)
      await th.find('.ve-table-sort').trigger('click')
      await later()
    }

    it('keeps the sort after hiding and showing a column', async () => {
      const sortChange = vi.fn()
      const wrapper = mountTable({ columns: createSortColumns(), sortOption: { sortChange } })
      await later()
      const vm = wrapper.vm as any

      await clickSort(wrapper, 'B')
      expect(sortStateOf(wrapper)).toEqual({ B: 'asc', C: '' })

      vm.hideColumnsByKeys(['d'])
      await later()
      expect(sortStateOf(wrapper)).toEqual({ B: 'asc', C: '' })

      vm.showColumnsByKeys(['d'])
      await later()
      expect(sortStateOf(wrapper)).toEqual({ B: 'asc', C: '' })

      // 下一次点击从保留的状态继续
      await clickSort(wrapper, 'B')
      expect(sortStateOf(wrapper)).toEqual({ B: 'desc', C: '' })
      expect(sortChange.mock.calls.at(-1)[0]).toEqual({ b: 'desc', c: '' })

      wrapper.unmount()
    })

    it('keeps the sort after fixing a column from the contextmenu', async () => {
      const wrapper = mountTable({
        columns: createSortColumns(),
        contextmenuHeaderOption: { contextmenus: [] },
      })
      await later()
      const vm = wrapper.vm as any

      await clickSort(wrapper, 'B')
      await clickSort(wrapper, 'B')
      expect(sortStateOf(wrapper)).toEqual({ B: 'desc', C: '' })

      await headerMenuAction(vm, 'a', 'LEFT_FIXED_COLUMN_TO')
      expect(fixedOf(vm).a).toBe('left')
      expect(sortStateOf(wrapper)).toEqual({ B: 'desc', C: '' })

      wrapper.unmount()
    })

    it('keeps the sort when columns change without a new sortBy', async () => {
      const wrapper = mountTable({ columns: createSortColumns() })
      await later()

      await clickSort(wrapper, 'B')
      expect(sortStateOf(wrapper)).toEqual({ B: 'asc', C: '' })

      const columns = createSortColumns()
      columns[0].title = 'A2'
      await wrapper.setProps({ columns })
      await later()
      expect(sortStateOf(wrapper)).toEqual({ B: 'asc', C: '' })

      wrapper.unmount()
    })

    it('applies a sortBy that the columns change sets', async () => {
      const wrapper = mountTable({ columns: createSortColumns() })
      await later()

      await clickSort(wrapper, 'B')
      expect(sortStateOf(wrapper)).toEqual({ B: 'asc', C: '' })

      const columns = createSortColumns()
      columns[1].sortBy = 'desc'
      columns[2].sortBy = ''
      await wrapper.setProps({ columns })
      await later()
      expect(sortStateOf(wrapper)).toEqual({ B: 'desc', C: '' })

      wrapper.unmount()
    })

    it('uses the configured sortBy of a column shown for the first time', async () => {
      const columns = createSortColumns()
      columns[3].sortBy = 'desc'
      const wrapper = mountTable({
        columns,
        sortOption: { multipleSort: true },
        columnHiddenOption: { defaultHiddenColumnKeys: ['d'] },
      })
      await later()
      const vm = wrapper.vm as any

      await clickSort(wrapper, 'B')
      expect(sortStateOf(wrapper)).toEqual({ B: 'asc', C: 'asc' })

      vm.showColumnsByKeys(['d'])
      await later()
      expect(sortStateOf(wrapper)).toEqual({ B: 'asc', C: 'asc', D: 'desc' })

      wrapper.unmount()
    })
  })
})
