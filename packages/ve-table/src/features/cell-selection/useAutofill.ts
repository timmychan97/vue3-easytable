/**
 * 拖动选区角标填充（autofill，MOD-02）
 *
 * - 拖动开始（角标 mousedown）：isAutofillStarting = true，在 window 上监听 mouseup / blur（FILL-02）
 * - 拖动中：鼠标经过的单元格记为 autoFillEndCell，填充方向 autofillingDirection 由选区与结束单元格计算（FILL-01）
 * - 拖动结束：isAutofillStarting 变为 false 时提交填充（setCellSelectionByAutofill），
 *   取消填充时先清空结束单元格，提交时因此什么也不做
 */
import type { ComputedRef, Ref } from 'vue'
import type { AutofillingDirection } from '../../selection/geometry'
import type { VeTableProps } from '../../ve-table-props'
import type { CellKey, ColgroupData } from '../../ve-table-types'
import type { AppliedCellChange } from '../cell-value-change'
import type { TableContext } from '../table-context'
import type { UseCellSelectionState } from './useCellSelectionState'
import { isBoolean, isEmptyValue, isFunction } from '@vue3-easytable/common/utils'
import { computed, onUnmounted, ref, watch } from 'vue'
import { getAutofillDirection } from '../../selection/geometry'
import { AUTOFILLING_DIRECTION, CURRENT_CELL_SELECTION_TYPES, HOOKS_NAME } from '../../util/constant'
import { cellAutofill, getAutofillChanges, isCellInSelectionRange } from '../../util/index'
import { safeCall } from '../../util/safe-call'
import { getCellValueCallbacks } from '../cell-value-change'

type RowKey = string | number
type ColKey = string | number

export interface UseAutofillOptions {
  props: Pick<VeTableProps, 'cellAutofillOption' | 'tableData' | 'rowKeyFieldName' | 'editOption'>
  colgroups: Ref<ColgroupData[]>
  allRowKeys: ComputedRef<RowKey[]>
  state: Pick<
    UseCellSelectionState,
    | 'cellSelectionData'
    | 'cellSelectionRangeData'
    | 'currentCellSelectionType'
    | 'cellSelectionCurrentCellChange'
    | 'cellSelectionNormalEndCellChange'
    | 'clearCellSelectionAutofillEndCell'
  >
  // 滚动容器：只有在容器内释放鼠标才提交填充
  containerElement: Ref<HTMLElement | null>
  tableContext: TableContext
}

export interface UseAutofill {
  isAutofillStarting: Ref<boolean>
  autofillingDirection: ComputedRef<AutofillingDirection | null>
  setCellSelectionByAutofill: () => false | void
  cellSelectionCornerMousedown: (params: { event: MouseEvent }) => void
  cellSelectionCornerMouseup: (params: { event: MouseEvent }) => void
  cancelAutofill: () => void
  addAutofillWindowListeners: () => void
  removeAutofillWindowListeners: () => void
  autofillWindowMouseup: (event: MouseEvent) => void
}

