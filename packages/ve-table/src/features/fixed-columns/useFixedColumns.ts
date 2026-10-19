import type { ComputedRef, InjectionKey, MaybeRefOrGetter } from 'vue'
import { getValByUnit } from '@vue3-easytable/common/utils'
import { computed, inject, toValue } from 'vue'
import { clsName, getFixedTotalWidthByColumnKey } from '../../util/index'

/**
 * 固定列的样式与 class（MOD-06）
 *
 * 之前表头（header-th）、表体（body/index 的 columnCollection）、表尾（footer-td）各自计算
 * 固定列的 left / right 偏移和 last-left-fixed-column / first-right-fixed-column，
 * 三份实现逐渐不一致（COL-06：表体和表尾按 field 比较）。现在在表格级按 colgroups 计算一次，
 * 通过 provide / inject 共享：每个叶子列一项，按列 key 查找。
 * 表头的分组列由它的第一个 / 最后一个叶子列得出（getHeaderFixedInfo）。
 */

type ColKey = string | number

export interface FixedColumnInfo {
  fixed: 'left' | 'right' | undefined
  // 只有固定列才有 left / right（与之前的输出一致：另一侧为 ''）
  style: { left?: string | number, right?: string | number }
  // fixed-left、fixed-right、last-left-fixed-column、first-right-fixed-column
  class: Record<string, boolean>
}

export interface FixedColumns {
  fixedColumnsMap: ComputedRef<Map<ColKey, FixedColumnInfo>>
  getColumnFixedInfo: (colKey: ColKey) => FixedColumnInfo
  getHeaderFixedInfo: (column: { fixed?: any, _keys?: string }) => FixedColumnInfo
}

export const FIXED_COLUMNS_KEY: InjectionKey<FixedColumns> = Symbol('veTableFixedColumns')

const CLASS_FIXED_LEFT = clsName('fixed-left')
const CLASS_FIXED_RIGHT = clsName('fixed-right')
const CLASS_LAST_LEFT_FIXED = clsName('last-left-fixed-column')
const CLASS_FIRST_RIGHT_FIXED = clsName('first-right-fixed-column')

function createInfo(fixed: any, style: FixedColumnInfo['style'], isLastLeft: boolean, isFirstRight: boolean): FixedColumnInfo {
  return {
    fixed,
    style,
    class: {
      [CLASS_FIXED_LEFT]: fixed === 'left',
      [CLASS_FIXED_RIGHT]: fixed === 'right',
      [CLASS_LAST_LEFT_FIXED]: isLastLeft,
      [CLASS_FIRST_RIGHT_FIXED]: isFirstRight,
    },
  }
}

const NOT_FIXED_INFO: FixedColumnInfo = createInfo(undefined, {}, false, false)

/*
 * 固定列的 left / right 偏移：同侧、更靠外的固定列的实时宽度之和。
 * 最外侧的固定列（第一列 / 最后一列）为 0。与之前三处的计算完全相同。
 */
function getFixedStyle(colgroups: any[], colKey: ColKey, fixed: any): FixedColumnInfo['style'] {
  let totalWidth: any = 0
  const columnIndex = colgroups.findIndex(x => x.key === colKey)
  if (
    (fixed === 'left' && columnIndex > 0)
    || (fixed === 'right' && columnIndex < colgroups.length - 1)
  ) {
    totalWidth = getValByUnit(getFixedTotalWidthByColumnKey({ colgroups, colKey, fixed }))
  }

  return {
    left: fixed === 'left' ? totalWidth : '',
    right: fixed === 'right' ? totalWidth : '',
  }
}

export function useFixedColumns(colgroups: MaybeRefOrGetter<any[]>): FixedColumns {
  const fixedColumnsMap = computed(() => {
    const cols = toValue(colgroups) || []
    const map = new Map<ColKey, FixedColumnInfo>()

    // 按 key 比较（COL-06）：没有 field 的列（复选框列、序号列）field 都是 undefined
    const leftFixedColumns = cols.filter(x => x.fixed === 'left')
    const rightFixedColumns = cols.filter(x => x.fixed === 'right')
    const lastLeftKey = leftFixedColumns.length ? leftFixedColumns[leftFixedColumns.length - 1].key : undefined
    const firstRightKey = rightFixedColumns.length ? rightFixedColumns[0].key : undefined

    cols.forEach((col) => {
      const { key, fixed } = col
      map.set(key, createInfo(
        fixed,
        fixed ? getFixedStyle(cols, key, fixed) : {},
        fixed === 'left' && key === lastLeftKey,
        fixed === 'right' && key === firstRightKey,
      ))
    })

    return map
  })

  // _keys 中的列 key 都是字符串，数字列 key 要换回原始值才能在 fixedColumnsMap / colgroups 中找到（COL-10）
  const colKeyByString = computed(() => {
    const map = new Map<string, ColKey>()
    ;(toValue(colgroups) || []).forEach(col => map.set(String(col.key), col.key))
    return map
  })

  function getColumnFixedInfo(colKey: ColKey) {
    return fixedColumnsMap.value.get(colKey) || NOT_FIXED_INFO
  }

  /*
   * 表头单元格（叶子列或分组列）
   * - left 偏移取第一个叶子列，right 偏移取最后一个叶子列；
   * - 最后一个叶子列是最后一个左固定列时为 last-left-fixed-column，
   *   第一个叶子列是第一个右固定列时为 first-right-fixed-column。
   * 分组列的 _keys 形如 "a|b|"，叶子列为 "a"
   */
  function getHeaderFixedInfo(column: { fixed?: any, _keys?: string }) {
    const { fixed } = column
    if (!fixed)
      return NOT_FIXED_INFO

    const keys = String(column._keys ?? '').split('|')
    const toColKey = (key: string): ColKey => colKeyByString.value.get(key) ?? key
    const firstKey = toColKey(keys[0])
    const lastKey = toColKey(keys.length === 1 ? keys[0] : keys[keys.length - 2])

    const firstInfo = fixedColumnsMap.value.get(firstKey)
    const lastInfo = fixedColumnsMap.value.get(lastKey)

    const edgeKey = fixed === 'left' ? firstKey : fixed === 'right' ? lastKey : ''
    let style: FixedColumnInfo['style']
    // 0 也是有效的列 key
    if (edgeKey === '') {
      style = { left: fixed === 'left' ? 0 : '', right: fixed === 'right' ? 0 : '' }
    }
    else {
      const edgeInfo = fixed === 'left' ? firstInfo : lastInfo
      // 叶子列继承分组列的 fixed，通常直接使用缓存
      style = edgeInfo && edgeInfo.fixed === fixed
        ? edgeInfo.style
        : getFixedStyle(toValue(colgroups) || [], edgeKey, fixed)
    }

    return createInfo(
      fixed,
      style,
      fixed === 'left' && !!lastInfo?.class[CLASS_LAST_LEFT_FIXED],
      fixed === 'right' && !!firstInfo?.class[CLASS_FIRST_RIGHT_FIXED],
    )
  }

  return {
    fixedColumnsMap,
    getColumnFixedInfo,
    getHeaderFixedInfo,
  }
}

export function injectFixedColumns(): FixedColumns {
  const fixedColumns = inject(FIXED_COLUMNS_KEY, null)
  if (!fixedColumns)
    throw new Error('[vue3-easytable] fixed columns are only available inside VeTable')
  return fixedColumns
}
