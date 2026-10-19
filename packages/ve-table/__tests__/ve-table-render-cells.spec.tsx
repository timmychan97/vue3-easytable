import veTable from '@/ve-table'
import { getTextContentOfVNode } from '@vue3-easytable/common/utils/index'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'

// RENDER-01 / RENDER-04 / RENDER-05 / RENDER-07：单元格渲染相关的回归测试
describe('veTable cell rendering', () => {
  const TABLE_DATA = [
    { rowKey: 1001, name: 'John', hobby: 'coding' },
    { rowKey: 1002, name: 'Dickerson', hobby: 'reading' },
  ]
  const FOOTER_DATA = [{ rowKey: 0, name: 'Sum', hobby: '2' }]

  afterEach(() => {
    document.querySelectorAll('.ve-dropdown-popper').forEach(el => el.remove())
  })

  // RENDER-01：传给用户渲染回调的第二个参数必须是真正的 h，而不是组件代理
  describe('render callbacks receive the real h (RENDER-01)', () => {
    it('renderBodyCell, renderHeaderCell and renderFooterCell can call h', () => {
      const received: unknown[] = []
      const wrapper = mount(veTable, {
        props: {
          columns: [
            {
              field: 'name',
              key: 'a',
              title: 'Name',
              renderHeaderCell: ({ column }, hArg) => {
                received.push(hArg)
                return hArg('span', { class: 'h-header' }, column.title)
              },
              renderBodyCell: ({ row }, hArg) => {
                received.push(hArg)
                return hArg('span', { class: 'h-body' }, row.name)
              },
              renderFooterCell: ({ row }, hArg) => {
                received.push(hArg)
                return hArg('span', { class: 'h-footer' }, row.name)
              },
            },
            { field: 'hobby', key: 'b', title: 'Hobby' },
          ],
          tableData: TABLE_DATA,
          footerData: FOOTER_DATA,
          rowKeyFieldName: 'rowKey',
        },
      })

      expect(received.length).toBeGreaterThan(0)
      received.forEach(arg => expect(arg).toBe(h))
      expect(wrapper.find('.h-header').text()).toBe('Name')
      expect(wrapper.findAll('.h-body').map(w => w.text())).toEqual(['John', 'Dickerson'])
      expect(wrapper.find('.h-footer').text()).toBe('Sum')

      wrapper.unmount()
    })

    it('filter and custom filter callbacks can call h', async () => {
      const received: unknown[] = []
      const wrapper = mount(veTable, {
        attachTo: document.body,
        props: {
          columns: [
            {
              field: 'name',
              key: 'a',
              title: 'Name',
              filter: {
                filterList: [{ value: 0, label: 'John', selected: false }],
                filterIcon: (hArg) => {
                  received.push(hArg)
                  return hArg('i', { class: 'h-filter-icon' }, 'F')
                },
              },
            },
            {
              field: 'hobby',
              key: 'b',
              title: 'Hobby',
              filterCustom: {
                defaultVisible: true,
                render: (_params, hArg) => {
                  received.push(hArg)
                  return hArg('div', { class: 'h-filter-custom' }, 'custom')
                },
                filterIcon: (hArg) => {
                  received.push(hArg)
                  return hArg('i', { class: 'h-filter-custom-icon' }, 'C')
                },
              },
            },
          ],
          tableData: TABLE_DATA,
          rowKeyFieldName: 'rowKey',
        },
      })
      await nextTick()
      await nextTick()

      // 三个回调都调用过
      expect(received.length).toBeGreaterThanOrEqual(3)
      received.forEach(arg => expect(arg).toBe(h))
      expect(wrapper.find('.h-filter-icon').exists()).toBe(true)
      expect(wrapper.find('.h-filter-custom-icon').exists()).toBe(true)
      expect(document.querySelector('.h-filter-custom')?.textContent).toBe('custom')

      wrapper.unmount()
    })
  })

  // RENDER-04：只返回一个维度的合并配置时，另一个维度默认 1，单元格不能消失
  describe('cell span with only one dimension (RENDER-04)', () => {
    const COLUMNS = [
      { field: 'name', key: 'a', title: 'Name' },
      { field: 'hobby', key: 'b', title: 'Hobby' },
    ]

    it('body cell with only colspan keeps rowspan 1', () => {
      const wrapper = mount(veTable, {
        props: {
          columns: COLUMNS,
          tableData: TABLE_DATA,
          rowKeyFieldName: 'rowKey',
          cellSpanOption: {
            bodyCellSpan: ({ column, rowIndex }) => {
              if (rowIndex === 0 && column.key === 'a')
                return { colspan: 2 }
              if (rowIndex === 0 && column.key === 'b')
                return { rowspan: 0, colspan: 0 }
              if (rowIndex === 1 && column.key === 'a')
                return { rowspan: 1 }
            },
          },
        },
      })

      const firstRowTds = wrapper.findAll('.ve-table-body-tr')[0].findAll('td')
      expect(firstRowTds.length).toBe(1)
      expect(firstRowTds[0].text()).toBe('John')
      expect(firstRowTds[0].attributes('colspan')).toBe('2')
      expect(firstRowTds[0].attributes('rowspan')).toBe('1')

      const secondRowTds = wrapper.findAll('.ve-table-body-tr')[1].findAll('td')
      expect(secondRowTds.length).toBe(2)
      expect(secondRowTds[0].attributes('colspan')).toBe('1')

      wrapper.unmount()
    })

    it('footer cell with only colspan keeps rowspan 1', () => {
      const wrapper = mount(veTable, {
        props: {
          columns: COLUMNS,
          tableData: TABLE_DATA,
          footerData: FOOTER_DATA,
          rowKeyFieldName: 'rowKey',
          cellSpanOption: {
            footerCellSpan: ({ column }) => {
              if (column.key === 'a')
                return { colspan: 2 }
              return { rowspan: 0, colspan: 0 }
            },
          },
        },
      })

      const tds = wrapper.find('.ve-table-footer-tr').findAll('td')
      expect(tds.length).toBe(1)
      expect(tds[0].text()).toBe('Sum')
      expect(tds[0].attributes('rowspan')).toBe('1')

      wrapper.unmount()
    })

    it('a span callback returning null keeps the cell', () => {
      const wrapper = mount(veTable, {
        props: {
          columns: COLUMNS,
          tableData: TABLE_DATA,
          rowKeyFieldName: 'rowKey',
          cellSpanOption: {
            bodyCellSpan: () => null,
          },
        },
      })

      expect(wrapper.findAll('.ve-table-body-td').length).toBe(4)

      wrapper.unmount()
    })
  })

  // RENDER-05：getTextContentOfVNode 需要递归读取 VNode 的文本
  describe('getTextContentOfVNode (RENDER-05)', () => {
    it('reads the text of element VNodes, nested children and arrays', () => {
      expect(getTextContentOfVNode(h('span', 'John'))).toBe('John')
      expect(getTextContentOfVNode(h('span', 42))).toBe('42')
      expect(getTextContentOfVNode(h('div', [h('b', 'A'), ' and ', h('i', ['B', 1])]))).toBe('A and B1')
      expect(getTextContentOfVNode([h('span', 'x'), 'y'])).toBe('xy')
      expect(getTextContentOfVNode(
        <span>
          Hello
          <b>World</b>
        </span>,
      )).toBe('Hello World')
    })

    it('reads the default slot of component VNodes', () => {
      const Comp = defineComponent({ setup: (_, { slots }) => () => h('em', slots.default?.()) })
      expect(getTextContentOfVNode(h(Comp, null, { default: () => ['in', h('b', 'side')] }))).toBe('inside')
      expect(getTextContentOfVNode(<Comp>slot text</Comp>)).toBe('slot text')
    })

    it('keeps the plain value behaviour and skips empty children', () => {
      expect(getTextContentOfVNode('text')).toBe('text')
      expect(getTextContentOfVNode(12)).toBe('12')
      expect(getTextContentOfVNode(null)).toBe('')
      expect(getTextContentOfVNode(undefined)).toBe('')
      // 条件渲染留下的 false / null 子节点不应变成文本
      expect(getTextContentOfVNode(h('span', [false && h('b', 'x'), null, 'ok']))).toBe('ok')
    })

    it('the ellipsis title shows the text of a renderBodyCell VNode', () => {
      const wrapper = mount(veTable, {
        props: {
          columns: [
            {
              field: 'name',
              key: 'a',
              title: 'Name',
              ellipsis: { showTitle: true },
              renderBodyCell: ({ row }) => <span class="name">{row.name}</span>,
            },
          ],
          tableData: TABLE_DATA,
          rowKeyFieldName: 'rowKey',
        },
      })

      const titles = wrapper.findAll('.ve-table-body-td-span-ellipsis').map(w => w.attributes('title'))
      expect(titles).toEqual(['John', 'Dickerson'])

      wrapper.unmount()
    })
  })

  // RENDER-07：勾选 / 单选单元格不能渲染出多余的 column="[object Object]" 属性
  describe('checkbox and radio cells have no stray column attribute (RENDER-07)', () => {
    it.each([
      ['checkbox', { checkboxOption: {} }],
      ['radio', { radioOption: {} }],
    ])('%s cells', (type, option) => {
      const wrapper = mount(veTable, {
        props: {
          columns: [
            { field: '', key: 'sel', type, title: '' },
            { field: 'name', key: 'a', title: 'Name' },
          ],
          tableData: TABLE_DATA,
          rowKeyFieldName: 'rowKey',
          ...option,
        },
      })

      expect(wrapper.findAll(`.ve-table-${type}-wrapper`).length).toBeGreaterThan(0)
      expect(wrapper.html()).not.toContain('column=')

      wrapper.unmount()
    })
  })
})
