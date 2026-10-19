import type { LocaleMessageInput } from '@/common/locale/types'
import VeConfigProviderSource from '@/common/comps/config-provider'
import enUS from '@/common/locale/lang/en-US'
import nbNO from '@/common/locale/lang/nb-NO'
import zhCN from '@/common/locale/lang/zh-CN'
import veLocale, { useLocale } from '@/ve-locale'
import { VeConfigProvider, VePagination } from '@/vue/src/index'
import { later, wrapMount as mount } from '@test-utils'
import { cloneDeep } from 'lodash'
import { defineComponent, h, nextTick, ref } from 'vue'

// 分页组件中的文案
function gotoLabel(wrapper: { find: (selector: string) => { text: () => string } }) {
  return wrapper.find('.ve-pagination-goto-label').text()
}
function totalText(wrapper: { find: (selector: string) => { text: () => string } }) {
  return wrapper.find('.ve-pagination-total').text()
}

describe('veConfigProvider', () => {
  beforeEach(() => {
    veLocale.use(zhCN)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    // 恢复默认语言，避免影响其他用例
    veLocale.use(zhCN)
  })

  it('is exported and registered by useVeTable', () => {
    expect(VeConfigProvider).toBe(VeConfigProviderSource)
    expect(VeConfigProvider.name).toBe('VeConfigProvider')

    const wrapper = mount({
      render() {
        return (
          <ve-config-provider>
            <span class="child">registered</span>
          </ve-config-provider>
        )
      },
    })

    expect(wrapper.find('.child').text()).toBe('registered')
  })

  it('renders its default slot', () => {
    const wrapper = mount({
      render() {
        return (
          <VeConfigProvider locale={enUS}>
            <span class="first">first</span>
            <span class="second">second</span>
          </VeConfigProvider>
        )
      },
    })

    expect(wrapper.find('.first').text()).toBe('first')
    expect(wrapper.find('.second').text()).toBe('second')
  })

  it('a component inside the provider uses the provider locale', () => {
    const wrapper = mount({
      render() {
        return (
          <div>
            <div class="inside">
              <VeConfigProvider locale={enUS}>
                <VePagination total={600} />
              </VeConfigProvider>
            </div>
            <div class="outside">
              <VePagination total={600} />
            </div>
          </div>
        )
      },
    })

    const inside = wrapper.find('.inside')
    const outside = wrapper.find('.outside')

    expect(gotoLabel(inside)).toBe('Go to')
    expect(totalText(inside)).toBe('Total 600')
    expect(inside.find('nav').attributes('aria-label')).toBe('Pagination navigation')
    expect(inside.find('.ve-pagination-pager li[title]').attributes('title')).toBe('Next 5 pages')
    expect(inside.find('.ve-pagination-select-label').text()).toBe('Items per page')

    // 提供者之外仍使用全局语言
    expect(gotoLabel(outside)).toBe('前往')
    expect(totalText(outside)).toBe('共 600 条')
  })

  it('nested providers: the innermost provider wins', () => {
    const wrapper = mount({
      render() {
        return (
          <VeConfigProvider locale={enUS}>
            <div class="outer">
              <VePagination total={600} />
            </div>
            <VeConfigProvider locale={{ 分页: { 前往: 'Inner go' } }}>
              <div class="inner">
                <VePagination total={600} />
              </div>
              <VeConfigProvider locale={{ 分页: { 前往: 'Innermost go' } }}>
                <div class="innermost">
                  <VePagination total={600} />
                </div>
              </VeConfigProvider>
            </VeConfigProvider>
          </VeConfigProvider>
        )
      },
    })

    expect(gotoLabel(wrapper.find('.outer'))).toBe('Go to')
    expect(gotoLabel(wrapper.find('.inner'))).toBe('Inner go')
    expect(gotoLabel(wrapper.find('.innermost'))).toBe('Innermost go')
    // 没有覆盖的键沿用外层提供者的语言包
    expect(totalText(wrapper.find('.inner'))).toBe('Total 600')
    expect(totalText(wrapper.find('.innermost'))).toBe('Total 600')
  })

  it('switching the locale prop at runtime updates the rendered text', async () => {
    const locale = ref<LocaleMessageInput | undefined>(enUS)

    const wrapper = mount({
      setup() {
        return () => (
          <VeConfigProvider locale={locale.value}>
            <VePagination total={600} />
          </VeConfigProvider>
        )
      },
    })

    expect(gotoLabel(wrapper)).toBe('Go to')
    expect(totalText(wrapper)).toBe('Total 600')

    locale.value = nbNO
    await nextTick()

    expect(gotoLabel(wrapper)).toBe('Gå til')
    expect(totalText(wrapper)).toBe('Totalt 600')

    // 去掉 locale 后回退到全局语言
    locale.value = undefined
    await nextTick()

    expect(gotoLabel(wrapper)).toBe('前往')
    expect(totalText(wrapper)).toBe('共 600 条')
  })

  it('without a provider, components fall back to the global locale', async () => {
    const wrapper = mount({
      render() {
        return <VePagination total={600} />
      },
    })

    expect(gotoLabel(wrapper)).toBe('前往')

    veLocale.use(enUS)
    await later()
    expect(gotoLabel(wrapper)).toBe('Go to')

    veLocale.update({ 分页: { 前往: 'Global go' } })
    await later()
    expect(gotoLabel(wrapper)).toBe('Global go')
  })

  it('a provider without a locale passes the global locale through, including later updates', async () => {
    const wrapper = mount({
      render() {
        return (
          <VeConfigProvider>
            <VePagination total={600} />
          </VeConfigProvider>
        )
      },
    })

    expect(gotoLabel(wrapper)).toBe('前往')

    veLocale.use(enUS)
    await later()
    expect(gotoLabel(wrapper)).toBe('Go to')
  })

  it('accepts an old English key through the provider and warns once', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const locale = ref<LocaleMessageInput>({ pagination: { pageSizeLabel: 'Rows per page' } })

    const wrapper = mount({
      setup() {
        return () => (
          <VeConfigProvider locale={locale.value}>
            <VePagination total={600} />
            <VePagination total={600} />
          </VeConfigProvider>
        )
      },
    })

    expect(wrapper.find('.ve-pagination-select-label').text()).toBe('Rows per page')

    // 再次传入同一个旧键：文案更新，但不再警告
    locale.value = { pagination: { pageSizeLabel: 'Rows' } }
    await nextTick()

    expect(wrapper.find('.ve-pagination-select-label').text()).toBe('Rows')

    const warnings = warnSpy.mock.calls.filter(args =>
      String(args[0]).includes('"pagination.pageSizeLabel"'),
    )
    expect(warnings).toHaveLength(1)
    expect(String(warnings[0][0])).toContain('"分页.每页显示条数"')
  })

  it('does not mutate the user locale object or the global locale', async () => {
    const userLocale = { 分页: { 前往: 'Mine' } }
    const userLocaleSnapshot = JSON.stringify(userLocale)
    const userEnUS = cloneDeep(enUS)
    const globalBefore = JSON.stringify(veLocale.getMessage())

    // 子组件通过 useLocale().update 做局部覆盖
    let localUpdate: (lang: LocaleMessageInput) => void = () => {}
    const LocalReader = defineComponent({
      setup() {
        const { getMessage, update } = useLocale()
        localUpdate = update
        return () => h('span', { class: 'local-goto' }, getMessage().分页.前往)
      },
    })

    const wrapper = mount({
      render() {
        return (
          <div>
            <VeConfigProvider locale={userLocale}>
              <LocalReader />
              <div class="sibling">
                <VePagination total={600} />
              </div>
            </VeConfigProvider>
            <VeConfigProvider locale={enUS}>
              <VePagination total={600} />
            </VeConfigProvider>
          </div>
        )
      },
    })

    expect(wrapper.find('.local-goto').text()).toBe('Mine')

    localUpdate({ 分页: { 前往: 'Local only' } })
    await nextTick()

    // 局部覆盖只影响调用 useLocale 的组件
    expect(wrapper.find('.local-goto').text()).toBe('Local only')
    expect(gotoLabel(wrapper.find('.sibling'))).toBe('Mine')

    // 用户对象、内置语言包和全局语言包都没有被修改
    expect(JSON.stringify(userLocale)).toBe(userLocaleSnapshot)
    expect(enUS).toEqual(userEnUS)
    expect(JSON.stringify(veLocale.getMessage())).toBe(globalBefore)
  })

  describe('inside ve-table', () => {
    const TABLE_DATA = [
      { name: 'John', date: '1900-05-20', rowKey: 0 },
      { name: 'Dickerson', date: '1910-06-20', rowKey: 1 },
    ]

    afterEach(() => {
      document.querySelectorAll('.ve-contextmenu-node').forEach(el => el.remove())
    })

    it('the header filter uses the provider locale', () => {
      const columns = [
        { field: 'name', key: 'name', title: 'Name' },
        {
          field: 'date',
          key: 'date',
          title: 'Date',
          filter: {
            filterList: [{ value: 0, label: '1900-05-20', selected: false }],
            filterConfirm: () => {},
            filterReset: () => {},
          },
        },
      ]

      const wrapper = mount({
        render() {
          return (
            <VeConfigProvider locale={enUS}>
              <ve-table row-key-field-name="rowKey" columns={columns} table-data={TABLE_DATA} />
            </VeConfigProvider>
          )
        },
      })

      const dropdown = wrapper.findComponent({ name: 'VeDropdown' })
      expect(dropdown.props('confirmFilterText')).toBe('Filter')
      expect(dropdown.props('resetFilterText')).toBe('Reset')
    })

    it('the contextmenu uses the provider locale', async () => {
      const columns = [
        { field: 'name', key: 'name', title: 'Name' },
        { field: 'date', key: 'date', title: 'Date' },
      ]

      const wrapper = mount(
        {
          render() {
            return (
              <VeConfigProvider locale={enUS}>
                <ve-table
                  row-key-field-name="rowKey"
                  columns={columns}
                  table-data={TABLE_DATA}
                  contextmenu-body-option={{
                    contextmenus: [{ type: 'CUT' }, { type: 'COPY' }],
                  }}
                />
              </VeConfigProvider>
            )
          },
        },
        { attachTo: document.body },
      )

      const td = wrapper.findAll('.ve-table-body-tr')[0].findAll('.ve-table-body-td')[1]
      td.trigger('mousedown', { button: 3 })
      await later()
      td.trigger('contextmenu')
      await later()

      const labels = Array.from(document.querySelectorAll('.ve-contextmenu-node'))
        .map(el => el.textContent?.trim())

      expect(labels).toEqual(['Cut', 'Copy'])
    })
  })
})
