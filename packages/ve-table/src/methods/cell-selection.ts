/**
 * Cell selection methods extracted from ve-table.
 * Spread into defineComponent({ methods: { ...cellSelectionMethods } })
 */
import { isBoolean, isEmptyValue, isFunction } from '@vue3-easytable/common/utils'
import { KEY_CODES } from '@vue3-easytable/common/utils/constant'
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

  // header indicator colKeys change
  headerIndicatorColKeysChange(this: any, { startColKey, endColKey }: any) {
    const { colgroups } = this
    this.headerIndicatorColKeys.startColKey = startColKey
    this.headerIndicatorColKeys.startColKeyIndex = colgroups.findIndex(
      (x: any) => x.key === startColKey,
    )
    this.headerIndicatorColKeys.endColKey = endColKey
    this.headerIndicatorColKeys.endColKeyIndex = colgroups.findIndex(
      (x: any) => x.key === endColKey,
    )
  },

  // clear header indicator colKeys
  clearHeaderIndicatorColKeys(this: any) {
    this.headerIndicatorColKeys.startColKey = ''
    this.headerIndicatorColKeys.startColKeyIndex = -1
    this.headerIndicatorColKeys.endColKey = ''
    this.headerIndicatorColKeys.endColKeyIndex = -1
  },

  // body indicator rowKeys change
  bodyIndicatorRowKeysChange(this: any, { startRowKey, endRowKey }: any) {
    const { allRowKeys } = this
    this.bodyIndicatorRowKeys.startRowKey = startRowKey
    this.bodyIndicatorRowKeys.startRowKeyIndex
              = allRowKeys.indexOf(startRowKey)
    this.bodyIndicatorRowKeys.endRowKey = endRowKey
    this.bodyIndicatorRowKeys.endRowKeyIndex
              = allRowKeys.indexOf(endRowKey)
  },

  // clear body indicator RowKeys
  clearBodyIndicatorRowKeys(this: any) {
    this.bodyIndicatorRowKeys.startRowKey = ''
    this.bodyIndicatorRowKeys.startRowKeyIndex = -1
    this.bodyIndicatorRowKeys.endRowKey = ''
    this.bodyIndicatorRowKeys.endRowKeyIndex = -1
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

    let autofillResponse: any = null

    if (cellAutofillOption) {
      const { beforeAutofill } = cellAutofillOption

      if (isFunction(beforeAutofill)) {
        // before autofill
        const beforeAutofillResponse = cellAutofill({
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
      autofillResponse = cellAutofill({
        isReplaceData: true,
        ...cellAutofillParams,
      })
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

    if (colgroups.length > 1) {
      this.cellSelectionCurrentCellChange({
        rowKey: startRowKey,
        colKey: colgroups[1].key,
      })

      this.cellSelectionNormalEndCellChange({
        rowKey: endRowKey,
        colKey: colgroups[colgroups.length - 1].key,
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
