/**
 * 列宽测量（MOD-02）
 *
 * 真实表格中有一行隐藏的测量单元格（COL-07），每列一个 ResizeObserver。
 * 测得的宽度先缓存在 measureColsWidths 中，防抖（0ms）之后一次写入 colgroups[]._realTimeWidth，
 * 再通知子组件（TABLE_CELL_WIDTH_CHANGE）。
 *
 * COL-15：测量单元格按列 key 复用，列变化时不再重新创建。列变化后 colgroups 被重新生成
 * （_realTimeWidth 回到列配置的宽度），而宽度没有变化的单元格不会再回调，
 * 所以在 columnsOptionResetTime 变化后重新上报缓存的宽度（与 header-tr 的 RENDER-12 相同）。
 */
import type { DebouncedFunc } from 'lodash'
import type { Ref } from 'vue'
import type { ColgroupData } from '../../ve-table-types'
import type { TableContext } from '../table-context'
import type { ColKey } from './useColumns'
import { debounce } from 'lodash'
import { markRaw, onUnmounted, watch } from 'vue'
import { HOOKS_NAME } from '../../util/constant'

export interface UseColumnMeasureOptions {
  colgroups: Ref<ColgroupData[]>
  columnsOptionResetTime: Ref<number>
  tableContext: TableContext
}

export interface UseColumnMeasure {
  // 列 key → 测得的宽度。非响应式（markRaw）
  measureColsWidths: Map<ColKey, number>
  // 测量单元格的回调（on-dom-resize-change）
  measureCellSizeChange: (params: { key: ColKey, width: number }) => void
  // 把测得的宽度写入 colgroups，并通知子组件
  measureCellWidthChange: (colWidths: Map<ColKey, number>) => void
  debouncedMeasureCellWidthChange: DebouncedFunc<(colWidths: Map<ColKey, number>) => void>
}

export function useColumnMeasure(options: UseColumnMeasureOptions): UseColumnMeasure {
  const { colgroups, columnsOptionResetTime, tableContext } = options

  const measureColsWidths = markRaw(new Map<ColKey, number>())

  function measureCellWidthChange(colWidths: Map<ColKey, number>) {
    colgroups.value = colgroups.value.map((item) => {
      // 还没有测量过的列（例如刚显示、测量单元格的 ResizeObserver 尚未回调）保留当前宽度（COL-15）
      if (colWidths.has(item.key))
        item._realTimeWidth = colWidths.get(item.key)
      return item
    })

    tableContext.emit(HOOKS_NAME.TABLE_CELL_WIDTH_CHANGE)
  }

  // 同一次布局中各列的回调合并为一次更新（bug fixed #467）
  const debouncedMeasureCellWidthChange = debounce(measureCellWidthChange, 0)

  function measureCellSizeChange({ key, width }: { key: ColKey, width: number }) {
    measureColsWidths.set(key, width)
    debouncedMeasureCellWidthChange(measureColsWidths)
  }

  /*
   * COL-15：列变化后重新上报最近测得的宽度；宽度确实变化的列之后会由 ResizeObserver 再上报。
   * 已不存在的列从缓存中删除，之后再显示时等待新单元格的测量结果。
   * flush: 'post'：在本次更新（包括重新生成 colgroups 与测量单元格）之后执行
   */
  watch(columnsOptionResetTime, () => {
    const colKeys = new Set(colgroups.value.map(x => x.key))
    Array.from(measureColsWidths.keys()).forEach((key) => {
      if (!colKeys.has(key))
        measureColsWidths.delete(key)
    })
    if (measureColsWidths.size)
      debouncedMeasureCellWidthChange(measureColsWidths)
  }, { flush: 'post' })

  // 取消未执行的防抖调用，避免卸载后仍更新 colgroups / 触发表格事件（INFRA-03）
  onUnmounted(() => {
    debouncedMeasureCellWidthChange.cancel()
  })

  return {
    measureColsWidths,
    measureCellSizeChange,
    measureCellWidthChange,
    debouncedMeasureCellWidthChange,
  }
}
