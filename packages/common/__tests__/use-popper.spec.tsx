import type { PopperAppendTo } from '../popper'
import veContextmenu from '@/ve-contextmenu'
import veDropdown from '@/ve-dropdown'
import { mount } from '@vue/test-utils'
import { createSSRApp, defineComponent, h, nextTick, onMounted, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import {
  clampToViewport,
  getBottomStartPosition,
  resolveAppendTo,
  usePopper,
} from '../popper'

// MOD-09：弹出层（下拉框、右键菜单）共用的 usePopper
describe('popper position helpers', () => {
  const VIEWPORT = { scrollX: 300, scrollY: 200, width: 1000, height: 700 }

  it('clampToViewport keeps a box that fits', () => {
    expect(clampToViewport({ x: 400, y: 300, width: 100, height: 100 }, VIEWPORT))
      .toEqual({ left: 400, top: 300 })
  })

  it('clampToViewport shifts a box that overflows the right and bottom edges back into the viewport', () => {
    expect(clampToViewport({ x: 1250, y: 850, width: 100, height: 100 }, VIEWPORT))
      .toEqual({ left: 300 + 1000 - 100, top: 200 + 700 - 100 })
  })

  it('clampToViewport pins a box larger than the viewport to its top / left edge and limits its height (MENU-07)', () => {
    expect(clampToViewport({ x: 500, y: 600, width: 1200, height: 900 }, VIEWPORT))
      .toEqual({ left: 300, top: 200, maxHeight: 700 })
  })

  it('clampToViewport does nothing without layout (viewport size 0)', () => {
    expect(clampToViewport({ x: -50, y: -50, width: 100, height: 5000 }, { scrollX: 0, scrollY: 0, width: 0, height: 0 }))
      .toEqual({ left: -50, top: -50 })
  })

  it('getBottomStartPosition places the popper below the trigger, aligned to its left edge', () => {
    expect(getBottomStartPosition({
      trigger: { left: 100, top: 50, height: 20, spaceRight: 500, spaceBottom: 500 },
      popper: { width: 120, height: 200 },
      offset: 5,
    })).toEqual({ left: 100, top: 50 + 20 + 5 })
  })

  it('getBottomStartPosition flips to the left and above when there is no room', () => {
    expect(getBottomStartPosition({
      trigger: { left: 900, top: 650, height: 20, spaceRight: 50, spaceBottom: 30 },
      popper: { width: 120, height: 200 },
      offset: 5,
    })).toEqual({ left: 900 - 120, top: 650 - 200 - 5 })
  })

  it('getBottomStartPosition adds the scroll offset of a custom container', () => {
    expect(getBottomStartPosition({
      trigger: { left: 10, top: 10, height: 20, spaceRight: 500, spaceBottom: 500 },
      popper: { width: 120, height: 200 },
      offset: 0,
      scroll: { left: 30, top: 40 },
    })).toEqual({ left: 40, top: 70 })
  })
})

describe('resolveAppendTo', () => {
  it('resolves a selector, an element and the default', () => {
    const el = document.createElement('section')
    el.id = 'popper-target'
    document.body.appendChild(el)

    expect(resolveAppendTo('#popper-target')).toBe(el)
    expect(resolveAppendTo(el)).toBe(el)
    expect(resolveAppendTo(undefined)).toBe(document.body)
    expect(resolveAppendTo('')).toBe(document.body)
    el.remove()
  })

  it('falls back to body and warns when the selector matches nothing (DD-06)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(resolveAppendTo('#nothing-here', 'VeTest')).toBe(document.body)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[VeTest] popperAppendTo "#nothing-here"'))
    warn.mockRestore()
  })
})

