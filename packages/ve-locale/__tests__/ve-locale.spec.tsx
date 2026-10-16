import type { LocaleMessage } from '@/common/locale/types'
import enUS from '@/common/locale/lang/en-US'
import zhCN from '@/common/locale/lang/zh-CN'
import { normalizeLocaleMessage } from '@/common/locale/legacy-keys'
import veLocale from '@/ve-locale'
import { later, wrapMount as mount } from '@test-utils'

describe('veLocale', () => {
  const wrapper = mount({
    render() {
      return (
        <div>
          <ve-pagination total={600} />
          <ve-pagination total={600} pageIndex={2} />
          <ve-pagination total={600} pageIndex={30} />
          <ve-pagination
            total={600}
            layout={['total', 'prev', 'next', 'sizer', 'jumper']}
          />
          <ve-pagination
            total={600}
            layout={[
              'total',
              'sizer',
              'prev',
              'pager',
              'next',
              'jumper',
            ]}
          />
        </div>
      )
    },
  })

  // 第一个分页组件中的文案
  const gotoLabel = () => wrapper.find('.ve-pagination-goto-label').text()
  const totalText = () => wrapper.find('.ve-pagination-total').text()

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('render with zhCN', async () => {
    veLocale.use(zhCN)

    await later()

    expect(wrapper.html()).toMatchSnapshot()
  })

  it('render with enUS', async () => {
    veLocale.use(enUS)

    await later()

    expect(wrapper.html()).toMatchSnapshot()
  })

  it('render by update method', async () => {
    const lang = {
      分页: {
        前往: '跳转到',
      },
    }

    veLocale.update(lang)

    await later()

    expect(gotoLabel()).toBe('跳转到')
    expect(wrapper.html()).toMatchSnapshot()
  })

  it('overrides a message with the new key', async () => {
    veLocale.use(enUS)
    veLocale.update({ 分页: { 前往: 'Jump' } })

    await later()

    expect(gotoLabel()).toBe('Jump')
    // 其他文案不受影响
    expect(totalText()).toBe('Total 600')
  })

  it('accepts a deprecated English key and warns once per key', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    veLocale.use(enUS)
    veLocale.update({ pagination: { goto: 'Old goto' } })
    veLocale.update({ pagination: { goto: 'Old goto again' } })

    await later()

    expect(gotoLabel()).toBe('Old goto again')

    const gotoWarnings = warnSpy.mock.calls.filter(args =>
      String(args[0]).includes('"pagination.goto"'),
    )
    expect(gotoWarnings).toHaveLength(1)
    expect(String(gotoWarnings[0][0])).toContain('"分页.前往"')
  })

  it('use() accepts a language pack written with the old keys', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    veLocale.use(zhCN)
    veLocale.use({
      pagination: {
        goto: 'Goto',
        total: total => `Sum ${total}`,
      },
    })

    await later()

    expect(gotoLabel()).toBe('Goto')
    expect(totalText()).toBe('Sum 600')

    // 恢复默认语言，避免影响其他用例
    veLocale.use(zhCN)
  })

  describe('normalizeLocaleMessage', () => {
    it('maps old keys to the new keys without mutating the input', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})

      const input = {
        pagination: { prevPage: 'Prev' },
        table: { cut: 'Cut it', emptyCell: 'Clear' },
      }
      const snapshot = JSON.stringify(input)

      expect(normalizeLocaleMessage(input)).toEqual({
        分页: { 上一页: 'Prev' },
        表格: { 剪切: 'Cut it', 清空单元格: 'Clear' },
      })
      expect(JSON.stringify(input)).toBe(snapshot)
    })

    it('prefers a new key given in the same object', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})

      expect(
        normalizeLocaleMessage({
          分页: { 下一页: 'new' },
          pagination: { nextPage: 'old' },
        }),
      ).toEqual({ 分页: { 下一页: 'new' } })
    })

    it('keeps unknown keys where they were and ignores empty input', () => {
      // 未知键不在类型中，这里模拟运行时传入的任意对象
      const input: any = {
        pagination: { notAKey: 'x' },
        custom: { a: 'b' },
      }
      expect(normalizeLocaleMessage(input)).toEqual({
        分页: {},
        pagination: { notAKey: 'x' },
        custom: { a: 'b' },
      })
      expect(normalizeLocaleMessage(undefined)).toEqual({})
      expect(normalizeLocaleMessage(null)).toEqual({})
    })
  })

  it('locale message types reject missing and unknown keys', () => {
    // 仅用于 vue-tsc：如果类型不再报错，@ts-expect-error 本身会报错
    // @ts-expect-error 缺少 表格
    const missing: LocaleMessage = { 分页: zhCN.分页 }
    // @ts-expect-error 多出的键
    const unknown: LocaleMessage = { ...zhCN, 表格: { ...zhCN.表格, 粘贴: 'Paste' } }

    expect(missing).toBeTruthy()
    expect(unknown).toBeTruthy()
  })
})
