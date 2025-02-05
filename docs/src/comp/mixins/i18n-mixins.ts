import { DOC_LANG } from '@/utils/constant'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

export default function useI18n() {
  const route = useRoute()
  const currentDocLang = computed(() => {
    return (route.path.split('/')[1] || DOC_LANG.EN) as ('zh' | 'en')
  })

  return {
    currentDocLang,
  }
}
