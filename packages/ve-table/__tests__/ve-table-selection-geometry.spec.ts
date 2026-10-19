/*
选区几何计算的单元测试（MOD-05）：selection/geometry.ts 中的纯函数，不挂载组件
（getAutofillDirection、adjustSelectionBorders、getAreaLayerRect 的测试在 ve-table-autofill.spec.ts 中）
*/
import {
  adjustSelectionBorders,
  createEmptyCellRect,
  getAutofillAreaBorders,
  getAutofillAreaColKeys,
  getCellRectInTable,
  getCellSelectionRange,
  getCornerCellInfo,
  getCornerPosition,
  getCurrentCellBorders,
  getRangeBorders,
  isCornerEnabled,
  isFirstNotFixedSelectionCol,
  isFirstSelectionCol,
  isFirstSelectionRow,
  isSelectionInVirtualView,
} from '@/ve-table/src/selection/geometry'

const COLGROUPS = [
  { key: 'a', fixed: 'left' },
  { key: 'b' },
  { key: 'c' },
  { key: 'd', fixed: 'right' },
]
const ROW_KEYS = ['r0', 'r1', 'r2', 'r3']

const cell = (rowKey: string, colKey: string) => ({ rowKey, colKey, rowIndex: ROW_KEYS.indexOf(rowKey) })
const EMPTY_CELL = { rowKey: '', colKey: '', rowIndex: -1 }

