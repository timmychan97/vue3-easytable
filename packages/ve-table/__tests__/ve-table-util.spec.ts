/*
表格工具函数单元测试
*/

import { getColKeysByRangeColKeys } from '@/ve-table/src/util'

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
})
