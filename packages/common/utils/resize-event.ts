/*
fork from:
https://github.com/ElemeFE/element
*/

import ResizeObserver from 'resize-observer-polyfill'

// TODO
/* istanbul ignore next */
const resizeHandler = function (entries: any) {
  for (const entry of entries) {
    const listeners: any = entry.target.__resizeListeners__ || []
    if (listeners.length) {
      listeners.forEach((fn: any) => {
        fn(entry.contentRect)
      })
    }
  }
}

/* istanbul ignore next */
export const addResizeListener = function (element: HTMLElement & Record<string, any>, fn: (contentRect: DOMRect) => void) {
  if (!element.__resizeListeners__) {
    element.__resizeListeners__ = []

    element.__ro__ = new ResizeObserver(resizeHandler)
    element.__ro__.observe(element)
  }
  element.__resizeListeners__.push(fn)
}

/* istanbul ignore next */
export const removeResizeListener = function (element: HTMLElement & Record<string, any>, fn: (contentRect: DOMRect) => void) {
  if (!element || !element.__resizeListeners__)
    return
  const index = element.__resizeListeners__.indexOf(fn)
  // 没有找到该回调时不能 splice(-1, 1)，否则会删掉最后一个回调
  if (index > -1)
    element.__resizeListeners__.splice(index, 1)
  // 最后一个回调移除后断开观察，并删除记录，之后再次 addResizeListener 会重新开始观察
  if (!element.__resizeListeners__.length) {
    element.__ro__?.disconnect()
    delete element.__resizeListeners__
    delete element.__ro__
  }
}
