/**
 * 单元格与表格的鼠标事件（MOD-02）
 *
 * 表头 / 表体单元格、表头行、表尾行、选区角标通过表格上下文（MOD-01）把事件发给表格，
 * 这里把它们分发给各功能：选区（点击、拖动、整行 / 整列选择）、编辑、右键菜单、列宽拖动、填充。
 * 也包括表格容器的 mouseup、表头的 mouseleave、点击表格外部和排序变化。
 */
import type { ComputedRef, Ref } from 'vue'
import type { VeTableProps } from '../../ve-table-props'
import type { ColgroupData, SelectionInstance } from '../../ve-table-types'
import type { UseAutofill } from '../cell-selection/useAutofill'
import type { UseCellSelection } from '../cell-selection/useCellSelection'
import type { UseCellSelectionState } from '../cell-selection/useCellSelectionState'
import type { UseSelectionDrag } from '../cell-selection/useSelectionDrag'
import type { UseColumns } from '../columns/useColumns'
import type { UseContextmenu } from '../contextmenu/useContextmenu'
import type { UseEditing } from '../editing/useEditing'
import type { UseKeyboard } from '../keyboard/useKeyboard'
import type { UseTableLayout } from '../layout/useTableLayout'
import type {
  BodyCellEventPayload,
  HeaderCellEventPayload,
  TableContext,
  TableEventScope,
} from '../table-context'
import { isEmptyValue } from '@vue3-easytable/common/utils'
import { MOUSE_EVENT_CLICK_TYPE } from '@vue3-easytable/common/utils/constant'
import { getMouseEventClickType } from '@vue3-easytable/common/utils/mouse-event'
import { nextTick, onMounted } from 'vue'
import { EMIT_EVENTS, HOOKS_NAME, KEYBOARD_MODE } from '../../util/constant'
import {
  getColgroupKeysByHeaderColumn,
  getLeftmostColKey,
  getRowKey,
  isClearSelectionByBodyCellRightClick,
  isContextmenuPanelClicked,
  isOperationColumn,
} from '../../util/index'

type RowKey = string | number
type ColKey = string | number

export interface UseCellEventsOptions {
  props: Pick<VeTableProps, 'editOption' | 'rowKeyFieldName'>
  colgroups: Ref<ColgroupData[]>
  allRowKeys: ComputedRef<RowKey[]>
  // 选区层：表头点击时先清除之前的单元格边框
  cellSelectionRef: Ref<SelectionInstance | null>
  tableEvents: TableEventScope
  tableContext: TableContext
  columns: Pick<UseColumns, 'isGroupHeader' | 'setIsColumnResizerHover' | 'setIsColumnResizing'>
  layout: Pick<UseTableLayout, 'headerRowHeightChange' | 'footRowHeightChange'>
  state: UseCellSelectionState
  selection: Pick<UseCellSelection, 'cellSelectionByClick' | 'setAllCellSelection'>
  selectionDrag: UseSelectionDrag
  autofill: Pick<
    UseAutofill,
    'isAutofillStarting' | 'cancelAutofill' | 'cellSelectionCornerMousedown' | 'cellSelectionCornerMouseup'
  >
  editing: Pick<UseEditing, 'editCellByClick' | 'stopEditingCell'>
  keyboard: Pick<UseKeyboard, 'keyboardMode' | 'getCellWidgetElement'>
  contextmenu: Pick<UseContextmenu, 'setContextmenuOptions'>
}

export interface UseCellEvents {
  updateColgroupsBySortChange: () => void
  tableClickOutside: (event: MouseEvent) => false | void
  tableContainerMouseup: () => void
  headerMouseleave: (event?: MouseEvent) => void
  bodyCellClick: (payload: BodyCellEventPayload) => void
  bodyCellDoubleClick: (payload: BodyCellEventPayload) => false | void
  bodyCellContextmenu: (payload: BodyCellEventPayload) => void
  bodyCellMousedown: (payload: BodyCellEventPayload) => false | void
  bodyCellMouseover: (payload: BodyCellEventPayload) => false | void
  bodyCellMousemove: (payload: BodyCellEventPayload) => void
  bodyCellMouseup: (payload: BodyCellEventPayload) => void
  headerCellClick: (payload: HeaderCellEventPayload) => void
  headerCellContextmenu: (payload: HeaderCellEventPayload) => void
  headerCellMousedown: (payload: HeaderCellEventPayload) => false | void
  headerCellMouseover: (payload: HeaderCellEventPayload) => void
  headerCellMousemove: (payload: HeaderCellEventPayload) => void
  headerCellMouseleave: (payload: HeaderCellEventPayload) => void
}

