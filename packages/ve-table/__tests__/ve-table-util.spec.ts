/*
表格工具函数单元测试
*/

import {
  getColKeysByRangeColKeys,
  setColumnFixed,
  setHeaderContextmenuOptions,
} from '@/ve-table/src/util'
import {
  COLUMN_FIXED_TYPE,
  CONTEXTMENU_NODE_TYPES,
} from '@/ve-table/src/util/constant'

describe('veTable util', () => {
  const colgroups = [{ key: 'a' }, { key: 'b' }, { key: 'c' }, { key: 'd' }]

  describe('getColKeysByRangeColKeys', () => {
    it('returns the keys between two known col keys in either order', () => {
      expect(
        getColKeysByRangeColKeys({ colKey1: 'b', colKey2: 'd', colgroups }),
      ).toEqual(['b', 'c', 'd'])
      expect(
        getColKeysByRangeColKeys({ colKey1: 'd', colKey2: 'b', colgroups }),
      ).toEqual(['b', 'c', 'd'])
    })

    it('returns null when colKey2 is unknown', () => {
      expect(
        getColKeysByRangeColKeys({ colKey1: 'b', colKey2: 'x', colgroups }),
      ).toBeNull()
    })

    it('returns null when colKey1 is unknown', () => {
      expect(
        getColKeysByRangeColKeys({ colKey1: 'x', colKey2: 'b', colgroups }),
      ).toBeNull()
    })
  })

  // 左右固定列：a 左固定，b 不固定，c 右固定
  const createFixedColumns = (): any[] => [
    { key: 'a', field: 'a', _level: 1, _keys: 'a', fixed: 'left' },
    { key: 'b', field: 'b', _level: 1, _keys: 'b' },
    { key: 'c', field: 'c', _level: 1, _keys: 'c', fixed: 'right' },
  ]

  describe('setColumnFixed', () => {
    it('keeps the columns when right-fixing a left-fixed column', () => {
      const cloneColumns = createFixedColumns()

      const result = setColumnFixed({
        cloneColumns,
        cellSelectionRangeData: { leftColKey: 'a', rightColKey: 'a' },
        fixedType: COLUMN_FIXED_TYPE.RIGHT,
        colgroups: cloneColumns,
        enableColumnResize: false,
      })

      expect(result).toBe(cloneColumns)
      expect(result.map(x => x.fixed)).toEqual(['left', undefined, 'right'])
    })

    it('keeps the columns when left-fixing a right-fixed column', () => {
      const cloneColumns = createFixedColumns()

      const result = setColumnFixed({
        cloneColumns,
        cellSelectionRangeData: { leftColKey: 'c', rightColKey: 'c' },
        fixedType: COLUMN_FIXED_TYPE.LEFT,
        colgroups: cloneColumns,
        enableColumnResize: false,
      })

      expect(result).toBe(cloneColumns)
      expect(result.map(x => x.fixed)).toEqual(['left', undefined, 'right'])
    })
  })

  describe('setHeaderContextmenuOptions', () => {
    const getOptions = ({ leftColKey, rightColKey }) => {
      const fixedColgroups = createFixedColumns()
      return setHeaderContextmenuOptions({
        column: fixedColgroups.find(x => x.key === leftColKey),
        contextmenuHeaderOption: {
          contextmenus: [
            { type: CONTEXTMENU_NODE_TYPES.LEFT_FIXED_COLUMN_TO },
            { type: CONTEXTMENU_NODE_TYPES.RIGHT_FIXED_COLUMN_TO },
          ],
        },
        cellSelectionRangeData: {
          leftColKey,
          rightColKey,
          topRowKey: 0,
          bottomRowKey: 0,
        },
        colgroups: fixedColgroups,
        allRowKeys: [0],
        headerIndicatorColKeys: {
          startColKey: leftColKey,
          endColKey: rightColKey,
        },
        enableHeaderContextmenu: true,
        t: (key: string) => key,
      }) as any[]
    }

    const isDisabled = (options: any[], type: string) =>
      !!options.find(x => x.type === type).disabled

    it('disables "right fixed column to" on a left-fixed column', () => {
      const options = getOptions({ leftColKey: 'a', rightColKey: 'a' })

      expect(
        isDisabled(options, CONTEXTMENU_NODE_TYPES.RIGHT_FIXED_COLUMN_TO),
      ).toBe(true)
      expect(
        isDisabled(options, CONTEXTMENU_NODE_TYPES.LEFT_FIXED_COLUMN_TO),
      ).toBe(false)
    })

    it('disables "left fixed column to" on a right-fixed column', () => {
      const options = getOptions({ leftColKey: 'c', rightColKey: 'c' })

      expect(
        isDisabled(options, CONTEXTMENU_NODE_TYPES.LEFT_FIXED_COLUMN_TO),
      ).toBe(true)
      expect(
        isDisabled(options, CONTEXTMENU_NODE_TYPES.RIGHT_FIXED_COLUMN_TO),
      ).toBe(false)
    })

    it('enables both directions on a column that is not fixed', () => {
      const options = getOptions({ leftColKey: 'b', rightColKey: 'b' })

      expect(
        isDisabled(options, CONTEXTMENU_NODE_TYPES.LEFT_FIXED_COLUMN_TO),
      ).toBe(false)
      expect(
        isDisabled(options, CONTEXTMENU_NODE_TYPES.RIGHT_FIXED_COLUMN_TO),
      ).toBe(false)
    })

    // 与 setColumnFixed 一致：左固定看选区右边界列，右固定看选区左边界列
    it('checks the same range edge as setColumnFixed', () => {
      const options = getOptions({ leftColKey: 'a', rightColKey: 'b' })

      expect(
        isDisabled(options, CONTEXTMENU_NODE_TYPES.LEFT_FIXED_COLUMN_TO),
      ).toBe(false)
      expect(
        isDisabled(options, CONTEXTMENU_NODE_TYPES.RIGHT_FIXED_COLUMN_TO),
      ).toBe(true)
    })
  })
})
