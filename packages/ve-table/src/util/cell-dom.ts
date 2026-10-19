/**
 * body 行 / 单元格的 DOM 查找（INFRA-04、VS-05）
 *
 * - 同时适用于普通模式（一个 tbody.ve-table-body 包含所有行）
 *   与虚拟滚动模式（每行一个 tbody.ve-table-body，外加上下占位 tbody）。
 * - rowKey / colKey 来自用户数据，可能包含 `"`、`\` 等字符：
 *   拼进选择器前先转义，单元格按属性值直接比较，不会抛出 SyntaxError。
 * - 找不到时一律返回 null（或空数组），调用方必须判空。
 * - 只返回本表格的行：展开行里嵌套的表格中的行会被排除。
 */
import { COMPS_CUSTOM_ATTRS } from './constant'
import { clsName } from './core'

type Root = ParentNode & Node

const BODY_ROW_SELECTOR = `tbody.${clsName('body')} > tr.${clsName('body-tr')}`

/**
 * 转义属性选择器中（双引号内）的值
 */
export function escapeAttrValue(value: unknown): string {
  const str = String(value)
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function')
    return CSS.escape(str)

  // 降级：双引号字符串内只需处理 `\`、`"` 和换行类字符
  return str
    .replace(/[\\"]/g, '\\$&')
    .replace(/[\n\r\f]/g, ch => `\\${ch.charCodeAt(0).toString(16)} `)
}

/**
 * 行是否属于 root 所在的表格（而不是展开行中嵌套的表格）
 */
function isOwnRow(root: Root, tr: Element) {
  const table = tr.closest('table')
  const outerTr = table?.parentElement?.closest('tr')
  return !outerTr || !root.contains(outerTr)
}

/**
 * 本表格所有已渲染的 body 行（按 DOM 顺序，不含展开行与虚拟滚动占位行）
 */
export function queryBodyRows(root: Root | null | undefined): HTMLTableRowElement[] {
  if (!root)
    return []

  return Array.from(root.querySelectorAll<HTMLTableRowElement>(BODY_ROW_SELECTOR))
    .filter(tr => isOwnRow(root, tr))
}

/**
 * 按 rowKey 查找 body 行
 */
export function queryBodyRow(root: Root | null | undefined, rowKey: unknown): HTMLTableRowElement | null {
  if (!root)
    return null

  const selector = `${BODY_ROW_SELECTOR}[${COMPS_CUSTOM_ATTRS.BODY_ROW_KEY}="${escapeAttrValue(rowKey)}"]`
  const rows = root.querySelectorAll<HTMLTableRowElement>(selector)
  for (const tr of Array.from(rows)) {
    if (isOwnRow(root, tr))
      return tr
  }
  return null
}

/**
 * 在行内按 colKey 查找单元格（只看直接子元素）
 */
function getRowCell(tr: HTMLTableRowElement, colKey: unknown): HTMLTableCellElement | null {
  const key = String(colKey)
  for (const cell of Array.from(tr.cells)) {
    if (cell.getAttribute(COMPS_CUSTOM_ATTRS.BODY_COLUMN_KEY) === key)
      return cell
  }
  return null
}

/**
 * 按 rowKey + colKey 查找 body 单元格
 */
export function queryCell(root: Root | null | undefined, rowKey: unknown, colKey: unknown): HTMLTableCellElement | null {
  const tr = queryBodyRow(root, rowKey)
  return tr ? getRowCell(tr, colKey) : null
}

/**
 * 第一个（已渲染的）包含该列单元格的 body 行中的单元格
 */
export function queryFirstRowCell(root: Root | null | undefined, colKey: unknown): HTMLTableCellElement | null {
  const rows = queryBodyRows(root)
  for (let i = 0; i < rows.length; i++) {
    const cell = getRowCell(rows[i], colKey)
    if (cell)
      return cell
  }
  return null
}

/**
 * 最后一个（已渲染的）包含该列单元格的 body 行中的单元格
 */
export function queryLastRowCell(root: Root | null | undefined, colKey: unknown): HTMLTableCellElement | null {
  const rows = queryBodyRows(root)
  for (let i = rows.length - 1; i >= 0; i--) {
    const cell = getRowCell(rows[i], colKey)
    if (cell)
      return cell
  }
  return null
}
