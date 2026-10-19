import type { CellSelectionRangeData } from '../../ve-table-types.js'
import { getSelectionRangeIndexes, getSelectionRangeKeys } from '../selection-range/range.js'
import { decodeSpreadsheetStr, encodeToSpreadsheetStr } from './tsv-codec.js'

type RowKey = string | number

interface ClipboardColumn {
  key: RowKey
  field?: string
  operationColumn?: boolean
  [key: string]: any
}

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
 * 列是否对应行数据中的一个字段，可以被粘贴、剪切、删除写入（CLIP-07）
 * 操作列（即使配置了 field）和没有 field 的列只用于展示，写入会在用户的行数据里
 * 生成 "undefined"、"index" 之类的多余属性，因此跳过。
 * 复制时这些列仍按位置输出空字符串（或其值），保证粘贴回来时列对齐。
 */
export function isClipboardWritableColumn(column: ClipboardColumn | undefined): boolean {
  if (!column || column.operationColumn)
    return false

  const { field } = column
  return field !== undefined && field !== null && field !== ''
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

/**
 * 清空选区内的单元格（剪切、删除共用），跳过不对应数据字段的列（CLIP-07）
 */
export function clearRangeValues({
  tableData,
  colgroups,
  selectionRangeIndexes,
}: {
  tableData: Record<string, any>[]
  colgroups: ClipboardColumn[]
  selectionRangeIndexes: SelectionRangeIndexes
}) {
  const { endColIndex, endRowIndex, startColIndex, startRowIndex }
    = selectionRangeIndexes

  const fieldNames = colgroups
    .slice(startColIndex, endColIndex + 1)
    .filter(isClipboardWritableColumn)
    .map(x => x.field as string)

  tableData.forEach((rowData, rowIndex) => {
    if (rowIndex >= startRowIndex && rowIndex <= endRowIndex) {
      fieldNames.forEach((fieldName) => {
        rowData[fieldName] = ''
      })
    }
  })
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
}: {
  event: any
  cellSelectionRangeData: CellSelectionRangeData | null | undefined
  colgroups: ClipboardColumn[]
  allRowKeys: RowKey[]
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

  // 不对应数据字段的列记为 null：粘贴时跳过该位置的值，其余列保持原位（CLIP-07）
  const sourceFieldNames = colgroups
    .slice(startColIndex, endColIndex + 1)
    .map(x => (isClipboardWritableColumn(x) ? (x.field as string) : null))

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
 */
export function onAfterPaste({
  tableData,
  beforePasteResponse,
}: {
  tableData: Record<string, any>[]
  beforePasteResponse: ClipboardRangeResponse<Record<string, string>[]>
}) {
  const { data: pasteData, selectionRangeIndexes } = beforePasteResponse

  pasteData.forEach((rowData, rowIndex) => {
    Object.assign(
      tableData[selectionRangeIndexes.startRowIndex + rowIndex],
      rowData,
    )
  })
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
  tableData,
  colgroups,
  selectionRangeData,
  selectionRangeIndexes,
}: {
  event: any
  tableData: Record<string, any>[]
  colgroups: ClipboardColumn[]
  selectionRangeData: any
  selectionRangeIndexes: SelectionRangeIndexes
}) {
  const spreadsheetStr = encodeToSpreadsheetStr(selectionRangeData)

  // 移除指定的表格数据
  clearRangeValues({ tableData, colgroups, selectionRangeIndexes })

  setClipboardText(event, spreadsheetStr)
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
export function onAfterDelete({
  tableData,
  colgroups,
  selectionRangeIndexes,
}: {
  tableData: Record<string, any>[]
  colgroups: ClipboardColumn[]
  selectionRangeIndexes: SelectionRangeIndexes
}) {
  // 移除指定的表格数据
  clearRangeValues({ tableData, colgroups, selectionRangeIndexes })
}
