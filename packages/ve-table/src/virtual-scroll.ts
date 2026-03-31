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
  /** Optional user callback matching the legacy scrolling() API. */
  onScrolling?: (info: {
    startRowIndex: number
    visibleStartIndex: number
    visibleEndIndex: number
    visibleAboveCount: number
    visibleBelowCount: number
  }) => void
  /**
   * Pixel offset subtracted from every item's `start` to account for
   * content above the virtualised rows (e.g. sticky header height).
   * Maps to TanStack's `scrollMargin`.
   */
  scrollMargin?: number
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
    estimateSize,
    overscan,
    getItemKey,
    onChange,
    onScrolling,
    scrollMargin = 0,
  } = config

  // Build TanStack options
  const virtualizerOptions = {
    count,
    getScrollElement,
    estimateSize: () => estimateSize,
    overscan,
    getItemKey,
    scrollMargin,
    observeElementRect,
    observeElementOffset,
    scrollToFn: elementScroll,
    onChange: (instance: Virtualizer<HTMLElement, HTMLElement>, _sync: boolean) => {
      // Fire the legacy scrolling() callback
      if (onScrolling) {
        const range = instance.range
        if (range) {
          const items = instance.getVirtualItems()
          const startRowIndex = items.length > 0 ? items[0].index : 0
          onScrolling({
            startRowIndex,
            visibleStartIndex: range.startIndex,
            visibleEndIndex: range.endIndex,
            visibleAboveCount: range.startIndex - startRowIndex,
            visibleBelowCount: items.length > 0
              ? items[items.length - 1].index - range.endIndex
              : 0,
          })
        }
      }

      // Notify host component to re-render
      onChange()
    },
  }

  const virtualizer = new Virtualizer<HTMLElement, HTMLElement>(virtualizerOptions)

  // _didMount sets up scroll listeners & ResizeObserver on the scroll container.
  // It returns a cleanup function.
  const cleanup = virtualizer._didMount()

  // Track the current estimateSize so we can update it
  let currentEstimateSize = estimateSize
  let currentOverscan = overscan
  let currentScrollMargin = scrollMargin

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

      if (patch.count !== undefined) {
        newOpts.count = patch.count
      }
      if (patch.estimateSize !== undefined && patch.estimateSize !== currentEstimateSize) {
        currentEstimateSize = patch.estimateSize
        newOpts.estimateSize = () => currentEstimateSize
      }
      if (patch.overscan !== undefined && patch.overscan !== currentOverscan) {
        currentOverscan = patch.overscan
        newOpts.overscan = currentOverscan
      }
      if (patch.getItemKey !== undefined) {
        newOpts.getItemKey = patch.getItemKey
      }
      if (patch.scrollMargin !== undefined && patch.scrollMargin !== currentScrollMargin) {
        currentScrollMargin = patch.scrollMargin
        newOpts.scrollMargin = currentScrollMargin
      }
      if (patch.onScrolling !== undefined) {
        // Rebuild onChange with the new scrolling callback
        const newOnScrolling = patch.onScrolling
        newOpts.onChange = (inst: Virtualizer<HTMLElement, HTMLElement>) => {
          if (newOnScrolling) {
            const range = inst.range
            if (range) {
              const items = inst.getVirtualItems()
              const startRowIndex = items.length > 0 ? items[0].index : 0
              newOnScrolling({
                startRowIndex,
                visibleStartIndex: range.startIndex,
                visibleEndIndex: range.endIndex,
                visibleAboveCount: range.startIndex - startRowIndex,
                visibleBelowCount: items.length > 0
                  ? items[items.length - 1].index - range.endIndex
                  : 0,
              })
            }
          }
          onChange()
        }
      }

      if (Object.keys(newOpts).length > 0) {
        virtualizer.setOptions({
          ...virtualizer.options,
          ...newOpts,
        })
        virtualizer._willUpdate()
      }
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
      const totalSize = virtualizer.getTotalSize()
      const lastItem = items[items.length - 1]
      return totalSize - lastItem.end
    },
  }

  return instance
}
