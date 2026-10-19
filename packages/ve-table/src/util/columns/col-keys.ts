/**
 * 列 key 相关的查询（MOD-03）：按 key 查列、范围内的列 key、按固定类型筛选、最左 / 最右、前后列
 */
import type { ColgroupsParam, ColKey } from '../core'
import { isEmptyArray, isEmptyValue } from '@vue3-easytable/common/utils'

/**
 * @getColumnByColkey
 * @desc  get column by col key
 * @param {string} colKey - column key
 */
export function getColumnByColkey(colKey: ColKey, colgroups: ColgroupsParam) {
  // 0 也是有效的列 key（SEL-14）
  if (!isEmptyValue(colKey))
    return colgroups.find(x => x.key === colKey)

  return null
}

/**
 * @isLastColumnByColKey
 * @desc is last column by column key
 * @param {string} colKey - column key
 */
export function isLastColumnByColKey(colKey: ColKey, colgroups: ColgroupsParam) {
  if (!isEmptyValue(colKey) && !isEmptyArray(colgroups))
    return colgroups[colgroups.length - 1].key === colKey

  return false
}

/**
 * @isOperationColumn
 * @desc is operation column
 * @param {string} colKey - column key（分组表头列可以没有 key，INFRA-17：ColumnOption.key 可选）
 * @param {arrat<object>} colgroups - column key
 */
export function isOperationColumn(colKey: ColKey | null | undefined, colgroups: ColgroupsParam) {
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
// headerColumnItem 可以是分组表头列或列配置（ColumnOption），只读取 _keys
export function getColKeysByHeaderColumn({ headerColumnItem }: { headerColumnItem: { _keys?: unknown, [key: string]: unknown } }): string[] {
  let result: string[]

  const { _keys } = headerColumnItem

  // 数字 key 的 _keys 也按字符串处理（SEL-14）
  result = String(_keys).split('|')
  if (result.length > 1)
    result = result.slice(0, result.length - 1)

  return result
}

/**
 * @getColKeysByRangeColKeys
 * @desc  get col keys by range col keys
 * @return Array<colKeys>
 */
export function getColKeysByRangeColKeys({ colKey1, colKey2, colgroups }: {
  colKey1: ColKey
  colKey2: ColKey
  colgroups: ColgroupsParam
}): ColKey[] | null {
  let result: ColKey[] | null = null

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
}: {
  colKeys: ColKey[] | null | undefined
  fixedType: string
  colgroups: ColgroupsParam
}): ColKey[] | null {
  let result: ColKey[] | null = null

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
}: {
  fixedType: string
  colgroups: ColgroupsParam
  isExcludeOperationColumn?: boolean
}): ColKey[] {
  const result: ColKey[] = colgroups
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
export function isExistGivenFixedColKey({ fixedType, colKeys, colgroups }: {
  fixedType: string
  colKeys: ColKey[] | null | undefined
  colgroups: ColgroupsParam
}) {
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
export function isExistNotFixedColKey({ colKeys, colgroups }: {
  colKeys: ColKey[] | null | undefined
  colgroups: ColgroupsParam
}) {
  let result = false
  if (Array.isArray(colKeys)) {
    result = colgroups.filter(
      x => !x.fixed && colKeys.includes(x.key),
    ).length > 0
  }
  return result
}

/**
 * @getLeftmostOrRightmostColKey
 * @desc get leftmost or rightmost column key
 * @return colKey
 */
function getLeftmostOrRightmostColKey({ type, colgroups, colKeys }: {
  type: 'leftmost' | 'rightmost'
  colgroups: ColgroupsParam
  colKeys: ColKey[] | null | undefined
}): ColKey | null {
  let result: ColKey | null = null

  if (Array.isArray(colKeys) && colKeys.length) {
    // colIndex 只在 colKey 有值之后才会被比较
    let mostObj: { colKey: ColKey | null, colIndex: number } = {
      colKey: null,
      colIndex: -1,
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
export function getLeftmostColKey({ colgroups, colKeys }: {
  colgroups: ColgroupsParam
  colKeys: ColKey[] | null | undefined
}) {
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
export function getRightmostColKey({ colgroups, colKeys }: {
  colgroups: ColgroupsParam
  colKeys: ColKey[] | null | undefined
}) {
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
export function getPreviewColKey({ colgroups, currentColKey }: {
  colgroups: ColgroupsParam
  currentColKey: ColKey | null | undefined
}): ColKey | null {
  let result: ColKey | null = null

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
export function getNextColKey({ colgroups, currentColKey }: {
  colgroups: ColgroupsParam
  currentColKey: ColKey | null | undefined
}): ColKey | null {
  let result: ColKey | null = null

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
