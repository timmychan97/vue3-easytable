import type { MaybeRefOrGetter } from 'vue'
import type { RowKey } from '../row-selection/useRowSelection'
import { computed, shallowRef, toValue, watch } from 'vue'

/**
 * 行展开的状态（MOD-08）
 *
 * - 受控模式（`expandedRowKeys`）直接读取用户的数组，原地修改（push / splice）也能被追踪（ROW-03）；
 * - 非受控模式的内部状态只整体替换，从不原地修改，也不与表格的 allRowKeys 共用数组（ROW-01）；
 * - `defaultExpandAllRows` 只用于初始化内部状态，之后行可以正常折叠（ROW-02）。
 */

export interface ExpandOption {
  expandedRowKeys?: RowKey[]
  defaultExpandedRowKeys?: RowKey[]
  defaultExpandAllRows?: boolean
  beforeExpandRowChange?: (params: { beforeExpandedRowKeys: RowKey[], row: any, rowIndex: number }) => boolean | void
  afterExpandRowChange?: (params: { afterExpandedRowKeys: RowKey[], row: any, rowIndex: number }) => void
  [key: string]: any
}

export interface UseRowExpandOptions {
  expandOption: MaybeRefOrGetter<ExpandOption | null | undefined>
  // 当前表格数据的全部 rowKey（defaultExpandAllRows 时使用）
  allRowKeys: MaybeRefOrGetter<RowKey[]>
}

export function useRowExpand(options: UseRowExpandOptions) {
  const { expandOption, allRowKeys } = options

  const getOption = () => toValue(expandOption) || null

  // 非受控模式下已展开的 key（只整体替换，不原地修改）
  const internalExpandedRowKeys = shallowRef<RowKey[]>([])

  // 是否受控（设置了 expandedRowKeys）
  const isControlled = computed(() => Array.isArray(getOption()?.expandedRowKeys))

  // 当前已展开的 key：受控时就是用户的数组本身
  const expandedRowKeys = computed<RowKey[]>(() =>
    isControlled.value ? getOption()!.expandedRowKeys! : internalExpandedRowKeys.value,
  )

  // 迭代响应式数组会追踪其长度和每一项，原地修改也会触发更新
  const expandedKeySet = computed(() => new Set(expandedRowKeys.value))

  function isRowExpanded(rowKey: RowKey) {
    return expandedKeySet.value.has(rowKey)
  }

  // 初始化非受控状态（选项对象被整体替换时重新初始化，与原行为一致）
  function initInternalExpandedRowKeys() {
    const option = getOption()
    if (!option)
      return

    // 复制一份，避免与表格的 allRowKeys 或用户的数组共用（ROW-01）
    if (option.defaultExpandAllRows)
      internalExpandedRowKeys.value = toValue(allRowKeys).slice()
    else if (Array.isArray(option.defaultExpandedRowKeys))
      internalExpandedRowKeys.value = option.defaultExpandedRowKeys.slice()
  }

  initInternalExpandedRowKeys()
  watch(getOption, initInternalExpandedRowKeys)

  /**
   * 切换某一行的展开状态
   * @returns 被 beforeExpandRowChange 阻止时返回 false
   */
  function toggleRowExpand({ row, rowKey, rowIndex }: { row: any, rowKey: RowKey, rowIndex: number }) {
    const option = getOption()
    if (!option)
      return false

    if (typeof option.beforeExpandRowChange === 'function') {
      const result = option.beforeExpandRowChange({
        beforeExpandedRowKeys: expandedRowKeys.value.slice(),
        row,
        rowIndex,
      })
      // 中断执行
      if (result === false)
        return false
    }

    const nextKeys = expandedRowKeys.value.slice()
    const index = nextKeys.indexOf(rowKey)
    if (index > -1)
      nextKeys.splice(index, 1)
    else
      nextKeys.push(rowKey)

    // 受控时只通知用户，由用户决定是否回写
    if (!isControlled.value)
      internalExpandedRowKeys.value = nextKeys

    if (typeof option.afterExpandRowChange === 'function') {
      option.afterExpandRowChange({
        afterExpandedRowKeys: nextKeys.slice(),
        row,
        rowIndex,
      })
    }

    return true
  }

  return {
    isControlled,
    expandedRowKeys,
    expandedKeySet,
    isRowExpanded,
    toggleRowExpand,
  }
}

export type RowExpand = ReturnType<typeof useRowExpand>
