/*
选区几何计算（纯函数，不读写组件状态，不访问 DOM，MOD-05）
- 选区范围与可见性：getCellSelectionRange、isSelectionInVirtualView、isCornerEnabled、getCornerCellInfo、
  isFirstSelectionRow / isFirstSelectionCol / isFirstNotFixedSelectionCol
- 单元格矩形：createEmptyCellRect、getCellRectInTable
- 边框：getCurrentCellBorders（当前单元格）、getRangeBorders（区域）、getAutofillAreaBorders /
  getAutofillAreaColKeys（填充预览）、adjustSelectionBorders（固定列、首行、首列修正，SEL-07）、
  getAreaLayerRect（区域浮层，SEL-07）、getCornerPosition（角标）
- getAutofillDirection：根据选区与 autofill 结束单元格的行列位置计算填充方向（FILL-01）
*/
import { isBoolean } from '@vue3-easytable/common/utils/index'
import {
  AUTOFILLING_DIRECTION,
  COLUMN_FIXED_TYPE,
  CURRENT_CELL_SELECTION_TYPES,
} from '../util/constant'
import {
  getLeftmostColKey,
  getNextColKey,
  getPreviewColKey,
  isLastColumnByColKey,
  isLastRowByRowKey,
} from '../util/index'

export type AutofillingDirection = 'up' | 'down' | 'left' | 'right'

/* ------------------------------------------------------------------ */
/* 选区范围与可见性                                                    */
/* ------------------------------------------------------------------ */

// 选区中的单元格（currentCell / normalEndCell / autoFillEndCell）
export interface SelectionCell {
  rowKey: any
  colKey: any
  rowIndex?: number
}

// 选区的行列 key 范围（与表格的 cellSelectionRangeData 相同）
export interface CellSelectionRange {
  leftColKey: any
  rightColKey: any
  topRowKey: any
  bottomRowKey: any
}

/*
 * @getCellSelectionRange
 * @desc 根据当前单元格与结束单元格计算选区范围。
 *       左右按列的位置判断（固定列时不能按单元格的 left 判断），上下按行下标判断；没有选区时全部为空字符串
 */
export function getCellSelectionRange({
  selectionType,
  currentCell,
  normalEndCell,
  colgroups,
}: {
  selectionType: string
  currentCell: SelectionCell
  normalEndCell: SelectionCell
  colgroups: any[]
}): CellSelectionRange {
  if (selectionType === CURRENT_CELL_SELECTION_TYPES.SINGLE) {
    return {
      leftColKey: currentCell.colKey,
      rightColKey: currentCell.colKey,
      topRowKey: currentCell.rowKey,
      bottomRowKey: currentCell.rowKey,
    }
  }

  if (selectionType === CURRENT_CELL_SELECTION_TYPES.RANGE) {
    const leftmostColKey = getLeftmostColKey({
      colgroups,
      colKeys: [currentCell.colKey, normalEndCell.colKey],
    })
    const isCurrentCellLeft = leftmostColKey === currentCell.colKey
    const isCurrentCellTop = (currentCell.rowIndex as number) < (normalEndCell.rowIndex as number)

    return {
      leftColKey: isCurrentCellLeft ? currentCell.colKey : normalEndCell.colKey,
      rightColKey: isCurrentCellLeft ? normalEndCell.colKey : currentCell.colKey,
      topRowKey: isCurrentCellTop ? currentCell.rowKey : normalEndCell.rowKey,
      bottomRowKey: isCurrentCellTop ? normalEndCell.rowKey : currentCell.rowKey,
    }
  }

  return {
    leftColKey: '',
    rightColKey: '',
    topRowKey: '',
    bottomRowKey: '',
  }
}

/*
 * @isSelectionInVirtualView
 * @desc 虚拟滚动时，选区完全在已渲染的行之外（整体在上方或整体在下方）则不显示边框
 */
