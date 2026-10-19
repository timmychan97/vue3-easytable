/**
 * 右键菜单（MOD-03）：表头 / 表体菜单项的生成，插入行的空数据，菜单面板点击判断
 */
import type {
  BodyIndicatorRowKeys,
  CellSelectionRangeData,
  HeaderIndicatorColKeys,
} from '../../ve-table-types'
import type { ColgroupsParam, RowKeysParam } from '../core'
import { isEmptyValue, isFunction } from '@vue3-easytable/common/utils'
import { getRandomId } from '@vue3-easytable/common/utils/random'
import { getColKeysByFixedType, isOperationColumn } from '../columns/col-keys'
import { COLUMN_FIXED_TYPE, CONTEXTMENU_NODE_TYPES } from '../constant'
import { getSelectionRangeIndexes, getSelectionRangeKeys } from '../selection-range/range'

// 菜单节点：内置节点由下面的 collection 生成，其余为用户传入的节点（原样保留）
interface ContextmenuNode {
  type?: string
  label?: any
  disabled?: boolean
  [key: string]: any
}

// contextmenuHeaderOption / contextmenuBodyOption
interface ContextmenuOptionConfig {
  contextmenus: ContextmenuNode[]
  beforeShow?: (params: Record<string, any>) => void
}

type Translate = (key: string) => any

// get header contextmenu option collection
export function getHeaderContextmenuOptionCollection(t: Translate): ContextmenuNode[] {
  return [
    {
      type: CONTEXTMENU_NODE_TYPES.SEPARATOR,
    },
    {
      label: t('剪切'),
      type: CONTEXTMENU_NODE_TYPES.CUT,
    },
    {
      label: t('复制'),
      type: CONTEXTMENU_NODE_TYPES.COPY,
    },
    // {
    //     label: t("paste"),
    //     type: CONTEXTMENU_NODE_TYPES.PASTE,
    // },
    // 删除列（REMOVE_COLUMN）、隐藏列（HIDE_COLUMN）尚未实现，其类型常量也已注释，
    // 放在这里会得到 type: undefined，误匹配用户未写 type 的菜单项（MENU-01）
    {
      label: t('清空列'),
      type: CONTEXTMENU_NODE_TYPES.EMPTY_COLUMN,
    },
    {
      label: t('左列冻结'),
      type: CONTEXTMENU_NODE_TYPES.LEFT_FIXED_COLUMN_TO,
    },
    {
      label: t('取消左列冻结'),
      type: CONTEXTMENU_NODE_TYPES.CANCEL_LEFT_FIXED_COLUMN_TO,
    },
    {
      label: t('右列冻结'),
      type: CONTEXTMENU_NODE_TYPES.RIGHT_FIXED_COLUMN_TO,
    },
    {
      label: t('取消右列冻结'),
      type: CONTEXTMENU_NODE_TYPES.CANCEL_RIGHT_FIXED_COLUMN_TO,
    },
  ]
}

// get body contextmenu option collection
export function getBodyContextmenuOptionCollection(t: Translate): ContextmenuNode[] {
  return [
    {
      type: CONTEXTMENU_NODE_TYPES.SEPARATOR,
    },
    {
      label: t('剪切'),
      type: CONTEXTMENU_NODE_TYPES.CUT,
    },
    {
      label: t('复制'),
      type: CONTEXTMENU_NODE_TYPES.COPY,
    },
    // {
    //     label: t("paste"),
    //     type: CONTEXTMENU_NODE_TYPES.PASTE,
    // },
    {
      label: t('上方插入行'),
      type: CONTEXTMENU_NODE_TYPES.INSERT_ROW_ABOVE,
    },
    {
      label: t('下方插入行'),
      type: CONTEXTMENU_NODE_TYPES.INSERT_ROW_BELOW,
    },
    {
      label: t('删除行'),
      type: CONTEXTMENU_NODE_TYPES.REMOVE_ROW,
    },
    {
      label: t('清空行'),
      type: CONTEXTMENU_NODE_TYPES.EMPTY_ROW,
    },
    // 删除列（REMOVE_COLUMN）尚未实现，见 getHeaderContextmenuOptionCollection（MENU-01）
    {
      label: t('清空单元格'),
      type: CONTEXTMENU_NODE_TYPES.EMPTY_CELL,
    },
  ]
}

/***
 * @setHeaderContextmenuOptions
 * @desc set header contextmenu options
 * @param {array<object>} column
 * @param {array<object>} contextmenuHeaderOption
 * @param {object} cellSelectionRangeData
 * @param {array<object>} colgroups
 * @param {object} headerIndicatorColKeys
 * @param {boolean} enableHeaderContextmenu
 * @param {boolean} t locale
 * @return headerContextmenuOptions
 */