describe('usePopper', () => {
  // 统计子组件的挂载次数：隐藏 / 再显示不能重新创建内容
  let childMounts = 0
  const Child = defineComponent({
    setup() {
      onMounted(() => childMounts++)
      return () => h('span', { class: 'probe-child' }, 'content')
    },
  })

  const Probe = defineComponent({
    props: {
      visible: { type: Boolean, default: false },
      appendTo: { type: [String, Object] as PropType<PopperAppendTo>, default: undefined },
    },
    setup(props) {
      const trigger = ref<HTMLElement | null>(null)
      const popperEl = ref<HTMLElement | null>(null)
      const popper = usePopper(trigger, {
        visible: () => props.visible,
        appendTo: () => props.appendTo,
        placement: 'bottom-start',
        popperRef: popperEl,
        offset: 5,
        name: 'Probe',
      })
      return () => {
        const content = h('div', {
          ref: popperEl,
          class: 'probe-popper',
          style: popper.position.value
            ? { left: `${popper.position.value.left}px`, top: `${popper.position.value.top}px` }
            : {},
        }, [h(Child)])
        return h('div', { class: 'probe' }, [
          h('button', { ref: trigger, class: 'probe-trigger' }, 'trigger'),
          h('div', { class: 'probe-hidden' }, [
            popper.isTeleported.value ? popper.renderTeleport([content]) : content,
          ]),
        ])
      }
    },
  })

  const popperParent = () => document.querySelector('.probe-popper')?.parentElement

  beforeEach(() => {
    childMounts = 0
  })

  it('keeps the content inside the component until it is first shown', async () => {
    const wrapper = mount(Probe, { attachTo: document.body })
    await nextTick()

    expect(popperParent()!.classList.contains('probe-hidden')).toBe(true)
    expect(wrapper.html()).not.toContain('teleport')
    wrapper.unmount()
  })

  it('moves the content to body while visible and back while hidden, without recreating it', async () => {
    const wrapper = mount(Probe, { attachTo: document.body })
    await nextTick()
    expect(childMounts).toBe(1)

    await wrapper.setProps({ visible: true })
    expect(popperParent()).toBe(document.body)
    // 第一次显示时从组件内部切换到 <Teleport>，内容重新创建一次
    expect(childMounts).toBe(2)

    await wrapper.setProps({ visible: false })
    expect(popperParent()!.classList.contains('probe-hidden')).toBe(true)

    await wrapper.setProps({ visible: true })
    expect(popperParent()).toBe(document.body)
    expect(childMounts).toBe(2)
    wrapper.unmount()
  })

  it('teleports to the appendTo target, and follows it when it changes', async () => {
    const a = document.createElement('section')
    const b = document.createElement('section')
    document.body.append(a, b)

    const wrapper = mount(Probe, { attachTo: document.body, props: { appendTo: a, visible: true } })
    await nextTick()
    expect(popperParent()).toBe(a)

    await wrapper.setProps({ appendTo: b })
    expect(popperParent()).toBe(b)
    wrapper.unmount()
    a.remove()
    b.remove()
  })

  it('positions the popper below the trigger before paint (bottom-start)', async () => {
    const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const box = this.classList.contains('probe-trigger')
        ? { left: 100, top: 40, width: 80, height: 20 }
        : { left: 0, top: 0, width: 0, height: 0 }
      return { ...box, right: box.left + box.width, bottom: box.top + box.height, x: box.left, y: box.top, toJSON() {} } as DOMRect
    })
    // jsdom 的视口尺寸为 0：模拟 1000x700，下方空间足够
    const doc = document.documentElement
    Object.defineProperty(doc, 'clientWidth', { configurable: true, value: 1000 })
    Object.defineProperty(doc, 'clientHeight', { configurable: true, value: 700 })
    const wrapper = mount(Probe, { attachTo: document.body })
    await nextTick()

    await wrapper.setProps({ visible: true })
    const popperEl = document.querySelector<HTMLElement>('.probe-popper')!
    expect(popperEl.style.left).toBe('100px')
    expect(popperEl.style.top).toBe(`${40 + 20 + 5}px`)
    wrapper.unmount()
    rect.mockRestore()
    delete (doc as any).clientWidth
    delete (doc as any).clientHeight
  })

  it('listens to scroll and resize only while visible', async () => {
    const add = vi.spyOn(window, 'addEventListener')
    const remove = vi.spyOn(window, 'removeEventListener')
    const resizeCalls = (spy: typeof add) => spy.mock.calls.filter(([type]) => type === 'resize').length

    const wrapper = mount(Probe, { attachTo: document.body })
    await nextTick()
    expect(resizeCalls(add)).toBe(0)

    await wrapper.setProps({ visible: true })
    expect(resizeCalls(add)).toBe(1)

    await wrapper.setProps({ visible: false })
    expect(resizeCalls(remove)).toBe(1)

    await wrapper.setProps({ visible: true })
    wrapper.unmount()
    expect(resizeCalls(remove)).toBe(2)
    add.mockRestore()
    remove.mockRestore()
  })

  it('unmounting removes the teleported content and leaves nothing in body', async () => {
    const before = document.body.childNodes.length
    const wrapper = mount(Probe, { props: { visible: true } })
    await nextTick()
    expect(popperParent()).toBe(document.body)

    wrapper.unmount()
    expect(document.querySelector('.probe-popper')).toBeNull()
    expect(document.body.childNodes.length).toBe(before)
  })
})