export function isSelectionInVirtualView({
  isVirtualScroll,
  selectionType,
  currentCell,
  normalEndCell,
  visibleIndexes,
}: {
  isVirtualScroll: boolean
  selectionType: string
  currentCell: SelectionCell
  normalEndCell: SelectionCell
  visibleIndexes: { start: number, end: number }
}): boolean {
  if (!isVirtualScroll)
    return true

  const { start, end } = visibleIndexes
  const currentRowIndex = currentCell.rowIndex as number
  const endRowIndex = normalEndCell.rowIndex as number

  if (selectionType === CURRENT_CELL_SELECTION_TYPES.SINGLE) {
    if (currentRowIndex < start || currentRowIndex > end)
      return false
  }

  if (selectionType === CURRENT_CELL_SELECTION_TYPES.RANGE) {
    if (
      (currentRowIndex < start && endRowIndex < start)
      || (currentRowIndex > end && endRowIndex > end)
    ) {
      return false
    }
  }

  return true
}

/*
 * @isCornerEnabled
 * @desc 是否显示填充角标：开启了 autofill，且横向、纵向没有同时被禁用
 */
export function isCornerEnabled(cellAutofillOption: unknown): boolean {
  if (!cellAutofillOption)
    return false

  const { directionX, directionY } = cellAutofillOption as { directionX?: unknown, directionY?: unknown }
  return !(
    isBoolean(directionY)
    && !directionY
    && isBoolean(directionX)
    && !directionX
  )
}

export interface CornerCellInfo {
  isLastColumn: boolean
  isLastRow: boolean
}

/*
 * @getCornerCellInfo
 * @desc 角标所在单元格（选区右下角）是否是最后一列 / 最后一行（角标需要向内移动）。
 *       右侧紧邻右固定列（自身不是右固定列）时也按最后一列处理
 */
export function getCornerCellInfo({
  colgroups,
  allRowKeys,
  rightColKey,
  bottomRowKey,
}: {
  colgroups: any[]
  allRowKeys: any[]
  rightColKey: any
  bottomRowKey: any
}): CornerCellInfo {
  let isLastColumn = false
  if (isLastColumnByColKey(rightColKey, colgroups)) {
    isLastColumn = true
  }
  else {
    const index = colgroups.findIndex(x => x.key === rightColKey)
    // 列已被隐藏 / 移除时 index 为 -1（SEL-01），不能再读 colgroups[index]
    if (
      index > -1
      && index < colgroups.length - 1
      && colgroups[index + 1].fixed === COLUMN_FIXED_TYPE.RIGHT
      && colgroups[index].fixed !== COLUMN_FIXED_TYPE.RIGHT
    ) {
      isLastColumn = true
    }
  }

  return {
    isLastColumn,
    isLastRow: isLastRowByRowKey(bottomRowKey, allRowKeys),
  }
}

// 选区是否从第一行开始
export function isFirstSelectionRow(allRowKeys: any[], range: CellSelectionRange): boolean {
  return allRowKeys[0] === range.topRowKey
}

// 选区是否从第一列开始（所有列都被隐藏时 colgroups 为空）
export function isFirstSelectionCol(colgroups: any[], range: CellSelectionRange): boolean {
  return colgroups[0]?.key === range.leftColKey
}

// 存在左固定列时，选区是否从第一个非固定列开始（按列 key 比较，COL-06）
export function isFirstNotFixedSelectionCol(colgroups: any[], range: CellSelectionRange): boolean {
  if (!colgroups.find(x => x.fixed === 'left'))
    return false

  const col = colgroups.find(x => !x.fixed)
  return !!col && col.key === range.leftColKey
}

// 选区的行列索引范围（闭区间）
export interface SelectionRangeIndexes {
  top: number
  bottom: number
  left: number
  right: number
}

export interface AutofillDirectionParams {
  range: SelectionRangeIndexes
  // autofill 结束单元格的行索引、列索引
  endRowIndex: number
  endColIndex: number
  // cellAutofillOption.directionX / directionY，显式为 false 时不允许该方向
  directionX?: unknown
  directionY?: unknown
}

