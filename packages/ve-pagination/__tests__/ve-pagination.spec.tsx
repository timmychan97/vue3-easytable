import vePagination from '@/ve-pagination'
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
})
