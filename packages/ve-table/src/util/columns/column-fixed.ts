/**
 * 固定列（MOD-03）：固定列的偏移宽度，右键菜单（取消）固定列，隐藏 / 显示列后恢复列状态
 */
import {
  isEmptyArray,
  isEmptyValue,
  isNumber,
} from '@vue3-easytable/common/utils'
import { COLUMN_FIXED_TYPE } from '../constant'
import { getColKeysByHeaderColumn, isOperationColumn } from './col-keys'

/**
 * @getFixedTotalWidthByColumnKey
 * @desc  get fixed total width by column key
 */
export function getFixedTotalWidthByColumnKey({ colgroups, colKey, fixed }) {
  const currentIndex = colgroups.findIndex(x => x.key === colKey)

  let result = 0

  if (fixed === COLUMN_FIXED_TYPE.LEFT) {
    // 只计算左列固定的
    result = colgroups.reduce((total, currentVal, index) => {
      return index < currentIndex
        && currentVal.fixed === COLUMN_FIXED_TYPE.LEFT
        ? currentVal._realTimeWidth + total
        : total
    }, 0)
  }
  else if (fixed === COLUMN_FIXED_TYPE.RIGHT) {
    // 只计算右列固定的
    result = colgroups.reduce((total, currentVal, index) => {
      return index > currentIndex
        && currentVal.fixed === COLUMN_FIXED_TYPE.RIGHT
        ? currentVal._realTimeWidth + total
        : total
    }, 0)
  }

  return result
}

/**
 * @getNotFixedTotalWidthByColumnKey
 * @desc  get not fixed total width by column key
 */
export function getNotFixedTotalWidthByColumnKey({ colgroups, colKey, fixed }) {
  const currentIndex = colgroups.findIndex(x => x.key === colKey)

  let result = 0

  if (fixed === COLUMN_FIXED_TYPE.LEFT) {
    // 只计算左侧非固定列
    result = colgroups.reduce((total, currentVal, index) => {
      return index < currentIndex && !currentVal.fixed
        ? currentVal._realTimeWidth + total
        : total
    }, 0)
  }
  else if (fixed === COLUMN_FIXED_TYPE.RIGHT) {
    // 只计算右侧非固定列
    result = colgroups.reduce((total, currentVal, index) => {
      return index > currentIndex && !currentVal.fixed
        ? currentVal._realTimeWidth + total
        : total
    }, 0)
  }

  return result
}

/**
 * @getTotalWidthByColKeys
 * @desc get total width by collumn keys
 * @return {number} width
 */
export function getTotalWidthByColKeys({ colKeys, colgroups }) {
  const result = colgroups.reduce((total, currentVal, _index) => {
    return colKeys.includes(currentVal.key)
      ? currentVal._realTimeWidth + total
      : total
  }, 0)

  return result
}

/***
 * @setColumnFixed
 * @desc set column fixed
 * @param {array<object>} cloneColumns
 * @param {object} cellSelectionRangeData
 * @param {string} fixedType COLUMN_FIXED_TYPE
 * @param {array<object>} colgroups
 * @param {bool} enableColumnResize
 * @return cloneColumns
 */
export function setColumnFixed({
  cloneColumns,
  cellSelectionRangeData,
  fixedType,
  colgroups,
  enableColumnResize,
}) {
  let result = cloneColumns

  const { leftColKey, rightColKey } = cellSelectionRangeData

  let colKey

  if (COLUMN_FIXED_TYPE.LEFT === fixedType)
    colKey = rightColKey

  else if (COLUMN_FIXED_TYPE.RIGHT === fixedType)
    colKey = leftColKey

  // find col index from cloneColumns
  const fixedColIndex = cloneColumns.findIndex((colItem) => {
    if (colItem._level === 1 && colItem.key === colKey) {
      return true
    }
    else {
      const colKeys = getColKeysByHeaderColumn({
        headerColumnItem: colItem,
      })
      if (colKeys.includes(colKey))
        return true
    }
    return false
  })

  if (fixedColIndex > -1) {
    // 不允许改变原有固定列方向。原样返回列配置（调用方会把返回值赋给 cloneColumns）
    const oldFixedType = cloneColumns[fixedColIndex].fixed
    if (!isEmptyValue(oldFixedType) && oldFixedType !== fixedType)
      return cloneColumns

    result = cloneColumns.map((colItem, index) => {
      // 清除所有固定
      if (colItem.fixed === fixedType)
        colItem.fixed = ''

      // 允许列自适应 && 不是多列表头
      if (
        enableColumnResize
        && !(Array.isArray(colItem.children) && colItem.children.length)
      ) {
        const _colItem = colgroups.find(
          x => x.key === colItem.key && !isEmptyValue(x.key),
        )
        if (_colItem)
          colItem.width = _colItem._columnResizeWidth
      }

      if (COLUMN_FIXED_TYPE.LEFT === fixedType) {
        // 不允许左冻结最后一列
        if (index <= fixedColIndex && index < cloneColumns.length - 1)
          colItem.fixed = fixedType
      }
      else {
        // 不允许右冻结第一列
        if (index >= fixedColIndex && index > 0)
          colItem.fixed = fixedType
      }
      return colItem
    })
  }

  return result
}

