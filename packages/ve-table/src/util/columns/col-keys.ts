/**
 * 列 key 相关的查询（MOD-03）：按 key 查列、范围内的列 key、按固定类型筛选、最左 / 最右、前后列
 */
import { isEmptyArray, isEmptyValue } from '@vue3-easytable/common/utils'

/**
 * @getColumnByColkey
 * @desc  get column by col key
 * @param {string} colKey - column key
 */
export function getColumnByColkey(colKey: string, colgroups) {
  if (colKey)
    return colgroups.find(x => x.key === colKey)

  return null
}

/**
 * @isLastColumnByColKey
 * @desc is last column by column key
 * @param {string} colKey - column key
 */
export function isLastColumnByColKey(colKey: string, colgroups) {
  if (!isEmptyValue(colKey) && !isEmptyArray(colgroups))
    return colgroups[colgroups.length - 1].key === colKey

  return false
}

/**
 * @isOperationColumn
 * @desc is operation column
 * @param {string} colKey - column key
 * @param {arrat<object>} colgroups - column key
 */
export function isOperationColumn(colKey: string, colgroups) {
  if (!isEmptyValue(colKey) && !isEmptyArray(colgroups)) {
    const firstCol = colgroups[0]
    if (firstCol.key === colKey && firstCol.operationColumn)
      return true
  }
  return false
}

/**
 * @getColKeysByHeaderColumn
 * @desc
 * @return Array<colKeys>
 */
export function getColKeysByHeaderColumn({ headerColumnItem }) {
  let result = null

  const { _keys } = headerColumnItem

  result = _keys.split('|')
  if (result.length > 1)
    result = result.slice(0, result.length - 1)

  return result
}

/**
 * @getColKeysByRangeColKeys
 * @desc  get col keys by range col keys
 * @return Array<colKeys>
 */
export function getColKeysByRangeColKeys({ colKey1, colKey2, colgroups }) {
  let result = null

  const index1 = colgroups.findIndex(x => x.key === colKey1)
  const index2 = colgroups.findIndex(x => x.key === colKey2)

  if (index1 !== -1 && index2 !== -1) {
    const beginIndex = index1 < index2 ? index1 : index2
    const endIndex = index1 < index2 ? index2 : index1
    result = colgroups.slice(beginIndex, endIndex + 1).map(x => x.key)
  }

  return result
}

/**
 * @getColKeysByFixedTypeWithinColKeys
 * @desc  get col keys by fixed type
 * @return {Array} colKeys
 */
export function getColKeysByFixedTypeWithinColKeys({
  colKeys,
  fixedType,
  colgroups,
}) {
  let result = null

  if (Array.isArray(colKeys)) {
    result = colgroups
      .filter(x => colKeys.includes(x.key) && x.fixed === fixedType)
      .map(x => x.key)
  }

  return result
}

/**
 * @getColKeysByFixedType
 * @desc get col keys by fixed type
 * @return colKey
 */
export function getColKeysByFixedType({
  fixedType,
  colgroups,
  isExcludeOperationColumn,
}) {
  let result = null

  result = colgroups
    .filter((x) => {
      const condition = x.fixed === fixedType

      // 排除操作列
      if (isExcludeOperationColumn)
        return condition && !x.operationColumn

      return condition
    })
    .map(x => x.key)
  return result
}

/**
 * @isExistFixedColKey
 * @desc is exist given fixed col key
 * @return bool
 */
export function isExistGivenFixedColKey({ fixedType, colKeys, colgroups }) {
  let result = false
  if (Array.isArray(colKeys)) {
    result = colgroups.some((x) => {
      return colKeys.includes(x.key) && x.fixed === fixedType
    })
  }
  return result
}

/**
 * @isExistNotFixedColKey
 * @desc is exist not fixed col key
 * @return bool
 */
export function isExistNotFixedColKey({ colKeys, colgroups }) {
  let result = false
  if (Array.isArray(colKeys)) {
    result = colgroups.filter(
      x => !x.fixed && colKeys.includes(x.key),
    ).length
  }
  return result
}

/**
 * @getLeftmostOrRightmostColKey
 * @desc get leftmost or rightmost column key
 * @return colKey
 */
function getLeftmostOrRightmostColKey({ type, colgroups, colKeys }) {
  let result = null

  if (Array.isArray(colKeys) && colKeys.length) {
    let mostObj = {
      colKey: null,
      colIndex: null,
    }
    colKeys.forEach((colKey) => {
      const colIndex = colgroups.findIndex(x => x.key === colKey)

      if (colIndex === -1) {
        console.warn(
          `getLeftmostOrRightmostColKey error:: can't find colKey:${colKey}`,
        )
        return false
      }

      if (isEmptyValue(mostObj.colKey)) {
        mostObj = {
          colKey,
          colIndex,
        }
      }
      else {
        if (type === 'leftmost') {
          if (colIndex < mostObj.colIndex) {
            mostObj = {
              colKey,
              colIndex,
            }
          }
        }
        else if (type === 'rightmost') {
          if (colIndex > mostObj.colIndex) {
            mostObj = {
              colKey,
              colIndex,
            }
          }
        }
      }
    })

    result = mostObj.colKey
  }

  return result
}

/**
 * @getLeftmostColKey
 * @desc get leftmost column key
 * @return colKey
 */
export function getLeftmostColKey({ colgroups, colKeys }) {
  return getLeftmostOrRightmostColKey({
    type: 'leftmost',
    colgroups,
    colKeys,
  })
}

/**
 * @getRightmostColKey
 * @desc get rightmost column key
 * @return colKey
 */
export function getRightmostColKey({ colgroups, colKeys }) {
  return getLeftmostOrRightmostColKey({
    type: 'rightmost',
    colgroups,
    colKeys,
  })
}

/**
 * @getPreviewColKey
 * @desc get preview column key
 * @return colKey
 */
export function getPreviewColKey({ colgroups, currentColKey }) {
  let result = null

  if (!isEmptyValue(currentColKey)) {
    const index = colgroups.findIndex(x => x.key === currentColKey)
    if (index === 0)
      result = currentColKey

    else if (index > 0)
      result = colgroups[index - 1].key
  }
  return result
}

/**
 * @getNextColKey
 * @desc get next column key
 * @return colKey
 */
export function getNextColKey({ colgroups, currentColKey }) {
  let result = null

  if (!isEmptyValue(currentColKey)) {
    const index = colgroups.findIndex(x => x.key === currentColKey)
    // 未知的列 key 返回 null（与 getPreviewColKey 一致）
    if (index < 0)
      return result

    if (index === colgroups.length - 1)
      result = currentColKey

    else if (index < colgroups.length - 1)
      result = colgroups[index + 1].key
  }
  return result
}
