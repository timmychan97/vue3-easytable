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
