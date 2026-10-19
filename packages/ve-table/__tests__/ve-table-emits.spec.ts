import veTable from '@/ve-table'
import { mount } from '@vue/test-utils'

// INFRA-06：VeTable 声明 emits，组件事件的监听器不再作为属性透传到根元素上
describe('veTable emits (INFRA-06)', () => {
  const TABLE_DATA = [
    { rowKey: 1001, name: 'John' },
    { rowKey: 1002, name: 'Dickerson' },
  ]
  const COLUMNS = [{ field: 'name', key: 'a', title: 'Name' }]

  it('declares every emitted event', () => {
    const emits = (veTable as any).emits
    const declared = Array.isArray(emits) ? emits : Object.keys(emits ?? {})
    expect(declared).toEqual(['on-row-insert'])
  })

  it('the on-row-insert listener is an emit listener, not a fallthrough attribute', () => {
    const onRowInsert = vi.fn()
    const wrapper = mount(veTable, {
      props: {
        columns: COLUMNS,
        tableData: TABLE_DATA,
        rowKeyFieldName: 'rowKey',
        rowInsertOption: { enable: true },
      },
      attrs: {
        'onOnRowInsert': onRowInsert,
        'data-test': 'table',
      },
    })
    const vm = wrapper.vm as any

    // 组件事件的监听器不出现在 $attrs 中；普通属性仍然透传到根元素
    expect(Object.keys(vm.$attrs)).toEqual(['data-test'])
    expect(wrapper.attributes('data-test')).toBe('table')

    vm.handleRowInsert({ insertRowIndex: 1 })
    expect(onRowInsert).toHaveBeenCalledTimes(1)
    expect(onRowInsert).toHaveBeenCalledWith({ insertRowIndex: 1 })
    expect(wrapper.emitted('on-row-insert')).toEqual([[{ insertRowIndex: 1 }]])

    wrapper.unmount()
  })
})
