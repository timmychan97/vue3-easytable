/*
表格工具函数单元测试
*/

import {
  getColKeysByHeaderColumn,
  getColKeysByRangeColKeys,
  getColumnByColkey,
  getNextColKey,
  setBodyContextmenuOptions,
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

    // COL-02：不允许左冻结最后一列
    it('does not left-fix the last column (COL-02)', () => {
      const cloneColumns: any[] = [
        { key: 'a', field: 'a', _level: 1, _keys: 'a' },
        { key: 'b', field: 'b', _level: 1, _keys: 'b' },
        { key: 'c', field: 'c', _level: 1, _keys: 'c' },
      ]

      const result = setColumnFixed({
        cloneColumns,
        cellSelectionRangeData: { leftColKey: 'c', rightColKey: 'c' },
        fixedType: COLUMN_FIXED_TYPE.LEFT,
        colgroups: cloneColumns,
        enableColumnResize: false,
      })

      expect(result.map(x => x.fixed || '')).toEqual(['left', 'left', ''])
    })

    // RIGHT 分支：不允许右冻结第一列（原本就正确，作为对照）
    it('does not right-fix the first column', () => {
      const cloneColumns: any[] = [
        { key: 'a', field: 'a', _level: 1, _keys: 'a' },
        { key: 'b', field: 'b', _level: 1, _keys: 'b' },
        { key: 'c', field: 'c', _level: 1, _keys: 'c' },
      ]

      const result = setColumnFixed({
        cloneColumns,
        cellSelectionRangeData: { leftColKey: 'a', rightColKey: 'a' },
        fixedType: COLUMN_FIXED_TYPE.RIGHT,
        colgroups: cloneColumns,
        enableColumnResize: false,
      })

      expect(result.map(x => x.fixed || '')).toEqual(['', 'right', 'right'])
    })
  })

  // SEL-14：列 key 为 0 时也是有效的 key
  describe('colKey 0 (SEL-14)', () => {
    const zeroColgroups: any[] = [
      { key: 'a', field: 'a', _level: 1, _keys: 'a' },
      { key: 0, field: 'zero', _level: 1, _keys: 0 },
      { key: 'c', field: 'c', _level: 1, _keys: 'c' },
    ]

    it('getColumnByColkey finds the column with key 0', () => {
      expect(getColumnByColkey(0, zeroColgroups)).toBe(zeroColgroups[1])
    })

    it('getColumnByColkey still returns null for an empty key', () => {
      expect(getColumnByColkey('', zeroColgroups)).toBeNull()
      expect(getColumnByColkey(null as any, zeroColgroups)).toBeNull()
      expect(getColumnByColkey(undefined as any, zeroColgroups)).toBeNull()
    })

    it('getColKeysByHeaderColumn accepts a numeric key', () => {
      expect(getColKeysByHeaderColumn({ headerColumnItem: { _keys: 0 } })).toEqual(['0'])
    })

    it('setColumnFixed works when a column before the target has key 0', () => {
      const cloneColumns = zeroColgroups.map(x => ({ ...x }))

      const result = setColumnFixed({
        cloneColumns,
        cellSelectionRangeData: { leftColKey: 'c', rightColKey: 'c' },
        fixedType: COLUMN_FIXED_TYPE.RIGHT,
        colgroups: cloneColumns,
        enableColumnResize: false,
      })

      expect(result.map(x => x.fixed || '')).toEqual(['', '', 'right'])
    })

    it('setColumnFixed left-fixes up to the column with key 0', () => {
      const cloneColumns = zeroColgroups.map(x => ({ ...x }))

      const result = setColumnFixed({
        cloneColumns,
        cellSelectionRangeData: { leftColKey: 0, rightColKey: 0 },
        fixedType: COLUMN_FIXED_TYPE.LEFT,
        colgroups: cloneColumns,
        enableColumnResize: false,
      })

      expect(result.map(x => x.fixed || '')).toEqual(['left', 'left', ''])
    })
  })

  describe('getNextColKey', () => {
    it('returns the next key, or the same key on the last column', () => {
      expect(getNextColKey({ colgroups, currentColKey: 'b' })).toBe('c')
      expect(getNextColKey({ colgroups, currentColKey: 'd' })).toBe('d')
    })

    // SEL-05：未知的列 key 不应返回第一列
    it('returns null for an unknown key (SEL-05)', () => {
      expect(getNextColKey({ colgroups, currentColKey: 'x' })).toBeNull()
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
  // MENU-01：未实现的菜单类型（删除列、隐藏列）不应出现在内置菜单集合中
  describe('contextmenu option collections (MENU-01)', () => {
    const t = (key: string) => key
    const customItem = { label: 'Custom item' }
    const removeColumnItem = { type: 'REMOVE_COLUMN', label: 'Remove it' }

    it('keeps a header menu item without a type as the user wrote it', () => {
      const options = setHeaderContextmenuOptions({
        column: colgroups[0],
        contextmenuHeaderOption: {
          contextmenus: [customItem, removeColumnItem],
        },
        cellSelectionRangeData: {
          leftColKey: 'a',
          rightColKey: 'a',
          topRowKey: 0,
          bottomRowKey: 0,
        },
        colgroups,
        allRowKeys: [0],
        headerIndicatorColKeys: { startColKey: 'a', endColKey: 'a' },
        enableHeaderContextmenu: true,
        t,
      }) as any[]

      expect(options).toEqual([customItem, removeColumnItem])
    })

    it('keeps a body menu item without a type as the user wrote it', () => {
      const options = setBodyContextmenuOptions({
        enableBodyContextmenu: true,
        contextmenuBodyOption: {
          contextmenus: [customItem, removeColumnItem],
        },
        cellSelectionRangeData: {
          leftColKey: 'a',
          rightColKey: 'a',
          topRowKey: 0,
          bottomRowKey: 0,
        },
        colgroups,
        allRowKeys: [0],
        bodyIndicatorRowKeys: { startRowKey: '', endRowKey: '' },
        t,
      }) as any[]

      expect(options).toEqual([customItem, removeColumnItem])
    })
  })
})
