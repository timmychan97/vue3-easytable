import type { VNodeNormalizedChildren } from 'vue'
import { createI18N } from '../locale'

/**
 * @desc create locale namespace by component name
 */
export function createLocale(compName: string) {
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
  if (isNumber(vNode))
    return vNode.toString()
  if (isBoolean(vNode))
    return vNode.toString()
  if (isString(vNode))
    return vNode
  if (!vNode)
    return ''

  if (isArray(vNode))
    return vNode.map(e => getTextContentOfVNode(e)).join('')
  if (typeof vNode === 'object' && vNode.children)
    return ''

  if (vNode.children)
    return getTextContentOfVNode(vNode.children as VNodeNormalizedChildren)

  return ''
}
