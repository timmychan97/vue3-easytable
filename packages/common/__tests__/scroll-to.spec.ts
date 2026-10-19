import { scrollTo } from '@/common/utils'
import { describe, expect, it, vi } from 'vitest'

// 已经滚动到 (left 30, top 40) 的元素
function scrolledElement() {
  const el = document.createElement('div')
  el.scrollLeft = 30
  el.scrollTop = 40
  return el
}

describe('scrollTo', () => {
  it('calls Element.scrollTo when it exists', () => {
    const el = scrolledElement()
    const fn = vi.fn()
    Object.defineProperty(el, 'scrollTo', { configurable: true, value: fn })

    scrollTo(el, { top: 10, behavior: 'smooth' })

    expect(fn).toHaveBeenCalledWith({ top: 10, behavior: 'smooth' })
  })

  // INFRA-20：没有 Element.scrollTo 时（jsdom、很老的浏览器），只写入给出的坐标，另一个方向保持不变
  describe('fallback without Element.scrollTo (INFRA-20)', () => {
    it('jsdom has no Element.scrollTo, so these tests use the fallback', () => {
      expect(scrolledElement().scrollTo).toBeUndefined()
    })

    it('a top-only call keeps scrollLeft', () => {
      const el = scrolledElement()
      scrollTo(el, { top: 10 })
      expect(el.scrollTop).toBe(10)
      expect(el.scrollLeft).toBe(30)
    })

    it('a left-only call keeps scrollTop', () => {
      const el = scrolledElement()
      scrollTo(el, { left: 5 })
      expect(el.scrollLeft).toBe(5)
      expect(el.scrollTop).toBe(40)
    })

    it('sets both coordinates when both are given, including 0', () => {
      const el = scrolledElement()
      scrollTo(el, { top: 0, left: 0 })
      expect(el.scrollTop).toBe(0)
      expect(el.scrollLeft).toBe(0)
    })

    it('an empty option changes nothing', () => {
      const el = scrolledElement()
      scrollTo(el, {})
      expect(el.scrollTop).toBe(40)
      expect(el.scrollLeft).toBe(30)
    })
  })
})
