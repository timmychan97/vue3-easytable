import type { LocaleMessageInput } from '@/common/locale/types'
import enUS from '@/common/locale/lang/en-US'
import noNB from '@/common/locale/lang/no-NB'
import zhCN from '@/common/locale/lang/zh-CN'
import veLocale from '@/ve-locale'
import { useVeTable, VePagination } from '@/vue/src/index'
import { mount } from '@vue/test-utils'
import { cloneDeep } from 'lodash'
import { createApp, nextTick } from 'vue'

// 每次 mount 都会创建一个独立的 Vue app
function mountApp(locale?: LocaleMessageInput, render?: () => any) {
  return mount({
    render: render ?? (() => <ve-pagination total={600} />),
  }, {
    global: {
      plugins: locale ? [useVeTable({ locale })] : [],
    },
  })
}

function gotoLabel(wrapper: { find: (selector: string) => { text: () => string } }) {
  return wrapper.find('.ve-pagination-goto-label').text()
}
function totalText(wrapper: { find: (selector: string) => { text: () => string } }) {
  return wrapper.find('.ve-pagination-total').text()
}

describe('veLocale: per-app isolation (I18N-02)', () => {
  beforeEach(() => {
    veLocale.use(zhCN)
    // VTU 的全局插件已经执行过 useVeTable()，这里再次安装会对每个组件给出 "Plugin has already been applied"
    const warn = console.warn
    vi.spyOn(console, 'warn').mockImplementation((...args: any[]) => {
      if (!String(args[0]).includes('Plugin has already been applied'))
        warn(...args)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    // 恢复默认语言，避免影响其他用例
    veLocale.use(zhCN)
  })

  it('a second app installed with another locale does not switch the first app', async () => {
    const first = mountApp(enUS)
    const second = mountApp(noNB)
    await nextTick()

    expect(gotoLabel(first)).toBe(enUS.分页.前往)
    expect(gotoLabel(second)).toBe(noNB.分页.前往)
  })

  it('useVeTable({ locale }) does not change the global locale or other apps', async () => {
    const globalBefore = JSON.stringify(veLocale.getMessage())

    const plain = mountApp()
    mountApp(enUS)
    await nextTick()

    expect(JSON.stringify(veLocale.getMessage())).toBe(globalBefore)
    expect(gotoLabel(plain)).toBe(zhCN.分页.前往)
  })

  it('this.$veLocale only switches its own app', async () => {
    const first = mountApp()
    const second = mountApp()

    ;(first.vm as any).$veLocale.use(enUS)
    await nextTick()

    expect(gotoLabel(first)).toBe(enUS.分页.前往)
    expect((first.vm as any).$veLocale.getMessage().分页.前往).toBe(enUS.分页.前往)
    expect(gotoLabel(second)).toBe(zhCN.分页.前往)
    expect(veLocale.getMessage().分页.前往).toBe(zhCN.分页.前往)
  })

  it('an app installed with a partial locale falls back to the global language', async () => {
    const wrapper = mountApp({ 分页: { 前往: 'Hop' } })
    await nextTick()

    expect(gotoLabel(wrapper)).toBe('Hop')
    expect(totalText(wrapper)).toBe(zhCN.分页.合计(600))
  })

  it('the global VeLocale still switches every app, including one installed with a locale', async () => {
    const withLocale = mountApp(enUS)
    const plain = mountApp()

    veLocale.use(noNB)
    await nextTick()

    expect(gotoLabel(withLocale)).toBe(noNB.分页.前往)
    expect(gotoLabel(plain)).toBe(noNB.分页.前往)
  })

  it('a VeConfigProvider inside the app wins over the app locale', async () => {
    const wrapper = mountApp(enUS, () => (
      <div>
        <ve-config-provider locale={noNB}>
          <ve-pagination class="inner" total={600} />
        </ve-config-provider>
        <ve-pagination class="outer" total={600} />
      </div>
    ))
    await nextTick()

    expect(wrapper.find('.inner .ve-pagination-goto-label').text()).toBe(noNB.分页.前往)
    expect(wrapper.find('.outer .ve-pagination-goto-label').text()).toBe(enUS.分页.前往)
  })

  it('update() does not mutate the previous message object or the language packs', () => {
    const zhBefore = cloneDeep(zhCN)
    const enBefore = cloneDeep(enUS)
    const previous = veLocale.getMessage()
    const previousGoto = previous.分页.前往

    veLocale.use(enUS)
    veLocale.update({ 分页: { 前往: 'Changed' } })

    expect(veLocale.getMessage().分页.前往).toBe('Changed')
    expect(previous.分页.前往).toBe(previousGoto)
    expect(veLocale.getMessage()).not.toBe(previous)
    expect(zhCN).toEqual(zhBefore)
    expect(enUS).toEqual(enBefore)
  })

  it('app.use(VeLocale, { locale }) sets the language of that app', async () => {
    // 不经过 VTU（VTU 的全局插件已经安装过 VeLocale），直接创建 app
    const app = createApp({ render: () => <ve-pagination total={600} /> })
    app.use(VePagination)
    app.use(veLocale, { locale: enUS })
    const el = document.createElement('div')
    app.mount(el)

    try {
      expect(el.querySelector('.ve-pagination-goto-label')!.textContent).toBe(enUS.分页.前往)
      expect(veLocale.getMessage().分页.前往).toBe(zhCN.分页.前往)

      veLocale.use(noNB)
      await nextTick()
      expect(el.querySelector('.ve-pagination-goto-label')!.textContent).toBe(noNB.分页.前往)
    }
    finally {
      app.unmount()
    }
  })
})
