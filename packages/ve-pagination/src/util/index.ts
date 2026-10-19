import { PREFIX_CLS } from './constant'

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
