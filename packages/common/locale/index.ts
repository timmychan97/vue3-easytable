import type { LocaleMessage } from './types'
import { injectLocale } from '@vue3-easytable/ve-locale'
import { isFunction } from '../utils/index'

// 供 Options API 组件的 `inject` 选项使用（组件包不直接依赖 ve-locale）
export { globalLocale, LocaleInjectionKey } from '@vue3-easytable/ve-locale'

/**
 * 创建某个组件的文案函数 `t(path, ...args)`。
 * 默认在调用时解析语言包：当前组件所在的 ConfigProvider，否则为全局语言包。
 * 也可以传入 `getMessages`，绑定到已经解析好的语言包（见 `useI18N`）。
 */
export function createI18N(
  compName: keyof LocaleMessage,
  getMessages: () => LocaleMessage = () => injectLocale().value,
) {
  return function (path: string, ...args: any[]) {
    let result = ''

    const messages = getMessages()

    if (messages[compName]) {
      const message = messages[compName][path]
      result = isFunction(message) ? message(...args) : message
    }
    else {
      console.error(
        `can't find ${compName} in ${JSON.stringify(messages)}`,
      )
    }

    return result
  }
}

/**
 * 在组件 setup 中调用：解析一次注入的语言包（ConfigProvider 或全局语言包），
 * 返回的 `t` 之后在渲染函数、方法和事件回调中都使用这个语言包。
 * 语言包是响应式的，在渲染中读取时切换语言会触发重新渲染。
 */
export function useI18N(compName: keyof LocaleMessage) {
  const locale = injectLocale()
  return createI18N(compName, () => locale.value)
}