/*
 * @getAutofillDirection
 * @desc 计算填充方向。结束单元格在选区下方 / 上方时为纵向（优先），否则在右侧 / 左侧时为横向。
 *       结束单元格在选区内、索引无效、或方向不被允许时返回 null（不会退而选择另一个方向）。
 */
export function getAutofillDirection({
  range,
  endRowIndex,
  endColIndex,
  directionX,
  directionY,
}: AutofillDirectionParams): AutofillingDirection | null {
  const { top, bottom, left, right } = range
  if ([top, bottom, left, right, endRowIndex, endColIndex].some(x => !(x >= 0)))
    return null

  let direction: AutofillingDirection | null = null
  if (endRowIndex > bottom)
    direction = AUTOFILLING_DIRECTION.DOWN as AutofillingDirection
  else if (endRowIndex < top)
    direction = AUTOFILLING_DIRECTION.UP as AutofillingDirection
  else if (endColIndex > right)
    direction = AUTOFILLING_DIRECTION.RIGHT as AutofillingDirection
  else if (endColIndex < left)
    direction = AUTOFILLING_DIRECTION.LEFT as AutofillingDirection

  if (!direction)
    return null

  const isVertical = direction === AUTOFILLING_DIRECTION.UP || direction === AUTOFILLING_DIRECTION.DOWN
  const allowed = isVertical ? directionY : directionX
  if (isBoolean(allowed) && !allowed)
    return null

  return direction
}

/* ------------------------------------------------------------------ */
/* 单元格矩形                                                          */
/* ------------------------------------------------------------------ */

// 单元格相对于表格的位置与尺寸
export interface CellRect {
  left: number
  top: number
  width: number
  height: number
}

export function createEmptyCellRect(): CellRect {
  return {
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  }
}

/*
 * @getCellRectInTable
 * @desc 单元格的视口矩形换算为相对于表格的矩形；单元格没有尺寸（未渲染、被隐藏）时返回 undefined
 */
export function getCellRectInTable(
  cellRect: { left: number, top: number, width: number, height: number },
  tableLeft: number,
  tableTop: number,
): CellRect | undefined {
  const { left, top, width, height } = cellRect
  if (height && width) {
    return {
      left: left - tableLeft,
      top: top - tableTop,
      width,
      height,
    }
  }
  return undefined
}

/* ------------------------------------------------------------------ */
/* 边框                                                                */
/* ------------------------------------------------------------------ */

export interface BorderLine {
  show: boolean
  width: number
  height: number
  top: number
  left: number
}

export interface SelectionBorders {
  borderWidth: number
  borderHeight: number
  topBorder: BorderLine
  rightBorder: BorderLine
  bottomBorder: BorderLine
  leftBorder: BorderLine
  corner: { show: boolean, top: number, left: number }
}

function createBorderLine(width: number, height: number, top = 0, left = 0): BorderLine {
  return {
    show: true,
    width,
    height,
    top,
    left,
  }
}

/*
 * @getCurrentCellBorders
 * @desc 当前单元格的边框（2px）。存在区域选择（结束单元格）时不显示角标，角标由区域边框显示。
 *       角标是否允许显示（autofill 配置）由 adjustSelectionBorders 统一处理（SEL-13）
 */
export function getCurrentCellBorders(
  currentCellRect: CellRect,
  { hasNormalEndCell }: { hasNormalEndCell: boolean },
): SelectionBorders {
  const { left, top, width, height } = currentCellRect

  const borders: SelectionBorders = {
    borderWidth: width + 1,
    borderHeight: height,
    topBorder: createBorderLine(0, 2, top - 1, left - 1),
    rightBorder: createBorderLine(2, 0, top, left + width - 2),
    bottomBorder: createBorderLine(0, 2, top + height - 2, left - 1),
    leftBorder: createBorderLine(2, 0, top, left - 1),
    corner: {
      show: !hasNormalEndCell,
      top: 0,
      left: 0,
    },
  }

  borders.corner.top = borders.bottomBorder.top - 3
  borders.corner.left = borders.rightBorder.left - 3

  return borders
}

