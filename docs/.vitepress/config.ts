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

const enSidebar = [
  {
    text: 'Guide',
    items: [
      { text: 'Introduction', link: '/en/' },
      { text: 'Quick Start', link: '/en/start' },
      { text: 'Theme Customization', link: '/en/theme' },
      { text: 'Internationalization', link: '/en/locale' },
      { text: 'FAQ', link: '/en/QA' },
    ],
  },
  {
    text: 'Basic Components',
    items: [
      { text: 'Loading', link: '/en/ve-loading' },
      { text: 'Locale', link: '/en/ve-locale' },
      { text: 'Icon', link: '/en/ve-icon' },
      { text: 'Pagination', link: '/en/ve-pagination' },
      { text: 'Contextmenu', link: '/en/ve-contextmenu' },
    ],
  },
  {
    text: 'Table Component',
    items: [
      { text: 'Usage', link: '/en/ve-table/usage' },
      { text: 'Table Width', link: '/en/ve-table/table-width' },
      { text: 'Table Height', link: '/en/ve-table/table-height' },
      { text: 'Table Border', link: '/en/ve-table/table-border' },
      { text: 'Column Width', link: '/en/ve-table/column-width' },
      { text: 'Column Resize', link: '/en/ve-table/column-resize' },
      { text: 'Fixed Columns', link: '/en/ve-table/column-fixed' },
      { text: 'Hidden Columns', link: '/en/ve-table/column-hidden' },
      { text: 'Fixed Header', link: '/en/ve-table/header-fixed' },
      { text: 'Header Grouping', link: '/en/ve-table/header-grouping' },
      { text: 'Hidden Header', link: '/en/ve-table/header-hidden' },
      { text: 'Filter', link: '/en/ve-table/header-filter' },
      { text: 'Custom Filter', link: '/en/ve-table/header-filter-custom' },
      { text: 'Sorting', link: '/en/ve-table/header-sort' },
      { text: 'Cell Alignment', link: '/en/ve-table/cell-align' },
      { text: 'Cell Style', link: '/en/ve-table/cell-style' },
      { text: 'Custom Cell', link: '/en/ve-table/cell-custom' },
      { text: 'Cell Merge', link: '/en/ve-table/cell-span' },
      { text: 'Operation Column', link: '/en/ve-table/operation-column' },
      { text: 'Cell Selection', link: '/en/ve-table/cell-selection' },
      { text: 'Cell Autofill', link: '/en/ve-table/cell-autofill' },
      { text: 'Cell Editing', link: '/en/ve-table/cell-edit' },
      { text: 'Clipboard', link: '/en/ve-table/clipboard' },
      { text: 'Context Menu', link: '/en/ve-table/contextmenu' },
      { text: 'Cell Ellipsis', link: '/en/ve-table/cell-ellipsis' },
      { text: 'Row Index', link: '/en/ve-table/row-index' },
      { text: 'Row Insert', link: '/en/ve-table/row-insert' },
      { text: 'Row Radio', link: '/en/ve-table/row-radio' },
      { text: 'Row Checkbox', link: '/en/ve-table/row-checkbox' },
      { text: 'Row Expand', link: '/en/ve-table/row-expand' },
      { text: 'Row Style', link: '/en/ve-table/row-style' },
      { text: 'Footer Summary', link: '/en/ve-table/footer-summary' },
      { text: 'Pagination', link: '/en/ve-table/pagination' },
      { text: 'Loading', link: '/en/ve-table/loading' },
      { text: 'Virtual Scrolling', link: '/en/ve-table/virtual-scroll' },
      { text: 'Custom Events', link: '/en/ve-table/event-custom' },
      { text: 'Empty Data', link: '/en/ve-table/data-empty' },
      { text: 'Instance Methods', link: '/en/ve-table/instance-methods' },
      { text: 'API', link: '/en/ve-table/api' },
    ],
  },
  {
    text: 'Auxiliary Components',
    items: [
      { text: 'Checkbox', link: '/en/ve-checkbox' },
      { text: 'Radio', link: '/en/ve-radio' },
      { text: 'Select', link: '/en/ve-select' },
      { text: 'Dropdown', link: '/en/ve-dropdown' },
    ],
  },
]

