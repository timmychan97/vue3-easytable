/**
 * TanStack Virtual integration for ve-table.
 *
 * Wraps @tanstack/virtual-core's Virtualizer in a thin adapter that
 * can be driven from an Options-API component.  The module owns:
 *   – creating / destroying the Virtualizer instance
 *   – bridging scroll-container & item measurement
 *   – exposing computed helpers (virtualItems, totalSize, spacers)
 *
 * It does NOT own any Vue reactivity – the host component is responsible
 * for re-rendering when `onChange` fires (typically via a version counter).
 */

import type { VirtualItem } from '@tanstack/virtual-core'
import {
  elementScroll,
  observeElementOffset,
  observeElementRect,

  Virtualizer,
} from '@tanstack/virtual-core'

// Re-export for consumers
export type { VirtualItem }

export interface VirtualScrollConfig {
  /** Total item count (= tableData.length). */
  count: number
  /** Returns the scroll-container DOM element. */
  getScrollElement: () => HTMLElement | null
  /** Estimated row height in px (used before measurement). */
  estimateSize: number
  /** Extra rows rendered above/below the visible window. */
  overscan: number
  /** Stable key for each row index. */
  getItemKey: (index: number) => string | number
  /** Called whenever the virtualizer's state changes (items, sizes, scroll). */
  onChange: () => void
  /** Optional user callback matching the legacy scrolling() API. `null` clears it in setOptions. */
  onScrolling?: ScrollingCallback | null
  /**
   * 滚动内容中位于第 0 行之前、会随内容一起滚走的高度（例如非固定表头）。
   * 对应 TanStack 的 `scrollMargin`：第 0 行的 start = scrollMargin。
   */
  scrollMargin?: number
  /**
   * 滚动容器顶部 / 底部被粘性元素（固定表头 / 固定表尾）遮住的高度。
   * 这部分不属于行的可视区，因此从 TanStack 看到的容器高度中减去。
   * 行坐标不变：scrollTop = 第 i 行的 start 时，第 i 行正好紧贴在固定表头下方。
   */
  stickyStart?: number
  stickyEnd?: number
}

export interface ScrollingInfo {
  startRowIndex: number
  visibleStartIndex: number
  visibleEndIndex: number
  visibleAboveCount: number
  visibleBelowCount: number
}

export type ScrollingCallback = (info: ScrollingInfo) => void

interface Rect {
  width: number
  height: number
}

export interface VirtualScrollInstance {
  /** The underlying TanStack Virtualizer (escape hatch). */
  readonly virtualizer: Virtualizer<HTMLElement, HTMLElement>

  /** Items that should be rendered right now (visible + overscan). */
  getVirtualItems: () => VirtualItem[]

  /** Total scrollable height in px. */
  getTotalSize: () => number

  /**
   * Ref callback – assign to the wrapping element of each virtual item
   * (the `<tbody>` per-row or the `<tr>` itself).
   * The element **must** carry a `data-index` attribute.
   */
  measureElement: (node: HTMLElement | null) => void

  /** Scroll a row index into view. */
  scrollToIndex: (index: number, options?: { align?: 'start' | 'center' | 'end' | 'auto', behavior?: ScrollBehavior }) => void

  /** Scroll to an absolute pixel offset. */
  scrollToOffset: (offset: number, options?: { align?: 'start' | 'center' | 'end' | 'auto', behavior?: ScrollBehavior }) => void

  /** Invalidate all size caches and force re-measurement. */
  measure: () => void

  /** Update options at runtime (e.g. count changed). */
  setOptions: (patch: Partial<VirtualScrollConfig>) => void

  /** Tear down scroll listeners and ResizeObservers. */
  destroy: () => void

  // ── Helpers for the padding-spacer rendering approach ──

  /** Height (px) of the spacer <tr> rendered before the first virtual item. */
  getPaddingTop: () => number

  /** Height (px) of the spacer <tr> rendered after the last virtual item. */
  getPaddingBottom: () => number
}

/**
 * Create a VirtualScrollInstance.
 *
 * Call in `mounted()` (the scroll element must exist in the DOM).
 * Call `.destroy()` in `beforeUnmount()`.
 */
