import type { LocaleMessageInput } from '@vue3-easytable/common/locale/types'

import type { Plugin } from 'vue'
import VeConfigProvider from '@vue3-easytable/common/comps/config-provider'
import VeCheckbox from '@vue3-easytable/ve-checkbox'
import VeCheckboxGroup from '@vue3-easytable/ve-checkbox-group'
import VeContextmenu from '@vue3-easytable/ve-contextmenu'
import VeDropdown from '@vue3-easytable/ve-dropdown'
import VeIcon from '@vue3-easytable/ve-icon'
import VeLoading from '@vue3-easytable/ve-loading'
import VeLocale, { installLocale } from '@vue3-easytable/ve-locale'
import VePagination from '@vue3-easytable/ve-pagination'
import VeRadio from '@vue3-easytable/ve-radio'
import VeSelect from '@vue3-easytable/ve-select'
import VeTable from '@vue3-easytable/ve-table/src'

const version = '0.0.5'
const components = [
  VeCheckbox,
  VeCheckboxGroup,
  VeConfigProvider,
  VeContextmenu,
  VeDropdown,
  VeIcon,
  VeLoading,
  // VeLocale 不在这里通过 app.use 安装，而是由下面的 installLocale 安装：
  // 否则之后的 app.use(VeLocale, { locale }) 会被 Vue 当作重复安装而跳过，语言包不生效（I18N-06）
  VePagination,
  VeRadio,
  VeSelect,
  VeTable,
]

const useVeTable = function (options?: { locale?: LocaleMessageInput }): Plugin {
  return {
    install(app) {
      components.forEach((Component) => {
        app.use(Component)
      })
      // 语言包只作用于当前 app（不修改全局 VeLocale），第二个 app 不会切换第一个 app 的语言（I18N-02）
      installLocale(app, options?.locale)
    },
  }
}
// const install = (app: Vue) => {
//   components.forEach((Component) => {
//     app.use(Component)
//   })

//   Vue.prototype.$veLoading = VeLoading
//   Vue.prototype.$veLocale = VeLocale
// }

/* istanbul ignore if */
// if (typeof window !== 'undefined' && window.Vue)
//   install(window.Vue)

export {
  useVeTable,
  VeCheckbox,
  VeCheckboxGroup,
  VeConfigProvider,
  VeContextmenu,
  VeDropdown,
  VeIcon,
  VeLoading,
  VeLocale,
  VePagination,
  VeRadio,
  version,
  VeSelect,
  VeTable,
}

// export default {
//   useVeTable,
//   version,
//   VeCheckbox,
//   VeCheckboxGroup,
//   VeContextmenu,
//   VeDropdown,
//   VeIcon,
//   VeLoading,
//   //   VeLocale,
//   VePagination,
//   VeRadio,
//   VeSelect,
//   VeTable,
// }
