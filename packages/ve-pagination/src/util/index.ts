import { DEFAULT_PAGING_COUNT, PREFIX_CLS } from './constant'

export function clsName(cls: string) {
  return PREFIX_CLS + cls
}

// 规范化页码：正整数，否则为 1
export function toValidPageIndex(value: unknown): number {
  const num = Number.parseInt(`${value}`, 10)
  return Number.isNaN(num) || num < 1 ? 1 : num
}

// 用户输入的页码：正整数，并且不超过总页数
export function clampPageIndex(value: unknown, pageCount: number): number {
  return Math.min(toValidPageIndex(value), pageCount)
}

// 数字按钮个数：不小于 1 的整数（向下取整）；非数字时使用默认值（PAG-05）
// 否则 <= 0 时跳转按钮移动 0 页或反向移动，小数时会跳到非整数页码
export function toValidPagingCount(value: unknown): number {
  const num = Math.floor(Number(value))
  return Number.isNaN(num) ? DEFAULT_PAGING_COUNT : Math.max(1, num)
}
