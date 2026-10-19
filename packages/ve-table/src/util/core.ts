/**
 * 通用工具（MOD-03）：类名、行 key、事件名等与具体功能无关的函数
 */
import type { ColgroupData } from '../ve-table-types'
import { isEmptyArray, isEmptyValue } from '@vue3-easytable/common/utils'
import { PREFIX_CLS } from './constant'

// 列 key / 行 key：来自用户配置与数据，可能是字符串或数字（包括 0）
export type ColKey = string | number
export type RowKey = string | number

// colgroups / allRowKeys 参数：子组件的 props 已声明为 PropType<ColgroupData[]> / PropType<RowKey[]>（INFRA-15）
export type ColgroupsParam = ColgroupData[]
export type RowKeysParam = RowKey[]

/**
 * @clsName
 * @desc  get class name
 * @param {string} cls - class
 */
export function clsName(cls: string) {
  return PREFIX_CLS + cls
}

/**
 * @getRowKey
 * @desc  get row key
 * @param {object} rowData - rowData
 * @param {string} rowKeyFieldName - row key field name
 */
export function getRowKey(rowData: any, rowKeyFieldName: string): string | number | null {
  if (rowData && rowKeyFieldName)
    return rowData[rowKeyFieldName] ?? null

  return null
}

/**
 * @isLastRowByRowKey
 * @desc is last row by row key
 * @param {string} rowKey - row key
 */
export function isLastRowByRowKey(rowKey: RowKey | null | undefined, allRowKeys: RowKeysParam) {
  if (!isEmptyValue(rowKey) && !isEmptyArray(allRowKeys))
    return allRowKeys[allRowKeys.length - 1] === rowKey

  return false
}

/**
 * @getDomResizeObserverCompKey
 * @desc  get dom resize observer comp key
 * @param {Any} originalKey - original key
 * @param {number} columnsOptionResetTime - columns option change time
 */
export function getDomResizeObserverCompKey(
  originalKey: any,
  columnsOptionResetTime: number,
) {
  let result = originalKey

  if (result || result === 0)
    result = `${originalKey}@${columnsOptionResetTime}`

  return result
}

/**
 * 转换 vue2 的事件名为 vue3
 * @param event emit 事件名 `on-aaa-bbb`
 * @returns 转换后 Vue3 jsx 的事件名 `onOnAaaBbb`
 */
export function getEmitEventName(event: string) {
  return `on${event.replace(/-?\b(\w)/g, (_, $1: string) => $1.toUpperCase())}`
}
