import type {
  AppliedCellChange,
  CanChangeCell,
  CellChange,
} from '../../features/cell-value-change/index.js'
import type { CellSelectionRangeData, ColgroupData } from '../../ve-table-types.js'
import { applyCellChanges, isWritableColumn } from '../../features/cell-value-change/index.js'
import { getSelectionRangeIndexes, getSelectionRangeKeys } from '../selection-range/range.js'
import { decodeSpreadsheetStr, encodeToSpreadsheetStr } from './tsv-codec.js'

type RowKey = string | number

// 可写入列的判断与逐单元格写入在 features/cell-value-change 中，与自动填充共用（FILL-03）
// 表格的 colgroups（INFRA-15），同时满足 CellValueColumn
type ClipboardColumn = ColgroupData

export interface SelectionRangeIndexes {
  startColIndex: number
  endColIndex: number
  startRowIndex: number
  endRowIndex: number
}

export interface SelectionRangeKeys {
  startColKey: RowKey
  endColKey: RowKey
  startRowKey: RowKey
  endRowKey: RowKey
}

export interface ClipboardRangeResponse<T = any> {
  selectionRangeIndexes: SelectionRangeIndexes
  selectionRangeKeys: SelectionRangeKeys
  data: T
}

interface BeforeRangeParams {
  cellSelectionRangeData: CellSelectionRangeData | null | undefined
  selectionRangeData: any
  colgroups: ClipboardColumn[]
  allRowKeys: RowKey[]
}

/**
 * 读取剪贴板文本（IE 下为 window.clipboardData）
 */
export function getClipboardText(event: any): string | undefined {
  if (event?.clipboardData)
    return event.clipboardData.getData('text/plain')

  // IE browser
  const ieClipboard = (window as any).clipboardData
  if (ieClipboard)
    return ieClipboard.getData('Text')

  return undefined
}

/**
 * 写入剪贴板文本（IE 下为 window.clipboardData）
 */
function setClipboardText(event: any, text: string) {
  if (event?.clipboardData)
    event.clipboardData.setData('text/plain', text)

  // IE browser
  else if ((window as any).clipboardData)
    (window as any).clipboardData.setData('Text', text)
}

/**
 * 根据选区 key 计算复制/剪切/删除所需的 indexes 与 keys
 * 选区不存在，或任一 key 已找不到（如行被删除、列被隐藏，index 为 -1）时返回 null（CLIP-01）
 */
function getRangeResponse({
  cellSelectionRangeData,
  selectionRangeData,
  colgroups,
  allRowKeys,
}: BeforeRangeParams): ClipboardRangeResponse | null {
  if (!cellSelectionRangeData)
    return null

  const selectionRangeIndexes: SelectionRangeIndexes = getSelectionRangeIndexes({
    cellSelectionRangeData,
    colgroups,
    allRowKeys,
  })

  if (Object.values(selectionRangeIndexes).includes(-1))
    return null

  return {
    selectionRangeIndexes,
    selectionRangeKeys: getSelectionRangeKeys({ cellSelectionRangeData }),
    data: selectionRangeData,
  }
}

interface ClearRangeParams {
  tableData: Record<string, any>[]
  colgroups: ClipboardColumn[]
  selectionRangeIndexes: SelectionRangeIndexes
  /** 只清空 edit: true 的列（设置了 editOption 时，CLIP-10） */
  editableOnly?: boolean
  canChange?: CanChangeCell
}

/**
 * 清空选区内的单元格（剪切、删除共用），跳过不对应数据字段的列（CLIP-07）
 * @return 实际清空的单元格（CLIP-10）
 */
export function clearRangeValues({
  tableData,
  colgroups,
  selectionRangeIndexes,
  editableOnly = false,
  canChange,
}: ClearRangeParams): AppliedCellChange[] {
  const { endColIndex, endRowIndex, startColIndex, startRowIndex }
    = selectionRangeIndexes

  // 同一字段只写一次（多个列可能指向同一个 field）
  const columns = colgroups
    .slice(startColIndex, endColIndex + 1)
    .filter(x => isWritableColumn(x, editableOnly))
    .filter((x, index, list) => list.findIndex(y => y.field === x.field) === index)

  const changes: CellChange[] = []
  for (let rowIndex = startRowIndex; rowIndex <= endRowIndex; rowIndex++)
    columns.forEach(column => changes.push({ rowIndex, column, value: '' }))

  return applyCellChanges({ tableData, changes, canChange })
}

/**
 * @onBeforeCopy
 * @desc on before copy
 * @return {selectionRangeIndexes,selectionRangeKeys,data} | null（选区失效）
 */
export function onBeforeCopy(params: BeforeRangeParams) {
  return getRangeResponse(params)
}

/**
 * @onAfterCopy
 * @desc on after copy
 */
export function onAfterCopy({
  event,
  selectionRangeData,
}: {
  event: any
  selectionRangeData: any
}) {
  setClipboardText(event, encodeToSpreadsheetStr(selectionRangeData))
}

/**
 * @onBeforePaste
 * @desc on before paste
 * @return {selectionRangeIndexes,selectionRangeKeys,data} | null
 *   剪贴板没有文本（如图片、文件，CLIP-02）或选区失效（CLIP-01）时返回 null
 */
