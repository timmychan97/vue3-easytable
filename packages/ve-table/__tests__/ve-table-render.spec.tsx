import veTable from '@/ve-table'
import { mount } from '@vue/test-utils'

// RENDER-02 / RENDER-03 / RENDER-06：body 渲染性能相关的回归测试
describe('veTable render performance', () => {
  function createRows() {
    return [
      { rowKey: 1001, name: 'John', hobby: 'coding', address: 'Shanghai' },
      { rowKey: 1002, name: 'Dickerson', hobby: 'reading', address: 'Beijing' },
      { rowKey: 1003, name: 'Larsen', hobby: 'running', address: 'Chongqing' },
      { rowKey: 1004, name: 'Geneva', hobby: 'cooking', address: 'Xiamen' },
    ]
  }

  const COLUMNS = [
    { field: 'name', key: 'b', title: 'Name', width: 200, align: 'left' },
    { field: 'hobby', key: 'c', title: 'Hobby', width: 300, align: 'left' },
    { field: 'address', key: 'd', title: 'Address', width: '', align: 'left' },
  ]

  function getRowEls(wrapper) {
    const result = new Map<string, Element>()
    wrapper.findAll('.ve-table-body-tr').forEach((tr) => {
      result.set(tr.attributes('row-key'), tr.element)
    })
    return result
  }

  // RENDER-02：非虚拟滚动的行必须按 key 复用，不能按位置匹配
  describe('body rows are keyed (RENDER-02)', () => {
    const EXPAND_COLUMNS = [
      { field: '', key: 'a', type: 'expand', title: '', width: 50, align: 'center' },
      ...COLUMNS,
    ]

    function mountTable(tableData) {
      return mount(veTable, {
        props: {
          columns: EXPAND_COLUMNS,
          tableData,
          rowKeyFieldName: 'rowKey',
          expandOption: {
            defaultExpandedRowKeys: [1002],
            render: ({ row }) => <p class="expand-content">{row.name}</p>,
          },
        },
      })
    }

    it('inserting a row at the top keeps the DOM nodes of the existing rows', async () => {
      const rows = createRows()
      const wrapper = mountTable(rows)
      await nextTick()

      const rowElsBefore = getRowEls(wrapper)
      const expandTrBefore = wrapper.find('.ve-table-expand-tr').element
      expect(rowElsBefore.size).toBe(4)

      await wrapper.setProps({
        tableData: [{ rowKey: 1000, name: 'New', hobby: 'new', address: 'new' }, ...rows],
      })

      const rowElsAfter = getRowEls(wrapper)
      expect([...rowElsAfter.keys()]).toEqual(['1000', '1001', '1002', '1003', '1004'])
      rowElsBefore.forEach((el, key) => {
        expect(rowElsAfter.get(key)).toBe(el)
      })

      // 展开行仍紧跟在所属行之后，且没有重新挂载
      const expandTr = wrapper.find('.ve-table-expand-tr')
      expect(expandTr.element).toBe(expandTrBefore)
      expect(expandTr.element.previousElementSibling).toBe(rowElsAfter.get('1002'))
      expect(expandTr.text()).toBe('Dickerson')

      wrapper.unmount()
    })

    it('reordering rows (e.g. sorting) moves the DOM nodes instead of re-creating them', async () => {
      const rows = createRows()
      const wrapper = mountTable(rows)
      await nextTick()

      const rowElsBefore = getRowEls(wrapper)
      const expandTrBefore = wrapper.find('.ve-table-expand-tr').element

      await wrapper.setProps({ tableData: [...rows].reverse() })

      const rowElsAfter = getRowEls(wrapper)
      expect([...rowElsAfter.keys()]).toEqual(['1004', '1003', '1002', '1001'])
      rowElsBefore.forEach((el, key) => {
        expect(rowElsAfter.get(key)).toBe(el)
      })
      expect(wrapper.find('.ve-table-expand-tr').element).toBe(expandTrBefore)
      expect(expandTrBefore.previousElementSibling).toBe(rowElsAfter.get('1002'))

      wrapper.unmount()
    })
  })

  // RENDER-03：单元格只读取自己的字段，不再深度监听整行
  describe('body cells read only their own field (RENDER-03)', () => {
    it('does not traverse the whole row object', async () => {
      let probeReads = 0
      const tableData = reactive(createRows().map(row => ({
        ...row,
        // 不属于任何列的嵌套数据：深度监听会遍历到这里
        meta: {
          get probe() {
            probeReads++
            return 1
          },
        },
      })))

      const wrapper = mount(veTable, {
        props: { columns: COLUMNS, tableData, rowKeyFieldName: 'rowKey' },
      })
      await nextTick()
      expect(wrapper.findAll('.ve-table-body-td').length).toBe(12)

      // 挂载时 VTU 自己也会深度检查 props，因此只统计之后的读取：
      // 修改一个单元格，深度监听会重新遍历该行的每个单元格
      probeReads = 0
      tableData[0].name = 'Edited'
      await nextTick()

      expect(wrapper.find('tr[row-key="1001"] td[col-key="b"]').text()).toBe('Edited')
      expect(probeReads).toBe(0)

      wrapper.unmount()
    })

    it('updates the cell when its field changes in place', async () => {
      const tableData = reactive(createRows())
      const wrapper = mount(veTable, {
        props: { columns: COLUMNS, tableData, rowKeyFieldName: 'rowKey' },
      })
      await nextTick()

      tableData[1].name = 'Edited'
      await nextTick()

      expect(wrapper.find('tr[row-key="1002"] td[col-key="b"]').text()).toBe('Edited')

      wrapper.unmount()
    })

    it('follows a change of column.field', async () => {
      const wrapper = mount(veTable, {
        props: { columns: COLUMNS, tableData: createRows(), rowKeyFieldName: 'rowKey' },
      })
      await nextTick()

      expect(wrapper.find('tr[row-key="1001"] td[col-key="b"]').text()).toBe('John')

      // 同一个列 key，换成另一个字段
      await wrapper.setProps({
        columns: [{ ...COLUMNS[0], field: 'address' }, ...COLUMNS.slice(1)],
      })
      await nextTick()

      expect(wrapper.find('tr[row-key="1001"] td[col-key="b"]').text()).toBe('Shanghai')

      wrapper.unmount()
    })
  })

  // RENDER-06：滚动条宽度为 0（覆盖式滚动条）时也只测量一次
  describe('scrollbar width (RENDER-06)', () => {
    it('measures a 0px scrollbar width only once', async () => {
      const appendSpy = vi.spyOn(document.body, 'appendChild')
      const countProbes = () =>
        appendSpy.mock.calls.filter(([el]) => (el as HTMLElement).className === 've-scrollbar-wrap').length

      const wrapper = mount(veTable, {
        props: {
          columns: COLUMNS,
          tableData: createRows(),
          // rowKeyFieldName 开启单元格选择 → 渲染编辑框，编辑框的 props 需要滚动条宽度
          rowKeyFieldName: 'rowKey',
        },
      })
      await nextTick()

      // 触发多次重新渲染
      for (const rowKey of ['1001', '1002', '1003']) {
        await wrapper.find(`tr[row-key="${rowKey}"] td[col-key="c"]`).trigger('mousedown')
        await wrapper.setProps({ tableData: createRows() })
      }

      // jsdom 中测得的宽度恒为 0，相当于 macOS / 移动端的覆盖式滚动条
      expect(countProbes()).toBe(1)

      wrapper.unmount()
      appendSpy.mockRestore()
    })
  })
})
