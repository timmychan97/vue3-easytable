import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

/**
 * 挂载组件并挂到 body 上（所有 ve 组件已在 setup.ts 中通过 config.global.plugins 全局注册）。
 * 用例结束后自动卸载并移除容器（见 auto-unmount.ts），不需要手动 unmount。
 */
export function wrapMount(component: any, config?: any) {
  return mount(component, {
    attachTo: 'body',
    ...config,
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
  // el 为该行的 <tbody>，需要按行 key 而不是下标决定行高时可以读取其中的 row-key
  rowHeight: (index: number, el: HTMLElement) => number
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
        return state.rowHeight(Number(this.getAttribute('data-index')), this)
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
    setRowHeight(fn: (index: number, el: HTMLElement) => number) {
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

/*
 * @mockCellRects
 * @desc jsdom 的 getBoundingClientRect 全为 0。这里让 body 单元格返回固定尺寸，
 *       其他元素返回一个容纳单元格的大矩形，供编辑框 / 选区的定位逻辑使用。
 *       单元格相对表格的偏移为 CELL_RECT_OFFSET。返回 vi.spyOn 的结果，用完调用 mockRestore()。
 */
export const CELL_RECT_OFFSET = { left: 10, top: 20 }

export function mockCellRects() {
  const rect = (left: number, top: number, width: number, height: number) => ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON() {
      return this
    },
  }) as DOMRect

  return vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    if (this.tagName === 'TD' && this.hasAttribute('col-key'))
      return rect(CELL_RECT_OFFSET.left, CELL_RECT_OFFSET.top, 100, 40)
    return rect(0, 0, 1000, 500)
  })
}