export function onBeforePaste({
  event,
  cellSelectionRangeData,
  colgroups,
  allRowKeys,
  editableOnly = false,
}: {
  event: any
  cellSelectionRangeData: CellSelectionRangeData | null | undefined
  colgroups: ClipboardColumn[]
  allRowKeys: RowKey[]
  /** 设置了 editOption 时为 true：不可编辑的列同样跳过（CLIP-10） */
  editableOnly?: boolean
  [key: string]: any
}): ClipboardRangeResponse<Record<string, string>[]> | null {
  const pastedData = getClipboardText(event)

  // 非文本内容（图片、文件）时 getData 返回空字符串，不能当作“粘贴空值”
  if (typeof pastedData !== 'string' || !pastedData)
    return null

  if (!cellSelectionRangeData)
    return null

  // 粘贴只以选区左上角为起点
  const startColIndex = colgroups.findIndex(
    x => x.key === cellSelectionRangeData.leftColKey,
  )
  const startRowIndex = allRowKeys.indexOf(cellSelectionRangeData.topRowKey)

  if (startColIndex === -1 || startRowIndex === -1)
    return null

  const decodePasteData = decodeSpreadsheetStr(pastedData)

  if (!decodePasteData.length)
    return null

  // 列数取最长的一行（CLIP-05）
  // （不用 Math.max(...rows)，避免超大粘贴时参数过多）
  const pasteColCount = decodePasteData.reduce(
    (max, row) => Math.max(max, row.length),
    0,
  )

  const endColIndex = Math.min(
    startColIndex + pasteColCount - 1,
    colgroups.length - 1,
  )
  const endRowIndex = Math.min(
    startRowIndex + decodePasteData.length - 1,
    allRowKeys.length - 1,
  )

  // 不对应数据字段（CLIP-07）或不可编辑（CLIP-10）的列记为 null：
  // 粘贴时跳过该位置的值，其余列保持原位
  const sourceFieldNames = colgroups
    .slice(startColIndex, endColIndex + 1)
    .map(x => (isWritableColumn(x, editableOnly) ? (x.field as string) : null))

  const data = decodePasteData
    .slice(0, endRowIndex - startRowIndex + 1)
    .map((rowData) => {
      const newRow: Record<string, string> = {}

      rowData.forEach((cellData, cellIndex) => {
        const fieldName = sourceFieldNames[cellIndex]
        if (cellIndex <= endColIndex - startColIndex && fieldName !== null)
          newRow[fieldName] = cellData
      })
      return newRow
    })

  return {
    selectionRangeIndexes: {
      startColIndex,
      endColIndex,
      startRowIndex,
      endRowIndex,
    },
    selectionRangeKeys: {
      startColKey: colgroups[startColIndex].key,
      endColKey: colgroups[endColIndex].key,
      startRowKey: allRowKeys[startRowIndex],
      endRowKey: allRowKeys[endRowIndex],
    },
    data,
  }
}

/**
 * @onAfterPaste
 * @desc on after paste
 * 按 beforePasteResponse.data 写入（beforePaste 中对 data 的修改同样生效），
 * 字段按选区内的列顺序对应到列，用于逐单元格回调（CLIP-10）
 * @return 实际写入的单元格
 */
export function onAfterPaste({
  tableData,
  colgroups,
  beforePasteResponse,
  canChange,
}: {
  tableData: Record<string, any>[]
  colgroups: ClipboardColumn[]
  beforePasteResponse: ClipboardRangeResponse<Record<string, string>[]>
  canChange?: CanChangeCell
}): AppliedCellChange[] {
  const { data: pasteData, selectionRangeIndexes } = beforePasteResponse
  const { startColIndex, endColIndex, startRowIndex } = selectionRangeIndexes

  const rangeColumns = colgroups.slice(startColIndex, endColIndex + 1)
  const changes: CellChange[] = []

  pasteData.forEach((rowData, index) => {
    Object.keys(rowData).forEach((field) => {
      // 优先选区内、可编辑的列；字段不在选区的列中（如 beforePaste 中新增的字段）时
      // 仍照常写入，回调中的 column 为找到的同字段列，找不到时为 { key: field, field }
      const candidates = [...rangeColumns, ...colgroups].filter(x => x.field === field)
      const column = candidates.find(x => x.edit) || candidates[0] || { key: field, field }
      changes.push({ rowIndex: startRowIndex + index, column, value: rowData[field] })
    })
  })

  return applyCellChanges({ tableData, changes, canChange })
}

/**
 * @onBeforeCut
 * @desc on before cut
 * @return {selectionRangeIndexes,selectionRangeKeys,data} | null（选区失效）
 */
export function onBeforeCut(params: BeforeRangeParams) {
  return getRangeResponse(params)
}

/**
 * @onAfterCut
 * @desc on after cut
 */
export function onAfterCut({
  event,
  selectionRangeData,
  ...clearParams
}: ClearRangeParams & {
  event: any
  selectionRangeData: any
}): AppliedCellChange[] {
  const spreadsheetStr = encodeToSpreadsheetStr(selectionRangeData)

  // 移除指定的表格数据（剪贴板仍写入整个选区，包括被跳过的单元格）
  const applied = clearRangeValues(clearParams)

  setClipboardText(event, spreadsheetStr)

  return applied
}

/**
 * @onBeforeDelete
 * @desc on before delete
 * @return {selectionRangeIndexes,selectionRangeKeys,data} | null（选区失效）
 */
export function onBeforeDelete(params: BeforeRangeParams) {
  return getRangeResponse(params)
}

/**
 * @onAfterDelete
 * @desc on after delete
 */
export function onAfterDelete(params: ClearRangeParams): AppliedCellChange[] {
  // 移除指定的表格数据
  return clearRangeValues(params)
}
