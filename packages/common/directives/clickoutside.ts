import type { Directive, DirectiveBinding } from 'vue'

type ClickOutsideCallback = (e: MouseEvent) => void

interface ClickOutsideEl extends HTMLElement {
  __clickOutSide__?: ((e: MouseEvent) => void) | null
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

const clickoutside: Directive<ClickOutsideEl, ClickOutsideCallback> = {
  beforeMount(el, binding) {
    warnIfNotFunction(binding)

    el.__clickOutSideValue__ = binding.value

    // 每次点击时读取最新的绑定值；不是函数时忽略（只在绑定时报一次错，而不是每次点击都抛异常）
    const handler = (e: MouseEvent) => {
      const callback = el.__clickOutSideValue__
      if (typeof callback !== 'function')
        return
      if (!el.contains(e.target as Node) && el !== e.target)
        callback(e)
    }

    el.__clickOutSide__ = handler

    document.addEventListener('click', handler, true)
  },

  updated(el, binding) {
    if (binding.value !== binding.oldValue)
      warnIfNotFunction(binding)
    el.__clickOutSideValue__ = binding.value
  },

  unmounted(el) {
    if (el.__clickOutSide__)
      document.removeEventListener('click', el.__clickOutSide__, true)
    el.__clickOutSide__ = null
    el.__clickOutSideValue__ = null
  },
}

export default clickoutside