/*
 * @getRangeBorders
 * @desc 区域选择的边框（1px），由当前单元格与结束单元格的矩形围成。
 *       leftmostCell：哪个单元格所在的列在左边（按列的位置判断，固定列时不能比较 left），无法判断时为 null
 */
export function getRangeBorders({
  currentCellRect,
  normalEndCellRect,
  leftmostCell,
}: {
  currentCellRect: CellRect
  normalEndCellRect: CellRect
  leftmostCell: 'current' | 'normalEnd' | null
}): SelectionBorders {
  const borders: SelectionBorders = {
    borderWidth: 0,
    borderHeight: 0,
    topBorder: createBorderLine(0, 1),
    rightBorder: createBorderLine(1, 0),
    bottomBorder: createBorderLine(0, 1),
    leftBorder: createBorderLine(1, 0),
    corner: {
      show: true,
      top: 0,
      left: 0,
    },
  }

  // 结束单元格在右侧
  if (leftmostCell === 'current') {
    borders.borderWidth
      = normalEndCellRect.left - currentCellRect.left + normalEndCellRect.width + 1

    borders.topBorder.left = currentCellRect.left - 1
    borders.bottomBorder.left = currentCellRect.left - 1
    borders.leftBorder.left = currentCellRect.left - 1
    borders.rightBorder.left = normalEndCellRect.left + normalEndCellRect.width - 1
  }
  // 结束单元格在左侧
  else if (leftmostCell === 'normalEnd') {
    borders.borderWidth
      = currentCellRect.left - normalEndCellRect.left + currentCellRect.width + 1

    borders.topBorder.left = normalEndCellRect.left - 1
    borders.rightBorder.left = currentCellRect.left + currentCellRect.width - 1
    borders.bottomBorder.left = normalEndCellRect.left - 1
    borders.leftBorder.left = normalEndCellRect.left - 1
  }

  // 结束单元格在下方
  if (normalEndCellRect.top > currentCellRect.top) {
    borders.borderHeight
      = normalEndCellRect.top - currentCellRect.top + normalEndCellRect.height

    borders.topBorder.top = currentCellRect.top - 1
    borders.rightBorder.top = currentCellRect.top
    borders.bottomBorder.top = normalEndCellRect.top + normalEndCellRect.height - 1
    borders.leftBorder.top = currentCellRect.top
  }
  // 结束单元格在上方或同一行
  else if (normalEndCellRect.top <= currentCellRect.top) {
    borders.borderHeight
      = currentCellRect.top - normalEndCellRect.top + currentCellRect.height

    borders.topBorder.top = normalEndCellRect.top - 1
    borders.rightBorder.top = normalEndCellRect.top
    borders.bottomBorder.top = currentCellRect.top + currentCellRect.height - 1
    borders.leftBorder.top = normalEndCellRect.top
  }

  borders.corner.top = borders.bottomBorder.top - 4
  borders.corner.left = borders.rightBorder.left - 4

  return borders
}

/*
 * @getAutofillAreaBorders
 * @desc 填充预览的边框：从选区（当前单元格或区域的边框，未经固定列修正）向填充方向延伸到填充结束单元格，
 *       靠近选区的一侧不显示。单个单元格的边框是 2px，纵向填充时右边框右移 1px 对齐。
 *       direction 为 null 或未知时返回 null
 */