export function setHeaderContextmenuOptions({
  column,
  contextmenuHeaderOption,
  cellSelectionRangeData,
  colgroups,
  allRowKeys,
  headerIndicatorColKeys,
  enableHeaderContextmenu,
  t,
}: {
  column: Record<string, any>
  contextmenuHeaderOption: ContextmenuOptionConfig
  cellSelectionRangeData: CellSelectionRangeData
  colgroups: ColgroupsParam
  allRowKeys: RowKeysParam
  headerIndicatorColKeys: HeaderIndicatorColKeys
  enableHeaderContextmenu: boolean
  t: Translate
}): ContextmenuNode[] {
  const result: ContextmenuNode[] = []

  if (enableHeaderContextmenu) {
    const selectionRangeKeys = getSelectionRangeKeys({
      cellSelectionRangeData,
    })

    const selectionRangeIndexes = getSelectionRangeIndexes({
      cellSelectionRangeData,
      colgroups,
      allRowKeys,
    })

    const isOperationCol = isOperationColumn(column.key, colgroups)

    const colCount
            = selectionRangeIndexes.endColIndex
              - selectionRangeIndexes.startColIndex
              + 1

    const { contextmenus, beforeShow } = contextmenuHeaderOption

    const isWholeColSelection = !isEmptyValue(
      headerIndicatorColKeys.startColKey,
    )

    const leftFixedColKeys = getColKeysByFixedType({
      fixedType: COLUMN_FIXED_TYPE.LEFT,
      colgroups,
      isExcludeOperationColumn: true,
    })

    const rightFixedColKeys = getColKeysByFixedType({
      fixedType: COLUMN_FIXED_TYPE.RIGHT,
      colgroups,
      isExcludeOperationColumn: true,
    })

    // 与 setColumnFixed 一致：左固定以选区右边界列为准，右固定以选区左边界列为准
    // 该列已向另一方向固定时，不允许改变固定方向
    const { leftColKey, rightColKey } = cellSelectionRangeData
    const leftFixedToColFixed = colgroups.find(x => x.key === rightColKey)?.fixed
    const rightFixedToColFixed = colgroups.find(x => x.key === leftColKey)?.fixed

    if (isFunction(beforeShow)) {
      beforeShow({
        isWholeColSelection,
        selectionRangeKeys,
        selectionRangeIndexes,
      })
    }

    const headerContextmenuOptionCollection
            = getHeaderContextmenuOptionCollection(t)

    contextmenus.forEach((contextmenu) => {
      const contentmenuCollectionItem
                = headerContextmenuOptionCollection.find(
                  x => x.type === contextmenu.type,
                )
      if (contentmenuCollectionItem) {
        let isContinue = true
        // empty column. 选中整列时支持
        if (
          contentmenuCollectionItem.type
          === CONTEXTMENU_NODE_TYPES.EMPTY_COLUMN
        ) {
          if (isWholeColSelection) {
            contentmenuCollectionItem.label
                            = contentmenuCollectionItem.label.replace(
                '$1',
                colCount,
              )
          }
          else {
            isContinue = false
          }
        }
        // left fixed column to
        else if (
          contentmenuCollectionItem.type
          === CONTEXTMENU_NODE_TYPES.LEFT_FIXED_COLUMN_TO
        ) {
          //
          if (
            isOperationCol
            || leftFixedToColFixed === COLUMN_FIXED_TYPE.RIGHT
          ) {
            contentmenuCollectionItem.disabled = true
          }
        }
        // calcel left fixed column to
        else if (
          contentmenuCollectionItem.type
          === CONTEXTMENU_NODE_TYPES.CANCEL_LEFT_FIXED_COLUMN_TO
        ) {
          if (leftFixedColKeys.length < 1)
            contentmenuCollectionItem.disabled = true
        }
        // right fixed column to
        else if (
          contentmenuCollectionItem.type
          === CONTEXTMENU_NODE_TYPES.RIGHT_FIXED_COLUMN_TO
        ) {
          //
          if (
            isOperationCol
            || rightFixedToColFixed === COLUMN_FIXED_TYPE.LEFT
          ) {
            contentmenuCollectionItem.disabled = true
          }
        }
        // calcel right fixed column to
        else if (
          contentmenuCollectionItem.type
          === CONTEXTMENU_NODE_TYPES.CANCEL_RIGHT_FIXED_COLUMN_TO
        ) {
          if (rightFixedColKeys.length < 1)
            contentmenuCollectionItem.disabled = true
        }

        if (isContinue)
          result.push(contentmenuCollectionItem)
      }
      else {
        result.push(contextmenu)
      }
    })
  }

  return result
}

