import { mount } from '@vue/test-utils'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'

// 用假的 ResizeObserver 记录 observe / disconnect，并可以手动触发回调
const observers: FakeResizeObserver[] = []

class FakeResizeObserver {
  callback: (entries: any[]) => void
  targets = new Set<Element>()
  disconnected = false

  constructor(callback: (entries: any[]) => void) {
    this.callback = callback
    observers.push(this)
  }

  observe(el: Element) {
    this.disconnected = false
    this.targets.add(el)
  }

  disconnect() {
    this.disconnected = true
    this.targets.clear()
  }

  // 模拟一次尺寸变化
  fire(el: Element, width = 100) {
    if (this.targets.has(el))
      this.callback([{ target: el, contentRect: { left: 0, top: 0, width, height: 10 } }])
  }
}

vi.mock('resize-observer-polyfill', () => ({ default: FakeResizeObserver }))

// setup.ts 已经通过 useVeTable 加载了真实的 polyfill，这里重置模块缓存后重新导入，才能用上 mock
let addResizeListener: typeof import('@/common/utils/resize-event')['addResizeListener']
let removeResizeListener: typeof import('@/common/utils/resize-event')['removeResizeListener']
let VueDomResizeObserver: typeof import('@/common/comps/resize-observer')['default']

beforeAll(async () => {
  vi.resetModules()
  ;({ addResizeListener, removeResizeListener } = await import('@/common/utils/resize-event'))
  VueDomResizeObserver = (await import('@/common/comps/resize-observer')).default
})

// 当前在观察 el 的 observer
function activeObserversOf(el: Element) {
  return observers.filter(ob => ob.targets.has(el))
}

function fireResize(el: Element) {
  activeObserversOf(el).forEach(ob => ob.fire(el))
}

describe('resize-event (INFRA-10)', () => {
  beforeEach(() => {
    observers.length = 0
  })

  it('removing a listener that was never added does not remove another listener', () => {
    const el = document.createElement('div')
    const a = vi.fn()
    const b = vi.fn()

    addResizeListener(el, a)
    addResizeListener(el, b)
    // 从未添加过的回调：indexOf 为 -1，不能删掉最后一个回调 b
    removeResizeListener(el, vi.fn())

    fireResize(el)

    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('removing the last listener disconnects, and adding again observes again', () => {
    const el = document.createElement('div')
    const a = vi.fn()
    const b = vi.fn()

    addResizeListener(el, a)
    removeResizeListener(el, a)

    expect(activeObserversOf(el)).toHaveLength(0)

    // disconnect 之后再次添加，必须重新开始观察
    addResizeListener(el, b)
    fireResize(el)

    expect(activeObserversOf(el)).toHaveLength(1)
    expect(b).toHaveBeenCalledTimes(1)
    expect(a).not.toHaveBeenCalled()
  })

  it('removing a listener twice is harmless', () => {
    const el = document.createElement('div')
    const a = vi.fn()
    const b = vi.fn()

    addResizeListener(el, a)
    addResizeListener(el, b)
    removeResizeListener(el, a)
    removeResizeListener(el, a)

    fireResize(el)

    expect(b).toHaveBeenCalledTimes(1)
    expect(activeObserversOf(el)).toHaveLength(1)
  })

  it('removeResizeListener on an element without listeners does nothing', () => {
    expect(() => removeResizeListener(document.createElement('div'), vi.fn())).not.toThrow()
  })
})

describe('vueDomResizeObserver component', () => {
  beforeEach(() => {
    observers.length = 0
  })

  it('observes its element while mounted and disconnects on unmount', () => {
    const wrapper = mount(VueDomResizeObserver, {
      props: { tagName: 'div', id: 'k' },
      slots: { default: () => h('span', 'content') },
    })
    const el = wrapper.element

    expect(activeObserversOf(el)).toHaveLength(1)

    fireResize(el)
    expect(wrapper.emitted('on-dom-resize-change')).toHaveLength(1)

    wrapper.unmount()

    expect(activeObserversOf(el)).toHaveLength(0)
    expect(observers.every(ob => ob.disconnected)).toBe(true)
  })
})