export function getAutofillAreaBorders({
  direction,
  area,
  autoFillEndCellRect,
  isSingleSelection,
}: {
  direction: AutofillingDirection | null
  area: SelectionBorders
  autoFillEndCellRect: CellRect
  isSingleSelection: boolean
}): SelectionBorders | null {
  const borders: SelectionBorders = {
    borderWidth: 0,
    borderHeight: 0,
    topBorder: createBorderLine(0, 1),
    rightBorder: createBorderLine(1, 0),
    bottomBorder: createBorderLine(0, 1),
    leftBorder: createBorderLine(1, 0),
    corner: {
      show: false,
      top: 0,
      left: 0,
    },
  }

  if (direction === AUTOFILLING_DIRECTION.DOWN) {
    borders.topBorder.show = false

    borders.borderWidth = area.borderWidth
    borders.borderHeight
      = autoFillEndCellRect.top - area.bottomBorder.top + autoFillEndCellRect.height

    borders.rightBorder.top = area.bottomBorder.top
    borders.rightBorder.left = area.rightBorder.left
    if (isSingleSelection)
      borders.rightBorder.left++

    borders.leftBorder.top = area.bottomBorder.top
    borders.leftBorder.left = area.leftBorder.left

    borders.bottomBorder.top = autoFillEndCellRect.top + autoFillEndCellRect.height - 1
    borders.bottomBorder.left = area.bottomBorder.left
  }
  else if (direction === AUTOFILLING_DIRECTION.UP) {
    borders.bottomBorder.show = false

    borders.borderWidth = area.borderWidth
    borders.borderHeight = area.topBorder.top - autoFillEndCellRect.top

    borders.topBorder.top = autoFillEndCellRect.top - 1
    borders.topBorder.left = area.topBorder.left

    borders.rightBorder.top = autoFillEndCellRect.top
    borders.rightBorder.left = area.rightBorder.left
    if (isSingleSelection)
      borders.rightBorder.left++

    borders.leftBorder.top = autoFillEndCellRect.top
    borders.leftBorder.left = area.leftBorder.left
  }
  else if (direction === AUTOFILLING_DIRECTION.RIGHT) {
    borders.leftBorder.show = false

    borders.borderWidth
      = autoFillEndCellRect.left - area.rightBorder.left + autoFillEndCellRect.width + 1
    borders.borderHeight = area.borderHeight

    borders.topBorder.top = area.topBorder.top
    borders.topBorder.left = area.rightBorder.left - 1

    borders.rightBorder.top = area.topBorder.top
    borders.rightBorder.left = autoFillEndCellRect.left + autoFillEndCellRect.width - 1

    borders.bottomBorder.top = area.bottomBorder.top
    borders.bottomBorder.left = area.rightBorder.left - 1
  }
  else if (direction === AUTOFILLING_DIRECTION.LEFT) {
    borders.rightBorder.show = false

    borders.borderWidth = area.leftBorder.left - autoFillEndCellRect.left + 1
    borders.borderHeight = area.borderHeight

    borders.topBorder.top = area.topBorder.top
    borders.topBorder.left = autoFillEndCellRect.left

    borders.rightBorder.left = area.topBorder.left

    borders.bottomBorder.top = area.bottomBorder.top
    borders.bottomBorder.left = autoFillEndCellRect.left

    borders.leftBorder.top = area.topBorder.top
    borders.leftBorder.left = autoFillEndCellRect.left
  }
  else {
    return null
  }

  return borders
}

/*
 * @getAutofillAreaColKeys
 * @desc 填充预览覆盖的列（两端的列 key）：纵向填充为选区的列；横向填充为选区旁边的一列到填充结束单元格所在的列
 */
export function getAutofillAreaColKeys({
  direction,
  leftColKey,
  rightColKey,
  autoFillEndColKey,
  colgroups,
}: {
  direction: AutofillingDirection | null
  leftColKey: any
  rightColKey: any
  autoFillEndColKey: any
  colgroups: any[]
}): [any, any] | null {
  if (direction === AUTOFILLING_DIRECTION.DOWN || direction === AUTOFILLING_DIRECTION.UP)
    return [leftColKey, rightColKey]

  if (direction === AUTOFILLING_DIRECTION.RIGHT)
    return [getNextColKey({ colgroups, currentColKey: rightColKey }), autoFillEndColKey]

  if (direction === AUTOFILLING_DIRECTION.LEFT)
    return [getPreviewColKey({ colgroups, currentColKey: leftColKey }), autoFillEndColKey]

  return null
}

