import veTable from '@/ve-table'
import { getVirtualRenderRange, later, mockVirtualScrollLayout } from '@test-utils'
import { mount } from '@vue/test-utils'

/*
 * INFRA-08：可选的用户选项 / 回调不存在时不能抛错
 * INFRA-11：用户回调抛出异常时通过 safeCall 记录，不影响表格内部流程
 */
describe('veTable optional and throwing user callbacks', () => {
  const TABLE_DATA = [
    { rowKey: 1001, name: 'John', age: 25 },
    { rowKey: 1002, name: 'Dickerson', age: 20 },
    { rowKey: 1003, name: 'Larsen', age: 18 },
  ]

  let vueErrors: unknown[] = []
  function mountTable(props: Record<string, any>) {
    vueErrors = []
    return mount(veTable, {
      props: {
        tableData: TABLE_DATA,
        rowKeyFieldName: 'rowKey',
        ...props,
      } as any,
      global: {
        config: {
          errorHandler: (err: unknown) => {
            vueErrors.push(err)
          },
        },
      },
    })
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('missing optional options and callbacks (INFRA-08)', () => {
    const SORT_COLUMNS = [
      { field: 'name', key: 'a', title: 'Name' },
      { field: 'age', key: 'b', title: 'Age', sortBy: '' },
    ]

    async function clickSort(wrapper: any) {
      await wrapper.find('.ve-table-sort').trigger('click')
      await later()
    }

    function sortIconStates(wrapper: any) {
      return {
        asc: wrapper.find('.ve-table-sort-icon-top').classes().includes('active'),
        desc: wrapper.find('.ve-table-sort-icon-bottom').classes().includes('active'),
      }
    }

    it('a sortable column without sortOption does not throw on click', async () => {
      const wrapper = mountTable({ columns: SORT_COLUMNS })

      await clickSort(wrapper)

      expect(vueErrors).toEqual([])
      expect(sortIconStates(wrapper)).toEqual({ asc: true, desc: false })

      wrapper.unmount()
    })

    it('a sortOption without sortChange does not throw on click', async () => {
      const wrapper = mountTable({ columns: SORT_COLUMNS, sortOption: { sortAlways: true } })

      await clickSort(wrapper)
      await clickSort(wrapper)

      expect(vueErrors).toEqual([])
      expect(sortIconStates(wrapper)).toEqual({ asc: false, desc: true })

      wrapper.unmount()
    })

    it('sortChange is still called with the sort columns', async () => {
      const sortChange = vi.fn()
      const wrapper = mountTable({ columns: SORT_COLUMNS, sortOption: { sortChange } })

      await clickSort(wrapper)

      expect(sortChange).toHaveBeenCalledTimes(1)
      expect(sortChange.mock.calls[0][0]).toEqual({ age: 'asc' })

      wrapper.unmount()
    })

    it('a checkbox column without checkboxOption renders the header', () => {
      const wrapper = mountTable({
        columns: [
          { field: '', key: 'sel', type: 'checkbox', title: '' },
          { field: 'name', key: 'a', title: 'Name' },
        ],
      })

      expect(vueErrors).toEqual([])
      expect(wrapper.find('.ve-table-header-tr .ve-table-checkbox-wrapper').exists()).toBe(true)
      expect(wrapper.findAll('.ve-table-body-tr .ve-table-checkbox-wrapper').length).toBe(3)

      wrapper.unmount()
    })

    it('hideSelectAll still hides the header checkbox', () => {
      const wrapper = mountTable({
        columns: [
          { field: '', key: 'sel', type: 'checkbox', title: '' },
          { field: 'name', key: 'a', title: 'Name' },
        ],
        checkboxOption: { hideSelectAll: true },
      })

      expect(wrapper.find('.ve-table-header-tr .ve-table-checkbox-wrapper').exists()).toBe(false)

      wrapper.unmount()
    })
  })

  // INFRA-13：排序、单元格 class、自定义事件工厂和事件、筛选回调抛出异常时只记录，不影响渲染和表格内部处理
  describe('more throwing callbacks go through safeCall (INFRA-13)', () => {
    const COLUMNS = [
      { field: 'name', key: 'a', title: 'Name' },
      { field: 'age', key: 'b', title: 'Age', sortBy: '' },
    ]
    const FOOTER_DATA = [{ rowKey: 'f1', name: 'sum', age: 63 }]

    function boom(name: string) {
      return () => {
        throw new Error(`${name} boom`)
      }
    }

    function loggedNames(consoleError: any) {
      return consoleError.mock.calls.map((call: any[]) => String(call[0]))
    }

    it('a throwing sortChange is logged and the sort still changes', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const wrapper = mountTable({ columns: COLUMNS, sortOption: { sortChange: boom('sortChange') } })

      await wrapper.find('.ve-table-sort').trigger('click')
      await later()

      expect(vueErrors).toEqual([])
      expect(loggedNames(consoleError).some((x: string) => x.includes('sortOption.sortChange'))).toBe(true)
      expect(wrapper.find('.ve-table-sort-icon-top').classes()).toContain('active')

      wrapper.unmount()
    })

    it('a throwing bodyCellClass is logged and the body still renders', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const wrapper = mountTable({
        columns: COLUMNS,
        cellStyleOption: { bodyCellClass: boom('bodyCellClass') },
      })

      expect(vueErrors).toEqual([])
      expect(wrapper.findAll('.ve-table-body-td').length).toBe(6)
      expect(loggedNames(consoleError).some((x: string) => x.includes('cellStyleOption.bodyCellClass'))).toBe(true)

      wrapper.unmount()
    })

    const FACTORIES = [
      'bodyRowEvents',
      'bodyCellEvents',
      'headerRowEvents',
      'headerCellEvents',
      'footerRowEvents',
      'footerCellEvents',
    ]

    it.each(FACTORIES)('a throwing eventCustomOption.%s is logged and the table still renders', (name) => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const wrapper = mountTable({
        columns: COLUMNS,
        footerData: FOOTER_DATA,
        eventCustomOption: { [name]: boom(name) },
      })

      expect(vueErrors).toEqual([])
      expect(wrapper.findAll('.ve-table-header-th').length).toBe(2)
      expect(wrapper.findAll('.ve-table-body-td').length).toBe(6)
      expect(wrapper.findAll('.ve-table-footer-td').length).toBe(2)
      expect(loggedNames(consoleError).some((x: string) => x.includes(`eventCustomOption.${name}`))).toBe(true)

      wrapper.unmount()
    })

    it.each(FACTORIES)('a truthy eventCustomOption.%s that is not a function is ignored', (name) => {
      const wrapper = mountTable({
        columns: COLUMNS,
        footerData: FOOTER_DATA,
        eventCustomOption: { [name]: { click: () => {} } },
      })

      expect(vueErrors).toEqual([])
      expect(wrapper.findAll('.ve-table-body-td').length).toBe(6)
      expect(wrapper.findAll('.ve-table-footer-td').length).toBe(2)

      wrapper.unmount()
    })

    it('a throwing cell event handler is logged and the table still handles the click', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const wrapper = mountTable({
        columns: COLUMNS,
        eventCustomOption: { bodyCellEvents: () => ({ click: boom('click') }) },
      })
      const bodyCellClick = vi.fn()
      ;(wrapper.vm as any).bodyCellClick = bodyCellClick

      await wrapper.find('.ve-table-body-td').trigger('click')
      await later()

      expect(vueErrors).toEqual([])
      expect(bodyCellClick).toHaveBeenCalledTimes(1)
      expect(loggedNames(consoleError).some((x: string) => x.includes('bodyCellEvents.click'))).toBe(true)

      wrapper.unmount()
    })

    it('throwing filterConfirm / filterReset are logged', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const wrapper = mountTable({
        columns: [
          {
            field: 'name',
            key: 'a',
            title: 'Name',
            filter: {
              filterList: [
                { value: 0, label: 'John', selected: false },
                { value: 1, label: 'Dickerson', selected: false },
              ],
              filterConfirm: boom('filterConfirm'),
              filterReset: boom('filterReset'),
            },
          },
        ],
      })

      wrapper.findAll('.ve-dropdown-items-li')[0].trigger('click')
      await later()
      // confirm
      wrapper.findAll('.ve-dropdown-operation-item')[1].trigger('click')
      await later()
      // reset
      wrapper.findAll('.ve-dropdown-operation-item')[0].trigger('click')
      await later()

      expect(vueErrors).toEqual([])
      const names = loggedNames(consoleError)
      expect(names.some((x: string) => x.includes('filter.filterConfirm'))).toBe(true)
      expect(names.some((x: string) => x.includes('filter.filterReset'))).toBe(true)

      wrapper.unmount()
    })
  })

  // INFRA-16：渲染时调用的单元格合并、是否可展开、筛选图标 / 自定义筛选内容抛出异常时只记录，表格照常渲染
  describe('render-time callbacks go through safeCall (INFRA-16)', () => {
    const COLUMNS = [
      { field: 'name', key: 'a', title: 'Name' },
      { field: 'age', key: 'b', title: 'Age' },
    ]
    const FOOTER_DATA = [{ rowKey: 'f1', name: 'sum', age: 63 }]

    function boom(name: string) {
      return () => {
        throw new Error(`${name} boom`)
      }
    }

    function logged(consoleError: any, name: string) {
      return consoleError.mock.calls.some((call: any[]) => String(call[0]).includes(name))
    }

    it('a throwing bodyCellSpan is logged and the cells are not merged', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const wrapper = mountTable({ columns: COLUMNS, cellSpanOption: { bodyCellSpan: boom('bodyCellSpan') } })

      expect(vueErrors).toEqual([])
      expect(wrapper.findAll('.ve-table-body-td').length).toBe(6)
      expect(logged(consoleError, 'cellSpanOption.bodyCellSpan')).toBe(true)

      wrapper.unmount()
    })

    it('a throwing footerCellSpan is logged and the cells are not merged', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const wrapper = mountTable({
        columns: COLUMNS,
        footerData: FOOTER_DATA,
        cellSpanOption: { footerCellSpan: boom('footerCellSpan') },
      })

      expect(vueErrors).toEqual([])
      expect(wrapper.findAll('.ve-table-footer-td').length).toBe(2)
      expect(logged(consoleError, 'cellSpanOption.footerCellSpan')).toBe(true)

      wrapper.unmount()
    })

    it('a throwing expandable is logged and the row is not expandable', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const wrapper = mountTable({
        columns: [{ field: '', key: 'e', type: 'expand', title: '' }, ...COLUMNS],
        expandOption: {
          expandable: ({ rowIndex }: { rowIndex: number }) => {
            if (rowIndex === 1)
              throw new Error('expandable boom')
            return true
          },
          render: () => 'detail',
        },
      })

      expect(vueErrors).toEqual([])
      expect(wrapper.findAll('.ve-table-body-tr').length).toBe(3)
      // 抛出异常的第 2 行没有展开图标
      expect(wrapper.findAll('.ve-table-body-tr').map(tr => tr.find('.ve-table-row-expand-icon').exists()))
        .toEqual([true, false, true])
      expect(logged(consoleError, 'expandOption.expandable')).toBe(true)

      wrapper.unmount()
    })

    it('a throwing filterCustom.render / filterIcon is logged and the header still renders', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const wrapper = mountTable({
        columns: [
          {
            field: 'name',
            key: 'a',
            title: 'Name',
            filterCustom: { render: boom('render'), filterIcon: boom('filterIcon') },
          },
          {
            field: 'age',
            key: 'b',
            title: 'Age',
            filter: {
              filterList: [{ value: 0, label: '20', selected: false }],
              filterIcon: boom('filterIcon'),
            },
          },
        ],
      })

      expect(vueErrors).toEqual([])
      expect(wrapper.findAll('.ve-table-header-th').length).toBe(2)
      expect(wrapper.findAll('.ve-table-body-td').length).toBe(6)
      // 图标回退为默认的筛选图标
      expect(wrapper.findAll('.ve-table-filter-icon .iconfont-vet').length).toBe(2)
      expect(logged(consoleError, 'filterCustom.render')).toBe(true)
      expect(logged(consoleError, 'filterCustom.filterIcon')).toBe(true)
      expect(logged(consoleError, 'filter.filterIcon')).toBe(true)

      wrapper.unmount()
    })

    // renderBodyCell 等单元格渲染函数不经过 safeCall：与 Vue 自身的渲染函数一样，错误交给应用处理
    it('a throwing renderBodyCell is not swallowed', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      let mountError: unknown
      try {
        mountTable({
          columns: [{ field: 'name', key: 'a', title: 'Name', renderBodyCell: boom('renderBodyCell') }],
        }).unmount()
      }
      catch (error) {
        mountError = error
      }

      expect([mountError, ...vueErrors].some(x => String(x).includes('renderBodyCell boom'))).toBe(true)
      // 没有经过 safeCall 的记录
      expect(logged(consoleError, 'callback threw')).toBe(false)
    })
  })

  describe('throwing callbacks go through safeCall (INFRA-11)', () => {
    const EDIT_COLUMNS = [
      { field: 'name', key: 'name', title: 'Name', edit: true },
      { field: 'age', key: 'age', title: 'Age', edit: true },
    ]

    it('a throwing beforeStartCellEditing cancels editing and is logged', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const wrapper = mountTable({
        columns: EDIT_COLUMNS,
        editOption: {
          beforeStartCellEditing: () => {
            throw new Error('start boom')
          },
        },
      })
      const vm = wrapper.vm as any

      expect(() => vm.startEditingCell({ rowKey: 1001, colKey: 'name' })).not.toThrow()
      await later()

      expect(vm.isCellEditing).toBe(false)
      expect(vm.editingCell.rowKey).not.toBe(1001)
      expect(consoleError).toHaveBeenCalledTimes(1)
      expect(consoleError.mock.calls[0][0]).toContain('beforeStartCellEditing')

      wrapper.unmount()
    })

    it('beforeStartCellEditing returning false still cancels, other values allow editing', async () => {
      let allow: unknown = false
      const wrapper = mountTable({
        columns: EDIT_COLUMNS,
        editOption: { beforeStartCellEditing: () => allow },
      })
      const vm = wrapper.vm as any

      vm.startEditingCell({ rowKey: 1001, colKey: 'name' })
      await later()
      expect(vm.isCellEditing).toBe(false)

      allow = undefined
      vm.startEditingCell({ rowKey: 1001, colKey: 'name' })
      await later()
      expect(vm.isCellEditing).toBe(true)

      wrapper.unmount()
    })

    describe('virtual scroll', () => {
      const MAX_HEIGHT = 500
      const ROW_HEIGHT = 40
      const VS_DATA = Array.from({ length: 1000 }, (_, i) => ({ rowKey: i, name: `name-${i}` }))

      let layout: ReturnType<typeof mockVirtualScrollLayout>
      beforeAll(() => {
        layout = mockVirtualScrollLayout({ containerHeight: MAX_HEIGHT, rowHeight: () => ROW_HEIGHT })
      })
      afterAll(() => {
        layout.restore()
      })

      async function settle() {
        await later()
        await later()
      }

      it('a throwing scrolling callback still lets the rows follow the scroll', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
        const scrolling = vi.fn(() => {
          throw new Error('scrolling boom')
        })
        const wrapper = mountTable({
          columns: [{ field: 'name', key: 'a', title: 'Name' }],
          tableData: VS_DATA,
          maxHeight: MAX_HEIGHT,
          virtualScrollOption: { enable: true, scrolling },
        })
        ;(wrapper as any).triggerResizeObserver({ width: MAX_HEIGHT })
        await settle()

        const scrollTop = 4000
        const containerEl = wrapper.find('.ve-table-container').element as HTMLElement
        containerEl.scrollTop = scrollTop
        containerEl.dispatchEvent(new Event('scroll'))
        await settle()

        const range = getVirtualRenderRange({
          count: 1000,
          viewportHeight: MAX_HEIGHT,
          rowHeight: () => ROW_HEIGHT,
          overscan: 5,
          scrollTop,
        })
        const renderedKeys = wrapper
          .findAll('.ve-table-body-tr')
          .map(tr => Number(tr.attributes('row-key')))

        expect(scrolling).toHaveBeenCalled()
        expect(renderedKeys[0]).toBe(range.renderStartIndex)
        expect(renderedKeys[renderedKeys.length - 1]).toBe(range.renderEndIndex)
        expect(consoleError).toHaveBeenCalled()
        expect(consoleError.mock.calls[0][0]).toContain('virtualScrollOption.scrolling')
        expect(vueErrors).toEqual([])

        wrapper.unmount()
      })
    })
  })
})
