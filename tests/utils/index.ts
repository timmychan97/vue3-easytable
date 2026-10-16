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

/*
 * @mockVirtualScrollLayout
 * @desc jsdom 没有布局，TanStack Virtual 读到的容器与行高度都是 0，因此不会渲染任何行。
 *       这里按元素类型模拟 offsetHeight / offsetWidth：
 *       - 滚动容器（.ve-table-container）返回 containerHeight / containerWidth
 *       - 虚拟行（带 data-index 的 <tbody>）返回 rowHeight(index)
 *       - 其他元素返回 0（与 jsdom 默认一致）
 *       返回 restore()，在 afterAll 中调用。
 */
export function mockVirtualScrollLayout(options: {
  containerHeight: number
  containerWidth?: number
  rowHeight: (index: number) => number
}) {
  const { containerHeight, containerWidth = 1000 } = options
  const state = { rowHeight: options.rowHeight }

  const originals = {
    offsetHeight: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight'),
    offsetWidth: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth'),
  }

  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get(this: HTMLElement) {
      if (this.classList.contains('ve-table-container'))
        return containerHeight
      if (this.tagName === 'TBODY' && this.hasAttribute('data-index'))
        return state.rowHeight(Number(this.getAttribute('data-index')))
      return 0
    },
  })
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get(this: HTMLElement) {
      if (this.classList.contains('ve-table-container'))
        return containerWidth
      return 0
    },
  })

  return {
    // 允许单个用例切换行高
    setRowHeight(fn: (index: number) => number) {
      state.rowHeight = fn
    },
    restore() {
      (['offsetHeight', 'offsetWidth'] as const).forEach((key) => {
        const desc = originals[key]
        if (desc)
          Object.defineProperty(HTMLElement.prototype, key, desc)
        else
          delete (HTMLElement.prototype as any)[key]
      })
    },
  }
}

/*
 * @getVirtualRenderRange
 * @desc 按 TanStack Virtual 的规则计算应渲染的行区间（可视区 + 上下 overscan）
 */
export function getVirtualRenderRange(options: {
  count: number
  viewportHeight: number
  rowHeight: (index: number) => number
  overscan: number
  scrollTop?: number
}) {
  const { count, viewportHeight, rowHeight, overscan, scrollTop = 0 } = options

  const starts: number[] = []
  let offset = 0
  for (let i = 0; i < count; i++) {
    starts.push(offset)
    offset += rowHeight(i)
  }

  // 可视区第一行：start <= scrollTop 的最后一行
  let startIndex = 0
  while (startIndex < count - 1 && starts[startIndex + 1] <= scrollTop)
    startIndex++

  // 可视区最后一行：第一个 end >= scrollTop + viewportHeight 的行
  let endIndex = startIndex
  while (endIndex < count - 1 && starts[endIndex] + rowHeight(endIndex) < scrollTop + viewportHeight)
    endIndex++

  return {
    visibleStartIndex: startIndex,
    visibleEndIndex: endIndex,
    renderStartIndex: Math.max(startIndex - overscan, 0),
    renderEndIndex: Math.min(endIndex + overscan, count - 1),
    totalHeight: offset,
    rowStart: (index: number) => starts[index],
  }
}
