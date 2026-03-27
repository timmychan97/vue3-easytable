import path from 'node:path'
import vueJsx from '@vitejs/plugin-vue-jsx'
import AutoImport from 'unplugin-auto-import/vite'
import { defineConfig } from 'vitepress'
import { demoPlugin } from './plugins/demo'

const zhSidebar = [
  {
    text: '指南',
    items: [
      { text: '介绍', link: '/zh/' },
      { text: '快速开始', link: '/zh/start' },
      { text: '主题定制', link: '/zh/theme' },
      { text: '国际化', link: '/zh/locale' },
      { text: '常见问题', link: '/zh/QA' },
    ],
  },
  {
    text: '基础组件',
    items: [
      { text: 'Loading 加载', link: '/zh/ve-loading' },
      { text: 'Locale 国际化', link: '/zh/ve-locale' },
      { text: 'Icon 图标', link: '/zh/ve-icon' },
      { text: 'Pagination 分页', link: '/zh/ve-pagination' },
      { text: 'Contextmenu 右键菜单', link: '/zh/ve-contextmenu' },
    ],
  },
  {
    text: 'Table 组件',
    items: [
      { text: '用法', link: '/zh/ve-table/usage' },
      { text: '表格宽度', link: '/zh/ve-table/table-width' },
      { text: '表格高度', link: '/zh/ve-table/table-height' },
      { text: '表格边框', link: '/zh/ve-table/table-border' },
      { text: '列宽设置', link: '/zh/ve-table/column-width' },
      { text: '列宽拖动', link: '/zh/ve-table/column-resize' },
      { text: '列固定', link: '/zh/ve-table/column-fixed' },
      { text: '列隐藏', link: '/zh/ve-table/column-hidden' },
      { text: '表头固定', link: '/zh/ve-table/header-fixed' },
      { text: '表头分组', link: '/zh/ve-table/header-grouping' },
      { text: '表头隐藏', link: '/zh/ve-table/header-hidden' },
      { text: '筛选', link: '/zh/ve-table/header-filter' },
      { text: '筛选自定义', link: '/zh/ve-table/header-filter-custom' },
      { text: '排序', link: '/zh/ve-table/header-sort' },
      { text: '单元格对齐', link: '/zh/ve-table/cell-align' },
      { text: '单元格样式', link: '/zh/ve-table/cell-style' },
      { text: '单元格自定义', link: '/zh/ve-table/cell-custom' },
      { text: '单元格合并', link: '/zh/ve-table/cell-span' },
      { text: '操作列', link: '/zh/ve-table/operation-column' },
      { text: '单元格选择', link: '/zh/ve-table/cell-selection' },
      { text: '单元格自动填充', link: '/zh/ve-table/cell-autofill' },
      { text: '单元格编辑', link: '/zh/ve-table/cell-edit' },
      { text: '剪贴板', link: '/zh/ve-table/clipboard' },
      { text: '右键菜单', link: '/zh/ve-table/contextmenu' },
      { text: '单元格省略', link: '/zh/ve-table/cell-ellipsis' },
      { text: '行序号', link: '/zh/ve-table/row-index' },
      { text: '行插入', link: '/zh/ve-table/row-insert' },
      { text: '行单选', link: '/zh/ve-table/row-radio' },
      { text: '行多选', link: '/zh/ve-table/row-checkbox' },
      { text: '行展开', link: '/zh/ve-table/row-expand' },
      { text: '行样式', link: '/zh/ve-table/row-style' },
      { text: 'Footer 汇总', link: '/zh/ve-table/footer-summary' },
      { text: '分页', link: '/zh/ve-table/pagination' },
      { text: '开启 Loading', link: '/zh/ve-table/loading' },
      { text: '虚拟滚动', link: '/zh/ve-table/virtual-scroll' },
      { text: '事件自定义', link: '/zh/ve-table/event-custom' },
      { text: '空数据', link: '/zh/ve-table/data-empty' },
      { text: '实例方法', link: '/zh/ve-table/instance-methods' },
      { text: 'API', link: '/zh/ve-table/api' },
    ],
  },
  {
    text: '辅助组件',
    items: [
      { text: 'Checkbox 多选框', link: '/zh/ve-checkbox' },
      { text: 'Radio 单选框', link: '/zh/ve-radio' },
      { text: 'Select 下拉选择', link: '/zh/ve-select' },
      { text: 'Dropdown 下拉菜单', link: '/zh/ve-dropdown' },
    ],
  },
]

export default defineConfig({
  title: 'Vue3 EasyTable',
  description: '一个基于 Vue3.x 的表格组件',

  srcExclude: ['**/README.md', 'src/**'],

  locales: {
    zh: {
      label: '中文',
      lang: 'zh-CN',
      link: '/zh/',
      themeConfig: {
        nav: [
          { text: '文档', link: '/zh/' },
          { text: 'GitHub', link: 'https://github.com/timmychan97/vue3-easytable' },
        ],
        sidebar: zhSidebar,
        outline: { label: '本页目录' },
        docFooter: { prev: '上一页', next: '下一页' },
        darkModeSwitchLabel: '主题',
        lightModeSwitchTitle: '切换到浅色模式',
        darkModeSwitchTitle: '切换到深色模式',
        sidebarMenuLabel: '菜单',
        returnToTopLabel: '返回顶部',
      },
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      themeConfig: {
        nav: [
          { text: 'Docs', link: '/en/' },
          { text: 'GitHub', link: 'https://github.com/timmychan97/vue3-easytable' },
        ],
        sidebar: [
          {
            text: 'Guide',
            items: [
              { text: 'Introduction', link: '/en/' },
            ],
          },
        ],
      },
    },
  },

  themeConfig: {
    socialLinks: [
      { icon: 'github', link: 'https://github.com/timmychan97/vue3-easytable' },
    ],
  },

  markdown: {
    config(md) {
      demoPlugin(md)
    },
  },

  vite: {
    plugins: [
      // Package source uses TSX with Vue JSX directives (v-show, v-click-outside, etc.)
      vueJsx(),
      // Auto-import Vue functions so package source files don't need explicit imports
      AutoImport({
        imports: ['vue'],
        dts: false,
      }),
    ],
    ssr: {
      // lodash is CJS — bundle it for SSR so named imports work
      noExternal: ['lodash'],
    },
    optimizeDeps: {
      include: ['@vue/compiler-dom', 'mockjs'],
    },
    resolve: {
      alias: [
        { find: '@vue3-easytable/vue', replacement: path.resolve(__dirname, '../../packages/vue/src') },
        { find: '@vue3-easytable/vue/libs/locale', replacement: path.resolve(__dirname, '../../packages/common/locale') },
      ],
    },
  },
})
