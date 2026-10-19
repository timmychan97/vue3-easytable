import veContextmenu from '@/ve-contextmenu'
import {
  later,
  wrapMount as mount,
} from '@test-utils'
import { mount as mountDetached } from '@vue/test-utils'
import { cloneDeep } from 'lodash'
import { afterEach, beforeEach, expect, vi } from 'vitest'

describe('veContextmenu', () => {
  const OPTIONS = [
    {
      label: 'menu1',
      type: 'menu1-type',
    },
    {
      label: 'menu2',
      type: 'menu2-type',
      children: [
        {
          label: 'menu2-1',
          type: 'menu2-1-type',
        },
        {
          label: 'menu2-2',
          type: 'menu2-2',
        },
      ],
    },
    {
      type: 'SEPARATOR',
    },
    {
      label: 'menu3',
      type: 'menu3-type',
    },
    {
      label: 'menu4',
      disabled: true,
      children: [
        {
          label: 'menu4-1',
        },
      ],
    },
    {
      label: 'menu5',
      type: 'menu5-type',
      children: [
        {
          label: 'menu5-1',
          type: 'menu5-1-type',
          children: [
            {
              label: 'menu5-1-1',
            },
            {
              label: 'menu5-2-2',
              type: 'menu5-2-2-type',
            },
          ],
        },
        {
          label: 'menu5-2',
          disabled: true,
        },
        {
          type: 'SEPARATOR',
        },
        {
          label: 'menu5-3',
          type: 'menu5-3-type',
        },
      ],
    },
    {
      label: 'menu6',
      type: 'menu6-type',
      disabled: true,
    },
  ]

  beforeEach(() => {
    return new Promise((resolve) => {
      const containerEl = document.createElement('div')
      containerEl.setAttribute('id', 'contextmenu-target')
      document.body.appendChild(containerEl)

      resolve()
    })
  })

  afterEach(() => {
    return new Promise((resolve) => {
      const containerEl = document.querySelector('#contextmenu-target')
      containerEl!.remove()

      resolve()
    })
  })

  it('render', () => {
    const wrapper = mount({
      template: `
            <div>
                <div id="contextmenu-target">Right click this area</div>
                <ve-contextmenu eventTarget="#contextmenu-target" :options="options" />
            </div>`,
      data() {
        return {
          options: OPTIONS,
        }
      },
    })
    expect(wrapper.html()).toMatchSnapshot()
    wrapper.unmount()
  })

  it('contextmenu event', async () => {
    const wrapper = mount(
      {
        render() {
          return (
            <div>
              <ve-contextmenu
                eventTarget={document.querySelector(
                  '#contextmenu-target',
                )}
                options={this.options}
              />
            </div>
          )
        },
        data() {
          return {
            options: OPTIONS,
          }
        },
      },
      // need attach to documnet
      { attachTo: document.body },
    )

    const contextmenuTargetEl = document.querySelector(
      '#contextmenu-target',
    )

    // trigger element hover
    const event = new MouseEvent('contextmenu', {
      // view: window, // window
      // bubbles: true,
      // cancelable: true,
    })

    contextmenuTargetEl!.dispatchEvent(event)

    await later()

    const contextmenuPoppers = document.querySelectorAll(
      '.ve-contextmenu-popper',
    )
    expect(contextmenuPoppers.length).toBe(1)

    wrapper.unmount()
  })

  it('contextmenu async contextmenu option', async () => {
    const wrapper = mount(
      {
        render() {
          return (
            <div>
              <ve-contextmenu
                eventTarget={document.querySelector(
                  '#contextmenu-target',
                )}
                options={this.options}
              />
            </div>
          )
        },
        data() {
          return {
            options: [],
          }
        },
      },
      // need attach to documnet
      { attachTo: document.body },
    )

    const contextmenuTargetEl = document.querySelector(
      '#contextmenu-target',
    )

    // trigger element hover
    const event = new MouseEvent('contextmenu', {
      // view: window, // window
      // bubbles: true,
      // cancelable: true,
    })

    contextmenuTargetEl!.dispatchEvent(event)

    await later()

    const contextmenuPoppers = document.querySelectorAll(
      '.ve-contextmenu-popper',
    )
    expect(contextmenuPoppers.length).toBe(0)

    ;(wrapper.vm as any).options = OPTIONS

    await later()

    contextmenuTargetEl!.dispatchEvent(event)

    await later()

    const contextmenuPoppers2 = document.querySelectorAll(
      '.ve-contextmenu-popper',
    )
    expect(contextmenuPoppers2.length).toBe(1)

    wrapper.unmount()
  })

  it('contextmenu eventTarget', async () => {
    const wrapper = mount(
      {
        render() {
          return (
            <div>
              <ve-contextmenu
                eventTarget={document.querySelector(
                  '#contextmenu-target',
                )}
                options={this.options}
              />
            </div>
          )
        },
        data() {
          return {
            options: OPTIONS,
          }
        },
      },
      // need attach to documnet
      { attachTo: document.body },
    )

    const contextmenuTargetEl = document.querySelector(
      '#contextmenu-target',
    )

    // trigger element hover
    const event = new MouseEvent('contextmenu', {
      // view: window, // window
      // bubbles: true,
      // cancelable: true,
    })

    contextmenuTargetEl!.dispatchEvent(event)

    await later()

    const contextmenuPoppers = document.querySelectorAll(
      '.ve-contextmenu-popper',
    )
    expect(contextmenuPoppers.length).toBe(1)

    wrapper.unmount()
  })

  it('contextmenu node hover', async () => {
    const wrapper = mount(
      {
        render() {
          return (
            <div>
              <ve-contextmenu
                eventTarget={document.querySelector(
                  '#contextmenu-target',
                )}
                options={this.options}
              />
            </div>
          )
        },
        data() {
          return {
            options: OPTIONS,
          }
        },
      },
      // need attach to documnet
      { attachTo: document.body },
    )

    const contextmenuTargetEl = document.querySelector(
      '#contextmenu-target',
    )

    // trigger element hover
    const event1 = new MouseEvent('contextmenu', {
      // view: window, // window
      // bubbles: true,
      // cancelable: true,
    })

    contextmenuTargetEl!.dispatchEvent(event1)

    await later()

    const contextmenuPopper = document.querySelector(
      '.ve-contextmenu-popper',
    )

    const contextmenuNodes = contextmenuPopper!.querySelectorAll(
      '.ve-contextmenu-node',
    )

    // trigger element hover
    const event2 = new MouseEvent('mouseover', {
      // view: window, // window
      // bubbles: true,
      // cancelable: true,
    })

    contextmenuNodes[1].dispatchEvent(event2)

    await later(500)

    const contextmenuPoppers = document.querySelectorAll(
      '.ve-contextmenu-popper',
    )
    expect(contextmenuPoppers.length).toBe(2)

    await later()

    // remove panel by hover or click parent node
    const event3 = new MouseEvent('click', {
      // view: window, // window
      // bubbles: true,
      // cancelable: true,
    })
    contextmenuNodes[0].dispatchEvent(event3)

    await later(500)

    // 点击没有子菜单的菜单项后整个菜单关闭：菜单回到组件内部，body 中不再有 popper
    const contextmenuPoppers2 = document.querySelectorAll(
      '.ve-contextmenu-popper',
    )
    expect(contextmenuPoppers2).toHaveLength(0)

    wrapper.unmount()
  })

  it('contextmenu on-node-click event', async () => {
    const mockFn = vi.fn()

    const wrapper = mount(
      {
        template: `
            <div>
                <div id="contextmenu-target">Right click this area</div>
                <ve-contextmenu @on-node-click="contextmenuClick" eventTarget="#contextmenu-target" :options="options" />
            </div>`,
        data() {
          return {
            options: OPTIONS,
          }
        },
        methods: {
          contextmenuClick(param) {
            mockFn(param)
          },
        },
      },
      // need attach to documnet
      { attachTo: document.body },
    )

    const contextmenuTargetEl = document.querySelector(
      '#contextmenu-target',
    )

    // trigger element hover
    const event1 = new MouseEvent('contextmenu', {
      // view: window, // window
      // bubbles: true,
      // cancelable: true,
    })

    contextmenuTargetEl!.dispatchEvent(event1)

    await later()

    const contextmenuPopper = document.querySelector(
      '.ve-contextmenu-popper',
    )

    const contextmenuNodes = contextmenuPopper!.querySelectorAll(
      '.ve-contextmenu-node',
    )

    const event2 = new MouseEvent('click', {
      // view: window, // window
      // bubbles: true,
      // cancelable: true,
    })

    contextmenuNodes[0].dispatchEvent(event2)

    expect(mockFn).toHaveBeenCalled()
    expect(mockFn).toHaveBeenCalledWith('menu1-type')

    wrapper.unmount()
  })

  it('contextmenu panel child node click', async () => {
    const mockFn = vi.fn()

    const wrapper = mount(
      {
        template: `
            <div>
                <div id="contextmenu-target">Right click this area</div>
                <ve-contextmenu @on-node-click="contextmenuClick" eventTarget="#contextmenu-target" :options="options" />
            </div>`,
        data() {
          return {
            options: OPTIONS,
          }
        },
        methods: {
          contextmenuClick(param) {
            mockFn(param)
          },
        },
      },
      // need attach to documnet
      { attachTo: document.body },
    )

    const contextmenuTargetEl = document.querySelector(
      '#contextmenu-target',
    )

    // trigger element hover
    const event1 = new MouseEvent('contextmenu', {
      // view: window, // window
      // bubbles: true,
      // cancelable: true,
    })

    contextmenuTargetEl!.dispatchEvent(event1)

    await later()

    const contextmenuPopper = document.querySelector(
      '.ve-contextmenu-popper',
    )

    const contextmenuNodes = contextmenuPopper!.querySelectorAll(
      '.ve-contextmenu-node',
    )

    // trigger element hover
    const event2 = new MouseEvent('mouseover', {
      // view: window, // window
      // bubbles: true,
      // cancelable: true,
    })

    contextmenuNodes[1].dispatchEvent(event2)

    await later(500)

    const contextmenuPoppers = document.querySelectorAll(
      '.ve-contextmenu-popper',
    )

    const childPanel = contextmenuPoppers[1]

    const clickEvent = new MouseEvent('click', {
      // view: window, // window
      // bubbles: true,
      // cancelable: true,
    })

    const childContextmenuNodes = childPanel.querySelectorAll(
      '.ve-contextmenu-node',
    )

    childContextmenuNodes[0].dispatchEvent(clickEvent)

    expect(mockFn).toHaveBeenCalled()
    expect(mockFn).toHaveBeenCalledWith('menu2-1-type')

    wrapper.unmount()
  })

  it('contextmenu node disabled', async () => {
    const mockFn = vi.fn()

    const wrapper = mount(
      {
        template: `
            <div>
                <div id="contextmenu-target">Right click this area</div>
                <ve-contextmenu @on-node-click="contextmenuClick" eventTarget="#contextmenu-target" :options="options" />
            </div>`,
        data() {
          return {
            options: OPTIONS,
          }
        },
        methods: {
          contextmenuClick(param) {
            mockFn(param)
          },
        },
      },
      // need attach to documnet
      { attachTo: document.body },
    )

    const contextmenuTargetEl = document.querySelector(
      '#contextmenu-target',
    )

    // trigger element hover
    const event1 = new MouseEvent('contextmenu', {
      // view: window, // window
      // bubbles: true,
      // cancelable: true,
    })

    contextmenuTargetEl!.dispatchEvent(event1)

    await later()

    const contextmenuPopper = document.querySelector(
      '.ve-contextmenu-popper',
    )

    const contextmenuNodes = contextmenuPopper!.querySelectorAll(
      '.ve-contextmenu-node',
    )

    const event = new MouseEvent('click', {
      // view: window, // window
      // bubbles: true,
      // cancelable: true,
    })

    contextmenuNodes[5].dispatchEvent(event)

    expect(mockFn).toHaveBeenCalledTimes(0)

    wrapper.unmount()
  })

  it('contextmenu destroyed', async () => {
    const wrapper = mount(
      {
        render() {
          return (
            <div>
              <div id="contextmenu-target">
                Right click this area
              </div>
              <ve-contextmenu
                eventTarget="#contextmenu-target"
                options={this.options}
              />
            </div>
          )
        },
        data() {
          return {
            options: OPTIONS,
          }
        },
      },
      // need attach to documnet
      { attachTo: document.body },
    )

    const contextmenuTargetEl = document.querySelector(
      '#contextmenu-target',
    )

    // trigger element hover
    const event1 = new MouseEvent('contextmenu', {
      // view: window, // window
      // bubbles: true,
      // cancelable: true,
    })

    contextmenuTargetEl!.dispatchEvent(event1)

    await later()

    const contextmenuPoppers = document.querySelectorAll(
      '.ve-contextmenu-popper',
    )
    expect(contextmenuPoppers.length).toBe(1)

    wrapper.unmount()

    const contextmenuPoppers2 = document.querySelectorAll(
      '.ve-contextmenu-popper',
    )
    expect(contextmenuPoppers2.length).toBe(0)
  })

  /*
    panel 左侧展示
    */
  it('contextmenu panel left direction', async () => {
    const wrapper = mount(
      {
        render() {
          return (
            <div>
              <div id="contextmenu-target">
                Right click this area
              </div>
              <ve-contextmenu
                eventTarget="#contextmenu-target"
                options={this.options}
              />
            </div>
          )
        },
        data() {
          return {
            options: OPTIONS,
          }
        },
      },
    )

    const veContextmenuComp = wrapper.findComponent(veContextmenu)

    const contextmenuTargetEl = document.querySelector(
      '#contextmenu-target',
    )

    // trigger element hover
    const event1 = new MouseEvent('contextmenu', {
      // view: window, // window
      // bubbles: true,
      // cancelable: true,
    })

    contextmenuTargetEl!.dispatchEvent(event1)

    veContextmenuComp.setData({
      isPanelRightDirection: false,
    })

    await later()

    const contextmenuPopper = document.querySelector(
      '.ve-contextmenu-popper',
    )

    const contextmenuNodes = contextmenuPopper!.querySelectorAll(
      '.ve-contextmenu-node',
    )

    // trigger element hover
    const event = new MouseEvent('mouseover', {
      // view: window, // window
      // bubbles: true,
      // cancelable: true,
    })

    contextmenuNodes[1].dispatchEvent(event)

    await later(500)

    const contextmenuPoppers = document.querySelectorAll(
      '.ve-contextmenu-popper',
    )
    expect(contextmenuPoppers.length).toBe(2)

    wrapper.unmount()
  })

  it('contextmenu clickoutside', async () => {
    const wrapper = mount(
      {
        render() {
          return (
            <div>
              <button id="outsideButton">outside table</button>
              <div
                id="contextmenu-target"
                style="width:300px;height:300px;"
              >
                Right click this area
              </div>
              <ve-contextmenu
                eventTarget="#contextmenu-target"
                options={this.options}
              />
            </div>
          )
        },
        data() {
          return {
            options: OPTIONS,
          }
        },
      },
      // need attach to documnet
      { attachTo: document.body },
    )

    const contextmenuTargetEl = document.querySelector(
      '#contextmenu-target',
    )

    // trigger element hover
    const event1 = new MouseEvent('contextmenu', {
      // view: window, // window
      // bubbles: true,
      // cancelable: true,
    })

    contextmenuTargetEl!.dispatchEvent(event1)
    // 菜单在挂起的更新完成后显示（MENU-06）
    await later()

    const veContextmenuComp = wrapper.findComponent(veContextmenu)

    expect(veContextmenuComp.vm.isPanelsEmptyed).toBe(false)

    // click outside
    wrapper.find('#outsideButton').trigger('click')

    await later()

    expect(veContextmenuComp.vm.isPanelsEmptyed).toBe(true)

    wrapper.unmount()
  })

  it('hideContextmenu instance method', async () => {
    const wrapper = mount(
      {
        render() {
          return (
            <div>
              <button id="outsideButton">outside table</button>
              <div
                id="contextmenu-target"
                style="width:300px;height:300px;"
              >
                Right click this area
              </div>
              <ve-contextmenu
                eventTarget="#contextmenu-target"
                options={this.options}
              />
            </div>
          )
        },
        data() {
          return {
            options: OPTIONS,
          }
        },
      },
      // need attach to documnet
      { attachTo: document.body },
    )

    const contextmenuTargetEl = document.querySelector(
      '#contextmenu-target',
    )

    // trigger element hover
    const event1 = new MouseEvent('contextmenu', {
      // view: window, // window
      // bubbles: true,
      // cancelable: true,
    })

    contextmenuTargetEl!.dispatchEvent(event1)
    // 菜单在挂起的更新完成后显示（MENU-06）
    await later()

    const veContextmenuComp = wrapper.findComponent(veContextmenu)

    expect(veContextmenuComp.vm.isPanelsEmptyed).toBe(false)

    ;(veContextmenuComp.vm as any).hideContextmenu()

    // click outside
    // wrapper.find("#outsideButton").trigger("click");

    await later()

    expect(veContextmenuComp.vm.isPanelsEmptyed).toBe(true)

    wrapper.unmount()
  })

  // 与 ve-table 相同的用法：目标内部的元素在同一个 contextmenu 事件中（冒泡到 eventTarget 之前）同步替换 options
  it('options replaced while the contextmenu event bubbles still open the new menu (MENU-06)', async () => {
    const wrapper = mount({
      render() {
        return (
          <div>
            <div class="menu06-target">
              <span
                class="menu06-cell"
                onContextmenu={() => {
                  this.count++
                  this.options = [{ label: `item${this.count}`, type: 'x' }]
                }}
              >
                cell
              </span>
            </div>
            <ve-contextmenu eventTarget={this.eventTarget} options={this.options} />
          </div>
        )
      },
      data() {
        return { options: [], count: 0, eventTarget: '' as string | HTMLElement }
      },
      mounted() {
        this.eventTarget = this.$el.querySelector('.menu06-target')
      },
    })
    await later()

    const visibleLabels = () => [...document.querySelectorAll(
      '.ve-contextmenu-popper .ve-contextmenu-node-label',
    )].map(x => x.textContent)
    const rightClickCell = async () => {
      document.querySelector('.menu06-cell')!.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
      )
      await later()
    }

    // 第一次右键：options 从空数组变为 1 项
    await rightClickCell()
    expect(visibleLabels()).toEqual(['item1'])

    // 再次右键：options 被替换为新数组
    await rightClickCell()
    expect(visibleLabels()).toEqual(['item2'])
    expect(document.querySelectorAll('.ve-contextmenu-popper')).toHaveLength(1)

    wrapper.unmount()
  })

  describe('eventTarget (MENU-02)', () => {
    // showRootContextmenuPanel 会同步调用 preventDefault，dispatchEvent 返回 false 即表示监听器已注册
    const rightClick = (el: Element) => !el.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
    )

    it('changing eventTarget moves the listener to the new element', async () => {
      const elA = document.createElement('div')
      const elB = document.createElement('div')
      document.body.append(elA, elB)

      const wrapper = mountDetached(veContextmenu, {
        props: { options: cloneDeep(OPTIONS) as any, eventTarget: elA },
      })
      await later()
      expect(rightClick(elA)).toBe(true)

      await wrapper.setProps({ eventTarget: elB })
      expect(rightClick(elA)).toBe(false)
      expect(rightClick(elB)).toBe(true)

      wrapper.unmount()
      expect(rightClick(elB)).toBe(false)
      elA.remove()
      elB.remove()
    })

    it('a string selector is resolved after mount, and re-resolved when it changes', async () => {
      const wrapper = mount({
        template: `
          <div>
            <ve-contextmenu :eventTarget="selector" :options="options" />
            <div id="menu02-target-a">A</div>
            <div id="menu02-target-b">B</div>
          </div>`,
        data() {
          return { selector: '#menu02-target-a', options: cloneDeep(OPTIONS) }
        },
      })
      await later()

      const elA = document.querySelector('#menu02-target-a')!
      const elB = document.querySelector('#menu02-target-b')!
      // 目标元素在组件之后渲染：created 阶段还查询不到
      expect(rightClick(elA)).toBe(true)

      ;(wrapper.vm as any).selector = '#menu02-target-b'
      await later()
      expect(rightClick(elA)).toBe(false)
      expect(rightClick(elB)).toBe(true)

      wrapper.unmount()
    })
  })

  // jsdom 没有布局：模拟 1000x700 的视口，页面已滚动 (300, 200)，菜单尺寸按首个菜单项区分
  describe('panel position (MENU-05)', () => {
    const SCROLL_X = 300
    const SCROLL_Y = 200
    let panelSizes: Record<string, { width: number, height: number }>
    // 断言失败时也要卸载，避免残留的菜单容器影响后续用例
    const openedWrappers: { unmount: () => void }[] = []
    const savedWindowProps: Record<string, PropertyDescriptor | undefined> = {}

    beforeEach(() => {
      vi.useFakeTimers()
      panelSizes = {
        'menu1': { width: 180, height: 200 },
        'menu2-1': { width: 320, height: 80 },
      }
      const doc = document.documentElement
      const docProps = { clientWidth: 1000, clientHeight: 700, scrollLeft: SCROLL_X, scrollTop: SCROLL_Y }
      Object.entries(docProps).forEach(([key, value]) => {
        Object.defineProperty(doc, key, { configurable: true, value })
      })
      const winProps = { pageXOffset: SCROLL_X, pageYOffset: SCROLL_Y, scrollX: SCROLL_X, scrollY: SCROLL_Y }
      Object.entries(winProps).forEach(([key, value]) => {
        savedWindowProps[key] = Object.getOwnPropertyDescriptor(window, key)
        Object.defineProperty(window, key, { configurable: true, value })
      })

      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
        const label = this.classList.contains('ve-contextmenu-popper')
          ? this.querySelector('.ve-contextmenu-node-label')?.textContent ?? ''
          : ''
        const { width, height } = panelSizes[label] ?? { width: 0, height: 0 }
        // 菜单容器是 body 上的绝对定位元素：视口坐标 = 文档坐标 - 滚动距离
        const left = (Number.parseFloat(this.style.left) || 0) - SCROLL_X
        const top = (Number.parseFloat(this.style.top) || 0) - SCROLL_Y
        return { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON() {} } as DOMRect
      })
    })

    afterEach(() => {
      openedWrappers.splice(0).forEach(wrapper => wrapper.unmount())
      vi.restoreAllMocks()
      vi.useRealTimers()
      ;['clientWidth', 'clientHeight', 'scrollLeft', 'scrollTop'].forEach((key) => {
        delete (document.documentElement as any)[key]
      })
      Object.entries(savedWindowProps).forEach(([key, descriptor]) => {
        if (descriptor)
          Object.defineProperty(window, key, descriptor)
        else
          delete (window as any)[key]
      })
    })

    async function openMenu(clientX: number, clientY: number) {
      const wrapper = mountDetached(veContextmenu, {
        props: {
          options: cloneDeep(OPTIONS) as any,
          eventTarget: document.querySelector('#contextmenu-target') as HTMLElement,
        },
      })
      openedWrappers.push(wrapper)
      await nextTick()
      document.querySelector('#contextmenu-target')!.dispatchEvent(
        new MouseEvent('contextmenu', { clientX, clientY }),
      )
      await nextTick()
      const rootEl = document.getElementById((wrapper.vm as any).rootContextmenuId)!
      return { wrapper, rootEl }
    }

    // 悬浮 menu2，等待 300ms 防抖后打开子菜单
    async function openSubmenu(rootEl: HTMLElement, clientX: number, clientY: number) {
      rootEl.querySelectorAll('.ve-contextmenu-node')[1].dispatchEvent(
        new MouseEvent('mouseover', { clientX, clientY }),
      )
      vi.advanceTimersByTime(350)
      await nextTick()
      await nextTick()
      const subEl = [...document.querySelectorAll<HTMLElement>('.ve-contextmenu-popper')]
        .find(el => el.querySelector('.ve-contextmenu-node-label')?.textContent === 'menu2-1')
      expect(subEl).toBeTruthy()
      return subEl!
    }

    it('a submenu opening to the right starts at the parent\'s right edge on a scrolled page', async () => {
      const { rootEl } = await openMenu(100, 100)
      // 文档坐标 = 鼠标视口坐标 + 滚动距离
      expect(rootEl.style.left).toBe('400px')
      expect(rootEl.style.top).toBe('300px')

      const subEl = await openSubmenu(rootEl, 150, 130)
      expect(subEl.style.left).toBe(`${400 + 180}px`)
      expect(subEl.style.top).toBe('330px')
    })

    it('a submenu opening to the left ends at the parent\'s left edge, using its own width', async () => {
      // 右侧空间不足：根菜单显示在鼠标左侧，子菜单默认向左展开
      const { rootEl } = await openMenu(950, 100)
      expect(rootEl.style.left).toBe(`${950 + SCROLL_X - 180}px`)

      const subEl = await openSubmenu(rootEl, 900, 130)
      expect(subEl.style.left).toBe(`${950 + SCROLL_X - 180 - 320}px`)
    })

    it('a panel larger than the space on both sides is clamped into the viewport', async () => {
      // 比视口还高的根菜单：两边空间都不够，固定在视口顶部
      panelSizes.menu1 = { width: 180, height: 1000 }
      const { rootEl } = await openMenu(100, 300)
      expect(rootEl.style.top).toBe(`${SCROLL_Y}px`)

      // 鼠标左右两侧都放不下的宽菜单：平移到视口内（贴住视口左边缘），而不是跑到视口外面
      panelSizes.menu1 = { width: 900, height: 200 }
      const { rootEl: rootEl2 } = await openMenu(500, 100)
      expect(rootEl2.style.left).toBe(`${SCROLL_X}px`)

      // 放得下时不受影响：右侧空间不够就显示在鼠标左侧，且仍在视口内
      panelSizes.menu1 = { width: 400, height: 200 }
      const { rootEl: rootEl3 } = await openMenu(700, 100)
      expect(rootEl3.style.left).toBe(`${700 + SCROLL_X - 400}px`)
    })

    // MENU-07：比视口还高的菜单限制为视口高度（样式中 overflow-y: auto），超出的菜单项可以滚动到
    it('a panel taller than the viewport is limited to the viewport height (MENU-07)', async () => {
      panelSizes.menu1 = { width: 180, height: 1000 }
      const { rootEl } = await openMenu(100, 300)
      expect(rootEl.style.top).toBe(`${SCROLL_Y}px`)
      expect(rootEl.style.maxHeight).toBe('700px')

      // 放得下的菜单不限制高度
      panelSizes.menu1 = { width: 180, height: 200 }
      const { rootEl: rootEl2 } = await openMenu(100, 100)
      expect(rootEl2.style.maxHeight).toBe('')
    })
  })

  describe('lifecycle and timers', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    // 注意：wrapMount 的 attachTo 每次都会在 body 留下一个 div，这里不挂载到 body，方便统计 body 子元素数量
    function mountMenu() {
      return mountDetached(veContextmenu, {
        props: {
          options: cloneDeep(OPTIONS) as any,
          eventTarget: document.querySelector('#contextmenu-target') as HTMLElement,
        },
      })
    }

    // 右键打开根菜单，并悬浮在带子菜单的 menu2 上（悬浮有 300ms 防抖）
    async function rightClickAndHover(wrapper: any) {
      document.querySelector('#contextmenu-target')!.dispatchEvent(new MouseEvent('contextmenu'))
      await nextTick()
      const rootPanelEl = document.getElementById(wrapper.vm.rootContextmenuId)!
      rootPanelEl.querySelectorAll('.ve-contextmenu-node')[1].dispatchEvent(new MouseEvent('mouseover'))
    }

    it('the hover debounce does not fire after unmount (MENU-03)', async () => {
      vi.useFakeTimers()
      const before = document.body.children.length
      const wrapper = mountMenu()
      await nextTick()

      await rightClickAndHover(wrapper)
      // 300ms 防抖未到期时卸载（例如切换路由）
      wrapper.unmount()

      expect(() => vi.advanceTimersByTime(500)).not.toThrow()
      await nextTick()
      await nextTick()

      expect(document.body.children.length).toBe(before)
    })

    it('repeated right-clicks with replaced options do not leak submenu containers (MENU-04)', async () => {
      vi.useFakeTimers()
      const before = document.body.children.length
      const wrapper = mountMenu()
      await nextTick()

      // 打开子菜单后再次右键：resetContextmenu 会把 panelOptions 重置为只有根菜单，
      // 之前创建的子菜单容器不再被 panelOptions 引用
      const openSubmenuThenRightClickAgain = async () => {
        await rightClickAndHover(wrapper)
        vi.advanceTimersByTime(350)
        await nextTick()
        document.querySelector('#contextmenu-target')!.dispatchEvent(new MouseEvent('contextmenu'))
        await nextTick()
      }

      await openSubmenuThenRightClickAgain()
      // 只剩根菜单：第二次右键关闭了子菜单，子菜单的元素由 Vue 移除
      const afterFirstOpen = document.body.children.length
      expect(afterFirstOpen).toBe(before + 1)

      // ve-table 每次右键都会替换 options（id 会重新生成）
      for (let i = 0; i < 5; i++) {
        await wrapper.setProps({ options: cloneDeep(OPTIONS) as any })
        await openSubmenuThenRightClickAgain()
      }

      expect(document.body.children.length).toBe(afterFirstOpen)

      wrapper.unmount()
      expect(document.body.children.length).toBe(before)
    })
  })

  // MOD-09：菜单由 <Teleport> 渲染，显示 / 关闭只修改状态；关闭的定时器可以被打断
  describe('teleported menu (MOD-09)', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    function mountMenu() {
      return mountDetached(veContextmenu, {
        props: {
          options: cloneDeep(OPTIONS) as any,
          eventTarget: document.querySelector('#contextmenu-target') as HTMLElement,
        },
      })
    }

    const rightClick = () => document.querySelector('#contextmenu-target')!.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
    )
    const openPoppers = () => [...document.querySelectorAll<HTMLElement>('.ve-contextmenu-popper')]

    it('renders the menu inside the component until it is first opened', async () => {
      const wrapper = mountMenu()
      await nextTick()

      // 隐藏在组件内部，body 中没有菜单
      expect(wrapper.find('.ve-contextmenu .ve-contextmenu-panel').exists()).toBe(true)
      expect(openPoppers()).toHaveLength(0)

      rightClick()
      await nextTick()
      expect(openPoppers()).toHaveLength(1)
      expect(openPoppers()[0].parentElement).toBe(document.body)
      wrapper.unmount()
    })

    it('a document click does nothing for a closed menu', async () => {
      const wrapper = mountMenu()
      await nextTick()

      vi.useFakeTimers()
      document.body.click()
      expect(vi.getTimerCount()).toBe(0)
      expect((wrapper.vm as any).isPanelsEmptyed).toBe(true)
      wrapper.unmount()
    })

    it('opening again cancels the pending hide of a clicked item', async () => {
      vi.useFakeTimers()
      const wrapper = mountMenu()
      await nextTick()

      rightClick()
      await nextTick()
      // 点击菜单项：50ms 后关闭
      openPoppers()[0].querySelectorAll<HTMLElement>('.ve-contextmenu-node')[0].click()
      vi.advanceTimersByTime(20)
      // 关闭之前再次右键
      rightClick()
      await nextTick()
      vi.advanceTimersByTime(500)
      await nextTick()

      expect((wrapper.vm as any).isPanelsEmptyed).toBe(false)
      expect(openPoppers()).toHaveLength(1)
      wrapper.unmount()
    })

    it('unmount clears the pending hide timers', async () => {
      vi.useFakeTimers()
      const wrapper = mountMenu()
      await nextTick()

      rightClick()
      await nextTick()
      openPoppers()[0].querySelectorAll<HTMLElement>('.ve-contextmenu-node')[0].click()
      wrapper.unmount()

      expect(vi.getTimerCount()).toBe(0)
      expect(openPoppers()).toHaveLength(0)
    })
  })
})