/*
  SSR + hydration：禁用状态的 <Teleport> 在 hydration 时会把 body 中无关的第一个节点当作锚点，
  卸载时将其删除。弹出层在第一次显示之前不渲染 <Teleport>，所以 hydration 后打开、关闭、卸载都不会动到 body 中的其他节点。
  */
describe('usePopper with SSR hydration', () => {
  const OPTIONS = [
    { value: 0, label: 'Apple', selected: false },
    { value: 1, label: 'Orange', selected: true },
  ]
  const MENUS = [{ label: 'menu1', type: 'menu1' }]

  const App = defineComponent({
    setup() {
      return () => h('div', [
        h('div', { id: 'hydrate-menu-target' }, 'target'),
        h(veDropdown, { modelValue: OPTIONS }, { default: () => h('span', { class: 'hydrate-trigger' }, 'open') }),
        h(veContextmenu, { eventTarget: '#hydrate-menu-target', options: MENUS as any }),
      ])
    },
  })

  it('hydrates, opens, closes and unmounts without touching other body nodes', async () => {
    const html = await renderToString(createSSRApp(App))
    expect(html).not.toContain('teleport')

    const host = document.createElement('div')
    host.id = 'hydrate-app'
    host.innerHTML = html
    const sibling = document.createElement('div')
    sibling.id = 'hydrate-sibling'
    document.body.prepend(host)
    document.body.append(sibling)

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const app = createSSRApp(App)
    app.mount(host)
    await nextTick()
    expect(warn.mock.calls.flat().join(' ')).not.toMatch(/hydration/i)
    expect(error.mock.calls.flat().join(' ')).not.toMatch(/hydration/i)

    // 打开下拉框与右键菜单
    host.querySelector<HTMLElement>('.hydrate-trigger')!.click()
    host.querySelector('#hydrate-menu-target')!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    await nextTick()
    expect(document.querySelector('.ve-dropdown-popper')!.parentElement).toBe(document.body)
    expect(document.querySelector('.ve-contextmenu-popper')!.parentElement).toBe(document.body)

    // 关闭（点击外部）
    document.body.click()
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(document.querySelector('.ve-dropdown-popper')).toBeNull()
    expect(document.querySelector('.ve-contextmenu-popper')).toBeNull()

    app.unmount()
    expect(document.body.contains(host)).toBe(true)
    expect(document.body.contains(sibling)).toBe(true)

    warn.mockRestore()
    error.mockRestore()
    host.remove()
    sibling.remove()
  })
})
