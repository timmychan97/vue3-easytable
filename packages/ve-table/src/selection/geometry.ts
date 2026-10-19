/*
选区几何计算（纯函数，不读写组件状态，MOD-05 的第一步）
- getAutofillDirection：根据选区与 autofill 结束单元格的行列位置计算填充方向（FILL-01）
- adjustSelectionBorders：按固定列、首行、首列等情况修正边框位置，返回新对象，不修改入参（SEL-07）
- getAreaLayerRect：区域浮层为四条边框围成的矩形（SEL-07）
*/
import { isBoolean } from '@vue3-easytable/common/utils/index'
import { AUTOFILLING_DIRECTION, COLUMN_FIXED_TYPE } from '../util/constant'

export type AutofillingDirection = 'up' | 'down' | 'left' | 'right'

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
