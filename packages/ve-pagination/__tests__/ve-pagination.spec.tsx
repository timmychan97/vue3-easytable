import vePagination from '@/ve-pagination'
import Pager from '@/ve-pagination/src/pager'
import { Jumper, Next, Prev, Sizer, Total } from '@/ve-pagination/src/parts'
import { later } from '@test-utils'
import { KEY_CODES } from '@test-utils/constant'
import { mount } from '@vue/test-utils'
import { vi } from 'vitest'

describe('vePagination', () => {
  it('render by different props', () => {
    const wrapper = mount({
      render() {
        return (
          <div>
            <vePagination total={600} />
            <vePagination total={600} pageIndex={2} />
            <vePagination total={600} pageIndex={30} />
            <vePagination
              total={600}
              layout={[
                'total',
                'prev',
                'next',
                'sizer',
                'jumper',
              ]}
            />
            <vePagination
              total={600}
              layout={[
                'total',
                'sizer',
                'prev',
                'pager',
                'next',
                'jumper',
              ]}
            />
          </div>
        )
      },
    })
    expect(wrapper.html()).toMatchSnapshot()
  })

  it('layout prop', () => {
    const wrapper = mount(vePagination, {
      propsData: {
        total: 300,
        layout: ['total', 'prev', 'next', 'sizer', 'jumper'],
      },
    })

    // except pager
    expect(wrapper.find('.ve-pagination-pager').exists()).toBe(false)
  })

  it('total prop', () => {
    const wrapper = mount(vePagination, {
      propsData: {
        total: 300,
      },
    })
    expect(wrapper.find('.ve-pagination-total').text()).toContain('300')
  })

  it('pageIndex prop', () => {
    const wrapper = mount(vePagination, {
      propsData: {
        total: 600,
        pageIndex: 5,
      },
    })

    expect(wrapper.find('.ve-pagination-li-active').text()).toBe('5')
  })

  it('pageSizeOption prop', () => {
    const wrapper = mount(vePagination, {
      propsData: {
        total: 600,
        pageSizeOption: [5, 10, 15],
        pageSize: 15,
      },
    })

    const pageSizeOptionEl = wrapper.findAll('.ve-dropdown-items-li')

    expect(pageSizeOptionEl[0].text()).toContain('5')
    expect(pageSizeOptionEl[1].text()).toContain('10')
    expect(pageSizeOptionEl[2].text()).toContain('15')
  })

  it('pagingCount prop', () => {
    const wrapper = mount(vePagination, {
      propsData: {
        total: 600,
        pagingCount: 7,
        pageIndex: 10,
      },
    })

    expect(
      wrapper.findAll('.ve-pagination-pager .ve-pagination-li').length,
    ).toBe(11)
  })

  it('pageSize prop', () => {
    const wrapper = mount(vePagination, {
      propsData: {
        total: 600,
        pageSizeOption: [5, 10, 15],
        pageSize: 15,
      },
    })

    expect(wrapper.find('.ve-dropdown-items-li.active').text()).toContain(
      '15',
    )
  })

  it('pageIndex change', async () => {
    const wrapper = mount(vePagination, {
      propsData: {
        total: 600,
      },
    })

    await wrapper.setProps({ pageIndex: 2 })

    expect(
      wrapper.find('.ve-pagination-li-active.ve-pagination-li').text(),
    ).toBe('2')
  })

  it('page number btn click operation', async () => {
    const wrapper = mount(vePagination, {
      propsData: {
        total: 600,
      },
    })

    wrapper.findAll('.ve-pagination-pager .ve-pagination-li')[5].trigger('click')

    await later()

    expect(wrapper.emitted('on-page-number-change')!.length).toEqual(1)
    expect(wrapper.emitted('on-page-number-change')![0]).toEqual([6])

    expect(
      wrapper.find('.ve-pagination-li-active.ve-pagination-li').text(),
    ).toBe('6')

    expect((wrapper.find('.ve-pagination-goto-input').element as HTMLInputElement).value).toBe(
      '6',
    )
  })

  it('next page number btn click operation', async () => {
    const wrapper = mount(vePagination, {
      propsData: {
        total: 600,
      },
    })

    wrapper.find('.ve-pagination-next').trigger('click')

    await later()

    expect(wrapper.emitted('on-page-number-change')!.length).toEqual(1)
    expect(wrapper.emitted('on-page-number-change')![0]).toEqual([2])

    expect(
      wrapper.find('.ve-pagination-li-active.ve-pagination-li').text(),
    ).toBe('2')
  })

  it('pre page number btn click operation', async () => {
    const wrapper = mount(vePagination, {
      propsData: {
        total: 600,
        pageIndex: 10,
      },
    })

    wrapper.find('.ve-pagination-prev').trigger('click')

    await later()

    expect(wrapper.emitted('on-page-number-change')!.length).toEqual(1)
    expect(wrapper.emitted('on-page-number-change')![0]).toEqual([9])

    expect(
      wrapper.find('.ve-pagination-li-active.ve-pagination-li').text(),
    ).toBe('9')
  })

  it('next5 click operation', async () => {
    const wrapper = mount(vePagination, {
      propsData: {
        total: 600,
      },
    })

    wrapper.find('.ve-pagination-jump-next').trigger('click')

    await later()

    expect(wrapper.emitted('on-page-number-change')!.length).toEqual(1)
    expect(wrapper.emitted('on-page-number-change')![0]).toEqual([6])

    expect(
      wrapper.find('.ve-pagination-li-active.ve-pagination-li').text(),
    ).toBe('6')
  })

  it('prev5 click operation', async () => {
    const wrapper = mount(vePagination, {
      propsData: {
        total: 600,
        pageIndex: 10,
      },
    })

    wrapper.find('.ve-pagination-jump-prev').trigger('click')

    await later()

    expect(wrapper.emitted('on-page-number-change')!.length).toEqual(1)
    expect(wrapper.emitted('on-page-number-change')![0]).toEqual([5])

    expect(
      wrapper.find('.ve-pagination-li-active.ve-pagination-li').text(),
    ).toBe('5')
  })

  it('on-page-size-change emit', () => {
    const wrapper = mount(vePagination, {
      propsData: {
        total: 600,
        pageSizeOption: [5, 10, 15],
        pageSize: 5,
      },
    })

    wrapper.findAll('.ve-dropdown-items-li')[1].trigger('click')

    expect(wrapper.emitted('on-page-size-change')!.length).toEqual(1)
    expect(wrapper.emitted('on-page-size-change')![0]).toEqual([10])

    expect(
      wrapper.find('.ve-pagination-li-active.ve-pagination-li').text(),
    ).toBe('1')
  })

  it('enter keyboard event ', async () => {
    const mockFn = vi.fn()

    const wrapper = mount(vePagination, {
      propsData: {
        total: 600,
        pageSize: 5,
      },
    })

    const textInput = wrapper.find('.ve-pagination-goto-input')
    await textInput.setValue(2)

    expect((textInput.element as HTMLInputElement).value).toBe('2')

    textInput.element.addEventListener('keyup', mockFn)
    textInput.element.dispatchEvent(
      new KeyboardEvent('keyup', { key: 'Enter', keyCode: KEY_CODES.ENTER }),
    )
    /* textInput.trigger("keyup", {
            keyCode: 13
        }); */

    await later()

    expect(mockFn).toBeCalled()

    expect(
      wrapper.find('.ve-pagination-li-active.ve-pagination-li').text(),
    ).toBe('2')

    expect(wrapper.emitted('on-page-number-change')!.length).toEqual(1)
    expect(wrapper.emitted('on-page-number-change')![0]).toEqual([2])
  })

  // WCAG 无障碍合规性测试
  describe('wCAG accessibility', () => {
    it('renders nav landmark with aria-label', () => {
      const wrapper = mount(vePagination, {
        propsData: { total: 600 },
      })

      const nav = wrapper.find('nav.ve-pagination-nav')
      expect(nav.exists()).toBe(true)
      expect(nav.attributes('aria-label')).toBeTruthy()
    })

    it('uses button elements for page controls (WCAG 4.1.2)', () => {
      const wrapper = mount(vePagination, {
        propsData: { total: 600 },
      })

      // 上一页和下一页应包含 button 元素
      const prevButton = wrapper.find('.ve-pagination-prev button')
      expect(prevButton.exists()).toBe(true)
      expect(prevButton.attributes('type')).toBe('button')

      const nextButton = wrapper.find('.ve-pagination-next button')
      expect(nextButton.exists()).toBe(true)
      expect(nextButton.attributes('type')).toBe('button')

      // 分页数字应包含 button 元素
      const pageButtons = wrapper.findAll('.ve-pagination-pager .ve-pagination-li button')
      expect(pageButtons.length).toBeGreaterThan(0)
      pageButtons.forEach((btn) => {
        expect(btn.attributes('type')).toBe('button')
      })
    })

    it('marks active page with aria-current="page" (WCAG 1.3.1)', () => {
      const wrapper = mount(vePagination, {
        propsData: { total: 600, pageIndex: 3 },
      })

      const activeItem = wrapper.find('.ve-pagination-li-active button')
      expect(activeItem.exists()).toBe(true)
      expect(activeItem.attributes('aria-current')).toBe('page')

      // 非激活项不应有 aria-current
      const inactiveItems = wrapper.findAll('.ve-pagination-pager .ve-pagination-li:not(.ve-pagination-li-active) button')
      inactiveItems.forEach((btn) => {
        expect(btn.attributes('aria-current')).toBeUndefined()
      })
    })

    it('provides aria-label on all page buttons (WCAG 1.1.1)', () => {
      const wrapper = mount(vePagination, {
        propsData: { total: 600, pageIndex: 5 },
      })

      const pageButtons = wrapper.findAll('.ve-pagination-pager .ve-pagination-li button')
      pageButtons.forEach((btn) => {
        expect(btn.attributes('aria-label')).toBeTruthy()
      })
    })

    it('prev button has aria-disabled when on first page (WCAG 4.1.2)', () => {
      const wrapper = mount(vePagination, {
        propsData: { total: 600, pageIndex: 1 },
      })

      const prevButton = wrapper.find('.ve-pagination-prev button')
      expect(prevButton.attributes('aria-disabled')).toBe('true')
      expect(prevButton.attributes('disabled')).toBeDefined()
    })

    it('next button has aria-disabled when on last page (WCAG 4.1.2)', () => {
      const wrapper = mount(vePagination, {
        propsData: { total: 100, pageSize: 10, pageIndex: 10 },
      })

      const nextButton = wrapper.find('.ve-pagination-next button')
      expect(nextButton.attributes('aria-disabled')).toBe('true')
      expect(nextButton.attributes('disabled')).toBeDefined()
    })

    it('prev/next buttons are not disabled in middle pages', () => {
      const wrapper = mount(vePagination, {
        propsData: { total: 600, pageIndex: 5 },
      })

      const prevButton = wrapper.find('.ve-pagination-prev button')
      expect(prevButton.attributes('aria-disabled')).toBe('false')
      expect(prevButton.attributes('disabled')).toBeUndefined()

      const nextButton = wrapper.find('.ve-pagination-next button')
      expect(nextButton.attributes('aria-disabled')).toBe('false')
      expect(nextButton.attributes('disabled')).toBeUndefined()
    })

    it('provides aria-label on prev and next buttons (WCAG 1.1.1)', () => {
      const wrapper = mount(vePagination, {
        propsData: { total: 600 },
      })

      const prevButton = wrapper.find('.ve-pagination-prev button')
      expect(prevButton.attributes('aria-label')).toBeTruthy()

      const nextButton = wrapper.find('.ve-pagination-next button')
      expect(nextButton.attributes('aria-label')).toBeTruthy()
    })

    it('jump input has accessible label (WCAG 1.3.1)', () => {
      const wrapper = mount(vePagination, {
        propsData: { total: 600 },
      })

      const input = wrapper.find('.ve-pagination-goto-input')
      expect(input.exists()).toBe(true)
      expect(input.attributes('aria-label')).toBeTruthy()
      expect(input.attributes('type')).toBe('text')
      expect(input.attributes('inputmode')).toBe('numeric')
    })

    it('jump input has associated label element (WCAG 1.3.1)', () => {
      const wrapper = mount(vePagination, {
        propsData: { total: 600 },
      })

      const label = wrapper.find('.ve-pagination-goto-label')
      expect(label.exists()).toBe(true)
      const labelFor = label.attributes('for')
      expect(labelFor).toBeTruthy()

      const input = wrapper.find(`#${labelFor}`)
      expect(input.exists()).toBe(true)
    })

    it('total display has aria-live for screen reader announcements (WCAG 4.1.3)', () => {
      const wrapper = mount(vePagination, {
        propsData: { total: 600 },
      })

      const total = wrapper.find('.ve-pagination-total')
      expect(total.attributes('aria-live')).toBe('polite')
    })

    it('aria-current updates when page changes (WCAG 1.3.1)', async () => {
      const wrapper = mount(vePagination, {
        propsData: { total: 600, pageIndex: 1 },
      })

      // 第 1 页应有 aria-current
      let activeButton = wrapper.find('.ve-pagination-li-active button')
      expect(activeButton.text()).toBe('1')
      expect(activeButton.attributes('aria-current')).toBe('page')

      // 点击第 3 页
      wrapper.findAll('.ve-pagination-pager .ve-pagination-li')[2].trigger('click')
      await later()

      // 第 3 页应有 aria-current
      activeButton = wrapper.find('.ve-pagination-li-active button')
      expect(activeButton.text()).toBe('3')
      expect(activeButton.attributes('aria-current')).toBe('page')
    })

    it('jump prev/next buttons have aria-label (WCAG 1.1.1)', () => {
      const wrapper = mount(vePagination, {
        propsData: { total: 600, pageIndex: 10 },
      })

      const jumpPrev = wrapper.find('.ve-pagination-jump-prev button')
      expect(jumpPrev.exists()).toBe(true)
      expect(jumpPrev.attributes('aria-label')).toBeTruthy()

      const jumpNext = wrapper.find('.ve-pagination-jump-next button')
      expect(jumpNext.exists()).toBe(true)
      expect(jumpNext.attributes('aria-label')).toBeTruthy()
    })

    it('keyboard Enter navigates via jumper (WCAG 2.1.1)', async () => {
      const wrapper = mount(vePagination, {
        propsData: { total: 600 },
      })

      const input = wrapper.find('.ve-pagination-goto-input')
      await input.setValue(5)

      input.element.dispatchEvent(
        new KeyboardEvent('keyup', { key: 'Enter' }),
      )
      await later()

      expect(wrapper.emitted('on-page-number-change')).toBeTruthy()
      expect(wrapper.emitted('on-page-number-change')![0]).toEqual([5])
    })

    it('non-Enter keys do not trigger jumper navigation (WCAG 2.1.1)', async () => {
      const wrapper = mount(vePagination, {
        propsData: { total: 600 },
      })

      const input = wrapper.find('.ve-pagination-goto-input')
      await input.setValue(5)

      input.element.dispatchEvent(
        new KeyboardEvent('keyup', { key: 'Tab' }),
      )
      await later()

      expect(wrapper.emitted('on-page-number-change')).toBeFalsy()
    })
  })

  describe('edge cases (PAG-01)', () => {
    async function pressEnter(wrapper: any, value: string) {
      const input = wrapper.find('.ve-pagination-goto-input')
      await input.setValue(value)
      input.element.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }))
      await later()
    }

    it('jumping with total = 0 emits page 1, not 0 (PAG-01)', async () => {
      const wrapper = mount(vePagination, { props: { total: 0 } })
      await pressEnter(wrapper, '3')

      expect(wrapper.emitted('on-page-number-change')).toEqual([[1]])
      expect((wrapper.find('.ve-pagination-goto-input').element as HTMLInputElement).value).toBe('1')
    })

    it('total = 0 disables prev and next (PAG-01)', () => {
      const wrapper = mount(vePagination, { props: { total: 0 } })

      expect(wrapper.find('.ve-pagination-prev button').attributes('disabled')).toBeDefined()
      expect(wrapper.find('.ve-pagination-next button').attributes('disabled')).toBeDefined()
    })

    it('next is disabled when total shrinks below the current page (PAG-01)', async () => {
      const wrapper = mount(vePagination, { props: { total: 100, pageSize: 10, pageIndex: 8 } })
      expect(wrapper.find('.ve-pagination-next button').attributes('disabled')).toBeUndefined()

      await wrapper.setProps({ total: 50 })

      expect(wrapper.find('.ve-pagination-next button').attributes('disabled')).toBeDefined()
      wrapper.find('.ve-pagination-next').trigger('click')
      expect(wrapper.emitted('on-page-number-change')).toBeFalsy()
    })

    it('prev from a page beyond the last page goes to the last page (PAG-01)', async () => {
      const wrapper = mount(vePagination, { props: { total: 100, pageSize: 10, pageIndex: 8 } })
      await wrapper.setProps({ total: 50 })

      wrapper.find('.ve-pagination-prev').trigger('click')

      expect(wrapper.emitted('on-page-number-change')).toEqual([[5]])
    })

    it('pageSize = 0 does not display Infinity (PAG-01)', () => {
      const wrapper = mount(vePagination, { props: { total: 30, pageSize: 0 } })

      expect(wrapper.text()).not.toContain('Infinity')
      expect(wrapper.text()).not.toContain('NaN')
    })

    it('an invalid pageIndex prop update falls back to page 1 (PAG-01)', async () => {
      const wrapper = mount(vePagination, { props: { total: 100, pageIndex: 3 } })

      await wrapper.setProps({ pageIndex: 0 })
      expect(wrapper.find('.ve-pagination-li-active').text()).toBe('1')

      await wrapper.setProps({ pageIndex: Number.NaN })
      expect(wrapper.find('.ve-pagination-li-active').text()).toBe('1')
    })
  })

  it('two paginations get distinct element ids (PAG-02)', () => {
    const wrapper = mount({
      render() {
        return (
          <div>
            <vePagination total={100} />
            <vePagination total={100} />
          </div>
        )
      },
    })

    const inputs = wrapper.findAll('.ve-pagination-goto-input')
    const gotoLabels = wrapper.findAll('.ve-pagination-goto-label')
    const sizeLabels = wrapper.findAll('.ve-pagination-select-label')
    const selects = wrapper.findAll('.ve-pagination-select')
    expect(inputs).toHaveLength(2)

    const inputIds = inputs.map(x => x.attributes('id'))
    const sizeLabelIds = sizeLabels.map(x => x.attributes('id'))
    expect(new Set(inputIds).size).toBe(2)
    expect(new Set(sizeLabelIds).size).toBe(2)

    // 每个 label / aria-labelledby 指向自己实例中的元素
    gotoLabels.forEach((label, i) => {
      expect(label.attributes('for')).toBe(inputIds[i])
    })
    selects.forEach((select, i) => {
      expect(select.attributes('aria-labelledby')).toBe(sizeLabelIds[i])
    })
  })

  it('pageSizeChangeHandler uses its argument (PAG-03)', async () => {
    const wrapper = mount(vePagination, {
      props: { total: 600, pageSizeOption: [5, 10, 15], pageSize: 5, pageIndex: 3 },
    })

    ;(wrapper.vm as any).pageSizeChangeHandler(15)
    await nextTick()

    expect(wrapper.emitted('on-page-size-change')).toEqual([[15]])
    expect(wrapper.find('.ve-pagination-li-active').text()).toBe('1')
  })

  describe('subcomponents use props and events, not $parent (MOD-10)', () => {
    it('total renders its total prop', () => {
      const wrapper = mount(Total, { props: { total: 42 } })

      expect(wrapper.find('.ve-pagination-total').text()).toContain('42')
    })

    it('prev and next follow their props and emit on click', async () => {
      const prev = mount(Prev, { props: { pageIndex: 1, pageCount: 3 } })
      const next = mount(Next, { props: { pageIndex: 1, pageCount: 3 } })

      expect(prev.find('button').attributes('disabled')).toBeDefined()
      expect(next.find('button').attributes('disabled')).toBeUndefined()

      await prev.setProps({ pageIndex: 3 })
      await next.setProps({ pageIndex: 3 })
      expect(prev.find('button').attributes('disabled')).toBeUndefined()
      expect(next.find('button').attributes('disabled')).toBeDefined()

      await prev.find('li').trigger('click')
      await next.find('li').trigger('click')
      expect(prev.emitted('prev')).toHaveLength(1)
      expect(next.emitted('next')).toHaveLength(1)
    })

    it('sizer emits the selected page size', async () => {
      const wrapper = mount(Sizer, {
        props: {
          options: [
            { value: 10, label: '10', selected: true },
            { value: 20, label: '20', selected: false },
          ],
        },
      })

      await wrapper.findAll('.ve-dropdown-items-li')[1].trigger('click')

      expect(wrapper.emitted('change')).toEqual([[20]])
    })

    it('jumper emits the page clamped to pageCount and shows it', async () => {
      const wrapper = mount(Jumper, { props: { pageIndex: 1, pageCount: 4 } })
      const input = wrapper.find('input')

      await input.setValue('9')
      input.element.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }))

      expect(wrapper.emitted('jump')).toEqual([[4]])
      expect((input.element as HTMLInputElement).value).toBe('4')
    })

    it('pager emits the clicked page', async () => {
      const wrapper = mount(Pager, { props: { pageIndex: 1, pageCount: 3, pagingCount: 5 } })

      await wrapper.findAll('.ve-pagination-li')[1].trigger('click')

      expect(wrapper.emitted('jump')).toEqual([[2]])
    })

    it('keeps the instance members available through a ref', async () => {
      const wrapper = mount(vePagination, {
        props: { total: 100, pageSize: 10, pageIndex: 3 },
      })
      const vm = wrapper.vm as any

      expect(vm.newPageIndex).toBe(3)
      expect(vm.pageCount).toBe(10)
      expect(vm.getValidNum('42')).toBe(10)
      expect(vm.newPageSizeOption.map((x: { value: number }) => x.value)).toEqual([10, 20, 30])

      vm.nextPage()
      vm.prevPage()
      vm.jumpPageHandler(7)
      vm.pageSizeChangeHandler(20)
      vm.goBackPageIndex()
      vm.goBackPageSize()
      await nextTick()

      expect(wrapper.emitted('on-page-number-change')).toEqual([[4], [3], [7]])
      expect(wrapper.emitted('on-page-size-change')).toEqual([[20]])
      expect(vm.newPageIndex).toBe(3)
      expect(vm.newPageSize).toBe(10)
    })
  })
})
