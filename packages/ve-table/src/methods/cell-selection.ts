/**
 * Cell selection methods extracted from ve-table.
 * Spread into defineComponent({ methods: { ...cellSelectionMethods } })
 */
import type { AppliedCellChange } from '../features/cell-value-change/index.js'
import { isBoolean, isEmptyValue, isFunction } from '@vue3-easytable/common/utils'
import { getCellValueCallbacks } from '../features/cell-value-change/index.js'
import {
  AUTOFILLING_DIRECTION,
  CURRENT_CELL_SELECTION_TYPES,
  HOOKS_NAME,
} from '../util/constant.js'
import {
  cellAutofill,
  getAutofillChanges,
  isCellInSelectionRange,
} from '../util/index.js'
import { safeCall } from '../util/safe-call.js'

export const cellSelectionMethods = {
  // set cell selection by autofill
  setCellSelectionByAutofill(this: any) {
    const {
      cellAutofillOption,
      cellSelectionRangeData,
      colgroups,
      allRowKeys,
      autofillingDirection,
      currentCellSelectionType,
    } = this
    const { autoFillEndCell, currentCell } = this.cellSelectionData

    const { rowKey, colKey } = autoFillEndCell

    if (isEmptyValue(rowKey) || isEmptyValue(colKey))
      return false

    /*
    方向为 null：结束单元格在选区内，或方向不被允许（directionX / directionY 为 false）。
    此时不填充，也不调用 beforeAutofill / afterAutofill（FILL-01）
    */
    if (!autofillingDirection)
      return false

    let currentCellData: any = {}
    let normalEndCellData: any = {}

    const { leftColKey, rightColKey, topRowKey, bottomRowKey }
              = cellSelectionRangeData

    // cell selection range auto fill
    if (
      currentCellSelectionType === CURRENT_CELL_SELECTION_TYPES.RANGE
    ) {
      if (
        !isCellInSelectionRange({
          cellData: autoFillEndCell,
          cellSelectionRangeData,
          colgroups,
          allRowKeys,
        })
      ) {
        if (autofillingDirection === AUTOFILLING_DIRECTION.RIGHT) {
          currentCellData = {
            rowKey: topRowKey,
            colKey: leftColKey,
          }
          normalEndCellData = { rowKey: bottomRowKey, colKey }
        }
        else if (
          autofillingDirection === AUTOFILLING_DIRECTION.DOWN
        ) {
          currentCellData = {
            rowKey: topRowKey,
            colKey: leftColKey,
          }
          normalEndCellData = { rowKey, colKey: rightColKey }
        }
        else if (
          autofillingDirection === AUTOFILLING_DIRECTION.UP
        ) {
          currentCellData = {
            rowKey,
            colKey: leftColKey,
          }
          normalEndCellData = {
            rowKey: bottomRowKey,
            colKey: rightColKey,
          }
        }
        else if (
          autofillingDirection === AUTOFILLING_DIRECTION.LEFT
        ) {
          currentCellData = { rowKey: topRowKey, colKey }
          normalEndCellData = {
            rowKey: bottomRowKey,
            colKey: rightColKey,
          }
        }
      }
      else {
        // return if within the range
        return false
      }
    }
    // cell selection single auto fill
    else if (
      currentCellSelectionType === CURRENT_CELL_SELECTION_TYPES.SINGLE
    ) {
      if (
        currentCell.rowKey !== rowKey
        || currentCell.colKey !== colKey
      ) {
        if (autofillingDirection === AUTOFILLING_DIRECTION.RIGHT) {
          currentCellData = {
            rowKey,
            colKey: leftColKey,
          }
          normalEndCellData = {
            rowKey,
            colKey,
          }
        }
        else if (
          autofillingDirection === AUTOFILLING_DIRECTION.DOWN
        ) {
          currentCellData = {
            rowKey: topRowKey,
            colKey: leftColKey,
          }
          normalEndCellData = {
            rowKey,
            colKey: leftColKey,
          }
        }
        else if (
          autofillingDirection === AUTOFILLING_DIRECTION.UP
        ) {
          currentCellData = {
            rowKey,
            colKey: leftColKey,
          }
          normalEndCellData = {
            rowKey: bottomRowKey,
            colKey: leftColKey,
          }
        }
        else if (
          autofillingDirection === AUTOFILLING_DIRECTION.LEFT
        ) {
          currentCellData = {
            rowKey,
            colKey,
          }
          normalEndCellData = {
            rowKey,
            colKey: rightColKey,
          }
        }
      }
      else {
        // return if within the range
        return false
      }
    }

    const cellAutofillParams = {
      tableData: this.tableData,
      allRowKeys: this.allRowKeys,
      colgroups: this.colgroups,
      rowKeyFieldName: this.rowKeyFieldName,
      direction: autofillingDirection,
      currentCellSelectionType,
      cellSelectionRangeData,
      nextCurrentCell: currentCellData,
      nextNormalEndCell: normalEndCellData,
    }

    /*
    执行顺序（FILL-03，与剪贴板相同，见 methods/clipboard.ts）：
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
    const cellValueCallbacks = getCellValueCallbacks(this.editOption)

    if (cellAutofillOption) {
      const { beforeAutofill } = cellAutofillOption

      // 源区域、目标区域（也是 beforeAutofill 的参数）
      const { response: beforeAutofillResponse } = cellAutofill({
        isReplaceData: false,
        ...cellAutofillParams,
      })

      const changes = getAutofillChanges({
        tableData: this.tableData,
        colgroups,
        direction: autofillingDirection,
        sourceSelectionRangeIndexes: beforeAutofillResponse.sourceSelectionRangeIndexes,
        targetSelectionRangeIndexes: beforeAutofillResponse.targetSelectionRangeIndexes,
        editableOnly: cellValueCallbacks.editableOnly,
      })
      if (!changes.length)
        return false

      if (isFunction(beforeAutofill)) {
        // beforeAutofill 抛出异常时视为“取消填充”（INFRA-07）
        const { value: callback, threw } = safeCall(
          'beforeAutofill',
          beforeAutofill,
          beforeAutofillResponse,
        )
        if (threw || (isBoolean(callback) && !callback))
          return false
      }

      // replace data
      const { response, applied } = cellAutofill({
        isReplaceData: true,
        ...cellAutofillParams,
        editableOnly: cellValueCallbacks.editableOnly,
        canChange: cellValueCallbacks.canChange,
      })
      autofillResponse = response
      appliedChanges = applied
    }

    // 先更新选区，再调用 afterAutofill（INFRA-07）
    if (!isEmptyValue(currentCellData.rowKey)) {
      this.cellSelectionCurrentCellChange({
        rowKey: currentCellData.rowKey,
        colKey: currentCellData.colKey,
      })
    }

    if (!isEmptyValue(normalEndCellData.rowKey)) {
      this.cellSelectionNormalEndCellChange({
        rowKey: normalEndCellData.rowKey,
        colKey: normalEndCellData.colKey,
      })
    }

    // 单元格内容已变化，刷新选区位置（FILL-06，与粘贴、剪切、删除相同）
    this.tableContext.emit(HOOKS_NAME.CLIPBOARD_CELL_VALUE_CHANGE)

    // 内部状态已更新完毕，再调用逐单元格的 after 回调（FILL-03）
    cellValueCallbacks.fireAfter(appliedChanges)

    // after autofill
    if (autofillResponse)
      safeCall('afterAutofill', cellAutofillOption.afterAutofill, autofillResponse)
  },

  /*
   * @cellSelectionCornerMousedown
   * @desc  recieve cell selection corner mousedown
   */
  cellSelectionCornerMousedown(this: any, { event: _event }: any) {
    this.isAutofillStarting = true
    this.addAutofillWindowListeners()
  },

  /*
   * @cellSelectionCornerMouseup
   * @desc  recieve cell selection corner mouseup
   */
  cellSelectionCornerMouseup(this: any, { event: _event }: any) {
    this.isAutofillStarting = false
  },

  /*
   * @cancelAutofill
   * @desc 取消正在进行的填充（FILL-02）：先清空 autofill 结束单元格，
   *       isAutofillStarting 的 watcher 中 setCellSelectionByAutofill 因此不会提交
   */
  cancelAutofill(this: any) {
    this.removeAutofillWindowListeners()
    this.clearCellSelectionAutofillEndCell()
    this.isAutofillStarting = false
  },

  /*
   * @addAutofillWindowListeners
   * @desc 拖动角标期间在 window 上监听（FILL-02）：
   *  - mouseup（捕获阶段，先于表格内的处理）：在表格外或窗口外释放时取消，在表格内释放时提交
   *  - blur：窗口失焦（如切换窗口）时取消
   */
  addAutofillWindowListeners(this: any) {
    this.removeAutofillWindowListeners()

    const onMouseup = (event: MouseEvent) => {
      this.autofillWindowMouseup(event)
    }
    const onBlur = () => {
      if (this.isAutofillStarting)
        this.cancelAutofill()
    }

    window.addEventListener('mouseup', onMouseup, { capture: true })
    window.addEventListener('blur', onBlur)

    this.autofillWindowListenersDisposer = () => {
      window.removeEventListener('mouseup', onMouseup, { capture: true })
      window.removeEventListener('blur', onBlur)
    }
  },

  // 移除拖动期间的 window 监听
  removeAutofillWindowListeners(this: any) {
    const dispose = this.autofillWindowListenersDisposer
    this.autofillWindowListenersDisposer = null
    if (isFunction(dispose))
      dispose()
  },

  /*
   * @autofillWindowMouseup
   * @desc 拖动角标后释放鼠标。只有释放点在表格容器内（目标元素在容器内，且坐标在容器矩形内）才提交。
   *       在窗口外释放时，浏览器会把 mouseup 派发给按下时的元素（角标），所以还要检查坐标
   */
  autofillWindowMouseup(this: any, event: MouseEvent) {
    this.removeAutofillWindowListeners()

    if (!this.isAutofillStarting)
      return

    const containerEl = this.tableContainerRef as HTMLElement | undefined
    const target = event.target as Node | null

    let isInside = false
    if (containerEl && target instanceof Node && containerEl.contains(target)) {
      const { left, top, right, bottom } = containerEl.getBoundingClientRect()
      const { clientX, clientY } = event
      isInside = clientX >= left && clientX <= right && clientY >= top && clientY <= bottom
    }

    if (isInside)
      this.isAutofillStarting = false
    else
      this.cancelAutofill()
  },
}