export function useAutofill(options: UseAutofillOptions): UseAutofill {
  const { props, colgroups, allRowKeys, state, containerElement, tableContext } = options
  const { cellSelectionData, cellSelectionRangeData, currentCellSelectionType } = state

  const isAutofillStarting = ref(false)

  /*
   * 填充方向（FILL-01）：由选区与 autofill 结束单元格的行列位置计算，不再由选区层在渲染时派发。
   * 结束单元格为空（拖动开始前 / 结束后）、在选区内或方向不被允许时为 null
   */
  const autofillingDirection = computed<AutofillingDirection | null>(() => {
    const { cellAutofillOption } = props
    if (!cellAutofillOption)
      return null

    const { currentCell, autoFillEndCell } = cellSelectionData.value
    if (isEmptyValue(autoFillEndCell.rowKey) || isEmptyValue(autoFillEndCell.colKey))
      return null

    let { leftColKey, rightColKey, topRowKey, bottomRowKey } = cellSelectionRangeData.value
    if (currentCellSelectionType.value === CURRENT_CELL_SELECTION_TYPES.SINGLE) {
      leftColKey = currentCell.colKey
      rightColKey = currentCell.colKey
      topRowKey = currentCell.rowKey
      bottomRowKey = currentCell.rowKey
    }
    else if (currentCellSelectionType.value !== CURRENT_CELL_SELECTION_TYPES.RANGE) {
      return null
    }

    const rowKeys = allRowKeys.value
    const colIndexOf = (colKey: ColKey) => colgroups.value.findIndex(x => x.key === colKey)
    const { directionX, directionY } = isBoolean(cellAutofillOption) ? {} as Record<string, never> : cellAutofillOption

    return getAutofillDirection({
      range: {
        top: rowKeys.indexOf(topRowKey),
        bottom: rowKeys.indexOf(bottomRowKey),
        left: colIndexOf(leftColKey),
        right: colIndexOf(rightColKey),
      },
      endRowIndex: rowKeys.indexOf(autoFillEndCell.rowKey),
      endColIndex: colIndexOf(autoFillEndCell.colKey),
      directionX,
      directionY,
    })
  })

  // 填充后的新选区（活动单元格与结束单元格），结束单元格在选区内时返回 null
  function getNextSelection(direction: AutofillingDirection): { current: CellKey, normalEnd: CellKey } | null {
    const { autoFillEndCell, currentCell } = cellSelectionData.value
    const { rowKey, colKey } = autoFillEndCell
    const { leftColKey, rightColKey, topRowKey, bottomRowKey } = cellSelectionRangeData.value

    // cell selection range auto fill
    if (currentCellSelectionType.value === CURRENT_CELL_SELECTION_TYPES.RANGE) {
      const isInRange = isCellInSelectionRange({
        cellData: autoFillEndCell,
        cellSelectionRangeData: cellSelectionRangeData.value,
        colgroups: colgroups.value,
        allRowKeys: allRowKeys.value,
      })
      // return if within the range
      if (isInRange)
        return null

      if (direction === AUTOFILLING_DIRECTION.RIGHT)
        return { current: { rowKey: topRowKey, colKey: leftColKey }, normalEnd: { rowKey: bottomRowKey, colKey } }
      if (direction === AUTOFILLING_DIRECTION.DOWN)
        return { current: { rowKey: topRowKey, colKey: leftColKey }, normalEnd: { rowKey, colKey: rightColKey } }
      if (direction === AUTOFILLING_DIRECTION.UP)
        return { current: { rowKey, colKey: leftColKey }, normalEnd: { rowKey: bottomRowKey, colKey: rightColKey } }
      if (direction === AUTOFILLING_DIRECTION.LEFT)
        return { current: { rowKey: topRowKey, colKey }, normalEnd: { rowKey: bottomRowKey, colKey: rightColKey } }
    }
    // cell selection single auto fill
    else if (currentCellSelectionType.value === CURRENT_CELL_SELECTION_TYPES.SINGLE) {
      // return if within the range
      if (currentCell.rowKey === rowKey && currentCell.colKey === colKey)
        return null

      if (direction === AUTOFILLING_DIRECTION.RIGHT)
        return { current: { rowKey, colKey: leftColKey }, normalEnd: { rowKey, colKey } }
      if (direction === AUTOFILLING_DIRECTION.DOWN)
        return { current: { rowKey: topRowKey, colKey: leftColKey }, normalEnd: { rowKey, colKey: leftColKey } }
      if (direction === AUTOFILLING_DIRECTION.UP)
        return { current: { rowKey, colKey: leftColKey }, normalEnd: { rowKey: bottomRowKey, colKey: leftColKey } }
      if (direction === AUTOFILLING_DIRECTION.LEFT)
        return { current: { rowKey, colKey }, normalEnd: { rowKey, colKey: rightColKey } }
    }

    // 其他情况不改变选区，但仍然填充（与原实现相同）
    return { current: {} as CellKey, normalEnd: {} as CellKey }
  }

  // 拖动结束：提交填充
  function setCellSelectionByAutofill() {
    const { cellAutofillOption } = props
    const { rowKey, colKey } = cellSelectionData.value.autoFillEndCell

    if (isEmptyValue(rowKey) || isEmptyValue(colKey))
      return false

    /*
    方向为 null：结束单元格在选区内，或方向不被允许（directionX / directionY 为 false）。
    此时不填充，也不调用 beforeAutofill / afterAutofill（FILL-01）
    */
    const direction = autofillingDirection.value
    if (!direction)
      return false

    const nextSelection = getNextSelection(direction)
    if (!nextSelection)
      return false

    const { current: currentCellData, normalEnd: normalEndCellData } = nextSelection

    const cellAutofillParams = {
      tableData: props.tableData,
      allRowKeys: allRowKeys.value,
      colgroups: colgroups.value,
      rowKeyFieldName: props.rowKeyFieldName,
      direction,
      currentCellSelectionType: currentCellSelectionType.value,
      cellSelectionRangeData: cellSelectionRangeData.value,
      nextCurrentCell: currentCellData,
      nextNormalEndCell: normalEndCellData,
    }

    /*
    执行顺序（FILL-03，与剪贴板相同，见 features/clipboard）：
      beforeAutofill（可取消）
      → 逐单元格 beforeCellValueChange 并写入（设置了 editOption 时只写入 edit: true 的列；
        返回 false 或抛出异常只跳过该单元格）
      → 选区更新、CLIPBOARD_CELL_VALUE_CHANGE hook（FILL-06）
      → 逐单元格 cellValueChange、afterCellValueChange（只针对实际写入的单元格）
      → afterAutofill（最后）
    操作列、没有 field 的列始终不写入（FILL-04）。
    没有任何可写入的单元格时（目标列都不能写入，或横向填充的源列都没有数据）不执行填充：
    不调用 beforeAutofill / afterAutofill，选区保持不变（FILL-05，与粘贴的 CLIP-11 相同）。
    值已经相同的单元格仍算可写入（只是写入时跳过），这样的填充照常执行。
    */
    let autofillResponse: any = null
    let appliedChanges: AppliedCellChange[] = []
    const cellValueCallbacks = getCellValueCallbacks(props.editOption)

    if (cellAutofillOption) {
      const { beforeAutofill } = cellAutofillOption

      // 源区域、目标区域（也是 beforeAutofill 的参数）
      const { response: beforeAutofillResponse } = cellAutofill({
        isReplaceData: false,
        ...cellAutofillParams,
      } as any)

      const changes = getAutofillChanges({
        tableData: props.tableData as any[],
        colgroups: colgroups.value,
        direction,
        sourceSelectionRangeIndexes: beforeAutofillResponse.sourceSelectionRangeIndexes,
        targetSelectionRangeIndexes: beforeAutofillResponse.targetSelectionRangeIndexes,
        editableOnly: cellValueCallbacks.editableOnly,
      })
      if (!changes.length)
        return false

      if (isFunction(beforeAutofill)) {
        // beforeAutofill 抛出异常时视为“取消填充”（INFRA-07）
        const { value: callback, threw } = safeCall('beforeAutofill', beforeAutofill, beforeAutofillResponse)
        if (threw || (isBoolean(callback) && !callback))
          return false
      }

      // replace data
      const { response, applied } = cellAutofill({
        isReplaceData: true,
        ...cellAutofillParams,
        editableOnly: cellValueCallbacks.editableOnly,
        canChange: cellValueCallbacks.canChange,
      } as any)
      autofillResponse = response
      appliedChanges = applied
    }

    // 先更新选区，再调用 afterAutofill（INFRA-07）
    if (!isEmptyValue(currentCellData.rowKey))
      state.cellSelectionCurrentCellChange({ rowKey: currentCellData.rowKey, colKey: currentCellData.colKey })

    if (!isEmptyValue(normalEndCellData.rowKey))
      state.cellSelectionNormalEndCellChange({ rowKey: normalEndCellData.rowKey, colKey: normalEndCellData.colKey })

    // 单元格内容已变化，刷新选区位置（FILL-06，与粘贴、剪切、删除相同）
    tableContext.emit(HOOKS_NAME.CLIPBOARD_CELL_VALUE_CHANGE)

    // 内部状态已更新完毕，再调用逐单元格的 after 回调（FILL-03）
    cellValueCallbacks.fireAfter(appliedChanges)

    // after autofill
    if (autofillResponse)
      safeCall('afterAutofill', cellAutofillOption.afterAutofill, autofillResponse)
  }

  let disposeWindowListeners: (() => void) | null = null

  // 移除拖动期间的 window 监听
  function removeAutofillWindowListeners() {
    const dispose = disposeWindowListeners
    disposeWindowListeners = null
    dispose?.()
  }

  /*
   * 取消正在进行的填充（FILL-02）：先清空 autofill 结束单元格，
   * isAutofillStarting 的 watcher 中 setCellSelectionByAutofill 因此不会提交
   */
  function cancelAutofill() {
    removeAutofillWindowListeners()
    state.clearCellSelectionAutofillEndCell()
    isAutofillStarting.value = false
  }

  /*
   * 拖动角标后释放鼠标。只有释放点在表格容器内（目标元素在容器内，且坐标在容器矩形内）才提交。
   * 在窗口外释放时，浏览器会把 mouseup 派发给按下时的元素（角标），所以还要检查坐标
   */
  function autofillWindowMouseup(event: MouseEvent) {
    removeAutofillWindowListeners()

    if (!isAutofillStarting.value)
      return

    const containerEl = containerElement.value
    const target = event.target as Node | null

    let isInside = false
    if (containerEl && target instanceof Node && containerEl.contains(target)) {
      const { left, top, right, bottom } = containerEl.getBoundingClientRect()
      const { clientX, clientY } = event
      isInside = clientX >= left && clientX <= right && clientY >= top && clientY <= bottom
    }

    if (isInside)
      isAutofillStarting.value = false
    else
      cancelAutofill()
  }

  /*
   * 拖动角标期间在 window 上监听（FILL-02）：
   *  - mouseup（捕获阶段，先于表格内的处理）：在表格外或窗口外释放时取消，在表格内释放时提交
   *  - blur：窗口失焦（如切换窗口）时取消
   */
  function addAutofillWindowListeners() {
    removeAutofillWindowListeners()

    const onMouseup = (event: MouseEvent) => {
      autofillWindowMouseup(event)
    }
    const onBlur = () => {
      if (isAutofillStarting.value)
        cancelAutofill()
    }

    window.addEventListener('mouseup', onMouseup, { capture: true })
    window.addEventListener('blur', onBlur)

    disposeWindowListeners = () => {
      window.removeEventListener('mouseup', onMouseup, { capture: true })
      window.removeEventListener('blur', onBlur)
    }
  }

  // 选区角标 mousedown：开始填充
  function cellSelectionCornerMousedown(_params: { event: MouseEvent }) {
    isAutofillStarting.value = true
    addAutofillWindowListeners()
  }

  // 选区角标 mouseup：结束填充
  function cellSelectionCornerMouseup(_params: { event: MouseEvent }) {
    isAutofillStarting.value = false
  }

  watch(isAutofillStarting, (val) => {
    if (val)
      return
    // 填充过程中出现异常也要清除 autofill 结束单元格（INFRA-07）
    try {
      setCellSelectionByAutofill()
    }
    finally {
      state.clearCellSelectionAutofillEndCell()
      // 拖动已结束，移除 window 上的 mouseup / blur 监听（FILL-02）
      removeAutofillWindowListeners()
    }
  })

  // 拖动填充中卸载：移除 window 上的监听（FILL-02）
  onUnmounted(() => {
    removeAutofillWindowListeners()
  })

  return {
    isAutofillStarting,
    autofillingDirection,
    setCellSelectionByAutofill,
    cellSelectionCornerMousedown,
    cellSelectionCornerMouseup,
    cancelAutofill,
    addAutofillWindowListeners,
    removeAutofillWindowListeners,
    autofillWindowMouseup,
  }
}
