// import './assets/main.css'

import Anchor from '@/comp/anchor.vue'
import DemoBlock from '@/comp/demo-block.vue'

// import 'md-powerpack'
import { ElButton, ElDatePicker, ElIcon, ElInput, ElInputNumber, ElRadio, ElRadioGroup, ElSelect } from 'element-plus'

// Progress 进度条

import hljs from 'highlight.js'

import NProgress from 'nprogress'

import { createApp } from 'vue'
import {
  // VeCheckbox,
  // VeCheckboxGroup,
  // VeContextmenu,
  // VeDropdown,
  // VeIcon,
  // VeLoading,
  // VeLocale,
  // VePagination,
  // VeRadio,
  // VeSelect,
  useVeTable,
// } from '@easytable/vue'
} from '../../packages/vue/src/index'
import App from './App.vue'

import router from './router'
import 'highlight.js/styles/color-brewer.css'
// Progress 进度条 样式
import 'nprogress/nprogress.css'

// import '@easytable/vue/packages/theme-dark/index.less'

// import './css/table-reset.less'

import '@/css/index.less'
import '@/css/custom.less'
import '@/comp/app.less'
import 'element-plus/theme-chalk/index.css'
import '../../packages/theme-default/index.less'

// console.log(VeTable);
const app = createApp(App)
app.use(ElDatePicker)
app.use(ElInputNumber)
app.use(ElIcon)
app.use(ElSelect)
app.use(ElRadio)
app.use(ElRadioGroup)
app.use(ElButton)
app.use(ElInput)
// app.use(VeTable)
// app.use(VeIcon)
// app.use(VeLoading)
app.use(useVeTable())
app.use(router)

router.beforeEach((to, from, next) => {
  NProgress.start()

  next()
})

router.afterEach(() => {
  nextTick(() => {
    const blocks = document.querySelectorAll('pre code:not(.hljs)')
    Array.prototype.forEach.call(blocks, hljs.highlightBlock)

    window.scroll(0, 0)
  })
  NProgress.done() // 结束Progress
})

app.component('anchor', Anchor)
app.component('demo-block', DemoBlock)

app.mount('#app')
