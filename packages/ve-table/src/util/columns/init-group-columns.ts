/**
 * 列配置树（MOD-03）：生成分组表头与 colgroups，按 key 递归移除列
 */
import { isEmptyArray, isEmptyValue } from '@vue3-easytable/common/utils'

/**
 * @recursiveRemoveColumnByKey
 * @desc recursive remove column key
 * @param {object} columns - deep clone column
 * @param {any} key - column key
 */
export function recursiveRemoveColumnByKey(columns, key: string) {
  return columns.filter((item) => {
    if ('children' in item)
      item.children = recursiveRemoveColumnByKey(item.children, key)

    return item.key !== key
  })
}

/**
 * @initGroupColumns
 * @desc  int group columns
 * @param {Array} cloneColumns - clone columns
 * @return {
   isGroupHeader,
   colgroups,
   groupColumns
}
 */
export function initGroupColumns(cloneColumns) {
  const colgroups = []
  const groupColumns = []

  // set column level
  let maxLevel = 1
  const setColumnLevel = (column, parent) => {
    if (parent) {
      column._level = parent._level + 1
      if (maxLevel < column._level)
        maxLevel = column._level
    }
    if (column.children) {
      column.children.forEach((item) => {
        item.fixed = column.fixed
        setColumnLevel(item, column)
      })
    }
  }
  cloneColumns.forEach((column) => {
    column._level = 1
    setColumnLevel(column)
  })

  // set colspan and rowspan and keys
  const setColspanAndRowspanAndKeys = (column) => {
    if (column.children) {
      let keys = ''
      let colspan = 0
      column.children.forEach((item) => {
        setColspanAndRowspanAndKeys(item)

        colspan += item._colspan
        keys += item._keys.endsWith('|')
          ? item._keys
          : `${item._keys}|`
      })
      column._keys = keys
      column._colspan = colspan
      column._rowspan = 1
    }
    else {
      column._keys = column.key
      column._colspan = 1
      column._rowspan = maxLevel - column._level + 1
    }
  }

  cloneColumns.forEach((column) => {
    setColspanAndRowspanAndKeys(column)
  })

  // init groupColumns
  for (let i = 0; i < maxLevel; i++)
    groupColumns.push([])

  // set colgroups and groupColumns
  const setColgroupsAndGroupColumns = (column) => {
    // column has children || column key is not empty
    if (!isEmptyArray(column.children) || !isEmptyValue(column.key)) {
      // set groupColumns
      const { ...groupColumn } = column
      groupColumns[column._level - 1].push(groupColumn)

      if (column.children) {
        column.children.forEach((item) => {
          setColgroupsAndGroupColumns(item)
        })
      }
      else {
        // set colgroups
        const { ...colgroup } = column
        colgroup._realTimeWidth = colgroup.width
        colgroups.push(colgroup)
      }
    }
  }

  cloneColumns.forEach((column) => {
    setColgroupsAndGroupColumns(column)
  })

  return {
    // set is group header
    isGroupHeader: maxLevel > 1,
    // set colgroups
    colgroups,
    // set groupColumns
    groupColumns,
  }
}
