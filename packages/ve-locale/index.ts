import type { LocaleMessage, LocaleMessageInput } from '@vue3-easytable/common/locale/types'
import type { App, InjectionKey, MaybeRefOrGetter, Ref } from 'vue'
import defaultLang from '@vue3-easytable/common/locale/lang/zh-CN'
import { normalizeLocaleMessage } from '@vue3-easytable/common/locale/legacy-keys'
import { withUse } from '@vue3-easytable/common/uses/with-use'
import { cloneDeep, merge } from 'lodash'
import { computed, hasInjectionContext, inject, provide, shallowRef, toValue } from 'vue'

/**
 * 语言包的读写接口：全局的 `VeLocale` 与每个 app 的 `this.$veLocale` 都是这个形状。
 * 每次 `use` / `update` 都合并到一个新对象中，不就地修改之前返回的对象、内置语言包或用户传入的对象。
 */
export interface VeLocaleApi {
  getMessage: () => LocaleMessage
  // 切换语言（与 update 相同：合并到当前语言包之上）
  use: (lang: LocaleMessageInput) => void
  // 覆盖部分文案
  update: (lang?: LocaleMessageInput) => void
}

// 全局语言包（每次更新都替换为新对象）
const currentLang = shallowRef<LocaleMessage>(cloneDeep(defaultLang))

/**
 * 注入的语言包始终是一个只读的 Ref（ConfigProvider 提供的是 computed，app 提供的是该 app 的语言包），
 * 都没有时回退到全局语言包（VeLocale 单例）。
 */
export const LocaleInjectionKey: InjectionKey<Readonly<Ref<LocaleMessage>>> = Symbol('VE_LOCALE')

// 全局语言包（只读）。Options API 组件的 `inject` 选项可用它作为默认值
export const globalLocale: Readonly<Ref<LocaleMessage>> = currentLang

// 每个 app 自己的语言包（app.use(VeLocale) / useVeTable() 安装时创建，app 卸载时移除）
const appLocales = new Map<App, Ref<LocaleMessage>>()

// 把（已规范化的）语言包合并到 target 中：生成新对象，target.value 原来的对象不变
function mergeInto(target: Ref<LocaleMessage>, normalized: Record<string, any>) {
  target.value = merge({}, target.value, normalized)
}

const VeLocale = {
  getMessage() {
    return currentLang.value
  },
  use(lang: LocaleMessageInput) {
    this.update(lang)
  },
  // 全局修改：作用于全局语言包和所有已安装的 app（各 app 通过 $veLocale 做的修改只影响自己）
  update(lang: LocaleMessageInput = {}) {
    // 兼容 81a1ebb 之前的英文键（映射为中文键并给出一次弃用警告）
    const normalized = normalizeLocaleMessage(lang)
    mergeInto(currentLang, normalized)
    appLocales.forEach(locale => mergeInto(locale, normalized))
  },
} satisfies VeLocaleApi

/**
 * 为 app 安装独立的语言包（同一个 app 多次调用时复用同一个）：
 * - 以安装时的全局语言包为起点，`lang` 合并在其上（可以只写要覆盖的键）
 * - 通过 app.provide 提供给该 app 内的所有组件（ConfigProvider 仍然优先）
 * - `this.$veLocale` 指向该 app 的语言包，修改只影响这个 app
 * - 全局的 `VeLocale.use` / `update` 仍然会同步到每个 app
 * 这样第二个 app 的 `useVeTable({ locale })` 不会切换第一个 app 的语言（I18N-02）。
 */
export function installLocale(app: App, lang?: LocaleMessageInput | null): VeLocaleApi {
  let locale = appLocales.get(app)

  if (!locale) {
    const appLocale = shallowRef<LocaleMessage>(currentLang.value)
    locale = appLocale
    appLocales.set(app, appLocale)
    app.onUnmount(() => {
      appLocales.delete(app)
    })

    const api: VeLocaleApi = {
      getMessage() {
        return appLocale.value
      },
      use(newLang) {
        this.update(newLang)
      },
      update(newLang = {}) {
        mergeInto(appLocale, normalizeLocaleMessage(newLang))
      },
    }

    app.provide(LocaleInjectionKey, appLocale)
    app.config.globalProperties.$veLocale = api
  }

  if (lang)
    mergeInto(locale, normalizeLocaleMessage(lang))

  return app.config.globalProperties.$veLocale as VeLocaleApi
}

export default withUse(VeLocale, (app: App, options?: { locale?: LocaleMessageInput }) => {
  installLocale(app, options?.locale)
})

/**
 * 获取当前组件所在上下文的语言包（最近的 ConfigProvider，否则为所在 app 的语言包，再否则为全局语言包）。
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
