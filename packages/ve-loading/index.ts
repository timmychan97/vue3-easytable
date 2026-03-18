import { withUse } from '@vue3-easytable/common/uses/with-use'
import VeLoading from './src/index'

export default withUse(VeLoading, (app) => {
  app.config.globalProperties.$veLoading = VeLoading
})
