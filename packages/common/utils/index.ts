import type { VNode, VNodeNormalizedChildren } from 'vue'
import type { LocaleMessage } from '../locale/types'
import { Comment } from 'vue'
import { createI18N } from '../locale'

/**
 * @desc create locale namespace by component name
 */
export function createLocale(compName: keyof LocaleMessage) {
  return createI18N(compName)
}

export function isArray(arr: unknown) {
  return Array.isArray(arr)
}

export function isEmptyArray(arr: unknown) {
  return !(isArray(arr) && arr.length > 0)
}

export function isEmptyValue(value: unknown) {
  return !(value !== '' && value !== undefined && value !== null)
}

export function isDefined(val: unknown) {
  return val !== undefined && val !== null
}

export function isObject(val: unknown) {
  return val !== null && typeof val === 'object'
}

export function isFunction(val: (() => void) | unknown) {
  return typeof val === 'function'
}

export function isBoolean(val: unknown) {
  return typeof val === 'boolean'
}

export function isString(val: unknown) {
  return typeof val === 'string'
}

export function isNumber(val: unknown) {
  return typeof val === 'number'
}

export function isTrue(val: unknown) {
  return isBoolean(val) && val
}

export function isFalse(val: unknown) {
  return isBoolean(val) && !val
}

export function getValByUnit(width: number | string) {
  return typeof width === 'number' ? `${width}px` : width
}

/**
 * https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollTo
 */
export function scrollTo(el: Element, option: ScrollToOptions) {
  if (isFunction(el.scrollTo)) {
    el.scrollTo(option)
  }
  else {
    const { top, left } = option
    el.scrollTop = top ?? 0
    el.scrollLeft = left ?? 0
  }
}

type VNodeLeaf = string | number | boolean | null | undefined | void

export function getTextContentOfVNode(vNode: VNode | VNodeNormalizedChildren | VNodeLeaf): string {
  // 顶层的布尔值保持原有行为（转为字符串）
  if (isBoolean(vNode))
    return String(vNode)
  return getVNodeText(vNode)
}

/*
 * RENDER-05：递归读取 VNode 的文本。
 * 之前只要 VNode 有 children 就提前返回 ''，下面的递归永远走不到。
 * 支持：字符串 / 数字子节点、子节点数组、组件 VNode 的 default 插槽函数；
 * 注释节点和条件渲染留下的 true / false / null 不计入文本。
 */
function getVNodeText(vNode: unknown): string {
  if (isNumber(vNode) || isString(vNode))
    return String(vNode)
  if (!vNode || isBoolean(vNode))
    return ''

  if (isArray(vNode))
    return (vNode as unknown[]).map(e => getVNodeText(e)).join('')

  if (typeof vNode === 'object') {
    const { type, children } = vNode as VNode
    if (type === Comment)
      return ''

    if (isString(children) || isNumber(children) || isArray(children))
      return getVNodeText(children)

    // 组件 VNode：children 为插槽对象，读取 default 插槽
    if (children && typeof children === 'object') {
      const defaultSlot = (children as Record<string, unknown>).default
      if (typeof defaultSlot === 'function')
        return getVNodeText(defaultSlot())
    }
  }

  return ''
}
