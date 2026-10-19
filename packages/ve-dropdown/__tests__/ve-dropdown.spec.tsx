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

  // 打开后弹出层由 <Teleport> 渲染到 body，不在组件自身的 DOM 中，只能从 document 查找
  const findInDocument = (selector: string) => document.querySelector<HTMLElement>(selector)
  const findAllInDocument = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)]

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
    expect(findInDocument('.ve-dropdown-dd-show')).not.toBeNull()

    findInDocument('.ve-dropdown-popper .ve-dropdown-items-li')!.click()
    await later(150)
    expect(findInDocument('.ve-dropdown-dd-show')).not.toBeNull()

    wrapper.setProps({ hideByItemClick: true })
    await later(100)
    findInDocument('.ve-dropdown-popper .ve-dropdown-items-li')!.click()
    await later(150)
    expect(findInDocument('.ve-dropdown-dd-show')).toBeNull()
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
    findAllInDocument('.ve-dropdown-popper .ve-dropdown-items-li')[1].click()

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
    expect(findInDocument('.ve-dropdown-dd-show')).not.toBeNull()

    expect(mockBeforeVisibleChangeFn).toHaveBeenCalledWith({
      nextVisible: true,
    })

    findInDocument('.ve-dropdown-popper .ve-dropdown-items-li')!.click()
    await later(150)

    expect(findInDocument('.ve-dropdown-dd-show')).toBeNull()
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
        // 挂载后立即卸载
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

  describe('click outside (DD-03)', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('a document click does nothing for closed dropdowns (DD-03)', async () => {
      const wrappers = [0, 1].map(() =>
        mount(veDropdown, {
          props: { modelValue: DROPDOWN_ITEMS },
          slots: { default: `<div class="btn">click me</div>` },
        }),
      )
      await later()

      vi.useFakeTimers()
      document.body.click()
      // 关闭状态的下拉框不应排任何定时器
      expect(vi.getTimerCount()).toBe(0)
      vi.advanceTimersByTime(100)

      wrappers.forEach((wrapper) => {
        expect(wrapper.emitted('on-dropdown-visible-change')).toBeUndefined()
        wrapper.unmount()
      })
    })

    it('a click outside still hides an open dropdown (DD-03)', async () => {
      const wrapper = mount(veDropdown, {
        props: { modelValue: DROPDOWN_ITEMS },
        slots: { default: `<div class="btn">click me</div>` },
      })
      await later()

      // 第一次打开 → 点击外部关闭
      wrapper.find('.btn').element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await later()
      document.body.click()
      await later()
      expect(wrapper.emitted('on-dropdown-visible-change')).toEqual([[true], [false]])

      // 再次打开 → 点击触发器关闭 → 之后的外部点击不再触发事件
      wrapper.find('.btn').element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await later()
      wrapper.find('.btn').element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await later()
      document.body.click()
      await later()
      expect(wrapper.emitted('on-dropdown-visible-change')).toEqual([[true], [false], [true], [false]])

      // 再次打开 → 第一次外部点击就能关闭
      wrapper.find('.btn').element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await later()
      document.body.click()
      await later()
      expect(wrapper.emitted('on-dropdown-visible-change')).toEqual([[true], [false], [true], [false], [true], [false]])
      expect((wrapper.vm as any).isDropdownVisible).toBe(false)
      wrapper.unmount()
    })

    // SEL-11：在面板内按下、在面板外松开（例如拖动选择文字），浏览器在公共祖先上触发 click，面板保持打开
    it('a drag that starts inside the open panel and ends outside keeps it open (SEL-11)', async () => {
      const wrapper = mount(veDropdown, {
        props: { modelValue: DROPDOWN_ITEMS },
        slots: { default: `<div class="btn">click me</div>` },
      })
      await later()

      wrapper.find('.btn').element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await later()
      expect((wrapper.vm as any).isDropdownVisible).toBe(true)

      const panel = document.querySelector('.ve-dropdown-dd-show .ve-dropdown-items')!
      const init = { bubbles: true, cancelable: true, detail: 1 }
      panel.dispatchEvent(new MouseEvent('mousedown', init))
      document.body.dispatchEvent(new MouseEvent('mouseup', init))
      document.body.dispatchEvent(new MouseEvent('click', init))
      await later(10)
      expect((wrapper.vm as any).isDropdownVisible).toBe(true)

      // 之后在外部的普通点击照常关闭
      document.body.dispatchEvent(new MouseEvent('mousedown', init))
      document.body.dispatchEvent(new MouseEvent('click', init))
      await later(10)
      expect((wrapper.vm as any).isDropdownVisible).toBe(false)
      wrapper.unmount()
    })
  })

  describe('option objects (DD-04)', () => {
    function createItems() {
      return [
        { value: 0, label: 'Apple', selected: false },
        { value: 1, label: 'Orange', selected: true },
        { value: 2, label: 'Banana', selected: false },
      ]
    }

    it('ticking a checkbox and clicking outside leaves the caller options unchanged (DD-04)', async () => {
      const items = createItems()
      const wrapper = mount(veDropdown, {
        props: { modelValue: items, isMultiple: true, showOperation: true },
        slots: { default: `<div class="btn">click me</div>` },
      })
      await later()
      wrapper.find('.btn').trigger('click')
      await later()

      const root = document.getElementById((wrapper.vm as any).rootId)!
      ;(root.querySelectorAll('.ve-checkbox')[2] as HTMLElement).click()
      await later()
      document.body.click()
      await later()

      expect(items).toEqual(createItems())
      wrapper.unmount()
    })

    it('clicking a single-select item leaves the caller options unchanged (DD-04)', async () => {
      const items = createItems()
      const wrapper = mount(veDropdown, {
        props: { modelValue: items, showOperation: true },
        slots: { default: `<div class="btn">click me</div>` },
      })
      await later()
      wrapper.find('.btn').trigger('click')
      await later()

      const root = document.getElementById((wrapper.vm as any).rootId)!
      ;(root.querySelectorAll('.ve-dropdown-items-li')[0] as HTMLElement).click()
      await later()

      expect(items).toEqual(createItems())
      // 发出的 v-model 值是新的对象，包含新的选中状态
      const emitted = wrapper.emitted('update:modelValue')![0][0] as any[]
      expect(emitted.find(x => x.selected).label).toBe('Apple')
      expect(emitted.every(x => !items.includes(x))).toBe(true)
      wrapper.unmount()
    })

    it('reset leaves the caller options unchanged (DD-04)', async () => {
      const items = createItems()
      const wrapper = mount(veDropdown, {
        props: { modelValue: items, isMultiple: true, showOperation: true },
        slots: { default: `<div class="btn">click me</div>` },
      })
      await later()
      wrapper.find('.btn').trigger('click')
      await later()

      const root = document.getElementById((wrapper.vm as any).rootId)!
      ;(root.querySelectorAll('.ve-dropdown-operation-item')[0] as HTMLElement).click()
      await later()

      expect(items).toEqual(createItems())
      expect((wrapper.emitted('on-filter-reset')![0][0] as any[]).some(x => x.selected)).toBe(false)
      wrapper.unmount()
    })
  })

  // 重置必须清除已确认的筛选，即使未确认的勾选已经全部取消
  describe('reset with nothing ticked (DD-08)', () => {
    // Orange 是已确认（modelValue 中）的选中项
    function createItems() {
      return [
        { value: 0, label: 'Apple', selected: false },
        { value: 1, label: 'Orange', selected: true },
        { value: 2, label: 'Banana', selected: false },
      ]
    }

    async function openMultiple(items: any[]) {
      const wrapper = mount(veDropdown, {
        props: { modelValue: items, isMultiple: true, showOperation: true },
        slots: { default: `<div class="btn">click me</div>` },
      })
      await later()
      wrapper.find('.btn').trigger('click')
      await later()
      const root = document.getElementById((wrapper.vm as any).rootId)!
      return { wrapper, root }
    }

    it('reset after unticking the confirmed item still emits the reset (DD-08)', async () => {
      const { wrapper, root } = await openMultiple(createItems())

      // 取消 Orange 的勾选，但不确认
      ;(root.querySelectorAll('.ve-checkbox')[1] as HTMLElement).click()
      await later()
      ;(root.querySelectorAll('.ve-dropdown-operation-item')[0] as HTMLElement).click()
      await later()

      expect(wrapper.emitted('on-filter-reset')?.length).toBe(1)
      expect((wrapper.emitted('on-filter-reset')![0][0] as any[]).some(x => x.selected)).toBe(false)
      const models = wrapper.emitted('update:modelValue')!
      expect((models[models.length - 1][0] as any[]).some(x => x.selected)).toBe(false)
      expect((wrapper.vm as any).isDropdownVisible).toBe(false)
      wrapper.unmount()
    })

    it('reset is not shown as disabled while a confirmed selection exists (DD-08)', async () => {
      const { wrapper, root } = await openMultiple(createItems())

      const resetButton = () => root.querySelectorAll('.ve-dropdown-operation-item')[0]
      expect(resetButton().classList.contains('ve-dropdown-filter-disable')).toBe(false)
      ;(root.querySelectorAll('.ve-checkbox')[1] as HTMLElement).click()
      await later()
      expect(resetButton().classList.contains('ve-dropdown-filter-disable')).toBe(false)
      wrapper.unmount()
    })

    it('reset with no selection at all still emits and closes (DD-08)', async () => {
      const items = createItems().map(x => ({ ...x, selected: false }))
      const { wrapper, root } = await openMultiple(items)

      const resetButton = root.querySelectorAll('.ve-dropdown-operation-item')[0] as HTMLElement
      expect(resetButton.classList.contains('ve-dropdown-filter-disable')).toBe(true)
      resetButton.click()
      await later()

      expect(wrapper.emitted('on-filter-reset')?.length).toBe(1)
      expect((wrapper.vm as any).isDropdownVisible).toBe(false)
      wrapper.unmount()
    })
  })

  // 弹出层只在打开后才进入目标元素（之前没有单独的容器），所以先打开再检查
  describe('popperAppendTo (DD-06, INFRA-05)', () => {
    async function open(wrapper: any) {
      wrapper.find('.btn').trigger('click')
      await later()
      return document.getElementById(wrapper.vm.rootId)!
    }

    it('appends the popper to body by default', async () => {
      const wrapper = mount(veDropdown, {
        props: { modelValue: DROPDOWN_ITEMS },
        slots: { default: `<div class="btn">click me</div>` },
      })
      await later()

      expect((await open(wrapper)).parentElement).toBe(document.body)
      wrapper.unmount()
    })

    it('accepts an element', async () => {
      const target = document.createElement('section')
      document.body.appendChild(target)
      const wrapper = mount(veDropdown, {
        props: { modelValue: DROPDOWN_ITEMS, popperAppendTo: target },
        slots: { default: `<div class="btn">click me</div>` },
      })
      await later()

      expect((await open(wrapper)).parentElement).toBe(target)
      wrapper.unmount()
      target.remove()
    })

    it('falls back to body and warns when the selector matches nothing (DD-06)', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const wrapper = mount(veDropdown, {
        props: { modelValue: DROPDOWN_ITEMS, popperAppendTo: '#no-such-element' },
        slots: { default: `<div class="btn">click me</div>` },
      })
      await later()

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('#no-such-element'))

      // 仍然可以正常打开
      expect((await open(wrapper)).parentElement).toBe(document.body)
      expect(wrapper.emitted('on-dropdown-visible-change')).toEqual([[true]])
      wrapper.unmount()
      warn.mockRestore()
    })
  })

  // MOD-09：弹出层由 <Teleport> 渲染，组件不再自己创建容器或移动 DOM
  describe('teleported popper (MOD-09)', () => {
    it('lives in the component until opened, in body while open, and back in the component when closed', async () => {
      const wrapper = mount(veDropdown, {
        props: { modelValue: DROPDOWN_ITEMS },
        slots: { default: `<div class="btn">click me</div>` },
      })
      await later()
      const ddParent = () => document.querySelector('.ve-dropdown-dd')!.parentElement!

      expect(wrapper.find('.ve-dropdown-dd').exists()).toBe(true)
      expect(document.querySelector('.ve-dropdown-popper')).toBeNull()

      wrapper.find('.btn').trigger('click')
      await later()
      expect(ddParent().classList.contains('ve-dropdown-popper')).toBe(true)
      expect(ddParent().parentElement).toBe(document.body)

      document.body.click()
      await later()
      expect(document.querySelector('.ve-dropdown-popper')).toBeNull()
      expect(wrapper.find('.ve-dropdown-dd').exists()).toBe(true)
      wrapper.unmount()
    })

    it('keeps the custom content state while it is closed and reopened', async () => {
      let mounts = 0
      const Counter = defineComponent({
        setup() {
          const count = ref(0)
          onMounted(() => mounts++)
          return () => h('button', { class: 'counter', onClick: () => count.value++ }, String(count.value))
        },
      })
      const wrapper = mount(veDropdown, {
        props: { isCustomContent: true },
        slots: { 'default': `<div class="btn">click me</div>`, 'custom-content': () => h(Counter) },
      })
      await later()

      wrapper.find('.btn').trigger('click')
      await later()
      findInDocument('.ve-dropdown-popper .counter')!.click()
      await later()
      expect(findInDocument('.ve-dropdown-popper .counter')!.textContent).toBe('1')

      // 关闭再打开：内容没有被重新创建
      wrapper.find('.btn').trigger('click')
      await later()
      wrapper.find('.btn').trigger('click')
      await later()
      expect(findInDocument('.ve-dropdown-popper .counter')!.textContent).toBe('1')
      // 第一次打开时从组件内部切换到 <Teleport>，内容创建一次；之后不再重新创建
      expect(mounts).toBe(2)
      wrapper.unmount()
    })
  })
})
