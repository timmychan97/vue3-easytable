// @vitest-environment node
/**
 * INFRA-05：在没有 DOM 的 Node 环境（SSR，例如 Nuxt）中导入并渲染组件不能崩溃。
 * 注意：本文件运行在 node 环境，不能访问 document / window。
 */
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

describe('sSR (INFRA-05)', () => {
  it('runs without a DOM', () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')
    expect(typeof HTMLElement).toBe('undefined')
  })

  it('imports the library entry', async () => {
    const lib = await import('../src/index')
    expect(typeof lib.useVeTable).toBe('function')
    expect(lib.VeTable).toBeTruthy()
    expect(lib.VeDropdown).toBeTruthy()
    expect(lib.VeSelect).toBeTruthy()
    expect(lib.VePagination).toBeTruthy()
    expect(lib.VeContextmenu).toBeTruthy()
  })

  // 逐个导入每个包（不经过库入口），确保单独按需导入也不会崩溃
  const PACKAGES: Record<string, () => Promise<{ default: unknown }>> = {
    've-checkbox': () => import('../../ve-checkbox/index'),
    've-checkbox-group': () => import('../../ve-checkbox-group/index'),
    've-contextmenu': () => import('../../ve-contextmenu/index'),
    've-dropdown': () => import('../../ve-dropdown/index'),
    've-icon': () => import('../../ve-icon/index'),
    've-loading': () => import('../../ve-loading/index'),
    've-locale': () => import('../../ve-locale/index'),
    've-pagination': () => import('../../ve-pagination/index'),
    've-radio': () => import('../../ve-radio/index'),
    've-select': () => import('../../ve-select/index'),
    've-table': () => import('../../ve-table/src/index'),
    'common/config-provider': () => import('../../common/comps/config-provider'),
  }

  it.each(Object.keys(PACKAGES))('imports @vue3-easytable/%s', async (name) => {
    const mod = await PACKAGES[name]()
    expect(mod.default).toBeTruthy()
  })

  describe('renderToString', () => {
    async function render(component: any, props: Record<string, any> = {}, children?: any) {
      const { useVeTable } = await import('../src/index')
      const app = createSSRApp({
        render: () => h(component, props, children),
      })
      app.use(useVeTable())
      const html = await renderToString(app)
      // 等待渲染后排队的 nextTick / 定时器回调执行完，它们在 SSR 中同样不能访问 DOM
      await new Promise(resolve => setTimeout(resolve, 20))
      return html
    }

    const OPTIONS = [
      { value: 0, label: 'Apple', selected: false },
      { value: 1, label: 'Orange', selected: true },
    ]

    it('veDropdown', async () => {
      const { VeDropdown } = await import('../src/index')
      const html = await render(VeDropdown, { modelValue: OPTIONS }, { default: () => 'click me' })
      expect(html).toContain('ve-dropdown')
      expect(html).toContain('Orange')
    })

    it('veDropdown with a string popperAppendTo', async () => {
      const { VeDropdown } = await import('../src/index')
      const html = await render(VeDropdown, { modelValue: OPTIONS, popperAppendTo: '#app' })
      expect(html).toContain('ve-dropdown')
    })

    it('veDropdown controlled and visible', async () => {
      const { VeDropdown } = await import('../src/index')
      const html = await render(VeDropdown, { modelValue: OPTIONS, isControlled: true, visible: true })
      expect(html).toContain('ve-dropdown')
    })

    it('veDropdown controlled and hidden', async () => {
      const { VeDropdown } = await import('../src/index')
      const html = await render(VeDropdown, { modelValue: OPTIONS, isControlled: true, visible: false })
      expect(html).toContain('ve-dropdown')
    })

    it('veSelect', async () => {
      const { VeSelect } = await import('../src/index')
      const html = await render(VeSelect, { modelValue: OPTIONS })
      expect(html).toContain('ve-select')
      expect(html).toContain('Orange')
    })

    it('vePagination', async () => {
      const { VePagination } = await import('../src/index')
      const html = await render(VePagination, { total: 100 })
      expect(html).toContain('ve-pagination')
    })

    it('veCheckbox, veRadio and veIcon', async () => {
      const { VeCheckbox, VeRadio, VeIcon } = await import('../src/index')
      expect(await render(VeCheckbox, { label: 'a' })).toContain('ve-checkbox')
      expect(await render(VeRadio, {}, { default: () => 'r' })).toContain('ve-radio')
      expect(await render(VeIcon, { name: 'filter' })).toContain('iconfont')
    })

    it('veTable', async () => {
      const { VeTable } = await import('../src/index')
      const html = await render(VeTable, {
        columns: [
          { field: 'name', key: 'a', title: 'Name' },
          { field: 'age', key: 'b', title: 'Age' },
        ],
        tableData: [
          { rowKey: 1, name: 'John', age: 20 },
          { rowKey: 2, name: 'Jane', age: 30 },
        ],
        rowKeyFieldName: 'rowKey',
      })
      expect(html).toContain('ve-table')
      expect(html).toContain('John')
    })

    it('veTable with header filters', async () => {
      const { VeTable } = await import('../src/index')
      const html = await render(VeTable, {
        columns: [
          {
            field: 'name',
            key: 'a',
            title: 'Name',
            filter: { filterList: [{ value: 0, label: 'John', selected: false }], filterConfirm: () => {} },
          },
          {
            field: 'age',
            key: 'b',
            title: 'Age',
            filterCustom: { defaultVisible: false, render: () => 'custom' },
          },
        ],
        tableData: [{ rowKey: 1, name: 'John', age: 20 }],
        rowKeyFieldName: 'rowKey',
      })
      expect(html).toContain('ve-table')
      expect(html).toContain('ve-dropdown')
    })

    it('veTable with most features enabled', async () => {
      const { VeTable } = await import('../src/index')
      const html = await render(VeTable, {
        columns: [
          { field: '', key: 'chk', type: 'checkbox', title: '', width: 50, fixed: 'left' },
          { field: '', key: 'exp', type: 'expand', title: '', width: 50 },
          { field: 'name', key: 'a', title: 'Name', sortBy: '', edit: true, ellipsis: { showTitle: true } },
          { field: 'age', key: 'b', title: 'Age', fixed: 'right' },
        ],
        tableData: Array.from({ length: 20 }, (_, i) => ({ rowKey: i, name: `n${i}`, age: i })),
        rowKeyFieldName: 'rowKey',
        maxHeight: 200,
        fixedHeader: true,
        virtualScrollOption: { enable: true },
        checkboxOption: {},
        expandOption: { render: () => 'expanded' },
        sortOption: { sortChange: () => {} },
        editOption: { cellValueChange: () => {} },
        cellSelectionOption: { enable: true },
        cellAutofillOption: true,
        columnWidthResizeOption: { enable: true },
        footerData: [{ rowKey: 'f', name: 'total', age: 0 }],
      })
      expect(html).toContain('ve-table')
    })

    // VeContextmenu 的 options / eventTarget 是 immediate watcher，在 setup 阶段就访问 document（MENU-02 处理）
    it.todo('veContextmenu')

    it('veConfigProvider', async () => {
      const { VeConfigProvider, VePagination } = await import('../src/index')
      const html = await render(VeConfigProvider, {}, { default: () => h(VePagination, { total: 10 }) })
      expect(html).toContain('ve-pagination')
    })
  })
})
