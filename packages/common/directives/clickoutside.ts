import type { Directive, DirectiveBinding } from 'vue'

type ClickOutsideCallback = (e: MouseEvent) => void

interface ClickOutsideState {
  onClick: (e: MouseEvent) => void
  onMousedown: (e: MouseEvent) => void
}

interface ClickOutsideEl extends HTMLElement {
  __clickOutSide__?: ClickOutsideState | null
  // 最新的绑定值（updated 时更新，避免回调停留在挂载时的旧值）
  __clickOutSideValue__?: unknown
}

function warnIfNotFunction(binding: DirectiveBinding) {
  if (typeof binding.value === 'function')
    return

  let msg = `in [clickoutside] directives, provided expression '${binding.value}' is not a function `

  const compName = binding.instance?.$options.name

  if (compName)
    msg += `in ${compName}`

  console.error(msg)
}

function isInside(el: HTMLElement, target: EventTarget | null) {
  return el === target || el.contains(target as Node)
}

const clickoutside: Directive<ClickOutsideEl, ClickOutsideCallback> = {
  beforeMount(el, binding) {
    warnIfNotFunction(binding)

    el.__clickOutSideValue__ = binding.value

    /*
    SEL-11：在元素内按下、在元素外松开（拖动选择、拖动填充、调整列宽等）时，
    浏览器会在按下与松开目标的公共祖先（元素外）上触发 click，这不是一次“在外部的点击”。
    所以记录最近一次 mousedown 是否在元素内，紧随其后的 click 据此忽略。
    在按下时就判断，而不是保存目标元素：按下的元素可能在 click 之前被重新渲染移除
    */
    let isMousedownInside = false

    const onMousedown = (e: MouseEvent) => {
      isMousedownInside = isInside(el, e.target)
    }

    // 每次点击时读取最新的绑定值；不是函数时忽略（只在绑定时报一次错，而不是每次点击都抛异常）
    const onClick = (e: MouseEvent) => {
      /*
      只对鼠标产生的 click（detail >= 1）使用 mousedown 的记录：键盘或代码触发的 click（detail 为 0）
      没有对应的 mousedown，之前的记录可能已经过期（例如上一次在窗口外松开，没有 click）
      */
      const isDragFromInside = isMousedownInside && e.detail > 0
      // 记录只用于紧随其后的这一次 click
      isMousedownInside = false

      const callback = el.__clickOutSideValue__
      if (typeof callback !== 'function')
        return
      if (isDragFromInside)
        return
      if (!isInside(el, e.target))
        callback(e)
    }

    el.__clickOutSide__ = { onClick, onMousedown }

    document.addEventListener('mousedown', onMousedown, true)
    document.addEventListener('click', onClick, true)
  },

  updated(el, binding) {
    if (binding.value !== binding.oldValue)
      warnIfNotFunction(binding)
    el.__clickOutSideValue__ = binding.value
  },

  unmounted(el) {
    const state = el.__clickOutSide__
    if (state) {
      document.removeEventListener('mousedown', state.onMousedown, true)
      document.removeEventListener('click', state.onClick, true)
    }
    el.__clickOutSide__ = null
    el.__clickOutSideValue__ = null
  },
}

export default clickoutside
