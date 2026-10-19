import { safeCall } from '../../util/safe-call'

/**
 * 用户自定义事件（eventCustomOption.*Events）的绑定（MOD-07）
 *
 * 表头、表体、表尾的 tr / td 共 6 个组件，之前各自复制了 9 个转发方法
 * （cellClick、cellDblclick … rowMouseup），这里统一成一个函数：
 * - 先调用用户的处理函数，再调用组件内部的处理（与之前的顺序一致）；
 * - 用户函数抛出异常时通过 safeCall 记录，内部处理照常执行（INFRA-13）；
 * - 用户和内部都没有处理函数的事件不再绑定监听器。
 */

export const CUSTOM_EVENT_NAMES = [
  'click',
  'dblclick',
  'contextmenu',
  'mouseenter',
  'mouseleave',
  'mousemove',
  'mouseover',
  'mousedown',
  'mouseup',
] as const

export type CustomEventName = (typeof CUSTOM_EVENT_NAMES)[number]

export type CustomEventHandler = (event: any) => void

export type CustomEvents = Partial<Record<CustomEventName, CustomEventHandler>>

export type CustomEventListeners = Partial<Record<`on${Capitalize<CustomEventName>}`, CustomEventHandler>>

// click -> onClick
const LISTENER_NAMES = Object.fromEntries(
  CUSTOM_EVENT_NAMES.map(name => [name, `on${name[0].toUpperCase()}${name.slice(1)}`]),
) as Record<CustomEventName, keyof CustomEventListeners>

export type CustomEventsFactoryName
  = | 'bodyRowEvents'
    | 'bodyCellEvents'
    | 'headerRowEvents'
    | 'headerCellEvents'
    | 'footerRowEvents'
    | 'footerCellEvents'

/**
 * 调用 eventCustomOption 中的事件工厂，返回用户事件对象（INFRA-13）
 * - 只有是函数时才调用（之前只要是真值就调用，非函数会抛出 "… is not a function" 并中断渲染）；
 * - 工厂在渲染时调用，抛出异常时通过 safeCall 记录并返回空对象，不再中断整个表格的渲染；
 * - 返回值不是对象时视为没有自定义事件。
 */
export function getCustomEvents(
  eventCustomOption: Record<string, any> | null | undefined,
  factoryName: CustomEventsFactoryName,
  params: Record<string, any>,
): CustomEvents {
  const { value } = safeCall(`eventCustomOption.${factoryName}`, eventCustomOption?.[factoryName], params)
  return value && typeof value === 'object' ? value : {}
}

/**
 * 合并用户事件与组件内部处理，返回可以直接展开到元素上的监听器（onClick …）
 * @param customEvents 用户事件（getCustomEvents 的返回值）
 * @param extra 组件内部处理，在用户处理之后调用
 * @param logName 日志中的名称，例如 "eventCustomOption.bodyCellEvents"
 */
export function bindCustomEvents(
  customEvents: CustomEvents | null | undefined,
  extra: CustomEvents = {},
  logName = 'eventCustomOption',
): CustomEventListeners {
  const listeners: CustomEventListeners = {}

  CUSTOM_EVENT_NAMES.forEach((name) => {
    const userHandler = customEvents?.[name]
    const internalHandler = extra[name]

    if (typeof userHandler !== 'function' && typeof internalHandler !== 'function')
      return

    listeners[LISTENER_NAMES[name]] = (event) => {
      safeCall(`${logName}.${name}`, userHandler, event)
      if (typeof internalHandler === 'function')
        internalHandler(event)
    }
  })

  return listeners
}
