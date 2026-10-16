import type { LocaleMessage, LocaleMessageInput } from '@vue3-easytable/common/locale/types'
import type { InjectionKey, Ref } from 'vue'
import defaultLang from '@vue3-easytable/common/locale/lang/zh-CN'
import { normalizeLocaleMessage } from '@vue3-easytable/common/locale/legacy-keys'
import { withUse } from '@vue3-easytable/common/uses/with-use'
// import Vue from 'vue'
import { cloneDeep, merge } from 'lodash'
import { inject, provide, ref } from 'vue'

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

const currentLang = ref(cloneDeep(defaultLang))

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

const LocaleInjectionKey: InjectionKey<Ref<LocaleMessage | undefined>> = Symbol('VE_LOCALE')

export function provideLocale(lang: Ref<LocaleMessage | undefined>) {
  provide(LocaleInjectionKey, lang)
}

export function useLocale() {
  const lang = inject(LocaleInjectionKey, ref())

  lang.value = lang.value ?? cloneDeep(defaultLang)

  return {
    getMessage() {
      return lang.value
    },
    update(newLang: LocaleMessageInput = {}) {
      merge(lang.value, normalizeLocaleMessage(newLang))
    },
  }
}