const nbSidebar = [
  {
    text: 'Veiledning',
    items: [
      { text: 'Introduksjon', link: '/nb/' },
      { text: 'Hurtigstart', link: '/nb/start' },
      { text: 'Tilpasning av tema', link: '/nb/theme' },
      { text: 'Internasjonalisering', link: '/nb/locale' },
      { text: 'Vanlige spørsmål', link: '/nb/QA' },
    ],
  },
  {
    text: 'Grunnleggende komponenter',
    items: [
      { text: 'Loading', link: '/nb/ve-loading' },
      { text: 'Locale', link: '/nb/ve-locale' },
      { text: 'Icon', link: '/nb/ve-icon' },
      { text: 'Pagination', link: '/nb/ve-pagination' },
      { text: 'Contextmenu', link: '/nb/ve-contextmenu' },
    ],
  },
  {
    text: 'Tabellkomponent',
    items: [
      { text: 'Bruk', link: '/nb/ve-table/usage' },
      { text: 'Tabellbredde', link: '/nb/ve-table/table-width' },
      { text: 'Tabellhøyde', link: '/nb/ve-table/table-height' },
      { text: 'Tabellramme', link: '/nb/ve-table/table-border' },
      { text: 'Kolonnebredde', link: '/nb/ve-table/column-width' },
      { text: 'Endre kolonnebredde', link: '/nb/ve-table/column-resize' },
      { text: 'Faste kolonner', link: '/nb/ve-table/column-fixed' },
      { text: 'Skjulte kolonner', link: '/nb/ve-table/column-hidden' },
      { text: 'Fast topptekst', link: '/nb/ve-table/header-fixed' },
      { text: 'Gruppering av topptekst', link: '/nb/ve-table/header-grouping' },
      { text: 'Skjult topptekst', link: '/nb/ve-table/header-hidden' },
      { text: 'Filtrering', link: '/nb/ve-table/header-filter' },
      { text: 'Egendefinert filter', link: '/nb/ve-table/header-filter-custom' },
      { text: 'Sortering', link: '/nb/ve-table/header-sort' },
      { text: 'Cellejustering', link: '/nb/ve-table/cell-align' },
      { text: 'Cellestil', link: '/nb/ve-table/cell-style' },
      { text: 'Egendefinert celle', link: '/nb/ve-table/cell-custom' },
      { text: 'Cellesammenslåing', link: '/nb/ve-table/cell-span' },
      { text: 'Operasjonskolonne', link: '/nb/ve-table/operation-column' },
      { text: 'Cellevalg', link: '/nb/ve-table/cell-selection' },
      { text: 'Automatisk utfylling', link: '/nb/ve-table/cell-autofill' },
      { text: 'Celleredigering', link: '/nb/ve-table/cell-edit' },
      { text: 'Utklippstavle', link: '/nb/ve-table/clipboard' },
      { text: 'Høyreklikkmeny', link: '/nb/ve-table/contextmenu' },
      { text: 'Celle-ellipse', link: '/nb/ve-table/cell-ellipsis' },
      { text: 'Radindeks', link: '/nb/ve-table/row-index' },
      { text: 'Radinnsetting', link: '/nb/ve-table/row-insert' },
      { text: 'Rad-radioknapp', link: '/nb/ve-table/row-radio' },
      { text: 'Rad-avkrysningsboks', link: '/nb/ve-table/row-checkbox' },
      { text: 'Radutvidelse', link: '/nb/ve-table/row-expand' },
      { text: 'Radstil', link: '/nb/ve-table/row-style' },
      { text: 'Bunntekstsammendrag', link: '/nb/ve-table/footer-summary' },
      { text: 'Paginering', link: '/nb/ve-table/pagination' },
      { text: 'Laster', link: '/nb/ve-table/loading' },
      { text: 'Virtuell rulling', link: '/nb/ve-table/virtual-scroll' },
      { text: 'Egendefinerte hendelser', link: '/nb/ve-table/event-custom' },
      { text: 'Tomme data', link: '/nb/ve-table/data-empty' },
      { text: 'Instansmetoder', link: '/nb/ve-table/instance-methods' },
      { text: 'API', link: '/nb/ve-table/api' },
    ],
  },
  {
    text: 'Hjelpekomponenter',
    items: [
      { text: 'Checkbox', link: '/nb/ve-checkbox' },
      { text: 'Radio', link: '/nb/ve-radio' },
      { text: 'Select', link: '/nb/ve-select' },
      { text: 'Dropdown', link: '/nb/ve-dropdown' },
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
        sidebar: enSidebar,
        outline: { label: 'On this page' },
        docFooter: { prev: 'Previous', next: 'Next' },
        darkModeSwitchLabel: 'Theme',
        lightModeSwitchTitle: 'Switch to light mode',
        darkModeSwitchTitle: 'Switch to dark mode',
        sidebarMenuLabel: 'Menu',
        returnToTopLabel: 'Back to top',
      },
    },
    nb: {
      label: 'Norsk',
      lang: 'nb-NO',
      link: '/nb/',
      themeConfig: {
        nav: [
          { text: 'Dokumentasjon', link: '/nb/' },
          { text: 'GitHub', link: 'https://github.com/timmychan97/vue3-easytable' },
        ],
        sidebar: nbSidebar,
        outline: { label: 'På denne siden' },
        docFooter: { prev: 'Forrige', next: 'Neste' },
        darkModeSwitchLabel: 'Tema',
        lightModeSwitchTitle: 'Bytt til lyst tema',
        darkModeSwitchTitle: 'Bytt til mørkt tema',
        sidebarMenuLabel: 'Meny',
        returnToTopLabel: 'Tilbake til toppen',
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
