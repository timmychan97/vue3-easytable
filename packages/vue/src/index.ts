import type { LocaleMessage } from '@vue3-easytable/common/locale/types'

// This file is auto gererated by build/build-entry.js
import type { Plugin } from 'vue'
import VeCheckbox from '@vue3-easytable/ve-checkbox'
import VeCheckboxGroup from '@vue3-easytable/ve-checkbox-group'
import VeContextmenu from '@vue3-easytable/ve-contextmenu'
import VeDropdown from '@vue3-easytable/ve-dropdown'
import VeIcon from '@vue3-easytable/ve-icon'
import VeLoading from '@vue3-easytable/ve-loading'
import VeLocale from '@vue3-easytable/ve-locale'
import VePagination from '@vue3-easytable/ve-pagination'
import VeRadio from '@vue3-easytable/ve-radio'
import VeSelect from '@vue3-easytable/ve-select'
import VeTable from '@vue3-easytable/ve-table/src'

const version = '0.0.5'
const components = [
  VeCheckbox,
  VeCheckboxGroup,
  VeContextmenu,
  VeDropdown,
  VeIcon,
  VeLoading,
  VeLocale,
  VePagination,
  VeRadio,
  VeSelect,
  VeTable,
]

const useVeTable = function (options?: { locale?: LocaleMessage }): Plugin {
  return {
    install(app) {
      components.forEach((Component) => {
        app.use(Component)
      })
      if (options?.locale)
        VeLocale.use(options.locale)
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
