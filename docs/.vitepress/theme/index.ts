import type { EnhanceAppContext } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'
import { defineComponent, h, watch } from 'vue'
import DemoBlock from './DemoBlock.vue'
import './custom.css'

// Stub for <anchor label="..."/> used in legacy docs content
const Anchor = defineComponent({
  props: { label: String, isEdit: Boolean, fileName: String },
  setup(props) {
    return () => h('h3', { id: props.label }, props.label)
  },
})

async function applyVeLocale(lang: string) {
  let locale
  if (lang === 'zh-CN') {
    locale = (await import('../../../packages/common/locale/lang/zh-CN')).default
  }
  else if (lang === 'en-US') {
    locale = (await import('../../../packages/common/locale/lang/en-US')).default
  }
  else if (lang === 'nb-NO') {
    locale = (await import('../../../packages/common/locale/lang/no-NB')).default
  }
  if (locale) {
    const { VeLocale } = await import('@vue3-easytable/vue')
    VeLocale.use(locale)
  }
}

export default {
  extends: DefaultTheme,
  async enhanceApp({ app }: EnhanceAppContext) {
    app.component('DemoBlock', DemoBlock)
    app.component('anchor', Anchor)

    // Only register ve-table components client-side to avoid SSR issues
    // (packages reference HTMLElement/document at module level)
    if (!import.meta.env.SSR) {
      const { useVeTable } = await import('@vue3-easytable/vue')
      await import('../../../packages/theme-default/index.less')
      app.use(useVeTable())
    }
  },
  setup() {
    if (!import.meta.env.SSR) {
      const { lang } = useData()
      // Apply locale immediately on mount and whenever the language changes
      watch(lang, (newLang) => applyVeLocale(newLang), { immediate: true })
    }
  },
}
