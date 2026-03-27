import type { EnhanceAppContext } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { defineComponent, h } from 'vue'
import DemoBlock from './DemoBlock.vue'
import './custom.css'

// Stub for <anchor label="..."/> used in legacy docs content
const Anchor = defineComponent({
  props: { label: String, isEdit: Boolean, fileName: String },
  setup(props) {
    return () => h('h3', { id: props.label }, props.label)
  },
})

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
}
