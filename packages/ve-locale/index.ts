import type { LocaleMessage, LocaleMessageInput } from '@vue3-easytable/common/locale/types'
import type { InjectionKey, MaybeRefOrGetter, Ref } from 'vue'
import defaultLang from '@vue3-easytable/common/locale/lang/zh-CN'
import { normalizeLocaleMessage } from '@vue3-easytable/common/locale/legacy-keys'
import { withUse } from '@vue3-easytable/common/uses/with-use'
// import Vue from 'vue'
import { cloneDeep, merge } from 'lodash'
import { computed, hasInjectionContext, inject, provide, ref, shallowRef, toValue } from 'vue'

// const { defineReactive } = Vue.util
// const proto = Vue.prototype

// proto.$veTableMessages = proto.$veTableMessages || {}

// defineReactive(
//   proto,
//   '$veTableMessages',
//   cloneDeep({
//     lang: defaultLang,
//   }),
// )

const currentLang = ref<LocaleMessage>(cloneDeep(defaultLang))

const VeLocale = {
  getMessage() {
    return currentLang.value
    // return proto.$veTableMessages.lang
  },
  use(lang: LocaleMessageInput) {
    this.update(lang)
  },
  update(lang: LocaleMessageInput = {}) {
    // 兼容 81a1ebb 之前的英文键（映射为中文键并给出一次弃用警告）
    merge(currentLang.value, normalizeLocaleMessage(lang))
    // merge(proto.$veTableMessages.lang, lang)
  },
}

export default withUse(VeLocale, (app) => {
  app.config.globalProperties.$veLocale = VeLocale
})

/**
 * 注入的语言包始终是一个只读的 Ref（ConfigProvider 提供的是 computed），
 * 没有 ConfigProvider 时回退到全局语言包（VeLocale 单例）。
 */
export const LocaleInjectionKey: InjectionKey<Readonly<Ref<LocaleMessage>>> = Symbol('VE_LOCALE')

// 全局语言包（只读）。Options API 组件的 `inject` 选项可用它作为默认值
export const globalLocale: Readonly<Ref<LocaleMessage>> = currentLang

/**
 * 获取当前组件所在上下文的语言包（最近的 ConfigProvider，否则为全局语言包）。
 * 在 setup / 渲染函数之外调用时直接返回全局语言包。
 */
export function injectLocale(): Readonly<Ref<LocaleMessage>> {
  if (!hasInjectionContext())
    return globalLocale
  return inject(LocaleInjectionKey, globalLocale)
}

/**
 * 向子组件提供语言包（ConfigProvider 使用）。
 * - 始终提供一个 computed，传入的语言包（或其中的键）变化时会同步到子组件
 * - 传入的语言包合并在上层语言包（外层 ConfigProvider 或全局语言包）之上，只需写要覆盖的键
 * - 旧的英文键会被映射为新键（每个旧键只警告一次）
 * - 合并到新对象中，不修改用户传入的对象，也不修改上层语言包
 */
export function provideLocale(lang: MaybeRefOrGetter<LocaleMessageInput | null | undefined>) {
  const parentLocale = injectLocale()

  const locale = computed<LocaleMessage>(() => {
    const input = toValue(lang)
    // 没有传入语言包时沿用上层语言包
    if (!input)
      return parentLocale.value
    return merge({}, parentLocale.value, normalizeLocaleMessage(input))
  })

  provide(LocaleInjectionKey, locale)

  return locale
}

/**
 * 在组件中读取语言包。
 * `update` 只做局部覆盖（仅影响本次 useLocale 的返回值），
 * 不会写入注入的 computed，也不会修改用户传入的对象；全局修改请使用 `VeLocale.update`。
 */
export function useLocale() {
  const injectedLocale = injectLocale()
  // 局部覆盖（已规范化为新键）
  const overrides = shallowRef<Record<string, any> | null>(null)

  const locale = computed<LocaleMessage>(() => {
    if (!overrides.value)
      return injectedLocale.value
    return merge({}, injectedLocale.value, overrides.value)
  })

  return {
    locale,
    getMessage() {
      return locale.value
    },
    update(newLang: LocaleMessageInput = {}) {
      overrides.value = merge({}, overrides.value, normalizeLocaleMessage(newLang))
    },
  }
}
