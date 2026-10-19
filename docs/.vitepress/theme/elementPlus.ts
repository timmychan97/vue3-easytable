import type { App } from 'vue'
import { ElButton, ElDatePicker, ElInput, ElInputNumber, ElOption, ElRadio, ElRadioButton, ElRadioGroup, ElSelect } from 'element-plus'
// Light theme only: ve-table has no dark theme in the docs yet, and dark inputs on a white table look broken
import 'element-plus/theme-chalk/index.css'

// The Element Plus components used by demos. Demo templates use them as global <el-*>
// components; JSX demos import them from "element-plus", which DemoBlock maps to this
// module so the docs bundle only these instead of the whole library.
const components = { ElButton, ElDatePicker, ElInput, ElInputNumber, ElOption, ElRadio, ElRadioButton, ElRadioGroup, ElSelect }

export { ElButton, ElDatePicker, ElInput, ElInputNumber, ElOption, ElRadio, ElRadioButton, ElRadioGroup, ElSelect }

export function installElementPlus(app: App) {
  for (const [name, component] of Object.entries(components))
    app.component(name, component)
}