export interface AdjustSelectionBordersOptions {
  // '' | 'left' | 'right'
  fixedType: string
  // 当前固定区域内选中列的总宽度
  fixedColsTotalWidth: number
  // 选中的列是否全部在当前固定区域内
  isAllColsFixed: boolean
  isFirstSelectionRow: boolean
  isFirstSelectionCol: boolean
  isFirstNotFixedSelectionCol: boolean
  showCorner: boolean
}

/*
 * @adjustSelectionBorders
 * @desc 修正边框位置，返回新对象，不修改入参。
 *       同一份边框数据会被边框、区域浮层等多个使用方读取，修改入参会让结果依赖调用顺序（SEL-07）
 */
export function adjustSelectionBorders(
  borders: SelectionBorders,
  {
    fixedType,
    fixedColsTotalWidth,
    isAllColsFixed,
    isFirstSelectionRow,
    isFirstSelectionCol,
    isFirstNotFixedSelectionCol,
    showCorner,
  }: AdjustSelectionBordersOptions,
): SelectionBorders {
  const result: SelectionBorders = {
    borderWidth: borders.borderWidth,
    borderHeight: borders.borderHeight,
    topBorder: { ...borders.topBorder },
    rightBorder: { ...borders.rightBorder },
    bottomBorder: { ...borders.bottomBorder },
    leftBorder: { ...borders.leftBorder },
    corner: { ...borders.corner },
  }
  const { topBorder, rightBorder, bottomBorder, leftBorder, corner } = result

  // 固定列区域只覆盖固定列的宽度
  if (fixedType) {
    result.borderWidth = fixedColsTotalWidth
    if (fixedType === COLUMN_FIXED_TYPE.LEFT)
      result.borderWidth += 1
  }

  if (fixedType === COLUMN_FIXED_TYPE.LEFT && !isAllColsFixed) {
    rightBorder.show = false
    corner.show = false
  }

  if (fixedType === COLUMN_FIXED_TYPE.RIGHT) {
    if (!isAllColsFixed)
      leftBorder.show = false

    topBorder.left = rightBorder.left - result.borderWidth + 1
    bottomBorder.left = rightBorder.left - result.borderWidth + 1
  }

  // 首行、首列、首个非固定列时边框会被遮住，向内移动 1px
  if (isFirstSelectionRow)
    topBorder.top += 1

  if (isFirstSelectionCol)
    leftBorder.left += 1

  if (isFirstNotFixedSelectionCol)
    leftBorder.left += 1

  if (!showCorner)
    corner.show = false

  return result
}

/*
 * @getAreaLayerRect
 * @desc 区域浮层：上边框顶部到下边框底部、上边框左侧开始的 borderWidth 宽度，与边框围成的矩形一致
 */
export function getAreaLayerRect(borders: SelectionBorders) {
  const { borderWidth, topBorder, bottomBorder } = borders
  return {
    top: topBorder.top,
    left: topBorder.left,
    width: borderWidth,
    height: bottomBorder.top + bottomBorder.height - topBorder.top,
  }
}

export interface CornerPosition {
  top: number
  left: number
  // 右边框、下边框宽度（px）：角标在最后一列 / 最后一行时为 0，并向内移动，避免被裁掉
  borderRightWidth: number
  borderBottomWidth: number
}

/*
 * @getCornerPosition
 * @desc 角标的位置与边框宽度
 */
export function getCornerPosition(
  corner: SelectionBorders['corner'],
  cornerCellInfo: CornerCellInfo,
): CornerPosition {
  const result: CornerPosition = {
    top: corner.top,
    left: corner.left,
    borderRightWidth: 1,
    borderBottomWidth: 1,
  }

  if (cornerCellInfo.isLastRow) {
    result.top -= 3
    result.borderBottomWidth = 0
  }

  if (cornerCellInfo.isLastColumn) {
    result.left -= 3
    result.borderRightWidth = 0
  }

  return result
}
