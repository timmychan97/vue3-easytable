import type { MockInstance } from 'vitest'
import clickoutside from '@/common/directives/clickoutside'
import eventsOutside from '@/common/directives/events-outside'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref, withDirectives } from 'vue'

// 渲染一个带指令的 <div class="inside">，value 来自响应式的 ref，方便在挂载后修改绑定值
function mountWithDirective(directive: any, value: ReturnType<typeof ref<any>>) {
  return mount(defineComponent({
    name: 'DirectiveHost',
    setup() {
      return () => h('div', [
        withDirectives(h('div', { class: 'inside' }, 'inside'), [[directive, value.value]]),
        h('div', { class: 'outside' }, 'outside'),
      ])
    },
  }), { attachTo: 'body' })
}

// 事件监听器中抛出的错误不会传给 dispatchEvent 的调用方，jsdom 会在 window 上派发 error 事件
function collectListenerErrors() {
  const errors: unknown[] = []
  const onError = (e: ErrorEvent) => {
    errors.push(e.error)
    e.preventDefault()
  }
  window.addEventListener('error', onError)
  return {
    errors,
    stop: () => window.removeEventListener('error', onError),
  }
}

describe('directives (INFRA-09)', () => {
  let consoleError: MockInstance<any[], any>

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('clickoutside', () => {
    it('calls the callback for clicks outside only', async () => {
      const callback = vi.fn()
      const wrapper = mountWithDirective(clickoutside, ref(callback))

      await wrapper.find('.inside').trigger('click')
      expect(callback).not.toHaveBeenCalled()

      await wrapper.find('.outside').trigger('click')
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('a value that is not a function logs an error and clicks do not throw', async () => {
      const listener = collectListenerErrors()
      const wrapper = mountWithDirective(clickoutside, ref('not a function'))

      expect(consoleError).toHaveBeenCalledTimes(1)

      await wrapper.find('.outside').trigger('click')
      await wrapper.find('.outside').trigger('click')
      listener.stop()

      expect(listener.errors).toEqual([])
    })

    it('uses the latest callback after the binding value changes', async () => {
      const first = vi.fn()
      const second = vi.fn()
      const value = ref<any>(first)
      const wrapper = mountWithDirective(clickoutside, value)

      value.value = second
      await nextTick()

      await wrapper.find('.outside').trigger('click')

      expect(first).not.toHaveBeenCalled()
      expect(second).toHaveBeenCalledTimes(1)
    })

    it('removes its document listener on unmount', async () => {
      const callback = vi.fn()
      const wrapper = mountWithDirective(clickoutside, ref(callback))
      wrapper.unmount()

      document.body.click()

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('events-outside', () => {
    it('calls the callback for the given events outside only', async () => {
      const callback = vi.fn()
      const wrapper = mountWithDirective(eventsOutside, ref({ events: ['mousedown'], callback }))

      await wrapper.find('.inside').trigger('mousedown')
      await wrapper.find('.outside').trigger('click')
      expect(callback).not.toHaveBeenCalled()

      await wrapper.find('.outside').trigger('mousedown')
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('unmounting with an invalid value does not throw', () => {
      const wrapper = mountWithDirective(eventsOutside, ref({ callback: vi.fn() }))
      expect(consoleError).toHaveBeenCalledTimes(1)

      expect(() => wrapper.unmount()).not.toThrow()
    })

    it('mounting and unmounting without a value does not throw', () => {
      let wrapper: ReturnType<typeof mountWithDirective> | undefined

      expect(() => {
        wrapper = mountWithDirective(eventsOutside, ref(undefined))
      }).not.toThrow()
      expect(() => wrapper?.unmount()).not.toThrow()
    })

    it('uses the latest callback and events after the binding value changes', async () => {
      const first = vi.fn()
      const second = vi.fn()
      const value = ref<any>({ events: ['mousedown'], callback: first })
      const wrapper = mountWithDirective(eventsOutside, value)

      value.value = { events: ['mouseup'], callback: second }
      await nextTick()

      await wrapper.find('.outside').trigger('mousedown')
      await wrapper.find('.outside').trigger('mouseup')

      expect(first).not.toHaveBeenCalled()
      expect(second).toHaveBeenCalledTimes(1)
    })

    it('removes its document listeners on unmount', async () => {
      const callback = vi.fn()
      const wrapper = mountWithDirective(eventsOutside, ref({ events: ['mousedown'], callback }))
      wrapper.unmount()

      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))

      expect(callback).not.toHaveBeenCalled()
    })
  })
})
