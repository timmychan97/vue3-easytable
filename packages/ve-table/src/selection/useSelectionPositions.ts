/*
选区单元格的位置跟踪（MOD-05）
- 跟踪当前单元格、结束单元格、填充结束单元格对应的 DOM 元素，并计算它们相对于表格的矩形
- 表格渲染完成后订阅表格事件（滚动、尺寸变化、列宽变化、剪贴板修改单元格），重新订阅前先注销旧的
- 滚动、尺寸变化时的防抖
- 卸载时取消未执行的防抖调用（订阅由表格上下文随组件卸载自动注销，MOD-01）
*/
import type { ComputedRef } from 'vue'
import type { TableEventScope } from '../features/table-context'
import type { CellRect, SelectionCell } from './geometry'
import { isEmptyValue } from '@vue3-easytable/common/utils/index'
import { debounce } from 'lodash'
import { nextTick, onBeforeUnmount, reactive, shallowRef, watch } from 'vue'
import { queryCell, queryFirstRowCell, queryLastRowCell } from '../util/cell-dom'
import { HOOKS_NAME } from '../util/constant'
import { createEmptyCellRect, getCellRectInTable } from './geometry'

export interface SelectionPositionsProps {
  tableEl: HTMLTableElement | null
  allRowKeys: any[]
  parentRendered: boolean
  cellSelectionData: {
    currentCell: SelectionCell
    normalEndCell: SelectionCell
    autoFillEndCell: SelectionCell
  }
  isVirtualScroll: boolean
  virtualScrollVisibleIndexs: { start: number, end: number }
}

export interface SelectionPositionsOptions {
  // 选区边框是否可见（虚拟滚动时选区可能在已渲染的行之外），不可见时不计算单元格位置
  isSelectionVisible: ComputedRef<boolean>
  // 当前单元格或结束单元格变化后调用（在位置更新之后）
  onSelectionCellChange: () => void
  // 表格上下文的订阅作用域（选区组件 setup 中创建）
  tableEvents: TableEventScope
}

type CellRectType = 'currentCell' | 'normalEndCell' | 'autoFillEndCell'

function isCellSet(cell: SelectionCell) {
  return !isEmptyValue(cell.rowKey) && !isEmptyValue(cell.colKey)
}

