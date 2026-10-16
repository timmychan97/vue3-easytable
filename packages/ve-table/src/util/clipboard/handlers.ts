import { decodeSpreadsheetStr, encodeToSpreadsheetStr } from './tsv-codec.js'

/**
 * @onBeforeCopy
 * @desc on before copy
 * @param {Event} event
 * @return {selectionRangeIndexes,selectionRangeKeys,data}
 */
export function onBeforeCopy({
  cellSelectionRangeData,
  selectionRangeData,
  colgroups,
  allRowKeys,
}: any) { // TODO: TS
  const { leftColKey, rightColKey, topRowKey, bottomRowKey }
        = cellSelectionRangeData

  const selectionRangeIndexes = {
    startColIndex: colgroups.findIndex((x: any) => x.key === leftColKey), // TODO: TS
    endColIndex: colgroups.findIndex((x: any) => x.key === rightColKey), // TODO: TS
    startRowIndex: allRowKeys.indexOf(topRowKey),
    endRowIndex: allRowKeys.indexOf(bottomRowKey),
  }

  const selectionRangeKeys = {
    startColKey: leftColKey,
    endColKey: rightColKey,
    startRowKey: topRowKey,
    endRowKey: bottomRowKey,
  }

  const response = {
    selectionRangeIndexes,
    selectionRangeKeys,
    data: selectionRangeData,
  }

  return response
}

/**
 * @onAfterCopy
 * @desc on after copy
 * @param {Event} event
 * @return
 */
export function onAfterCopy({ event, selectionRangeData }: any) { // TODO: TS
  const spreadsheetStr = encodeToSpreadsheetStr(selectionRangeData)

  if (event.clipboardData)
    event.clipboardData.setData('text/plain', spreadsheetStr)

  // IE browser
  // eslint-disable-next-line ts/ban-ts-comment
  // @ts-expect-error
  else if (window.clipboardData)
    // eslint-disable-next-line ts/ban-ts-comment
    // @ts-expect-error
    window.clipboardData.setData('Text', spreadsheetStr)
}

/**
 * @onBeforePaste
 * @desc on before paste
 * @param {Event} event
 * @return
 */
export function onBeforePaste({
  event,
  cellSelectionRangeData,
  colgroups,
  allRowKeys,
}: any) { // TODO: TS
  let pastedData

  if (event.clipboardData)
    pastedData = event.clipboardData.getData('text/plain')

  // IE browser
  else if (window.clipboardData)
    pastedData = window.clipboardData.getData('Text')

  if (typeof pastedData !== 'string')
    return null

  const decodePasteData = decodeSpreadsheetStr(pastedData)

  const startColIndex = colgroups.findIndex(
    x => x.key === cellSelectionRangeData.leftColKey,
  )
  const endColIndex = Math.min(
    startColIndex + decodePasteData[0].length - 1,
    colgroups.length - 1,
  )
  const startRowIndex = allRowKeys.indexOf(cellSelectionRangeData.topRowKey)
  const endRowIndex = Math.min(
    startRowIndex + decodePasteData.length - 1,
    allRowKeys.length - 1,
  )

  const response = {
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
    data: [],
  }

  const sourceFieldNames = colgroups
    .slice(startColIndex, endColIndex + 1)
    .map(x => x.field)

  response.data = decodePasteData
    .slice(0, endRowIndex - startRowIndex + 1)
    .map((rowData) => {
      const newRow = {}

      rowData.forEach((cellData, cellIndex) => {
        if (cellIndex <= endColIndex - startColIndex)
          newRow[sourceFieldNames[cellIndex]] = cellData
      })
      return newRow
    })

  return response
}

/**
 * @onAfterPaste
 * @desc on after paste
 * @param {Event} event
 * @return
 */
export function onAfterPaste({ tableData, beforePasteResponse }) {
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
 * @param {Event} event
 * @return {selectionRangeIndexes,selectionRangeKeys,data}
 */
export function onBeforeCut({
  cellSelectionRangeData,
  selectionRangeData,
  colgroups,
  allRowKeys,
}) {
  const { leftColKey, rightColKey, topRowKey, bottomRowKey }
        = cellSelectionRangeData

  const selectionRangeIndexes = {
    startColIndex: colgroups.findIndex(x => x.key === leftColKey),
    endColIndex: colgroups.findIndex(x => x.key === rightColKey),
    startRowIndex: allRowKeys.indexOf(topRowKey),
    endRowIndex: allRowKeys.indexOf(bottomRowKey),
  }

  const selectionRangeKeys = {
    startColKey: leftColKey,
    endColKey: rightColKey,
    startRowKey: topRowKey,
    endRowKey: bottomRowKey,
  }

  const response = {
    selectionRangeIndexes,
    selectionRangeKeys,
    data: selectionRangeData,
  }

  return response
}

/**
 * @onAfterCut
 * @desc on after cut
 * @param {Event} event
 * @return
 */
export function onAfterCut({
  event,
  tableData,
  colgroups,
  selectionRangeData,
  selectionRangeIndexes,
}) {
  const spreadsheetStr = encodeToSpreadsheetStr(selectionRangeData)

  const { endColIndex, endRowIndex, startColIndex, startRowIndex }
        = selectionRangeIndexes

  // 移除制定的表格数据
  const fieldNames = colgroups
    .slice(startColIndex, endColIndex + 1)
    .map(x => x.field)

  tableData.forEach((rowData, rowIndex) => {
    if (rowIndex >= startRowIndex && rowIndex <= endRowIndex) {
      fieldNames.forEach((fieldName) => {
        rowData[fieldName] = ''
      })
    }
  })

  if (event.clipboardData)
    event.clipboardData.setData('text/plain', spreadsheetStr)

  // IE browser
  else if (window.clipboardData)
    window.clipboardData.setData('Text', spreadsheetStr)
}

/**
 * @onBeforeDelete
 * @desc on before delete
 * @param {Event} event
 * @return {selectionRangeIndexes,selectionRangeKeys,data}
 */
export function onBeforeDelete({
  cellSelectionRangeData,
  selectionRangeData,
  colgroups,
  allRowKeys,
}) {
  const { leftColKey, rightColKey, topRowKey, bottomRowKey }
        = cellSelectionRangeData

  const selectionRangeIndexes = {
    startColIndex: colgroups.findIndex(x => x.key === leftColKey),
    endColIndex: colgroups.findIndex(x => x.key === rightColKey),
    startRowIndex: allRowKeys.indexOf(topRowKey),
    endRowIndex: allRowKeys.indexOf(bottomRowKey),
  }

  const selectionRangeKeys = {
    startColKey: leftColKey,
    endColKey: rightColKey,
    startRowKey: topRowKey,
    endRowKey: bottomRowKey,
  }

  const response = {
    selectionRangeIndexes,
    selectionRangeKeys,
    data: selectionRangeData,
  }

  return response
}

/**
 * @onAfterDelete
 * @desc on after delete
 * @param {Event} event
 * @return
 */
export function onAfterDelete({ tableData, colgroups, selectionRangeIndexes }) {
  const { endColIndex, endRowIndex, startColIndex, startRowIndex }
        = selectionRangeIndexes

  // 移除制定的表格数据
  const fieldNames = colgroups
    .slice(startColIndex, endColIndex + 1)
    .map(x => x.field)

  tableData.forEach((rowData, rowIndex) => {
    if (rowIndex >= startRowIndex && rowIndex <= endRowIndex) {
      fieldNames.forEach((fieldName) => {
        rowData[fieldName] = ''
      })
    }
  })
}
