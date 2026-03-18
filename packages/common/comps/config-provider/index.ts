import type { PropType } from 'vue'
import type { LocaleMessage } from '../../locale/types'
import { provideLocale } from '@vue3-easytable/ve-locale'

export default defineComponent({
  name: 'EtConfigProvider',
  props: {
    locale: {
      type: Object as PropType<LocaleMessage>,
    },
  },
  setup(props, { slots }) {
    if (props.locale)
      provideLocale(computed(() => props.locale))

    return () => slots.defaults?.()
  },
})