export function createVirtualScroll(config: VirtualScrollConfig): VirtualScrollInstance {
  const {
    count,
    getScrollElement,
    overscan,
    onChange,
    scrollMargin = 0,
  } = config

  // 可在运行时通过 setOptions 修改的配置
  let currentEstimateSize = config.estimateSize
  let currentGetItemKey = config.getItemKey
  let currentOnScrolling: ScrollingCallback | null = config.onScrolling ?? null
  let stickyStart = config.stickyStart ?? 0
  let stickyEnd = config.stickyEnd ?? 0

  // TanStack 的 getMeasurements 以 getItemKey 的引用作为缓存依赖之一。
  // 每次需要重新计算行位置（行 key 顺序变化、预估行高变化）时换一个新的包装函数；
  // 已测量的行高按 key 缓存在 itemSizeCache 中，不受影响。
  const wrapGetItemKey = () => (index: number) => currentGetItemKey(index)

  // 容器尺寸：记录原始尺寸与 TanStack 的回调，粘性高度变化时可以重新上报
  let rawRect: Rect | null = null
  let emitRect: ((rect: Rect) => void) | null = null
  // 至少保留 1px，避免表头比容器还高时 TanStack 认为容器尚未布局而不渲染任何行
  const toViewportRect = (rect: Rect): Rect => ({
    width: rect.width,
    height: rect.height > 0 ? Math.max(rect.height - stickyStart - stickyEnd, 1) : 0,
  })

  const fireScrolling = (instance: Virtualizer<HTMLElement, HTMLElement>) => {
    if (!currentOnScrolling)
      return
    const range = instance.range
    if (!range)
      return
    const items = instance.getVirtualItems()
    const startRowIndex = items.length > 0 ? items[0].index : 0
    currentOnScrolling({
      startRowIndex,
      visibleStartIndex: range.startIndex,
      visibleEndIndex: range.endIndex,
      visibleAboveCount: range.startIndex - startRowIndex,
      visibleBelowCount: items.length > 0
        ? items[items.length - 1].index - range.endIndex
        : 0,
    })
  }

  const handleChange = (instance: Virtualizer<HTMLElement, HTMLElement>) => {
    // Fire the legacy scrolling() callback
    fireScrolling(instance)
    // Notify host component to re-render
    onChange()
  }

  // Build TanStack options
  const virtualizerOptions = {
    count,
    getScrollElement,
    estimateSize: () => currentEstimateSize,
    overscan,
    getItemKey: wrapGetItemKey(),
    scrollMargin,
    observeElementRect: (instance: Virtualizer<HTMLElement, HTMLElement>, cb: (rect: Rect) => void) => {
      emitRect = cb
      const unsubscribe = observeElementRect(instance, (rect) => {
        rawRect = rect
        cb(toViewportRect(rect))
      })
      return () => {
        emitRect = null
        unsubscribe?.()
      }
    },
    observeElementOffset,
    scrollToFn: elementScroll,
    onChange: (instance: Virtualizer<HTMLElement, HTMLElement>, _sync: boolean) => handleChange(instance),
  }

  const virtualizer = new Virtualizer<HTMLElement, HTMLElement>(virtualizerOptions)

  // _didMount sets up scroll listeners & ResizeObserver on the scroll container.
  // It returns a cleanup function.
  const cleanup = virtualizer._didMount()
  // _willUpdate 才会真正挂载滚动容器：读取容器尺寸（observeElementRect）并监听 scroll（observeElementOffset）。
  // 缺少这一步时 scrollRect 一直是 initialRect（0x0），TanStack 不产出任何行，滚动也不会更新可视区。
  virtualizer._willUpdate()

  const instance: VirtualScrollInstance = {
    get virtualizer() {
      return virtualizer
    },

    getVirtualItems() {
      return virtualizer.getVirtualItems()
    },

    getTotalSize() {
      return virtualizer.getTotalSize()
    },

    measureElement(node: HTMLElement | null) {
      virtualizer.measureElement(node)
    },

    scrollToIndex(index, options) {
      virtualizer.scrollToIndex(index, options)
    },

    scrollToOffset(offset, options) {
      virtualizer.scrollToOffset(offset, options)
    },

    measure() {
      virtualizer.measure()
    },

    setOptions(patch) {
      const newOpts: Record<string, any> = {}
      let remeasure = false

      if (patch.count !== undefined && patch.count !== virtualizer.options.count) {
        newOpts.count = patch.count
      }
      if (patch.estimateSize !== undefined && patch.estimateSize !== currentEstimateSize) {
        currentEstimateSize = patch.estimateSize
        // 未测量的行需要按新的预估行高重新排布
        remeasure = true
      }
      if (patch.overscan !== undefined && patch.overscan !== virtualizer.options.overscan) {
        newOpts.overscan = patch.overscan
      }
      if (patch.getItemKey !== undefined) {
        currentGetItemKey = patch.getItemKey
        remeasure = true
      }
      if (patch.scrollMargin !== undefined && patch.scrollMargin !== virtualizer.options.scrollMargin) {
        newOpts.scrollMargin = patch.scrollMargin
      }
      if ('onScrolling' in patch) {
        currentOnScrolling = patch.onScrolling ?? null
      }
      if (remeasure) {
        newOpts.getItemKey = wrapGetItemKey()
      }

      let stickyChanged = false
      if (patch.stickyStart !== undefined && patch.stickyStart !== stickyStart) {
        stickyStart = patch.stickyStart
        stickyChanged = true
      }
      if (patch.stickyEnd !== undefined && patch.stickyEnd !== stickyEnd) {
        stickyEnd = patch.stickyEnd
        stickyChanged = true
      }

      if (Object.keys(newOpts).length > 0) {
        virtualizer.setOptions({
          ...virtualizer.options,
          ...newOpts,
        })
        virtualizer._willUpdate()
        // TanStack 的 setOptions 不会触发 onChange：主动通知一次，让宿主按新的行数 / 位置重新渲染
        handleChange(virtualizer)
      }

      // 粘性高度变化：按原始容器尺寸重新上报给 TanStack（会自行判断是否需要通知）
      if (stickyChanged && rawRect && emitRect)
        emitRect(toViewportRect(rawRect))
    },

    destroy() {
      cleanup()
    },

    getPaddingTop() {
      const items = virtualizer.getVirtualItems()
      if (items.length === 0)
        return 0
      return items[0].start - virtualizer.options.scrollMargin
    },

    getPaddingBottom() {
      const items = virtualizer.getVirtualItems()
      if (items.length === 0)
        return 0
      // getTotalSize() 不含 scrollMargin，而 item.end 含有，需换算到同一坐标
      const totalSize = virtualizer.getTotalSize()
      const lastItem = items[items.length - 1]
      return totalSize - (lastItem.end - virtualizer.options.scrollMargin)
    },
  }

  return instance
}
