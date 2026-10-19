/*
 * @getScrollbarWidth
 * @desc get scroll bar width
 * @param
 * @return
 */
export function getScrollbarWidth() {
  // SSR（没有 DOM）时无法测量，返回 0；客户端激活后的实例会重新测量
  if (typeof document === 'undefined')
    return 0

  const outer = document.createElement('div')
  outer.className = 've-scrollbar-wrap'
  outer.style.visibility = 'hidden'
  outer.style.width = '100px'
  outer.style.position = 'absolute'
  outer.style.top = '-9999px'
  document.body.appendChild(outer)

  const widthNoScroll = outer.offsetWidth
  outer.style.overflow = 'scroll'

  const inner = document.createElement('div')
  inner.style.width = '100%'
  outer.appendChild(inner)

  const widthWithScroll = inner.offsetWidth
  outer.parentNode?.removeChild(outer)

  return widthNoScroll - widthWithScroll
}
