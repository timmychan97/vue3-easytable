/**
 * 旧（英文）语言包键 → 新（中文）键的兼容层（I18N-04，决定 D5）。
 *
 * 81a1ebb 把语言包的键从英文改成了中文（如 `pagination.goto` → `分页.前往`）。
 * 按旧键写的自定义语言包会被静默忽略，因此在语言包进入 VeLocale 时
 * 把旧键映射为新键，并对每个旧键只警告一次。
 */
import type { DeprecatedLocaleMessage, LocaleMessage, LocaleMessageInput } from './types'

interface LegacySection<S extends keyof LocaleMessage, D> {
  section: S
  // 每个旧键都必须映射到该分组下存在的新键
  keys: { [K in keyof Required<D>]: keyof LocaleMessage[S] }
}

interface LegacyKeyMap {
  pagination: LegacySection<'分页', NonNullable<DeprecatedLocaleMessage['pagination']>>
  table: LegacySection<'表格', NonNullable<DeprecatedLocaleMessage['table']>>
}

export const LEGACY_LOCALE_KEY_MAP = {
  pagination: {
    section: '分页',
    keys: {
      goto: '前往',
      page: '页',
      itemsPerPage: '每页条数',
      total: '合计',
      prev5: '向前N页',
      next5: '向后N页',
      prevPage: '上一页',
      nextPage: '下一页',
      paginationLabel: '分页导航',
      pageLabel: '第N页',
      currentPageLabel: '当前页',
      jumpToLabel: '跳转到',
      pageSizeLabel: '每页显示条数',
    },
  },
  table: {
    section: '表格',
    keys: {
      confirmFilter: '确认筛选',
      resetFilter: '重置筛选',
      cut: '剪切',
      copy: '复制',
      insertRowAbove: '上方插入行',
      insertRowBelow: '下方插入行',
      removeRow: '删除行',
      emptyRow: '清空行',
      emptyColumn: '清空列',
      emptyCell: '清空单元格',
      leftFixedColumnTo: '左列冻结',
      cancelLeftFixedColumnTo: '取消左列冻结',
      rightFixedColumnTo: '右列冻结',
      cancelRightFixedColumnTo: '取消右列冻结',
    },
  },
} as const satisfies LegacyKeyMap

// 已经警告过的旧键（每个旧键只警告一次）
const warnedLegacyKeys = new Set<string>()

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwn(obj: object, key: string) {
  return Object.prototype.hasOwnProperty.call(obj, key)
}

function warnLegacyKey(oldPath: string, newPath: string) {
  if (warnedLegacyKeys.has(oldPath))
    return
  warnedLegacyKeys.add(oldPath)
  console.warn(
    `[vue3-easytable] Locale key "${oldPath}" is deprecated and will be removed in a future version. Use "${newPath}" instead.`,
  )
}

/**
 * 把用户传入的语言包规范化为新键：
 * - 旧键映射到新键（同一次传入中如果也给了新键，以新键为准）
 * - 不认识的旧键原样保留（与之前一样不会生效）
 * - 不修改传入的对象，返回一个新对象，可直接 merge 进当前语言包
 */
export function normalizeLocaleMessage(lang: LocaleMessageInput | null | undefined): Record<string, any> {
  const result: Record<string, any> = {}

  if (!isObject(lang))
    return result

  const input = lang as Record<string, unknown>

  // 先复制非旧分组（包括新的中文分组）
  Object.keys(input).forEach((section) => {
    if (hasOwn(LEGACY_LOCALE_KEY_MAP, section))
      return
    const messages = input[section]
    result[section] = isObject(messages) ? { ...messages } : messages
  })

  // 再把旧分组中的键映射到新分组
  Object.keys(LEGACY_LOCALE_KEY_MAP).forEach((legacySection) => {
    const legacyMessages = input[legacySection]
    if (!isObject(legacyMessages))
      return

    const { section, keys } = LEGACY_LOCALE_KEY_MAP[legacySection as keyof typeof LEGACY_LOCALE_KEY_MAP]
    const explicitMessages = isObject(result[section]) ? result[section] : {}
    const target: Record<string, unknown> = { ...explicitMessages }
    const unknownMessages: Record<string, unknown> = {}

    Object.keys(legacyMessages).forEach((legacyKey) => {
      const newKey = hasOwn(keys, legacyKey) ? keys[legacyKey as keyof typeof keys] as string : null
      if (!newKey) {
        unknownMessages[legacyKey] = legacyMessages[legacyKey]
        return
      }

      warnLegacyKey(`${legacySection}.${legacyKey}`, `${section}.${newKey}`)

      if (!hasOwn(explicitMessages, newKey))
        target[newKey] = legacyMessages[legacyKey]
    })

    result[section] = target
    if (Object.keys(unknownMessages).length > 0)
      result[legacySection] = unknownMessages
  })

  return result
}
