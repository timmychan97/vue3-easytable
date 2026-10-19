/**
 * 批量写入单元格（粘贴、剪切、删除、自动填充共用，CLIP-07、CLIP-10、FILL-03、FILL-04，D12）
 *
 * - isWritableColumn：哪些列可以被写入（不对应数据字段的列始终跳过；设置了 editOption
 *   时只有 edit: true 的列可写入）；
 * - applyCellChanges：逐单元格写入，值不变的单元格不写入、不回调；
 * - getCellValueCallbacks：设置了 editOption 时，逐单元格调用
 *   beforeCellValueChange / cellValueChange / afterCellValueChange，参数与单元格编辑相同。
 *
 * 调用方的顺序：before*（整个操作，可取消）→ applyCellChanges（逐单元格 before 并写入）
 * → 内部状态更新（选区等）→ fireAfter（逐单元格 after）→ after*（最后）。
 */
import { isBoolean } from '@vue3-easytable/common/utils'
import { cloneDeep } from 'lodash'
import { safeCall } from '../../util/safe-call.js'

type ColumnKey = string | number

export interface CellValueColumn {
  key: ColumnKey
  field?: string
  operationColumn?: boolean
  edit?: boolean
  [key: string]: any
}

/**
 * 要写入的一个单元格
 */
export interface CellChange {
  rowIndex: number
  column: CellValueColumn
  value: any
}

/**
 * 已写入的单元格，row 为写入时的行对象（after 回调使用）
 */
export interface AppliedCellChange extends CellChange {
  row: Record<string, any>
}

/**
 * 写入前的逐单元格检查，返回 false 时跳过该单元格（beforeCellValueChange）
 */
export type CanChangeCell = (change: CellChange, row: Record<string, any>) => boolean

/**
 * 调用 before* 回调：返回 false 或抛出异常时视为取消（INFRA-07）
 */
export function isCancelledByCallback(name: string, callback: any, payload: any): boolean {
  const { value, threw } = safeCall(name, callback, payload)
  return threw || (isBoolean(value) && !value)
}

/**
 * 列是否对应行数据中的一个字段（CLIP-07、FILL-04）
 * 操作列（即使配置了 field）和没有 field 的列只用于展示，写入会在用户的行数据里
 * 生成 "undefined"、"index" 之类的多余属性；作为自动填充的源列时也没有可填充的值。
 */
export function isDataColumn(column: CellValueColumn | undefined): boolean {
  if (!column || column.operationColumn)
    return false

  const { field } = column
  return field !== undefined && field !== null && field !== ''
}

/**
 * 列是否可以被粘贴、剪切、删除、自动填充写入
 * @param editableOnly 设置了 editOption 时为 true：只有 edit: true 的列可写入（CLIP-10、FILL-03）
 */
export function isWritableColumn(
  column: CellValueColumn | undefined,
  editableOnly = false,
): boolean {
  if (!isDataColumn(column))
    return false

  return !editableOnly || !!column!.edit
}

/**
 * 依次写入单元格
 * - 值没有变化（===）的单元格不写入，也不调用 canChange；
 * - canChange 返回 false 时只跳过该单元格，其余单元格照常写入；
 * - 按顺序逐个检查并写入，后面单元格的 canChange 能看到同一次操作中前面已写入的值。
 * @return 实际写入的单元格
 */
export function applyCellChanges({
  tableData,
  changes,
  canChange,
}: {
  tableData: Record<string, any>[]
  changes: CellChange[]
  canChange?: CanChangeCell
}): AppliedCellChange[] {
  const applied: AppliedCellChange[] = []

  changes.forEach((change) => {
    const row = tableData[change.rowIndex]
    const field = change.column.field as string

    if (!row || row[field] === change.value)
      return

    if (canChange && !canChange(change, row))
      return

    row[field] = change.value
    applied.push({ ...change, row })
  })

  return applied
}

export interface CellValueCallbacks {
  /** 只写入 edit: true 的列 */
  editableOnly: boolean
  /** 调用 beforeCellValueChange，返回 false 或抛出异常时跳过该单元格（INFRA-07） */
  canChange?: CanChangeCell
  /** 内部状态更新完成后，对实际写入的单元格调用 cellValueChange、afterCellValueChange */
  fireAfter: (applied: AppliedCellChange[]) => void
}

/**
 * 设置了 editOption 时的逐单元格编辑回调（D12）
 * 未设置 editOption 时不过滤可编辑列，也不调用任何编辑回调。
 */
export function getCellValueCallbacks(editOption: Record<string, any> | null | undefined): CellValueCallbacks {
  if (!editOption)
    return { editableOnly: false, fireAfter: () => {} }

  const { beforeCellValueChange, cellValueChange, afterCellValueChange } = editOption

  // 没有 beforeCellValueChange 时不必为每个单元格复制整行
  const canChange: CanChangeCell | undefined = typeof beforeCellValueChange === 'function'
    ? (change, row) => !isCancelledByCallback('beforeCellValueChange', beforeCellValueChange, {
        row: cloneDeep(row),
        column: change.column,
        changeValue: change.value,
      })
    : undefined

  return {
    editableOnly: true,
    canChange,
    fireAfter(applied) {
      applied.forEach(({ row, column, value }) => {
        // 同 afterCellValueChange，未来被移除（与单元格编辑一致）
        safeCall('cellValueChange', cellValueChange, { row, column, changeValue: value })
        safeCall('afterCellValueChange', afterCellValueChange, { row, column, changeValue: value })
      })
    },
  }
}
