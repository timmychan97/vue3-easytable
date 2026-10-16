import type { PropType } from 'vue'
import type { LocaleMessageInput } from '../../locale/types'
import { provideLocale } from '@vue3-easytable/ve-locale'
import { defineComponent } from 'vue'
import { withUse } from '../../uses/with-use'

const VeConfigProvider = defineComponent({
  name: 'VeConfigProvider',
  props: {
    // 语言包：合并在上层语言包之上，可以只写要覆盖的键，也接受已废弃的英文键
    locale: {
      type: Object as PropType<LocaleMessageInput>,
    },
  },
  setup(props, { slots }) {
    // 始终提供 computed，locale 变化（包括变为 undefined）时子组件同步更新
    provideLocale(() => props.locale)

    return () => slots.default?.()
  },
})

export default withUse(VeConfigProvider)