describe('selection geometry (MOD-05)', () => {
  describe('getCellSelectionRange', () => {
    it('a single cell is its own range', () => {
      expect(getCellSelectionRange({
        selectionType: 'single',
        currentCell: cell('r1', 'b'),
        normalEndCell: EMPTY_CELL,
        colgroups: COLGROUPS,
      })).toEqual({ leftColKey: 'b', rightColKey: 'b', topRowKey: 'r1', bottomRowKey: 'r1' })
    })

    it('orders a range by column position and row index, whatever the drag direction', () => {
      const range = { leftColKey: 'b', rightColKey: 'c', topRowKey: 'r1', bottomRowKey: 'r3' }
      const pairs: [string, string, string, string][] = [
        ['r1', 'b', 'r3', 'c'],
        ['r3', 'c', 'r1', 'b'],
        ['r3', 'b', 'r1', 'c'],
        ['r1', 'c', 'r3', 'b'],
      ]
      for (const [r1, c1, r2, c2] of pairs) {
        expect(getCellSelectionRange({
          selectionType: 'range',
          currentCell: cell(r1, c1),
          normalEndCell: cell(r2, c2),
          colgroups: COLGROUPS,
        })).toEqual(range)
      }
    })

    it('uses the column order, not the key order', () => {
      const colgroups = [{ key: 'z' }, { key: 'a' }]
      expect(getCellSelectionRange({
        selectionType: 'range',
        currentCell: cell('r0', 'a'),
        normalEndCell: cell('r0', 'z'),
        colgroups,
      })).toMatchObject({ leftColKey: 'z', rightColKey: 'a' })
    })

    it('is empty without a selection', () => {
      expect(getCellSelectionRange({
        selectionType: '',
        currentCell: EMPTY_CELL,
        normalEndCell: EMPTY_CELL,
        colgroups: COLGROUPS,
      })).toEqual({ leftColKey: '', rightColKey: '', topRowKey: '', bottomRowKey: '' })
    })
  })

  describe('isSelectionInVirtualView', () => {
    const base = { isVirtualScroll: true, visibleIndexes: { start: 10, end: 20 } }
    const at = (rowIndex: number) => ({ rowKey: `k${rowIndex}`, colKey: 'a', rowIndex })

    it('is always visible without virtual scroll', () => {
      expect(isSelectionInVirtualView({ ...base, isVirtualScroll: false, selectionType: 'single', currentCell: at(0), normalEndCell: EMPTY_CELL })).toBe(true)
    })

    it('hides a single cell outside the rendered rows', () => {
      expect(isSelectionInVirtualView({ ...base, selectionType: 'single', currentCell: at(9), normalEndCell: EMPTY_CELL })).toBe(false)
      expect(isSelectionInVirtualView({ ...base, selectionType: 'single', currentCell: at(10), normalEndCell: EMPTY_CELL })).toBe(true)
      expect(isSelectionInVirtualView({ ...base, selectionType: 'single', currentCell: at(21), normalEndCell: EMPTY_CELL })).toBe(false)
    })

    it('hides a range only when it is wholly above or below the rendered rows', () => {
      expect(isSelectionInVirtualView({ ...base, selectionType: 'range', currentCell: at(2), normalEndCell: at(5) })).toBe(false)
      expect(isSelectionInVirtualView({ ...base, selectionType: 'range', currentCell: at(30), normalEndCell: at(25) })).toBe(false)
      // 跨过整个渲染范围
      expect(isSelectionInVirtualView({ ...base, selectionType: 'range', currentCell: at(2), normalEndCell: at(30) })).toBe(true)
      expect(isSelectionInVirtualView({ ...base, selectionType: 'range', currentCell: at(15), normalEndCell: at(30) })).toBe(true)
    })
  })

  describe('isCornerEnabled', () => {
    it('needs an autofill option with at least one direction allowed', () => {
      expect(isCornerEnabled(null)).toBe(false)
      expect(isCornerEnabled(false)).toBe(false)
      expect(isCornerEnabled({})).toBe(true)
      expect(isCornerEnabled({ directionX: false })).toBe(true)
      expect(isCornerEnabled({ directionY: false })).toBe(true)
      expect(isCornerEnabled({ directionX: false, directionY: false })).toBe(false)
    })
  })

  describe('getCornerCellInfo', () => {
    const info = (rightColKey: string, bottomRowKey = 'r1', colgroups: any[] = COLGROUPS) =>
      getCornerCellInfo({ colgroups, allRowKeys: ROW_KEYS, rightColKey, bottomRowKey })

    it('detects the last column and the last row', () => {
      expect(info('d', 'r3')).toEqual({ isLastColumn: true, isLastRow: true })
      expect(info('b', 'r1')).toEqual({ isLastColumn: false, isLastRow: false })
    })

    it('treats the column before the right fixed columns as the last one', () => {
      expect(info('c').isLastColumn).toBe(true)
    })

    it('tolerates an unknown column (SEL-01)', () => {
      const allRightFixed = COLGROUPS.map(x => ({ ...x, fixed: 'right' }))
      expect(info('missing', 'r1', allRightFixed).isLastColumn).toBe(false)
      expect(info('missing', 'r1', []).isLastColumn).toBe(false)
    })
  })

  describe('first row / column checks', () => {
    const range = (leftColKey: string, topRowKey: string) => ({ leftColKey, rightColKey: leftColKey, topRowKey, bottomRowKey: topRowKey })

    it('isFirstSelectionRow and isFirstSelectionCol', () => {
      expect(isFirstSelectionRow(ROW_KEYS, range('a', 'r0'))).toBe(true)
      expect(isFirstSelectionRow(ROW_KEYS, range('a', 'r1'))).toBe(false)
      expect(isFirstSelectionCol(COLGROUPS, range('a', 'r1'))).toBe(true)
      expect(isFirstSelectionCol(COLGROUPS, range('b', 'r1'))).toBe(false)
      expect(isFirstSelectionCol([], range('a', 'r1'))).toBe(false)
    })

    it('isFirstNotFixedSelectionCol needs a left fixed column', () => {
      expect(isFirstNotFixedSelectionCol(COLGROUPS, range('b', 'r1'))).toBe(true)
      expect(isFirstNotFixedSelectionCol(COLGROUPS, range('c', 'r1'))).toBe(false)
      expect(isFirstNotFixedSelectionCol([{ key: 'b' }, { key: 'c' }], range('b', 'r1'))).toBe(false)
    })
  })

  describe('cell rects', () => {
    it('createEmptyCellRect returns a new zero rect each time', () => {
      const a = createEmptyCellRect()
      expect(a).toEqual({ left: 0, top: 0, width: 0, height: 0 })
      expect(createEmptyCellRect()).not.toBe(a)
    })

    it('getCellRectInTable makes the rect relative to the table, and ignores cells without a size', () => {
      expect(getCellRectInTable({ left: 110, top: 75, width: 100, height: 40 }, 10, 5)).toEqual({ left: 100, top: 70, width: 100, height: 40 })
      expect(getCellRectInTable({ left: 110, top: 75, width: 0, height: 40 }, 10, 5)).toBeUndefined()
      expect(getCellRectInTable({ left: 110, top: 75, width: 100, height: 0 }, 10, 5)).toBeUndefined()
    })
  })

  describe('getCurrentCellBorders', () => {
    const rect = { left: 100, top: 40, width: 100, height: 40 }

    it('draws a 2px box around the cell with the corner at the bottom right', () => {
      expect(getCurrentCellBorders(rect, { hasNormalEndCell: false })).toEqual({
        borderWidth: 101,
        borderHeight: 40,
        topBorder: { show: true, width: 0, height: 2, top: 39, left: 99 },
        rightBorder: { show: true, width: 2, height: 0, top: 40, left: 198 },
        bottomBorder: { show: true, width: 0, height: 2, top: 78, left: 99 },
        leftBorder: { show: true, width: 2, height: 0, top: 40, left: 99 },
        corner: { show: true, top: 75, left: 195 },
      })
    })

    // SEL-13：角标只取决于是否存在区域选择，以及（修正时）autofill 是否允许显示角标
    it('hides the corner when there is a range; the autofill option is applied by adjustSelectionBorders (SEL-13)', () => {
      expect(getCurrentCellBorders(rect, { hasNormalEndCell: true }).corner.show).toBe(false)

      const adjust = (showCorner: boolean, hasNormalEndCell: boolean) => adjustSelectionBorders(
        getCurrentCellBorders(rect, { hasNormalEndCell }),
        {
          fixedType: '',
          fixedColsTotalWidth: 0,
          isAllColsFixed: false,
          isFirstSelectionRow: false,
          isFirstSelectionCol: false,
          isFirstNotFixedSelectionCol: false,
          showCorner,
        },
      ).corner.show
      expect(adjust(true, false)).toBe(true)
      expect(adjust(false, false)).toBe(false)
      expect(adjust(true, true)).toBe(false)
    })
  })

  describe('getRangeBorders', () => {
    const current = { left: 100, top: 80, width: 100, height: 40 }
    const end = { left: 300, top: 160, width: 100, height: 40 }

    it('encloses both cells when the end cell is right and below', () => {
      const borders = getRangeBorders({ currentCellRect: current, normalEndCellRect: end, leftmostCell: 'current' })
      expect(borders).toEqual({
        borderWidth: 301,
        borderHeight: 120,
        topBorder: { show: true, width: 0, height: 1, top: 79, left: 99 },
        rightBorder: { show: true, width: 1, height: 0, top: 80, left: 399 },
        bottomBorder: { show: true, width: 0, height: 1, top: 199, left: 99 },
        leftBorder: { show: true, width: 1, height: 0, top: 80, left: 99 },
        corner: { show: true, top: 195, left: 395 },
      })
    })

    it('gives the same box when the cells are swapped', () => {
      const a = getRangeBorders({ currentCellRect: current, normalEndCellRect: end, leftmostCell: 'current' })
      const b = getRangeBorders({ currentCellRect: end, normalEndCellRect: current, leftmostCell: 'normalEnd' })
      expect(b).toEqual(a)
    })

    it('leaves the horizontal position at 0 when the leftmost cell is unknown', () => {
      const borders = getRangeBorders({ currentCellRect: current, normalEndCellRect: end, leftmostCell: null })
      expect(borders.borderWidth).toBe(0)
      expect(borders.topBorder.left).toBe(0)
      expect(borders.borderHeight).toBe(120)
    })
  })

  describe('getAutofillAreaBorders', () => {
    // 单元格 (100, 80) 100x40 的当前单元格边框
    const area = getCurrentCellBorders({ left: 100, top: 80, width: 100, height: 40 }, { hasNormalEndCell: false })

    it('extends down from the selection without a top border', () => {
      const borders = getAutofillAreaBorders({
        direction: 'down',
        area,
        autoFillEndCellRect: { left: 100, top: 160, width: 100, height: 40 },
        isSingleSelection: true,
      })!
      expect(borders.topBorder.show).toBe(false)
      expect(borders.borderWidth).toBe(area.borderWidth)
      expect(borders.borderHeight).toBe(160 - area.bottomBorder.top + 40)
      expect(borders.bottomBorder).toMatchObject({ show: true, top: 199, left: area.bottomBorder.left })
      // 单个单元格的边框是 2px，右边框右移 1px
      expect(borders.rightBorder.left).toBe(area.rightBorder.left + 1)
      expect(borders.corner.show).toBe(false)
    })

    it('does not shift the right border for a range', () => {
      const borders = getAutofillAreaBorders({
        direction: 'down',
        area,
        autoFillEndCellRect: { left: 100, top: 160, width: 100, height: 40 },
        isSingleSelection: false,
      })!
      expect(borders.rightBorder.left).toBe(area.rightBorder.left)
    })

    it('extends up without a bottom border', () => {
      const borders = getAutofillAreaBorders({
        direction: 'up',
        area,
        autoFillEndCellRect: { left: 100, top: 0, width: 100, height: 40 },
        isSingleSelection: true,
      })!
      expect(borders.bottomBorder.show).toBe(false)
      expect(borders.borderHeight).toBe(area.topBorder.top)
      expect(borders.topBorder).toMatchObject({ top: -1, left: area.topBorder.left })
    })

    it('extends right without a left border', () => {
      const borders = getAutofillAreaBorders({
        direction: 'right',
        area,
        autoFillEndCellRect: { left: 300, top: 80, width: 100, height: 40 },
        isSingleSelection: true,
      })!
      expect(borders.leftBorder.show).toBe(false)
      expect(borders.borderWidth).toBe(300 - area.rightBorder.left + 100 + 1)
      expect(borders.borderHeight).toBe(area.borderHeight)
      expect(borders.rightBorder.left).toBe(399)
    })

    it('extends left without a right border', () => {
      const borders = getAutofillAreaBorders({
        direction: 'left',
        area,
        autoFillEndCellRect: { left: 0, top: 80, width: 100, height: 40 },
        isSingleSelection: true,
      })!
      expect(borders.rightBorder.show).toBe(false)
      expect(borders.borderWidth).toBe(area.leftBorder.left + 1)
      expect(borders.leftBorder).toMatchObject({ left: 0, top: area.topBorder.top })
    })

    it('returns null without a direction, and never changes the area', () => {
      const before = JSON.stringify(area)
      expect(getAutofillAreaBorders({ direction: null, area, autoFillEndCellRect: createEmptyCellRect(), isSingleSelection: true })).toBeNull()
      expect(JSON.stringify(area)).toBe(before)
    })
  })

  describe('getAutofillAreaColKeys', () => {
    const params = { leftColKey: 'b', rightColKey: 'c', autoFillEndColKey: 'd', colgroups: COLGROUPS }

    it('covers the selection columns when filling vertically', () => {
      expect(getAutofillAreaColKeys({ ...params, direction: 'down' })).toEqual(['b', 'c'])
      expect(getAutofillAreaColKeys({ ...params, direction: 'up' })).toEqual(['b', 'c'])
    })

    it('starts next to the selection when filling horizontally', () => {
      expect(getAutofillAreaColKeys({ ...params, direction: 'right' })).toEqual(['d', 'd'])
      expect(getAutofillAreaColKeys({ ...params, direction: 'left', autoFillEndColKey: 'a' })).toEqual(['a', 'a'])
    })

    it('returns null without a direction', () => {
      expect(getAutofillAreaColKeys({ ...params, direction: null })).toBeNull()
    })
  })

  describe('getCornerPosition', () => {
    const corner = { show: true, top: 75, left: 195 }

    it('keeps the position inside a normal cell', () => {
      expect(getCornerPosition(corner, { isLastColumn: false, isLastRow: false }))
        .toEqual({ top: 75, left: 195, borderRightWidth: 1, borderBottomWidth: 1 })
    })

    it('moves inwards and drops the outer border on the last row or column', () => {
      expect(getCornerPosition(corner, { isLastColumn: true, isLastRow: false }))
        .toEqual({ top: 75, left: 192, borderRightWidth: 0, borderBottomWidth: 1 })
      expect(getCornerPosition(corner, { isLastColumn: true, isLastRow: true }))
        .toEqual({ top: 72, left: 192, borderRightWidth: 0, borderBottomWidth: 0 })
    })
  })
})
