/**
 * Cell selection methods extracted from ve-table.
 * Spread into defineComponent({ methods: { ...cellSelectionMethods } })
 */
import type { AppliedCellChange } from '../features/cell-value-change/index.js'
import { isBoolean, isEmptyValue, isFunction } from '@vue3-easytable/common/utils'
import { KEY_CODES } from '@vue3-easytable/common/utils/constant'
import { getCellValueCallbacks } from '../features/cell-value-change/index.js'
import {
  AUTOFILLING_DIRECTION,
  CURRENT_CELL_SELECTION_TYPES,
  HOOKS_NAME,
  INSTANCE_METHODS,
} from '../util/constant.js'
import {
  cellAutofill,
  getRowKey,
  isCellInSelectionRange,
} from '../util/index.js'
import { safeCall } from '../util/safe-call.js'

export const cellSelectionMethods = {
  // cell selection current cell change
  cellSelectionCurrentCellChange(this: any, { rowKey, colKey }: any) {
    this.cellSelectionData.currentCell.colKey = colKey
    this.cellSelectionData.currentCell.rowKey = rowKey
    this.cellSelectionData.currentCell.rowIndex
              = this.allRowKeys.indexOf(rowKey)
  },

  // cell selection end cell change
  cellSelectionNormalEndCellChange(this: any, { rowKey, colKey }: any) {
    this.cellSelectionData.normalEndCell.colKey = colKey
    this.cellSelectionData.normalEndCell.rowKey = rowKey
    this.cellSelectionData.normalEndCell.rowIndex
              = this.allRowKeys.indexOf(rowKey)
  },

  // cell selection auto fill cell change
  cellSelectionAutofillCellChange(this: any, { rowKey, colKey }: any) {
    this.cellSelectionData.autoFillEndCell.colKey = colKey
    this.cellSelectionData.autoFillEndCell.rowKey = rowKey
  },

  // clear cell selection current cell
  clearCellSelectionCurrentCell(this: any) {
    this.cellSelectionCurrentCellChange({
      rowKey: '',
      colKey: '',
      rowIndex: -1,
    })
  },

  // clear cell selection normal end cell
  clearCellSelectionNormalEndCell(this: any) {
    this.cellSelectionNormalEndCellChange({
      rowKey: '',
      colKey: '',
      rowIndex: -1,
    })
  },

  // clear cell selection autofill end cell
  clearCellSelectionAutofillEndCell(this: any) {
    this.cellSelectionAutofillCellChange({ rowKey: '', colKey: '' })
  },

  /*
   * 表头 / 行指示器（整列、整行选择）只保存 key（SEL-09）。
   * 行列位置会变化（插入行、排序、隐藏列），需要下标时用 getIndicatorIndexes 按 key 重新计算
   */
  // header indicator colKeys change
  headerIndicatorColKeysChange(this: any, { startColKey, endColKey }: any) {
    this.headerIndicatorColKeys.startColKey = startColKey
    this.headerIndicatorColKeys.endColKey = endColKey
  },

  // clear header indicator colKeys
  clearHeaderIndicatorColKeys(this: any) {
    this.headerIndicatorColKeys.startColKey = ''
    this.headerIndicatorColKeys.endColKey = ''
  },

  // body indicator rowKeys change
  bodyIndicatorRowKeysChange(this: any, { startRowKey, endRowKey }: any) {
    this.bodyIndicatorRowKeys.startRowKey = startRowKey
    this.bodyIndicatorRowKeys.endRowKey = endRowKey
  },

  // clear body indicator RowKeys
  clearBodyIndicatorRowKeys(this: any) {
    this.bodyIndicatorRowKeys.startRowKey = ''
    this.bodyIndicatorRowKeys.endRowKey = ''
  },

  // 清除表头与行指示器：选区被键盘、单元格点击或 API 改为普通单元格选择时调用（SEL-09）
  clearIndicatorKeys(this: any) {
    this.clearHeaderIndicatorColKeys()
    this.clearBodyIndicatorRowKeys()
  },

  /*
   * @getIndicatorIndexes
   * @desc 按当前的 colgroups / allRowKeys 计算指示器的起止下标，未设置或已不存在时为 -1（SEL-09）
   */
  getIndicatorIndexes(this: any) {
    const { colgroups, allRowKeys, headerIndicatorColKeys, bodyIndicatorRowKeys } = this
    const colIndex = (colKey: any) =>
      isEmptyValue(colKey) ? -1 : colgroups.findIndex((x: any) => x.key === colKey)
    const rowIndex = (rowKey: any) =>
      isEmptyValue(rowKey) ? -1 : allRowKeys.indexOf(rowKey)

    return {
      startColIndex: colIndex(headerIndicatorColKeys.startColKey),
      endColIndex: colIndex(headerIndicatorColKeys.endColKey),
      startRowIndex: rowIndex(bodyIndicatorRowKeys.startRowKey),
      endRowIndex: rowIndex(bodyIndicatorRowKeys.endRowKey),
    }
  },

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
      → 选区更新
      → 逐单元格 cellValueChange、afterCellValueChange（只针对实际写入的单元格）
      → afterAutofill（最后）
    操作列、没有 field 的列始终不写入（FILL-04）。
    */
    let autofillResponse: any = null
    let appliedChanges: AppliedCellChange[] = []
    const cellValueCallbacks = getCellValueCallbacks(this.editOption)

    if (cellAutofillOption) {
      const { beforeAutofill } = cellAutofillOption

      if (isFunction(beforeAutofill)) {
        // before autofill
        const { response: beforeAutofillResponse } = cellAutofill({
          isReplaceData: false,
          ...cellAutofillParams,
        })
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

    // 内部状态已更新完毕，再调用逐单元格的 after 回调（FILL-03）
    cellValueCallbacks.fireAfter(appliedChanges)

    // after autofill
    if (autofillResponse)
      safeCall('afterAutofill', cellAutofillOption.afterAutofill, autofillResponse)
  },

  // cell selection range data change
  cellSelectionRangeDataChange(this: any, newData: any) {
    this.cellSelectionRangeData = Object.assign(
      this.cellSelectionRangeData,
      newData,
    )
  },

  // set current cell selection type
  setCurrentCellSelectionType(this: any) {
    const { currentCell, normalEndCell } = this.cellSelectionData

    let result

    if (
      isEmptyValue(currentCell.rowKey)
      || isEmptyValue(currentCell.colKey)
    ) {
      result = ''
    }
    else {
      if (
        !isEmptyValue(normalEndCell.rowKey)
        && !isEmptyValue(normalEndCell.colKey)
      ) {
        result = CURRENT_CELL_SELECTION_TYPES.RANGE
      }

      else {
        result = CURRENT_CELL_SELECTION_TYPES.SINGLE
      }
    }

    this.currentCellSelectionType = result
  },

  // cell selection by click
  cellSelectionByClick(this: any, { rowData, column }: any) {
    const { rowKeyFieldName } = this

    const rowKey = getRowKey(rowData, rowKeyFieldName)

    // set cell selection and column to visible
    this[INSTANCE_METHODS.SET_CELL_SELECTION]({
      rowKey,
      colKey: column.key,
      isScrollToRow: false,
    })
    // row to visible
    this.rowToVisible(KEY_CODES.ARROW_UP, rowKey)
    this.rowToVisible(KEY_CODES.ARROW_DOWN, rowKey)
  },

  // set range cell selection by header indicator
  setRangeCellSelectionByHeaderIndicator(this: any) {
    const { headerIndicatorColKeys, allRowKeys } = this
    const { startColKey, endColKey } = headerIndicatorColKeys

    if (isEmptyValue(startColKey) || isEmptyValue(endColKey))
      return false

    this.cellSelectionCurrentCellChange({
      rowKey: allRowKeys[0],
      colKey: startColKey,
    })

    this.cellSelectionNormalEndCellChange({
      rowKey: allRowKeys[allRowKeys.length - 1],
      colKey: endColKey,
    })
  },

  // set range cell selection by body indicator
  setRangeCellSelectionByBodyIndicator(this: any) {
    const { bodyIndicatorRowKeys, colgroups } = this
    const { startRowKey, endRowKey } = bodyIndicatorRowKeys

    if (isEmptyValue(startRowKey) || isEmptyValue(endRowKey))
      return false

    // 整行选择只包含非操作列（SEL-03：之前固定从 colgroups[1] 开始，没有操作列时会漏掉第一列）
    const dataColumns = colgroups.filter((x: any) => !x.operationColumn)

    if (dataColumns.length) {
      this.cellSelectionCurrentCellChange({
        rowKey: startRowKey,
        colKey: dataColumns[0].key,
      })

      this.cellSelectionNormalEndCellChange({
        rowKey: endRowKey,
        colKey: dataColumns[dataColumns.length - 1].key,
      })
    }
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

    const containerEl = this.$refs[this.tableContainerRef] as HTMLElement | undefined
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

  /*
   * @addSelectionDragListener
   * @desc 拖动选择（单元格区域、整行、整列）期间在 document 上监听 mouseup（捕获阶段），结束拖动（SEL-11）。
   *       在表格外松开时，浏览器在公共祖先上触发的 click 不再清除选区（clickoutside 忽略从表格内开始的拖动），
   *       所以拖动状态不能再依赖 tableClickOutside 重置。
   *       同时监听 window blur：拖动中窗口失焦（如 Alt+Tab）时 mouseup 可能永远不会到达，失焦即结束拖动（SEL-18，与填充的 FILL-02 相同）
   */
  addSelectionDragListener(this: any) {
    this.removeSelectionDragListener()

    const onEnd = () => {
      this.endSelectionDrag()
    }
    document.addEventListener('mouseup', onEnd, true)
    window.addEventListener('blur', onEnd)

    this.selectionDragListenerDisposer = () => {
      document.removeEventListener('mouseup', onEnd, true)
      window.removeEventListener('blur', onEnd)
    }
  },

  // 移除拖动选择期间的 document 监听
  removeSelectionDragListener(this: any) {
    const dispose = this.selectionDragListenerDisposer
    this.selectionDragListenerDisposer = null
    if (isFunction(dispose))
      dispose()
  },

  // 结束拖动选择：之后鼠标经过单元格 / 表头不再扩展选区（填充由 FILL-02 的 window 监听单独处理）
  endSelectionDrag(this: any) {
    this.removeSelectionDragListener()
    this.isHeaderCellMousedown = false
    this.isBodyCellMousedown = false
    this.isBodyOperationColumnMousedown = false
  },

  /*
   * @endLostSelectionDrag
   * @desc 拖动选择中，鼠标经过单元格 / 表头时没有按住左键：mouseup 已丢失（例如在窗口外释放且浏览器没有派发），
   *       结束拖动，不再扩展选区（SEL-18，与填充的 FILL-02 相同）
   */
  endLostSelectionDrag(this: any, event: unknown) {
    const isDragging = this.isBodyCellMousedown
      || this.isHeaderCellMousedown
      || this.isBodyOperationColumnMousedown

    if (isDragging && event instanceof MouseEvent && (event.buttons & 1) === 0)
      this.endSelectionDrag()
  },

  /*
   * @reconcileCellState
   * @desc 列（colgroups）或行（allRowKeys）变化后，同步选区与编辑状态（SEL-01）
   *  - 正在编辑的单元格所在行 / 列已不存在：清除编辑状态（无处保存，直接丢弃）
   *  - currentCell 所在行 / 列已不存在：清空选区（连同 normalEndCell）
   *  - normalEndCell 所在行 / 列已不存在：选区收缩为 currentCell
   *  - 行位置变化：更新 rowIndex，并刷新选区位置
   *  - 表头 / 行指示器的 key 已不存在：清除指示器
   *  - range 中仍引用已不存在的 key（选区层未挂载时）：按当前单元格重置
   */
  reconcileCellState(this: any) {
    const { colgroups, allRowKeys, cellSelectionData } = this
    const { currentCell, normalEndCell, autoFillEndCell } = cellSelectionData

    const hasCol = (colKey: any) => colgroups.some((x: any) => x.key === colKey)
    const hasRow = (rowKey: any) => allRowKeys.includes(rowKey)
    const isCellSet = (cell: any) =>
      !isEmptyValue(cell.rowKey) && !isEmptyValue(cell.colKey)
    const isCellExist = (cell: any) => hasRow(cell.rowKey) && hasCol(cell.colKey)

    // editing cell
    if (this.isCellEditing && !isCellExist(this.editingCell)) {
      this.clearEditingCell()
      this.editorInputStartValue = ''
      this.enableStopEditing = true
    }

    /*
    表头 / 行指示器（整列、整行选择）引用的 key 已不存在时清除。
    key 仍存在时不重新应用：方向键移动后指示器并不会被清除，重新应用会把选区拉回去
    */
    const { startColKey, endColKey } = this.headerIndicatorColKeys
    if (
      (!isEmptyValue(startColKey) || !isEmptyValue(endColKey))
      && (!hasCol(startColKey) || !hasCol(endColKey))
    ) {
      this.clearHeaderIndicatorColKeys()
    }

    const { startRowKey, endRowKey } = this.bodyIndicatorRowKeys
    if (
      (!isEmptyValue(startRowKey) || !isEmptyValue(endRowKey))
      && (!hasRow(startRowKey) || !hasRow(endRowKey))
    ) {
      this.clearBodyIndicatorRowKeys()
    }

    let isPositionChanged = false

    // current cell
    if (isCellSet(currentCell)) {
      if (!isCellExist(currentCell)) {
        this.clearCellSelectionCurrentCell()
      }
      else {
        const rowIndex = allRowKeys.indexOf(currentCell.rowKey)
        if (rowIndex !== currentCell.rowIndex) {
          currentCell.rowIndex = rowIndex
          isPositionChanged = true
        }
      }
    }

    // normal end cell：没有 currentCell 时 range 也没有意义
    if (isCellSet(normalEndCell)) {
      if (!isCellSet(currentCell) || !isCellExist(normalEndCell)) {
        this.clearCellSelectionNormalEndCell()
      }
      else {
        const rowIndex = allRowKeys.indexOf(normalEndCell.rowKey)
        if (rowIndex !== normalEndCell.rowIndex) {
          normalEndCell.rowIndex = rowIndex
          isPositionChanged = true
        }
      }
    }

    // autofill end cell
    if (isCellSet(autoFillEndCell) && !isCellExist(autoFillEndCell))
      this.clearCellSelectionAutofillEndCell()

    /*
    selection range：通常由选区层根据 currentCell / normalEndCell 重新计算，
    这里只处理选区层没有同步时仍引用已不存在 key 的情况
    */
    const { leftColKey, rightColKey, topRowKey, bottomRowKey }
      = this.cellSelectionRangeData
    const isRangeStale
      = [leftColKey, rightColKey].some(x => !isEmptyValue(x) && !hasCol(x))
        || [topRowKey, bottomRowKey].some(x => !isEmptyValue(x) && !hasRow(x))

    if (isRangeStale) {
      if (!isCellSet(currentCell)) {
        this.cellSelectionRangeDataChange({
          leftColKey: '',
          rightColKey: '',
          topRowKey: '',
          bottomRowKey: '',
        })
      }
      else if (!isCellSet(normalEndCell)) {
        this.cellSelectionRangeDataChange({
          leftColKey: currentCell.colKey,
          rightColKey: currentCell.colKey,
          topRowKey: currentCell.rowKey,
          bottomRowKey: currentCell.rowKey,
        })
      }
    }

    // 行位置变化（如在上方插入行）后，等 DOM 更新再刷新选区位置
    if (isPositionChanged) {
      this.$nextTick(() => {
        this.hooks.triggerHook(HOOKS_NAME.CLIPBOARD_CELL_VALUE_CHANGE)
      })
    }
  },
}