export function useCellEvents(options: UseCellEventsOptions): UseCellEvents {
  const {
    props,
    colgroups,
    allRowKeys,
    cellSelectionRef,
    tableEvents,
    tableContext,
    columns,
    layout,
    state,
    selection,
    selectionDrag,
    autofill,
    editing,
    keyboard,
    contextmenu,
  } = options
  const {
    cellSelectionData,
    cellSelectionRangeData,
    headerIndicatorColKeys,
    bodyIndicatorRowKeys,
  } = state
  const { isHeaderCellMousedown, isBodyCellMousedown, isBodyOperationColumnMousedown } = selectionDrag

  // 分组表头对应的叶子列 key：使用 colgroups 中真实的列 key，数字 key 才能匹配（COL-13）
  function getHeaderColKeys(column: HeaderCellEventPayload['column']): ColKey[] {
    if (columns.isGroupHeader.value)
      return getColgroupKeysByHeaderColumn({ headerColumnItem: column, colgroups: colgroups.value })
    return [column.key as ColKey]
  }

  /*
   * 排序变化
   * COL-08：排序状态只保存在表头（header/index.tsx 的 sortColumns），不再写回 colgroups[].sortBy，
   * 这样 colgroups[].sortBy 始终是配置值，表头可以据此区分“列重新生成”和“配置变化”
   */
  function updateColgroupsBySortChange() {
    // 排序后行的位置变化，清除选区
    state.clearCellSelectionCurrentCell()
    state.clearCellSelectionNormalEndCell()
    editing.stopEditingCell()
  }

  // 点击表格外部
  function tableClickOutside(event: MouseEvent) {
    // exclude contextmenu panel clicked
    if (isContextmenuPanelClicked(event))
      return false

    // 结束拖动选择，同时移除拖动期间的 mouseup / blur 监听（SEL-20）
    selectionDrag.endSelectionDrag()
    // 在表格外点击：取消正在进行的填充，而不是提交（FILL-02）
    autofill.cancelAutofill()
    columns.setIsColumnResizing(false)

    state.clearCellSelectionCurrentCell()
    state.clearCellSelectionNormalEndCell()

    state.clearHeaderIndicatorColKeys()
    state.clearBodyIndicatorRowKeys()

    editing.stopEditingCell()
  }

  // 表格容器 mouseup（事件的先后顺序 containerMouseup > bodyCellMousedown > bodyCellMouseup > bodyCellClick）
  function tableContainerMouseup() {
    // 结束拖动选择，同时移除拖动期间的 mouseup / blur 监听（SEL-20）
    selectionDrag.endSelectionDrag()
    // 在表格内释放：提交填充（通常 FILL-02 的 window 捕获监听已先处理）
    autofill.isAutofillStarting.value = false
  }

  // 表头 mouseleave：隐藏列宽拖动手柄
  function headerMouseleave(_event?: MouseEvent) {
    columns.setIsColumnResizerHover(false)
  }

  function bodyCellClick(_payload: BodyCellEventPayload) {
    // feature...
  }

  // 右键单元格：结束编辑，生成右键菜单
  function bodyCellContextmenu({ rowData, column }: BodyCellEventPayload) {
    if (props.editOption) {
      const rowKey = getRowKey(rowData, props.rowKeyFieldName) as RowKey
      editing.editCellByClick({ isDblclick: false, rowKey, colKey: column.key })
    }

    contextmenu.setContextmenuOptions(column)
  }

  // 双击单元格：开始编辑；双击操作列清除选区
  function bodyCellDoubleClick({ rowData, column }: BodyCellEventPayload) {
    if (isOperationColumn(column.key, colgroups.value)) {
      state.clearCellSelectionCurrentCell()
      state.clearCellSelectionNormalEndCell()
      editing.stopEditingCell()
      return false
    }

    if (props.editOption) {
      const rowKey = getRowKey(rowData, props.rowKeyFieldName) as RowKey
      editing.editCellByClick({ isDblclick: true, rowKey, colKey: column.key })
    }
  }

  // mousedown 单元格：选中单元格 / 区域，操作列选中整行
  function bodyCellMousedown({ event, rowData, column }: BodyCellEventPayload) {
    if (!state.enableCellSelection.value)
      return false

    // SEL-10：点击的是单元格中渲染的输入框、按钮等：焦点和按键归该元素
    const isWidgetMousedown = !!keyboard.getCellWidgetElement(event.target)

    // SEL-08：点击单元格（包括当前单元格）恢复单元格导航
    if (!isWidgetMousedown)
      keyboard.keyboardMode.value = KEYBOARD_MODE.CELL

    const { shiftKey } = event
    const rowKey = getRowKey(rowData, props.rowKeyFieldName)!
    const colKey = column.key
    const { currentCell } = cellSelectionData.value
    const mouseEventClickType = getMouseEventClickType(event)

    if (isOperationColumn(colKey, colgroups.value)) {
      state.clearHeaderIndicatorColKeys()

      isBodyOperationColumnMousedown.value = true
      // 在表格外松开时也要结束拖动（SEL-11）
      selectionDrag.addSelectionDragListener()

      const { startRowKey, endRowKey } = bodyIndicatorRowKeys.value
      // 下标按当前行顺序计算，插入行后不会过期（SEL-09）
      const { startRowIndex: startRowKeyIndex, endRowIndex: endRowKeyIndex } = state.getIndicatorIndexes()
      let newStartRowKey = startRowKey
      let newEndRowKey = endRowKey

      if (shiftKey && (startRowKeyIndex > -1 || currentCell.rowIndex > -1)) {
        newStartRowKey = isEmptyValue(currentCell.rowKey) ? startRowKey : currentCell.rowKey
        newEndRowKey = rowKey
      }
      else {
        const currentRowIndex = allRowKeys.value.indexOf(rowKey)
        // 从下往上拖动时起点下标大于终点下标，按上下边界判断（SEL-15）
        const topRowIndex = Math.min(startRowKeyIndex, endRowKeyIndex)
        const bottomRowIndex = Math.max(startRowKeyIndex, endRowKeyIndex)

        // 左键点击 || 不在当前选择行内
        if (
          mouseEventClickType === MOUSE_EVENT_CLICK_TYPE.LEFT_MOUSE
          || currentRowIndex < topRowIndex
          || currentRowIndex > bottomRowIndex
        ) {
          newStartRowKey = rowKey
          newEndRowKey = rowKey
        }
      }

      state.bodyIndicatorRowKeysChange({ startRowKey: newStartRowKey, endRowKey: newEndRowKey })
    }
    else {
      // body cell mousedown（在输入框中拖动选择文字时不扩展单元格选区，SEL-10）
      isBodyCellMousedown.value = !isWidgetMousedown
      if (isBodyCellMousedown.value)
        selectionDrag.addSelectionDragListener()

      const isClearByRightClick = isClearSelectionByBodyCellRightClick({
        mouseEventClickType,
        cellData: { rowKey, colKey },
        cellSelectionData: cellSelectionData.value,
        cellSelectionRangeData: cellSelectionRangeData.value,
        colgroups: colgroups.value,
        allRowKeys: allRowKeys.value,
      })

      if (isClearByRightClick) {
        state.clearHeaderIndicatorColKeys()
        state.clearBodyIndicatorRowKeys()

        if (shiftKey && currentCell.rowIndex > -1) {
          state.cellSelectionNormalEndCellChange({ rowKey, colKey })
        }
        else {
          // cell selection by click
          selection.cellSelectionByClick({ rowData, column })
          state.clearCellSelectionNormalEndCell()
        }
      }
    }

    if (props.editOption)
      editing.editCellByClick({ isDblclick: false, rowKey, colKey })
  }

  // 拖动经过单元格：扩展选区 / 整行 / 整列，或填充的结束单元格
  function bodyCellMouseover({ event, rowData, column }: BodyCellEventPayload) {
    // 拖动选择时没有按住左键：mouseup 已丢失，先结束拖动（SEL-18）
    selectionDrag.endLostSelectionDrag(event)

    const rowKey = getRowKey(rowData, props.rowKeyFieldName) as RowKey
    const colKey = column.key

    if (isBodyCellMousedown.value) {
      // 操作列不能单元格选中
      if (isOperationColumn(colKey, colgroups.value))
        return false

      state.cellSelectionNormalEndCellChange({ rowKey, colKey })
    }

    if (isBodyOperationColumnMousedown.value) {
      state.bodyIndicatorRowKeysChange({
        startRowKey: bodyIndicatorRowKeys.value.startRowKey,
        endRowKey: rowKey,
      })
    }

    // 允许在 body cell mouseover 里补充 header indicator 信息
    if (isHeaderCellMousedown.value) {
      state.headerIndicatorColKeysChange({
        startColKey: headerIndicatorColKeys.value.startColKey,
        endColKey: colKey,
      })
    }

    if (autofill.isAutofillStarting.value) {
      /*
      经过单元格时没有按住左键：说明 mouseup 已丢失（例如在窗口外释放且浏览器没有派发），
      取消填充，避免下一次在表格内的 mouseup 提交（FILL-02）
      */
      if (event instanceof MouseEvent && (event.buttons & 1) === 0) {
        autofill.cancelAutofill()
        return false
      }

      // 操作列不能 autofilling 效果
      if (isOperationColumn(colKey, colgroups.value))
        return false

      state.cellSelectionAutofillCellChange({ rowKey, colKey })
    }
  }

  // 单元格 mousemove：通知列宽拖动等
  function bodyCellMousemove({ event, column }: BodyCellEventPayload) {
    tableContext.emit(HOOKS_NAME.BODY_CELL_MOUSEMOVE, { event, column })
  }

  function bodyCellMouseup(_payload: BodyCellEventPayload) {
    // feature...
  }

  function headerCellClick(_payload: HeaderCellEventPayload) {
    // feature...
  }

  // 右键表头：生成右键菜单
  function headerCellContextmenu({ column }: HeaderCellEventPayload) {
    contextmenu.setContextmenuOptions(column)
  }

  // mousedown 表头：选中整列（操作列表头：全选）
  function headerCellMousedown({ event, column }: HeaderCellEventPayload) {
    if (!state.enableCellSelection.value)
      return false

    isHeaderCellMousedown.value = true
    selectionDrag.addSelectionDragListener()

    const { shiftKey } = event

    state.clearBodyIndicatorRowKeys()

    const colKeys = getHeaderColKeys(column)
    const currentCellStartColKey = colKeys[0]
    const currentCellEndColKey = colKeys[colKeys.length - 1]

    const { currentCell } = cellSelectionData.value

    if (isOperationColumn(column.key as ColKey, colgroups.value)) {
      state.clearCellSelectionCurrentCell()
      state.clearCellSelectionNormalEndCell()
      nextTick(() => {
        // select all cell
        selection.setAllCellSelection()
      })
      return false
    }

    // 需要先将之前选中单元格元素清空
    if (isEmptyValue(headerIndicatorColKeys.value.startColKey)) {
      // 值的比较（currentCell.colKey 会变化）
      if (JSON.stringify(colKeys) !== JSON.stringify([currentCell.colKey]))
        cellSelectionRef.value!.clearCurrentCellRect()

      cellSelectionRef.value!.clearNormalEndCellRect()
    }

    const { startColKey, endColKey } = headerIndicatorColKeys.value
    // 下标按当前列顺序计算（SEL-09）
    const { startColIndex: startColKeyIndex, endColIndex: endColKeyIndex } = state.getIndicatorIndexes()

    let newStartColKey = startColKey
    let newEndColKey = endColKey
    if (shiftKey) {
      if (isEmptyValue(startColKey)) {
        if (!isEmptyValue(currentCell.colKey)) {
          const leftColKey = getLeftmostColKey({
            colgroups: colgroups.value,
            colKeys: colKeys.concat([currentCell.colKey]),
          })

          newStartColKey = currentCell.colKey
          newEndColKey = leftColKey === currentCell.colKey ? currentCellEndColKey : currentCellStartColKey
        }
        else {
          newStartColKey = currentCellStartColKey
          newEndColKey = currentCellEndColKey
        }
      }
      else {
        newStartColKey = startColKey
        const leftColKey = getLeftmostColKey({
          colgroups: colgroups.value,
          colKeys: colKeys.concat([startColKey]),
        })

        newEndColKey = leftColKey === startColKey ? currentCellEndColKey : currentCellStartColKey
      }
    }
    else {
      const mouseEventClickType = getMouseEventClickType(event)
      const currentCellStartColIndex = colgroups.value.findIndex(x => x.key === currentCellStartColKey)
      const currentCellEndColIndex = colgroups.value.findIndex(x => x.key === currentCellEndColKey)
      // 从右往左拖动时起点下标大于终点下标，按左右边界判断（SEL-15）
      const leftColIndex = Math.min(startColKeyIndex, endColKeyIndex)
      const rightColIndex = Math.max(startColKeyIndex, endColKeyIndex)
      // 左键点击 || 不在当前选择列内
      if (
        mouseEventClickType === MOUSE_EVENT_CLICK_TYPE.LEFT_MOUSE
        || currentCellStartColIndex < leftColIndex
        || currentCellEndColIndex < leftColIndex
        || currentCellStartColIndex > rightColIndex
        || currentCellEndColIndex > rightColIndex
      ) {
        newStartColKey = currentCellStartColKey
        newEndColKey = currentCellEndColKey
      }
    }

    state.headerIndicatorColKeysChange({ startColKey: newStartColKey, endColKey: newEndColKey })
  }

  // 拖动经过表头：扩展整列选择
  function headerCellMouseover({ event, column }: HeaderCellEventPayload) {
    // 拖动选择时没有按住左键：mouseup 已丢失，先结束拖动（SEL-18）
    selectionDrag.endLostSelectionDrag(event)

    if (!isHeaderCellMousedown.value || isOperationColumn(column.key as ColKey, colgroups.value))
      return

    const colKeys = getHeaderColKeys(column)
    const { startColKey } = headerIndicatorColKeys.value

    const leftColKey = getLeftmostColKey({
      colgroups: colgroups.value,
      colKeys: colKeys.concat([startColKey]),
    })

    const endColKey = leftColKey === startColKey ? colKeys[colKeys.length - 1] : colKeys[0]

    state.headerIndicatorColKeysChange({ startColKey, endColKey })
  }

  // 表头 mousemove：通知列宽拖动
  function headerCellMousemove({ event, column }: HeaderCellEventPayload) {
    tableContext.emit(HOOKS_NAME.HEADER_CELL_MOUSEMOVE, { event, column })
  }

  function headerCellMouseleave(_payload: HeaderCellEventPayload) {
    // todo
  }

  // 接收子组件通过表格上下文发出的事件（MOD-01）：事件名 → 处理函数
  onMounted(() => {
    tableEvents.onMany({
      [EMIT_EVENTS.SORT_CHANGE]: () => updateColgroupsBySortChange(),
      [EMIT_EVENTS.HEADER_ROW_HEIGHT_CHANGE]: payload => layout.headerRowHeightChange(payload),
      [EMIT_EVENTS.FOOTER_ROW_HEIGHT_CHANGE]: payload => layout.footRowHeightChange(payload),
      [EMIT_EVENTS.BODY_CELL_CLICK]: bodyCellClick,
      [EMIT_EVENTS.BODY_CELL_MOUSEOVER]: bodyCellMouseover,
      [EMIT_EVENTS.BODY_CELL_MOUSEDOWN]: bodyCellMousedown,
      [EMIT_EVENTS.BODY_CELL_MOUSEMOVE]: bodyCellMousemove,
      [EMIT_EVENTS.BODY_CELL_MOUSEUP]: bodyCellMouseup,
      [EMIT_EVENTS.SELECTION_CORNER_MOUSEDOWN]: autofill.cellSelectionCornerMousedown,
      [EMIT_EVENTS.SELECTION_CORNER_MOUSEUP]: autofill.cellSelectionCornerMouseup,
      [EMIT_EVENTS.BODY_CELL_CONTEXTMENU]: bodyCellContextmenu,
      [EMIT_EVENTS.BODY_CELL_DOUBLE_CLICK]: bodyCellDoubleClick,
      [EMIT_EVENTS.HEADER_CELL_CLICK]: headerCellClick,
      [EMIT_EVENTS.HEADER_CELL_CONTEXTMENU]: headerCellContextmenu,
      [EMIT_EVENTS.HEADER_CELL_MOUSEDOWN]: headerCellMousedown,
      [EMIT_EVENTS.HEADER_CELL_MOUSEOVER]: headerCellMouseover,
      [EMIT_EVENTS.HEADER_CELL_MOUSEMOVE]: headerCellMousemove,
      [EMIT_EVENTS.HEADER_CELL_MOUSELEAVE]: headerCellMouseleave,
    })
  })

  return {
    updateColgroupsBySortChange,
    tableClickOutside,
    tableContainerMouseup,
    headerMouseleave,
    bodyCellClick,
    bodyCellDoubleClick,
    bodyCellContextmenu,
    bodyCellMousedown,
    bodyCellMouseover,
    bodyCellMousemove,
    bodyCellMouseup,
    headerCellClick,
    headerCellContextmenu,
    headerCellMousedown,
    headerCellMouseover,
    headerCellMousemove,
    headerCellMouseleave,
  }
}