export function useSelectionPositions(
  props: SelectionPositionsProps,
  { isSelectionVisible, onSelectionCellChange, tableEvents }: SelectionPositionsOptions,
) {
  // 单元格元素（DOM 元素不需要深层响应）
  const currentCellEl = shallowRef<HTMLElement | null>(null)
  const normalEndCellEl = shallowRef<HTMLElement | null>(null)
  const autoFillEndCellEl = shallowRef<HTMLElement | null>(null)

  // 单元格相对于表格的矩形
  const cellSelectionRect = reactive({
    currentCellRect: createEmptyCellRect(),
    normalEndCellRect: createEmptyCellRect(),
    autoFillEndCellRect: createEmptyCellRect(),
  })

  // 已订阅的表格事件的注销函数
  let hookDisposers: (() => void)[] = []

  /* ---------------- 单元格元素 ---------------- */

  // 普通模式与虚拟滚动模式通用，key 会被转义，找不到返回 null
  function getTableCellEl({ rowKey, colKey }: { rowKey: any, colKey: any }) {
    return queryCell(props.tableEl, rowKey, colKey)
  }

  /*
  首行 / 末行（已渲染）中指定列的单元格。
  用作跨页单元格选择：表格大小变化或者存在横向滚动条时，区域选择位置自动校准
  */
  function getTableFirstRowCellByColKey(colKey: any) {
    return queryFirstRowCell(props.tableEl, colKey)
  }

  function getTableLastRowCellByColKey(colKey: any) {
    return queryLastRowCell(props.tableEl, colKey)
  }

  function setCurrentCellEl() {
    const { currentCell } = props.cellSelectionData
    if (isCellSet(currentCell)) {
      const cellEl = getTableCellEl(currentCell)
      if (cellEl)
        currentCellEl.value = cellEl
    }
  }

  function setNormalEndCellEl() {
    const { normalEndCell } = props.cellSelectionData
    if (isCellSet(normalEndCell)) {
      const cellEl = getTableCellEl(normalEndCell)
      if (cellEl)
        normalEndCellEl.value = cellEl
    }
  }

  function setAutofillEndCellEl() {
    const cellEl = getTableCellEl(props.cellSelectionData.autoFillEndCell)
    if (cellEl)
      autoFillEndCellEl.value = cellEl
  }

  // 虚拟滚动时重新查找单元格元素（滚动后行会被重新渲染）
  function setCellEls() {
    if (props.isVirtualScroll && isSelectionVisible.value) {
      setCurrentCellEl()
      setNormalEndCellEl()
    }
  }

  function clearCurrentCellRect() {
    currentCellEl.value = null
    cellSelectionRect.currentCellRect = createEmptyCellRect()
  }

  function clearNormalEndCellRect() {
    normalEndCellEl.value = null
    cellSelectionRect.normalEndCellRect = createEmptyCellRect()
  }

  function clearAutofillEndCellRect() {
    autoFillEndCellEl.value = null
    cellSelectionRect.autoFillEndCellRect = createEmptyCellRect()
  }

  /* ---------------- 单元格位置 ---------------- */

  // 单元格相对于表格的矩形；选区不可见时返回 false，单元格没有尺寸时返回 undefined
  function getCellPosition({ cellEl, tableLeft, tableTop }: { cellEl: HTMLElement, tableLeft: number, tableTop: number }) {
    if (!isSelectionVisible.value)
      return false

    return getCellRectInTable(cellEl.getBoundingClientRect(), tableLeft, tableTop)
  }

  // 已渲染的首行 / 末行中指定列的单元格位置（不含高度），用于校准超出虚拟滚动渲染范围的单元格
  function getCellPositionByColKey({
    tableLeft,
    tableTop,
    colKey,
    isFirstRow,
    isLastRow,
  }: {
    tableLeft: number
    tableTop: number
    colKey: any
    isFirstRow?: boolean
    isLastRow?: boolean
  }) {
    if (!isSelectionVisible.value)
      return false

    let cellEl: HTMLElement | null | undefined
    if (isFirstRow)
      cellEl = getTableFirstRowCellByColKey(colKey)
    else if (isLastRow)
      cellEl = getTableLastRowCellByColKey(colKey)

    if (!cellEl)
      return

    const { left: cellLeft, top: cellTop, width: cellWidth } = cellEl.getBoundingClientRect()

    if (cellWidth) {
      return {
        left: cellLeft - tableLeft,
        top: cellTop - tableTop,
        width: cellWidth,
      }
    }
  }

  function setSelectionPositions({ type }: { type: CellRectType }) {
    const { allRowKeys, tableEl, cellSelectionData, virtualScrollVisibleIndexs } = props

    // table empty
    if (allRowKeys.length === 0)
      return false

    if (!tableEl)
      return false

    const { left: tableLeft, top: tableTop } = tableEl.getBoundingClientRect()

    let isCurrentCellOverflow = false
    let isNormalEndCellOverflow = false

    // set current cell position
    if (type === 'currentCell') {
      isCurrentCellOverflow = true
      if (currentCellEl.value) {
        const rect = getCellPosition({ cellEl: currentCellEl.value, tableLeft, tableTop })
        if (rect) {
          isCurrentCellOverflow = false
          cellSelectionRect.currentCellRect = rect
        }
      }
    }

    // set normal end cell position
    if (type === 'normalEndCell') {
      isNormalEndCellOverflow = true
      if (normalEndCellEl.value) {
        const rect = getCellPosition({ cellEl: normalEndCellEl.value, tableLeft, tableTop })
        if (rect) {
          isNormalEndCellOverflow = false
          cellSelectionRect.normalEndCellRect = rect
        }
      }
    }

    // 虚拟滚动时单元格超出了已渲染的行：用首行 / 末行校准
    if ((isCurrentCellOverflow || isNormalEndCellOverflow) && props.isVirtualScroll) {
      const { currentCell, normalEndCell } = cellSelectionData
      // 弥补的
      let mackUpColKey
      let mackUpRowIndex

      if (isCurrentCellOverflow) {
        mackUpColKey = currentCell.colKey
        mackUpRowIndex = currentCell.rowIndex as number
      }
      else {
        mackUpColKey = normalEndCell.colKey
        mackUpRowIndex = normalEndCell.rowIndex as number
      }

      let mackUpRect: Partial<CellRect> | false | undefined
      // 当没有 currentCellRect 或 normalCellRect 时 进行纠正，否则只更新top值
      if (
        (isCurrentCellOverflow && !cellSelectionRect.currentCellRect.height)
        || (isNormalEndCellOverflow && !cellSelectionRect.normalEndCellRect.height)
      ) {
        const mackUpRectParams = {
          tableLeft,
          tableTop,
          colKey: mackUpColKey,
        }
        // 上方超出
        if (mackUpRowIndex < virtualScrollVisibleIndexs.start) {
          mackUpRect = getCellPositionByColKey({
            ...mackUpRectParams,
            isFirstRow: true,
          })
        }
        // 下方超出
        else if (mackUpRowIndex > virtualScrollVisibleIndexs.end) {
          mackUpRect = getCellPositionByColKey({
            ...mackUpRectParams,
            isLastRow: true,
          })
        }
      }
      // 仅更新 top 值
      else {
        // 上方超出
        if (mackUpRowIndex < virtualScrollVisibleIndexs.start) {
          mackUpRect = {
            top: 0,
          }
        }
        // 下方超出
        else if (mackUpRowIndex > virtualScrollVisibleIndexs.end) {
          mackUpRect = {
            top: tableEl.clientHeight,
          }
        }
      }

      if (isCurrentCellOverflow)
        Object.assign(cellSelectionRect.currentCellRect, mackUpRect)
      else
        Object.assign(cellSelectionRect.normalEndCellRect, mackUpRect)
    }

    if (autoFillEndCellEl.value && type === 'autoFillEndCell') {
      const rect = getCellPosition({ cellEl: autoFillEndCellEl.value, tableLeft, tableTop })
      if (rect)
        cellSelectionRect.autoFillEndCellRect = rect
    }
  }

  // 重新计算当前单元格与结束单元格的位置
  function resetCellPositions() {
    const { currentCell, normalEndCell } = props.cellSelectionData
    if (isCellSet(currentCell))
      setSelectionPositions({ type: 'currentCell' })

    if (isCellSet(normalEndCell))
      setSelectionPositions({ type: 'normalEndCell' })
  }

  const debounceResetCellPositions = debounce(resetCellPositions, 210)
  const debounceSetCellEls = debounce(setCellEls, 200)

  /* ---------------- 表格事件 ---------------- */

  // 注销已订阅的所有表格事件
  function removeHooks() {
    hookDisposers.forEach(dispose => dispose())
    hookDisposers = []
  }

  function addHooks() {
    hookDisposers = [
      // table container scroll
      tableEvents.on(HOOKS_NAME.TABLE_CONTAINER_SCROLL, () => {
        setCellEls()
        debounceSetCellEls()

        resetCellPositions()
        debounceResetCellPositions()
      }),
      // table size change
      tableEvents.on(HOOKS_NAME.TABLE_SIZE_CHANGE, () => {
        debounceResetCellPositions()
      }),
      // table td width change
      tableEvents.on(HOOKS_NAME.TABLE_CELL_WIDTH_CHANGE, () => {
        nextTick(() => {
          resetCellPositions()
        })
      }),
      // clipboard cell value change
      tableEvents.on(HOOKS_NAME.CLIPBOARD_CELL_VALUE_CHANGE, () => {
        nextTick(() => {
          // 插入 / 删除行后单元格元素可能已变化，先重新查找再计算位置
          setCurrentCellEl()
          setNormalEndCellEl()
          resetCellPositions()
        })
      }),
    ]
  }

  watch(
    () => props.parentRendered,
    (val) => {
      if (val) {
        // 先注销旧的订阅，避免重复注册
        removeHooks()
        addHooks()
      }
    },
    { immediate: true },
  )

  /* ---------------- 选区单元格变化 ---------------- */

  watch(
    () => props.cellSelectionData.currentCell,
    (cell) => {
      if (isCellSet(cell)) {
        setCurrentCellEl()
        setSelectionPositions({ type: 'currentCell' })
      }
      else {
        clearCurrentCellRect()
      }
      onSelectionCellChange()
    },
    { deep: true, immediate: true },
  )

  watch(
    () => props.cellSelectionData.normalEndCell,
    (cell) => {
      if (isCellSet(cell)) {
        setNormalEndCellEl()
        setSelectionPositions({ type: 'normalEndCell' })
      }
      else {
        clearNormalEndCellRect()
      }
      onSelectionCellChange()
    },
    { deep: true, immediate: true },
  )

  watch(
    () => props.cellSelectionData.autoFillEndCell,
    (cell) => {
      if (isCellSet(cell)) {
        setAutofillEndCellEl()
        setSelectionPositions({ type: 'autoFillEndCell' })
      }
      else {
        clearAutofillEndCellRect()
      }
    },
    { deep: true, immediate: true },
  )

  onBeforeUnmount(() => {
    // 订阅由表格上下文在组件卸载时自动注销（INFRA-01）；这里取消未执行的防抖调用
    debounceResetCellPositions.cancel()
    debounceSetCellEls.cancel()
  })

  return {
    currentCellEl,
    normalEndCellEl,
    autoFillEndCellEl,
    cellSelectionRect,
    getTableCellEl,
    getTableFirstRowCellByColKey,
    getTableLastRowCellByColKey,
    setCurrentCellEl,
    setNormalEndCellEl,
    setAutofillEndCellEl,
    setCellEls,
    setSelectionPositions,
    resetCellPositions,
    clearCurrentCellRect,
    clearNormalEndCellRect,
    clearAutofillEndCellRect,
    removeHooks,
  }
}
