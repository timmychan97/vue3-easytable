import veSelect from '@/ve-select'
import { later, wrapMount as mount } from '@test-utils'

describe('veSelect', () => {
  // select items
  const SELECT_ITEMS = [
    { value: 0, label: 'Apple' },
    { value: 1, label: 'Orange', selected: true },
    { value: 2, label: 'Banana' },
  ]

  it('render by value prop', () => {
    const wrapper = mount({
      render() {
        return <veSelect modelValue={SELECT_ITEMS} placeholder="姓名" />
      },
    })

    expect(wrapper.html()).toMatchSnapshot()
    wrapper.unmount()
  })

  it('render by isMultiple prop', () => {
    const wrapper = mount({
      render() {
        return (
          <veSelect
            modelValue={SELECT_ITEMS}
            placeholder="姓名"
            isMultiple
          />
        )
      },
    })

    expect(wrapper.html()).toMatchSnapshot()
    wrapper.unmount()
  })

  it('render by isInput prop', () => {
    const wrapper = mount({
      render() {
        return (
          <veSelect modelValue={SELECT_ITEMS} placeholder="姓名" isInput />
        )
      },
    })

    expect(wrapper.html()).toMatchSnapshot()
    wrapper.unmount()
  })

  it('width prop', () => {
    const wrapper = mount(veSelect, {
      propsData: {
        value: SELECT_ITEMS,
        width: 120,
      },
    })

    expect(
      wrapper.find('.ve-dropdown-dt-selected').attributes('style'),
    ).toBe('width: 120px;')
    wrapper.unmount()
  })

  it('isMultiple prop', () => {
    const wrapper = mount(veSelect, {
      propsData: {
        modelValue: SELECT_ITEMS,
        isMultiple: true,
      },
    })

    expect(wrapper.findAll('.ve-dropdown-items-multiple').length).toBe(3)
    wrapper.unmount()
  })

  it('isInput prop', () => {
    const wrapper = mount(veSelect, {
      propsData: {
        value: SELECT_ITEMS,
        isInput: true,
      },
    })

    expect(wrapper.find('.ve-select-input').exists()).toBe(true)
    wrapper.unmount()
  })

  it('on-select-change emit event', async () => {
    const wrapper = mount(veSelect, {
      propsData: {
        modelValue: SELECT_ITEMS,
      },
    })

    wrapper.findAll('.ve-dropdown-items-li')[1].trigger('click')

    expect(wrapper.emitted('on-select-change')!.length).toEqual(1)
    expect(
      (wrapper.emitted('on-select-change')![0][0] as any[]).find(x => x.selected)
        .label,
    ).toBe('Orange')
    wrapper.unmount()
  })

  // 下拉框展开/收起时，箭头图标的 class 应随之切换
  it('toggles the arrow icon class with the dropdown visibility', async () => {
    const wrapper = mount(veSelect, {
      propsData: {
        modelValue: SELECT_ITEMS,
      },
    })

    const icon = () => wrapper.find('.ve-select-toggle-icon')

    expect(icon().classes()).not.toContain('ve-select-show')

    wrapper.find('.ve-dropdown-dt-selected').trigger('click')
    await later()

    expect(icon().classes()).toContain('ve-select-show')

    wrapper.find('.ve-dropdown-dt-selected').trigger('click')
    // 等待下拉框 150ms 的隐藏定时器执行完毕
    await later(200)

    expect(icon().classes()).not.toContain('ve-select-show')
    wrapper.unmount()
  })
})
