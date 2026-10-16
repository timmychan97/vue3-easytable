import veDropdown from '@/ve-dropdown'
import { later, wrapMount as mount } from '@test-utils'
import { mount as mountDetached } from '@vue/test-utils'
import { expect, vi } from 'vitest'

describe('veDropdown', () => {
  // dropdown items
  const DROPDOWN_ITEMS = [
    { value: 0, label: 'Apple' },
    { value: 1, label: 'Orange', selected: true },
    { value: 2, label: 'Banana' },
  ]

  it('render normal', () => {
    const wrapper = mount(veDropdown, {
      propsData: {
        modelValue: DROPDOWN_ITEMS,
        showOperation: true,
        confirmFilterText: 'filter',
        resetFilterText: 'reset',
      },
      slots: {
        default: `<div>click me</div>`,
      },
    })

    expect(wrapper.html()).toMatchSnapshot()
    wrapper.unmount()
  })
  it('render with radio', () => {
    const wrapper = mount(veDropdown, {
      propsData: {
        modelValue: DROPDOWN_ITEMS,
        showRadio: true,
        showOperation: true,
        confirmFilterText: 'filter',
        resetFilterText: 'reset',
      },
      slots: {
        default: `<div>click me</div>`,
      },
    })

    expect(wrapper.html()).toMatchSnapshot()
    wrapper.unmount()
  })

  it('render with checkbox', () => {
    const wrapper = mount(veDropdown, {
      propsData: {
        modelValue: DROPDOWN_ITEMS,
        isMultiple: true,
        showOperation: true,
        confirmFilterText: 'filter',
        resetFilterText: 'reset',
      },
      slots: {
        default: `<div>click me</div>`,
      },
    })

    expect(wrapper.html()).toMatchSnapshot()
    wrapper.unmount()
  })

  it('value props', () => {
    const wrapper = mount(veDropdown, {
      propsData: {
        modelValue: DROPDOWN_ITEMS,
      },
      slots: {
        default: `<div>click me</div>`,
      },
    })

    expect(wrapper.findAll('.ve-dropdown-items-li').length).toBe(3)
    wrapper.unmount()
  })

  it('showOperation prop', () => {
    const wrapper = mount(veDropdown, {
      propsData: {
        modelValue: DROPDOWN_ITEMS,
        showOperation: true,
      },
      slots: {
        default: `<div>click me</div>`,
      },
    })

    expect(wrapper.find('.ve-dropdown-operation').exists()).toBe(true)
    wrapper.unmount()
  })

  it('isMultiple prop', () => {
    const wrapper = mount(veDropdown, {
      propsData: {
        modelValue: DROPDOWN_ITEMS,
        isMultiple: true,
      },
      slots: {
        default: `<div>click me</div>`,
      },
    })

    expect(wrapper.find('.ve-dropdown-items-multiple').exists()).toBe(true)
    wrapper.unmount()
  })

  it('placeholder prop', () => {
    const wrapper = mount(veDropdown, {
      propsData: {
        modelValue: DROPDOWN_ITEMS,
        isMultiple: true,
      },
      slots: {
        default: `<div>click me</div>`,
      },
    })

    expect(wrapper.find('.ve-dropdown-items-multiple').exists()).toBe(true)
    wrapper.unmount()
  })

  it('textAlign prop', () => {
    const wrapper = mount(veDropdown, {
      propsData: {
        modelValue: DROPDOWN_ITEMS,
        textAlign: 'center',
      },
      slots: {
        default: `<div>click me</div>`,
      },
    })

    expect(wrapper.find('.ve-dropdown-items-li-a-center').exists()).toBe(
      true,
    )
    wrapper.unmount()
  })

  it('operation text prop', () => {
    const wrapper = mount(veDropdown, {
      propsData: {
        modelValue: DROPDOWN_ITEMS,
        showOperation: true,
        confirmFilterText: 'ok',
        resetFilterText: 'cancel',
      },
      slots: {
        default: `<div>click me</div>`,
      },
    })

    expect(wrapper.find('.ve-dropdown-operation').text()).toContain('ok')
    expect(wrapper.find('.ve-dropdown-operation').text()).toContain(
      'cancel',
    )
    wrapper.unmount()
  })

  it('showRadio prop', () => {
    const wrapper = mount(veDropdown, {
      propsData: {
        modelValue: DROPDOWN_ITEMS,
        showRadio: true,
      },
      slots: {
        default: `<div>click me</div>`,
      },
    })

    expect(wrapper.findAll('.ve-radio').length).toBe(3)
    wrapper.unmount()
  })

  it('isControlled prop', () => {
    const wrapper = mount(veDropdown, {
      propsData: {
        modelValue: DROPDOWN_ITEMS,
        isControlled: true,
        visible: true,
      },
      slots: {
        default: `<div>click me</div>`,
      },
    })

    expect(wrapper.find('.ve-dropdown-dd-show').exists()).toBe(true)
    wrapper.unmount()
  })

  it('hideByItemClick prop', async () => {
    const wrapper = mount(veDropdown, {
      propsData: {
        modelValue: DROPDOWN_ITEMS,
        hideByItemClick: false,
      },
      slots: {
        default: `<div class="btn">click me</div>`,
      },
    })

    wrapper.find('.btn').trigger('click')
    await later(100)
    expect(wrapper.find('.ve-dropdown-dd-show').exists()).toBe(true)

    wrapper.find('.ve-dropdown-items-li').trigger('click')
    await later(150)
    expect(wrapper.find('.ve-dropdown-dd-show').exists()).toBe(true)

    wrapper.setProps({ hideByItemClick: true })
    await later(100)
    wrapper.find('.ve-dropdown-items-li').trigger('click')
    await later(150)
    expect(wrapper.find('.ve-dropdown-dd-show').exists()).toBe(false)
    wrapper.unmount()
  })

  it('custom-content slot', () => {
    const wrapper = mount(veDropdown, {
      propsData: {
        modelValue: DROPDOWN_ITEMS,
        isCustomContent: true,
      },
      slots: {
        'custom-content': `<div class="custom-content-slot">this is custom content</div>`,
      },
    })

    expect(wrapper.find('.custom-content-slot').exists()).toBe(true)
    wrapper.unmount()
  })

  it('on-item-select-change emit', async () => {
    const wrapper = mount(veDropdown, {
      propsData: {
        modelValue: DROPDOWN_ITEMS,
      },
      slots: {
        default: `<div class="btn">click me</div>`,
      },
    })

    wrapper.find('.btn').trigger('click')
    await later(100)

    // 改变选项
    wrapper.findAll('.ve-dropdown-items-li')[1].trigger('click')

    await later()

    const items = [
      { value: 0, label: 'Apple', selected: false },
      { value: 1, label: 'Orange', selected: true },
      { value: 2, label: 'Banana', selected: false },
    ]

    expect(wrapper.emitted('on-item-select-change')![0]).toEqual([items])
    wrapper.unmount()
  })

  it('visible change emit', async () => {
    const wrapper = mount(veDropdown, {
      propsData: {
        modelValue: DROPDOWN_ITEMS,
      },
      slots: {
        default: `<div class="btn">click me</div>`,
      },
    })

    wrapper.find('.btn').trigger('click')
    await later(100)

    wrapper.find('.btn').trigger('click')
    await later(100)

    expect(wrapper.emitted('on-dropdown-visible-change')!.length).toEqual(2)
    expect(wrapper.emitted('on-dropdown-visible-change')![0]).toEqual([
      true,
    ])
    expect(wrapper.emitted('on-dropdown-visible-change')![1]).toEqual([
      false,
    ])
    wrapper.unmount()
  })

  it('single select filter confirm emit', async () => {
    const items = [
      { value: 0, label: 'Apple', selected: false },
      { value: 1, label: 'Orange', selected: true },
      { value: 2, label: 'Banana', selected: false },
    ]

    const wrapper = mount(veDropdown, {
      propsData: {
        modelValue: items,
        showOperation: true,
        confirmFilterText: 'ok',
        resetFilterText: 'cancel',
      },
      slots: {
        default: `<div class="btn">click me</div>`,
      },
    })

    await later()
    wrapper.find('.btn').trigger('click')
    await later()
    // 改变选项
    // wrapper.findAll('.ve-dropdown-items-li')[0].trigger('click')
    ;(document.querySelectorAll('.ve-dropdown-items-li')[0] as HTMLElement).click()

    await later()

    // confirm btn click
    // wrapper.findAll('.ve-dropdown-operation-item')[1].trigger('click')
    ;(document.querySelectorAll('.ve-dropdown-operation-item')[1] as HTMLElement).click()

    await later()

    expect(wrapper.emitted('on-filter-confirm')!.length).toEqual(1)
    expect(
      (wrapper.emitted('on-filter-confirm')![0][0] as any[]).find(x => x.selected)
        .label,
    ).toEqual('Apple')
    wrapper.unmount()
  })

  it('single select filter reset emit', async () => {
    const items = [
      { value: 0, label: 'Apple', selected: false },
      { value: 1, label: 'Orange', selected: true },
      { value: 2, label: 'Banana', selected: false },
    ]

    const wrapper = mount(veDropdown, {
      propsData: {
        modelValue: items,
        showOperation: true,
        confirmFilterText: 'ok',
        resetFilterText: 'cancel',
      },
      slots: {
        default: `<div class="btn">click me</div>`,
      },
    })

    await later()

    wrapper.find('.btn').trigger('click')
    await later()

    // reset btn click
    // wrapper.findAll('.ve-dropdown-operation-item')[0].trigger('click')
    ;(document.querySelectorAll('.ve-dropdown-operation-item')[0] as HTMLElement).click()

    await later()

    expect(wrapper.emitted('on-filter-reset')!.length).toEqual(1)
    expect(
      (wrapper.emitted('on-filter-reset')![0][0] as any[]).filter(x => x.selected)
        .length,
    ).toEqual(0)
    wrapper.unmount()
  })

  it('multiple select filter confirm emit', async () => {
    const items = [
      { value: 0, label: 'Apple', selected: true },
      { value: 1, label: 'Orange', selected: true },
      { value: 2, label: 'Banana', selected: false },
    ]

    const wrapper = mount(veDropdown, {
      propsData: {
        modelValue: items,
        isMultiple: true,
        showOperation: true,
        confirmFilterText: 'ok',
        resetFilterText: 'cancel',
      },
      slots: {
        default: `<div class="btn">click me</div>`,
      },
    })

    await later()

    wrapper.find('.btn').trigger('click')
    await later()

    // 改变选项
    ;(document.querySelectorAll('.ve-checkbox')[2] as HTMLElement).click()

    await later()

    // confirm btn click
    ;(document.querySelectorAll('.ve-dropdown-operation-item')[1] as HTMLElement).click()

    await later()

    expect(wrapper.emitted('on-filter-confirm')!.length).toEqual(1)
    expect(
      (wrapper.emitted('on-filter-confirm')![0][0] as any[]).filter(x => x.selected)
        .length,
    ).toEqual(3)
    wrapper.unmount()
  })

  it('multiple select filter reset emit', async () => {
    const items = [
      { value: 0, label: 'Apple', selected: true },
      { value: 1, label: 'Orange', selected: true },
      { value: 2, label: 'Banana', selected: false },
    ]

    const wrapper = mount(veDropdown, {
      propsData: {
        modelValue: items,
        isMultiple: true,
        showOperation: true,
        confirmFilterText: 'ok',
        resetFilterText: 'cancel',
      },
      slots: {
        default: `<div class="btn">click me</div>`,
      },
    })

    await later()

    wrapper.find('.btn').trigger('click')
    await later()
    // reset btn click
    ;(document.querySelectorAll('.ve-dropdown-operation-item')[0] as HTMLElement).click()

    await later()

    expect(wrapper.emitted('on-filter-reset')!.length).toEqual(1)
    expect(
      (wrapper.emitted('on-filter-reset')![0][0] as any[]).filter(x => x.selected)
        .length,
    ).toEqual(0)
    wrapper.unmount()
  })

  it('beforeVisibleChange callback method', async () => {
    const mockBeforeVisibleChangeFn = vi.fn()
    const wrapper = mount({
      render() {
        return (
          <ve-dropdown
            hide-by-item-click={true}
            before-visible-change={args =>
              mockBeforeVisibleChangeFn(args)}
            modelValue={DROPDOWN_ITEMS}
          >
            <div class="btn" style="color:blue;cursor: pointer;">
              点击这里
            </div>
          </ve-dropdown>
        )
      },
    })

    wrapper.find('.btn').trigger('click')
    await later(100)
    expect(wrapper.find('.ve-dropdown-dd-show').exists()).toBe(true)

    expect(mockBeforeVisibleChangeFn).toHaveBeenCalledWith({
      nextVisible: true,
    })

    wrapper.find('.ve-dropdown-items-li').trigger('click')
    await later(150)

    expect(wrapper.find('.ve-dropdown-dd-show').exists()).toBe(false)
    expect(mockBeforeVisibleChangeFn).toHaveBeenCalledWith({
      nextVisible: false,
    })
    wrapper.unmount()
  })

  describe('lifecycle and timers', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    // 弹出层容器（挂在 body 上）
    function getRootEl(wrapper: any) {
      return document.getElementById(wrapper.vm.rootId)
    }

    it('rapid clicks toggle correctly when uncontrolled (DD-01)', async () => {
      vi.useFakeTimers()
      const wrapper = mount(veDropdown, {
        props: { modelValue: DROPDOWN_ITEMS },
        slots: { default: `<div class="btn">click me</div>` },
      })
      await nextTick()

      // 打开 → 关闭 → 再打开，全部在 150ms 内完成
      wrapper.find('.btn').trigger('click')
      vi.advanceTimersByTime(10)
      wrapper.find('.btn').trigger('click')
      vi.advanceTimersByTime(10)
      wrapper.find('.btn').trigger('click')
      vi.advanceTimersByTime(500)
      await nextTick()

      expect(wrapper.emitted('on-dropdown-visible-change')).toEqual([[true], [false], [true]])
      expect((wrapper.vm as any).internalVisible).toBe(true)
      expect(getRootEl(wrapper)!.querySelector('.ve-dropdown-items-li')).not.toBeNull()
      wrapper.unmount()
    })

    it('controlled visible true → false → true keeps the panel content (DD-01)', async () => {
      vi.useFakeTimers()
      const wrapper = mount(veDropdown, {
        props: { modelValue: DROPDOWN_ITEMS, isControlled: true, visible: false },
        slots: { default: `<div class="btn">click me</div>` },
      })
      await nextTick()
      await nextTick()

      // visible 的 watcher 内部会等待两个 tick
      const flush = async () => {
        for (let i = 0; i < 3; i++)
          await nextTick()
      }

      await wrapper.setProps({ visible: true })
      await flush()
      vi.advanceTimersByTime(10)
      await wrapper.setProps({ visible: false })
      await flush()
      vi.advanceTimersByTime(10)
      await wrapper.setProps({ visible: true })
      await flush()

      vi.advanceTimersByTime(500)
      await nextTick()

      expect(getRootEl(wrapper)!.querySelector('.ve-dropdown-items-li')).not.toBeNull()
      wrapper.unmount()
    })

    // 注意：wrapMount 的 attachTo 每次都会在 body 留下一个 div，所以这里不挂载到 body
    it('unmount removes the body container (DD-02)', async () => {
      const before = document.body.children.length

      for (let i = 0; i < 5; i++) {
        const wrapper = mountDetached(veDropdown, {
          props: { modelValue: DROPDOWN_ITEMS as any },
          slots: { default: `<div class="btn">click me</div>` },
        })
        await later()
        wrapper.find('.btn').trigger('click')
        await later()
        wrapper.unmount()
        await later()
      }

      expect(document.body.children.length).toBe(before)
    })

    it('unmount before the container is created leaves nothing behind (DD-02)', async () => {
      const before = document.body.children.length

      for (let i = 0; i < 5; i++) {
        const wrapper = mountDetached(veDropdown, {
          props: { modelValue: DROPDOWN_ITEMS as any },
          slots: { default: `<div class="btn">click me</div>` },
        })
        // 在 addRootElementToElement 的 nextTick 执行前卸载
        wrapper.unmount()
      }
      await later()

      expect(document.body.children.length).toBe(before)
    })

    it('the click-outside timer does not fire after unmount (DD-01)', async () => {
      vi.useFakeTimers()
      const wrapper = mount(veDropdown, {
        props: { modelValue: DROPDOWN_ITEMS },
        slots: { default: `<div class="btn">click me</div>` },
      })
      await nextTick()

      wrapper.find('.btn').trigger('click')
      vi.advanceTimersByTime(10)
      expect((wrapper.vm as any).internalVisible).toBe(true)

      // 点击外部：clickoutside 会排一个 setTimeout 去隐藏
      const hideSpy = vi.spyOn(wrapper.vm as any, 'hideDropDown')
      document.body.click()
      wrapper.unmount()

      expect(() => vi.advanceTimersByTime(1000)).not.toThrow()
      expect(hideSpy).not.toHaveBeenCalled()
    })
  })
})