/***
 * @setHeaderContextmenuOptions
 * @desc set header contextmenu options
 * @param {array<object>} column
 * @param {array<object>} contextmenuBodyOption
 * @param {object} cellSelectionRangeData
 * @param {array<object>} colgroups
 * @param {object} bodyIndicatorRowKeys
 * @param {boolean} enableHeaderContextmenu
 * @param {boolean} t locale
 * @return headerContextmenuOptions
 */
export function setBodyContextmenuOptions({
  enableBodyContextmenu,
  contextmenuBodyOption,
  cellSelectionRangeData,
  colgroups,
  allRowKeys,
  bodyIndicatorRowKeys,
  t,
}: {
  enableBodyContextmenu: boolean
  contextmenuBodyOption: ContextmenuOptionConfig
  cellSelectionRangeData: CellSelectionRangeData
  colgroups: ColgroupsParam
  allRowKeys: RowKeysParam
  bodyIndicatorRowKeys: BodyIndicatorRowKeys
  t: Translate
}): ContextmenuNode[] {
  const result: ContextmenuNode[] = []
  if (enableBodyContextmenu) {
    const selectionRangeKeys = getSelectionRangeKeys({
      cellSelectionRangeData,
    })

    const selectionRangeIndexes = getSelectionRangeIndexes({
      cellSelectionRangeData,
      colgroups,
      allRowKeys,
    })

    const rowCount
            = selectionRangeIndexes.endRowIndex
              - selectionRangeIndexes.startRowIndex
              + 1

    const { contextmenus, beforeShow } = contextmenuBodyOption

    const isWholeRowSelection = !isEmptyValue(
      bodyIndicatorRowKeys.startRowKey,
    )
    if (isFunction(beforeShow)) {
      beforeShow({
        isWholeRowSelection,
        selectionRangeKeys,
        selectionRangeIndexes,
      })
    }

    const bodyContextmenuOptionCollection
            = getBodyContextmenuOptionCollection(t)

    contextmenus.forEach((contextmenu) => {
      const contentmenuCollectionItem
                = bodyContextmenuOptionCollection.find(
                  x => x.type === contextmenu.type,
                )
      if (contentmenuCollectionItem) {
        let isContinue = true

        // remove row
        if (
          contentmenuCollectionItem.type
          === CONTEXTMENU_NODE_TYPES.REMOVE_ROW
        ) {
          contentmenuCollectionItem.label
                        = contentmenuCollectionItem.label.replace('$1', rowCount)
        }
        // empty row. 选中整行时支持
        else if (
          contentmenuCollectionItem.type
          === CONTEXTMENU_NODE_TYPES.EMPTY_ROW
        ) {
          if (isWholeRowSelection) {
            contentmenuCollectionItem.label
                            = contentmenuCollectionItem.label.replace(
                '$1',
                rowCount,
              )
          }
          else {
            isContinue = false
          }
        }
        // empty cell.没选中整行时支持
        else if (
          contentmenuCollectionItem.type
          === CONTEXTMENU_NODE_TYPES.EMPTY_CELL
        ) {
          isContinue = !isWholeRowSelection
        }

        if (isContinue)
          result.push(contentmenuCollectionItem)
      }
      else {
        result.push(contextmenu)
      }
    })
  }
  return result
}

// create empty row data
export function createEmptyRowData({ colgroups, rowKeyFieldName }: {
  colgroups: ColgroupsParam
  rowKeyFieldName: string
}) {
  const rowData: Record<string, any> = {
    [rowKeyFieldName]: getRandomId(),
  }

  colgroups.forEach((column) => {
    if (column.field)
      rowData[column.field] = ''
  })

  return rowData
}

//  empty row data
// export function emptyRowData({ rowData, rowKeyFieldName }) {
//     Object.keys(rowData).forEach((key) => {
//         if (key !== rowKeyFieldName) {
//             rowData[key] = "";
//         }
//     });

//     return rowData;
// }

// is contextmenu panel clicked
export function isContextmenuPanelClicked(event: Event) {
  let result = false
  const contextmenuPanelEls = document.querySelectorAll(
    '.ve-contextmenu-popper',
  );
  [].forEach.call(contextmenuPanelEls, (el: Element) => {
    if (el.contains(event.target as Node | null))
      result = true
  })

  return result
}