/***
 * @restoreColumnsState
 * @desc 隐藏/显示列会从 props.columns 重新生成 cloneColumns，这里把用户交互产生的列状态恢复回去（COL-03）：
 *   1. 右键菜单（取消）固定列后的 fixed（顶层列；分组表头的子列在 initGroupColumns 中继承父级）
 *   2. 拖动调整后的列宽 colgroups[]._columnResizeWidth，写回叶子列的 width（与 setColumnFixed 的做法一致）
 * 本次新显示的列（之前不在 prevCloneColumns 中）沿用列配置的 fixed，但要保证固定列连续：
 *   位于左固定区域内则左固定，位于右固定区域内则右固定，会把固定区域断开时取消固定
 * @param {array<object>} cloneColumns 新生成的 cloneColumns（会被直接修改）
 * @param {array<object>} prevCloneColumns 当前的 cloneColumns
 * @param {array<object>} colgroups 当前的 colgroups
 * @param {bool} enableColumnResize
 * @return cloneColumns
 */
export function restoreColumnsState({
  cloneColumns,
  prevCloneColumns,
  colgroups,
  enableColumnResize,
}) {
  // 列的标识：有 key 用 key；没有 key 的分组表头用其叶子列的 key
  const getLeafKeys = (column) => {
    if (!isEmptyArray(column.children))
      return column.children.flatMap(getLeafKeys)
    return isEmptyValue(column.key) ? [] : [column.key]
  }
  const getIdentityKeys = column =>
    isEmptyValue(column.key) ? getLeafKeys(column) : [column.key]

  const prevColumns = cloneColumns.map((column) => {
    const keys = getIdentityKeys(column)
    if (!keys.length)
      return undefined
    return prevCloneColumns.find(prev =>
      getIdentityKeys(prev).some(key => keys.includes(key)),
    )
  })

  const isLeft = fixed => fixed === COLUMN_FIXED_TYPE.LEFT
  const isRight = fixed => fixed === COLUMN_FIXED_TYPE.RIGHT

  // 已存在的列：沿用之前的固定状态
  cloneColumns.forEach((column, index) => {
    const prev = prevColumns[index]
    if (prev)
      column.fixed = prev.fixed
  })

  // 新显示的列：按相邻列保证固定列连续
  cloneColumns.forEach((column, index) => {
    if (prevColumns[index] || column.operationColumn)
      return

    const prevColumn = index > 0 ? cloneColumns[index - 1] : undefined
    const nextIndex = prevColumns.findIndex((x, i) => i > index && x)
    const nextColumn = nextIndex > -1 ? cloneColumns[nextIndex] : undefined

    if (nextColumn && isLeft(nextColumn.fixed)) {
      column.fixed = COLUMN_FIXED_TYPE.LEFT
    }
    else if (prevColumn && isRight(prevColumn.fixed)) {
      column.fixed = COLUMN_FIXED_TYPE.RIGHT
    }
    else if (isLeft(column.fixed)) {
      if (prevColumn && !isLeft(prevColumn.fixed))
        column.fixed = ''
    }
    else if (isRight(column.fixed)) {
      if (nextColumn && !isRight(nextColumn.fixed))
        column.fixed = ''
    }
  })

  // 拖动调整后的列宽
  if (enableColumnResize) {
    const restoreWidth = (column) => {
      if (!isEmptyArray(column.children)) {
        column.children.forEach(restoreWidth)
        return
      }
      const colgroup = colgroups.find(
        x => !isEmptyValue(x.key) && x.key === column.key,
      )
      if (colgroup && isNumber(colgroup._columnResizeWidth))
        column.width = colgroup._columnResizeWidth
    }
    cloneColumns.forEach(restoreWidth)
  }

  return cloneColumns
}

/***
 * @cancelColumnFixed
 * @desc cancel column fixed
 * @param {array<object>} cloneColumns
 * @param {array<object>} colgroups
 * @param {string} fixedType COLUMN_FIXED_TYPE
 * @param {bool} enableColumnResize
 * @return cloneColumns
 */
export function cancelColumnFixed({
  cloneColumns,
  colgroups,
  fixedType,
  enableColumnResize,
}) {
  return cloneColumns.map((colItem) => {
    // 允许列自适应 && 不是多列表头
    if (
      enableColumnResize
      && !(Array.isArray(colItem.children) && colItem.children.length)
    ) {
      const _colItem = colgroups.find(
        x => x.key === colItem.key && !isEmptyValue(x.key),
      )
      if (_colItem)
        colItem.width = _colItem._columnResizeWidth
    }

    if (COLUMN_FIXED_TYPE.LEFT === fixedType) {
      if (
        colItem.fixed === fixedType
        && !isOperationColumn(colItem.key, colgroups)
      ) {
        colItem.fixed = ''
      }
    }
    else {
      if (colItem.fixed === fixedType)
        colItem.fixed = ''
    }
    return colItem
  })
}
