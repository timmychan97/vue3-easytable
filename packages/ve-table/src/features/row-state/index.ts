import type { InjectionKey, MaybeRefOrGetter } from 'vue'
import type { ExpandOption, RowExpand } from '../row-expand/useRowExpand'
import type { CheckboxOption, RadioOption, RowKey, RowRadio, RowSelection } from '../row-selection/useRowSelection'
import { inject, toValue } from 'vue'
import { useRowExpand } from '../row-expand/useRowExpand'
import { useRowRadio, useRowSelection } from '../row-selection/useRowSelection'

/**
 * 表格级的行状态（勾选 / 单选 / 展开）
 *
 * 在 ve-table 中创建一次并 provide，表头（全选框）和表体（行勾选框、单选框、展开行）
 * 通过 inject 读取同一份派生状态，不再通过事件来回同步副本（MOD-08, ROW-04）。
 */
export interface RowState {
  selection: RowSelection
  radio: RowRadio
  expand: RowExpand
}

export const ROW_STATE_KEY: InjectionKey<RowState> = Symbol('veTableRowState')

export interface CreateRowStateOptions {
  checkboxOption: MaybeRefOrGetter<CheckboxOption | null | undefined>
  radioOption: MaybeRefOrGetter<RadioOption | null | undefined>
  expandOption: MaybeRefOrGetter<ExpandOption | null | undefined>
  tableData: MaybeRefOrGetter<any[]>
  rowKeyFieldName: MaybeRefOrGetter<string | null | undefined>
  allRowKeys: MaybeRefOrGetter<RowKey[]>
}

export function createRowState(options: CreateRowStateOptions): RowState {
  const { checkboxOption, radioOption, expandOption, tableData, rowKeyFieldName, allRowKeys } = options

  // 根据 rowKey 取行数据（回调参数 row）
  const getRowByKey = (rowKey: RowKey) => {
    const fieldName = toValue(rowKeyFieldName)
    if (!fieldName)
      return undefined
    return toValue(tableData).find(row => row[fieldName] === rowKey)
  }

  return {
    selection: useRowSelection({ checkboxOption, allRowKeys, getRowByKey }),
    radio: useRowRadio({ radioOption, getRowByKey }),
    expand: useRowExpand({ expandOption, allRowKeys }),
  }
}

export function injectRowState(): RowState {
  const rowState = inject(ROW_STATE_KEY, null)
  if (!rowState)
    throw new Error('[vue3-easytable] row state is only available inside VeTable')
  return rowState
}
