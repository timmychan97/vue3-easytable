import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { useVeTable } from '../../packages/vue/src/index'

/**
 * 挂载组件并全局注册所有 ve 组件
 */
export function wrapMount(component: any, config?: any) {
  const { global: configGlobal, ...restConfig } = config ?? {}
  return mount(component, {
    global: {
      plugins: [useVeTable()],
      ...configGlobal,
    },
    attachTo: 'body',
    ...restConfig,
  })
}

export function getApp(config: any) {
  return config
}

export function later(delay: number | undefined = 0): Promise<void> {
  return new Promise((resolve) => {
    if (typeof delay === 'number') {
      setTimeout(() => {
        resolve()
      }, delay)
    }
    else {
      nextTick(() => {
        resolve()
      })
    }
  })
}

/*
 * @mockScrollTo
 * @desc mock scrollTo function
 */
export function mockScrollTo() {
  const fn = vi.fn()
  Element.prototype.scrollTo = fn
  return fn
}

/*
 * @mockElementMeasurement
 * @desc mock element measurement
 */
export function mockElementMeasurement(key: string, value: number) {
  Object.defineProperty(HTMLElement.prototype, key, {
    configurable: true,
    value,
  })
}

/*
 * @clearMockElementMeasurement
 * @desc clear mock element measurement
 */
export function clearMockElementMeasurement(key: string) {
  const originalValue = {
    value: 1200,
    writable: false,
    enumerable: false,
    configurable: true,
  }

  Object.defineProperty(HTMLElement.prototype, key, originalValue)
}
