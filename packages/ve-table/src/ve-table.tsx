import type { ComponentPublicInstance } from 'vue'
import type {
  ContextmenuOption,
  EditorInstance,
  SelectionInstance,
} from './ve-table-types'
import VueDomResizeObserver from '@vue3-easytable/common/comps/resize-observer'
import clickoutside from '@vue3-easytable/common/directives/clickoutside'
import { globalLocale, LocaleInjectionKey } from '@vue3-easytable/common/locale'
import {
  getValByUnit,
  isEmptyValue,
} from '@vue3-easytable/common/utils'
import { MOUSE_EVENT_CLICK_TYPE } from '@vue3-easytable/common/utils/constant'
// isInputKeyCode moved to methods/keyboard.ts
import { getMouseEventClickType } from '@vue3-easytable/common/utils/mouse-event'
import VeContextmenu from '@vue3-easytable/ve-contextmenu'
import { computed, defineComponent, inject, markRaw, nextTick, provide, shallowRef } from 'vue'
import Body from './body'
import Colgroup from './colgroup'
import ColumnResizer from './column-resizer'
import EditInput from './editor'
import { useAutofill } from './features/cell-selection/useAutofill'
import { useCellSelection } from './features/cell-selection/useCellSelection'
import { useCellSelectionState } from './features/cell-selection/useCellSelectionState'
import { useSelectionDrag } from './features/cell-selection/useSelectionDrag'
import { useClipboard } from './features/clipboard/useClipboard'
import { useColumnMeasure } from './features/columns/useColumnMeasure'
import { useColumns } from './features/columns/useColumns'
import { useEditing } from './features/editing/useEditing'
import { FIXED_COLUMNS_KEY, useFixedColumns } from './features/fixed-columns/useFixedColumns'
import { useKeyboard } from './features/keyboard/useKeyboard'
import { useTableLayout } from './features/layout/useTableLayout'
import { createRowState, ROW_STATE_KEY } from './features/row-state'
import { useScrolling } from './features/scrolling/useScrolling'
import { createTableContext, provideTableContext, useTableContext } from './features/table-context'
import { useVirtualScroll } from './features/virtual-scroll/useVirtualScroll'
import Footer from './footer'
import Header from './header'
import { contextmenuMethods } from './methods/contextmenu'
import RowInsertIndicator from './row-insert-indicator'
import Selection from './selection'
// Clipboard utils moved to methods/clipboard.ts
import {
  COMPS_NAME,
  CONTEXTMENU_TYPES,
  EMIT_EVENTS,
  HOOKS_NAME,
  INSTANCE_METHODS,
  KEYBOARD_MODE,
} from './util/constant.js'
import {
  clsName,
  getColgroupKeysByHeaderColumn,
  getEmitEventName,
  getLeftmostColKey,
  getRowKey,
  isClearSelectionByBodyCellRightClick,
  isContextmenuPanelClicked,
  isOperationColumn,
} from './util/index.js'
import { veTableProps } from './ve-table-props'

export default defineComponent({
  name: COMPS_NAME.VE_TABLE,
  directives: {
    'click-outside': clickoutside,
  },
  /*
   * INFRA-06：声明组件对外触发的全部事件（this.$emit）。
   * 未声明时监听器会作为属性透传到根元素上。内部组件之间的通信走表格上下文（MOD-01），不在此列。
   * - on-row-insert：行插入（rowInsertOption），参数 { insertRowIndex }
   */
  emits: [EMIT_EVENTS.ROW_INSERT],
  props: veTableProps,
  setup(props) {
    // 表格上下文（MOD-01）：子组件与表格之间的类型化事件，取代 emitter mixin 与 Hooks。非响应式
    const tableContext = markRaw(createTableContext())
    provideTableContext(tableContext)
    // 表格自身的订阅，卸载时自动注销
    const tableEvents = markRaw(useTableContext(tableContext))

    // 语言包：最近的 ConfigProvider，否则为全局语言包（右键菜单文案使用）
    const veLocale = inject(LocaleInjectionKey, globalLocale)

    // 行 key（按 tableData 顺序）
    const allRowKeys = computed<Array<string | number>>(() => {
      const { tableData, rowKeyFieldName } = props
      if (!rowKeyFieldName)
        return []
      return (tableData as any[]).map(x => x[rowKeyFieldName])
    })

    // 行勾选 / 单选 / 展开状态（MOD-08）：表头和表体通过 inject 共享同一份派生状态
    provide(ROW_STATE_KEY, createRowState({
      checkboxOption: () => props.checkboxOption,
      radioOption: () => props.radioOption,
      expandOption: () => props.expandOption,
      tableData: () => props.tableData,
      rowKeyFieldName: () => props.rowKeyFieldName,
      allRowKeys,
    }))
    // 模板 ref（render 中以同名字符串引用）
    const tableRootRef = shallowRef<HTMLElement | null>(null)
    const tableContainerWrapperRef = shallowRef<ComponentPublicInstance | null>(null)
    const tableContainerRef = shallowRef<HTMLElement | null>(null)
    const tableRef = shallowRef<HTMLTableElement | null>(null)
    const tableBodyRef = shallowRef<ComponentPublicInstance | null>(null)
    const tableContentWrapperRef = shallowRef<ComponentPublicInstance | null>(null)
    const virtualPhantomRef = shallowRef<HTMLElement | null>(null)
    const editInputRef = shallowRef<EditorInstance | null>(null)
    const cellSelectionRef = shallowRef<SelectionInstance | null>(null)
    const contextmenuRef = shallowRef<ComponentPublicInstance | null>(null)

    // 列：cloneColumns、分组表头、colgroups，隐藏 / 显示列，拖动列宽
    const columns = useColumns({
      props,
      tableContext,
      // 拖动列宽后，等 DOM 更新再刷新滚动条状态（滚动状态在后面创建，函数声明会被提升）
      onColumnWidthResize: refreshScrollBarStatusAfterRender,
    })
    // 列宽测量（COL-07、COL-15）
    const columnMeasure = useColumnMeasure({
      colgroups: columns.colgroups,
      columnsOptionResetTime: columns.columnsOptionResetTime,
      tableContext,
    })

    // 固定列的样式与 class（MOD-06）：按 colgroups 计算一次，表头、表体、表尾共享
    provide(FIXED_COLUMNS_KEY, useFixedColumns(columns.colgroups))

    // 表头 / 表尾行高、表格高度
    const layout = useTableLayout({ props, groupColumns: columns.groupColumns })

    // 单元格选区状态：活动单元格、区域、整列 / 整行指示器
    const selectionState = useCellSelectionState({ props, colgroups: columns.colgroups, allRowKeys })

    // 虚拟滚动（TanStack Virtual）
    const virtualScroll = useVirtualScroll({
      props,
      allRowKeys,
      headerTotalHeight: layout.headerTotalHeight,
      footerTotalHeight: layout.footerTotalHeight,
      scrollElement: tableContainerRef,
    })

    // 滚动阴影、滚动条状态、行 / 列滚动到可见区域
    const scrolling = useScrolling({
      props,
      rootElement: tableRootRef,
      containerElement: tableContainerRef,
      contentWrapper: tableContentWrapperRef,
      colgroups: columns.colgroups,
      hasFixedColumn: columns.hasFixedColumn,
      columnsOptionResetTime: columns.columnsOptionResetTime,
      isVirtualScroll: virtualScroll.isVirtualScroll,
      virtualScroll: virtualScroll.virtualScroll,
      headerTotalHeight: layout.headerTotalHeight,
      footerTotalHeight: layout.footerTotalHeight,
      cellSelectionData: selectionState.cellSelectionData,
      cellSelectionCurrentCellChange: selectionState.cellSelectionCurrentCellChange,
    })

    // 单元格编辑
    const editing = useEditing({
      props,
      colgroups: columns.colgroups,
      cellSelectionData: selectionState.cellSelectionData,
      cellSelectionCurrentCellChange: selectionState.cellSelectionCurrentCellChange,
      tableContext,
    })

    // 选区的实例方法、点击选择，行列变化后同步选区与编辑状态（SEL-01）
    const selection = useCellSelection({
      props,
      colgroups: columns.colgroups,
      allRowKeys,
      state: selectionState,
      scrolling,
      editing,
      tableContext,
    })
    // 拖动选择（单元格区域、整行、整列）
    const selectionDrag = useSelectionDrag()
    // 拖动选区角标填充
    const autofill = useAutofill({
      props,
      colgroups: columns.colgroups,
      allRowKeys,
      state: selectionState,
      containerElement: tableContainerRef,
      tableContext,
    })

    // 剪贴板：复制、粘贴、剪切、Delete
    const clipboard = useClipboard({
      props,
      colgroups: columns.colgroups,
      allRowKeys,
      cellSelectionRangeData: selectionState.cellSelectionRangeData,
      cellSelectionCurrentCellChange: selectionState.cellSelectionCurrentCellChange,
      cellSelectionNormalEndCellChange: selectionState.cellSelectionNormalEndCellChange,
      isCellEditing: editing.isCellEditing,
      tableContext,
    })

    // 键盘：单元格导航、编辑快捷键、表格模式（SEL-08）
    const keyboard = useKeyboard({
      rootElement: tableRootRef,
      editor: editInputRef,
      colgroups: columns.colgroups,
      allRowKeys,
      state: selectionState,
      selection,
      editing,
      clipboard,
      scrolling,
    })

    function refreshScrollBarStatusAfterRender() {
      nextTick(() => scrolling.setScrollBarStatus())
    }

    return {
      tableContext,
      tableEvents,
      veLocale,
      allRowKeys,
      ...columns,
      ...columnMeasure,
      ...layout,
      ...virtualScroll,
      ...selectionState,
      ...scrolling,
      ...editing,
      ...selection,
      ...selectionDrag,
      ...autofill,
      ...clipboard,
      ...keyboard,
      tableRootRef,
      tableContainerWrapperRef,
      tableContainerRef,
      tableRef,
      tableBodyRef,
      tableContentWrapperRef,
      virtualPhantomRef,
      editInputRef,
      cellSelectionRef,
      contextmenuRef,
    }
  },
  data() {
    return {
      parentRendered: false,

      // Highlight
      highlightRowKey: '' as string | number,

      // Context menu
      contextmenuEventTarget: '' as string | EventTarget,
      contextmenuOptions: [] as ContextmenuOption[],
    }
  },
  computed: {
    // table container wrapper style
    tableContainerWrapperStyle() {
      return {
        width: '100%',
      }
    },
    // table container style
    tableContainerStyle() {
      const maxHeight = getValByUnit(this.maxHeight)

      let tableContainerHeight: string | number | undefined
      if (this.isVirtualScroll) {
        if (maxHeight) {
          tableContainerHeight = maxHeight as string | number
        }
        else {
          console.error(
            'maxHeight prop is required when \'virtualScrollOption.enable = true\'',
          )
        }
      }
      else {
        const { tableHeight, hasXScrollBar } = this
        let h = tableHeight
        if (hasXScrollBar)
          h += this.getScrollBarWidth()

        tableContainerHeight = getValByUnit(h)
      }

      return {
        'max-height': maxHeight as string | number | undefined,
        'height': tableContainerHeight,
      }
    },
    // table style
    tableStyle() {
      return {
        width: getValByUnit(this.scrollWidth),
      }
    },
    // table class
    tableClass() {
      return {
        [clsName('border-x')]: this.borderX,
        [clsName('border-y')]: this.borderY,
      }
    },
    // table container class
    tableContainerClass() {
      const {
        isVirtualScroll,
        isLeftScrolling,
        isRightScrolling,
        isVerticalScrolling,
        isCellEditing,
        isAutofillStarting,
        enableCellSelection,
      } = this

      return {
        [clsName('container')]: true,
        [clsName('virtual-scroll')]: isVirtualScroll,
        [clsName('container-left-scrolling')]: isLeftScrolling,
        [clsName('container-right-scrolling')]: isRightScrolling,
        [clsName('container-vertical-scrolling')]: isVerticalScrolling,
        [clsName('is-cell-editing')]: isCellEditing,
        [clsName('autofilling')]: isAutofillStarting,
        // 如果开启单元格选择，则关闭 user-select
        [clsName('enable-cell-selection')]: enableCellSelection,
      }
    },
    // table body class
    tableBodyClass() {
      let result = null

      const { rowStyleOption } = this

      let hoverHighlight = true
      let clickHighlight = true
      let stripe = false

      if (rowStyleOption) {
        hoverHighlight = rowStyleOption.hoverHighlight
        clickHighlight = rowStyleOption.clickHighlight
        stripe = rowStyleOption.stripe
      }

      result = {
        [clsName('stripe')]: stripe === true, // 默认不开启
        [clsName('row-hover')]: hoverHighlight !== false, // 默认开启
        [clsName('row-highlight')]: clickHighlight !== false, // 默认开启
      }

      return result
    },
    // enable header contextmenu
    enableHeaderContextmenu() {
      let result = false

      const { contextmenuHeaderOption } = this
      if (contextmenuHeaderOption) {
        const { contextmenus } = contextmenuHeaderOption

        if (Array.isArray(contextmenus) && contextmenus.length)
          result = true
      }
      return result
    },
    // enable body contextmenu
    enableBodyContextmenu() {
      let result = false

      const { contextmenuBodyOption } = this
      if (contextmenuBodyOption) {
        const { contextmenus } = contextmenuBodyOption

        if (Array.isArray(contextmenus) && contextmenus.length)
          result = true
      }
      return result
    },
    // contextmenu type
    contextMenuType() {
      if (!isEmptyValue(this.headerIndicatorColKeys.startColKey))
        return CONTEXTMENU_TYPES.HEADER_CONTEXTMENU

      else
        return CONTEXTMENU_TYPES.BODY_CONTEXTMENU
    },
    // row insert indicator props
    rowInsertIndicatorProps() {
      return {
        parentRendered: this.parentRendered,
        tableContainerEl: this.tableContainerRef as HTMLElement | undefined,
        tableEl: this.tableRef as HTMLTableElement | undefined,
        colgroups: this.colgroups,
        // INS-01 / VS-06：插入位置的数据下标直接从行的 <tbody data-index> 读取，
        // 不再依赖虚拟滚动区间（否则每次滚动都会重新渲染指示器）
        rowInsertOption: this.rowInsertOption,
        fixedHeader: this.fixedHeader,
        fixedFooter: this.fixedFooter,
        [getEmitEventName(EMIT_EVENTS.ROW_INSERT)]: (params) => {
          this.handleRowInsert(params)
        },
      }
    },
  },
  mounted() {
    this.parentRendered = true

    // set contextmenu event target
    this.contextmenuEventTarget = this.tableRootRef.querySelector(
      `.${clsName('content')}`,
    )

    // 接收子组件通过表格上下文发出的事件（MOD-01）：事件名 → 处理方法
    this.tableEvents.onMany({
      [EMIT_EVENTS.SORT_CHANGE]: () => this.updateColgroupsBySortChange(),
      [EMIT_EVENTS.HEADER_ROW_HEIGHT_CHANGE]: ({ rowIndex, height }) => this.headerRowHeightChange({ rowIndex, height }),
      [EMIT_EVENTS.FOOTER_ROW_HEIGHT_CHANGE]: ({ rowIndex, height }) => this.footRowHeightChange({ rowIndex, height }),
      [EMIT_EVENTS.BODY_CELL_CLICK]: params => this.bodyCellClick(params),
      [EMIT_EVENTS.BODY_CELL_MOUSEOVER]: params => this.bodyCellMouseover(params),
      [EMIT_EVENTS.BODY_CELL_MOUSEDOWN]: params => this.bodyCellMousedown(params),
      [EMIT_EVENTS.BODY_CELL_MOUSEMOVE]: params => this.bodyCellMousemove(params),
      [EMIT_EVENTS.BODY_CELL_MOUSEUP]: params => this.bodyCellMouseup(params),
      [EMIT_EVENTS.SELECTION_CORNER_MOUSEDOWN]: params => this.cellSelectionCornerMousedown(params),
      [EMIT_EVENTS.SELECTION_CORNER_MOUSEUP]: params => this.cellSelectionCornerMouseup(params),
      [EMIT_EVENTS.BODY_CELL_CONTEXTMENU]: params => this.bodyCellContextmenu(params),
      [EMIT_EVENTS.BODY_CELL_DOUBLE_CLICK]: params => this.bodyCellDoubleClick(params),
      [EMIT_EVENTS.HEADER_CELL_CLICK]: params => this.headerCellClick(params),
      [EMIT_EVENTS.HEADER_CELL_CONTEXTMENU]: params => this.headerCellContextmenu(params),
      [EMIT_EVENTS.HEADER_CELL_MOUSEDOWN]: params => this.headerCellMousedown(params),
      [EMIT_EVENTS.HEADER_CELL_MOUSEOVER]: params => this.headerCellMouseover(params),
      [EMIT_EVENTS.HEADER_CELL_MOUSEMOVE]: params => this.headerCellMousemove(params),
      [EMIT_EVENTS.HEADER_CELL_MOUSELEAVE]: params => this.headerCellMouseleave(params),
    })
  },

  methods: {
    // sort change
    // COL-08：排序状态只保存在表头（header/index.tsx 的 sortColumns），不再写回 colgroups[].sortBy，
    // 这样 colgroups[].sortBy 始终是配置值，表头可以据此区分“列重新生成”和“配置变化”
    updateColgroupsBySortChange() {
      // clear cell selection when sorting to avoid stale selection state
      this.clearCellSelectionCurrentCell()
      this.clearCellSelectionNormalEndCell()

      // stop editing cell if active
      this[INSTANCE_METHODS.STOP_EDITING_CELL]()
    },

    // get virtual phantom (kept for expand row + fixed column sticky workaround)
    getVirtualViewPhantom() {
      let content = null

      const { hasLeftFixedColumn, expandOption } = this

      // This phantom is only needed for the non-virtual-scroll sticky expand row fix
      if (!this.isVirtualScroll && hasLeftFixedColumn && expandOption) {
        const props = {
          tagName: 'div',
          style: {
            width: '100%',
          },
          onOnDomResizeChange: ({ width }) => {
            this.tableViewportWidth = width
          },
        }

        content = (
          <div
            ref="virtualPhantomRef"
            class={[
              clsName('virtual-phantom'),
            ]}
          >
            <VueDomResizeObserver {...props} />
          </div>
        )
      }

      return content
    },

    // table click outside
    tableClickOutside(e) {
      // exclude contextmenu panel clicked
      if (isContextmenuPanelClicked(e))
        return false

      // 结束拖动选择，同时移除拖动期间的 mouseup / blur 监听（SEL-20）
      this.endSelectionDrag()
      // 在表格外点击：取消正在进行的填充，而不是提交（FILL-02）
      this.cancelAutofill()
      this.setIsColumnResizing(false)

      // clear cell selection
      this.clearCellSelectionCurrentCell()
      this.clearCellSelectionNormalEndCell()

      // clear indicators
      this.clearHeaderIndicatorColKeys()
      this.clearBodyIndicatorRowKeys()

      // stop editing cell
      this[INSTANCE_METHODS.STOP_EDITING_CELL]()
    },

    /*
         * @bodyCellContextmenu
         * @desc  recieve td right click\contextmenu event
         * @param {object} rowData - row data
         * @param {object} column - column data
         */
    bodyCellContextmenu({ event: _event, rowData, column }) {
      const { editOption, rowKeyFieldName } = this

      if (editOption) {
        const rowKey = getRowKey(rowData, rowKeyFieldName)
        this.editCellByClick({
          isDblclick: false,
          rowKey,
          colKey: column.key,
        })
      }

      this.setContextmenuOptions(column)
    },

    /*
         * @bodyCellDoubleClick
         * @desc  recieve td double click event
         * @param {object} rowData - row data
         * @param {object} column - column data
         */
    bodyCellDoubleClick({ event: _event, rowData, column }) {
      const { editOption, rowKeyFieldName, colgroups } = this

      if (isOperationColumn(column.key, colgroups)) {
        // clear cell selection
        this.clearCellSelectionCurrentCell()
        this.clearCellSelectionNormalEndCell()

        // stop editing cell
        this[INSTANCE_METHODS.STOP_EDITING_CELL]()
        return false
      }

      if (editOption) {
        const rowKey = getRowKey(rowData, rowKeyFieldName)
        this.editCellByClick({
          isDblclick: true,
          rowKey,
          colKey: column.key,
        })
      }
    },

    /*
         * @bodyCellClick
         * @desc  recieve td click event
         * @param {object} rowData - row data
         * @param {object} column - column data
         */
    bodyCellClick({ event: _event, rowData: _rowData, column: _column }) {
      // feature...
    },

    /*
         * @bodyCellMousedown
         * @desc  recieve td mousedown event
         * @param {object} rowData - row data
         * @param {object} column - column data
         */
    bodyCellMousedown({ event, rowData, column }) {
      if (!this.enableCellSelection)
        return false

      // SEL-10：点击的是单元格中渲染的输入框、按钮等：焦点和按键归该元素
      const isWidgetMousedown = !!this.getCellWidgetElement(event.target)

      // SEL-08：点击单元格（包括当前单元格）恢复单元格导航
      if (!isWidgetMousedown)
        this.keyboardMode = KEYBOARD_MODE.CELL

      const { shiftKey } = event

      const {
        editOption,
        rowKeyFieldName,
        colgroups,
        cellSelectionData,
        cellSelectionRangeData,
        allRowKeys,
      } = this

      const rowKey = getRowKey(rowData, rowKeyFieldName)!
      const colKey = column.key

      const { currentCell } = cellSelectionData

      const mouseEventClickType = getMouseEventClickType(event)

      if (isOperationColumn(colKey, colgroups)) {
        // clear header indicator colKeys
        this.clearHeaderIndicatorColKeys()

        const { bodyIndicatorRowKeys } = this
        this.isBodyOperationColumnMousedown = true
        // 在表格外松开时也要结束拖动（SEL-11）
        this.addSelectionDragListener()

        const { startRowKey, endRowKey } = bodyIndicatorRowKeys
        // 下标按当前行顺序计算，插入行后不会过期（SEL-09）
        const {
          startRowIndex: startRowKeyIndex,
          endRowIndex: endRowKeyIndex,
        } = this.getIndicatorIndexes()
        let newStartRowKey = startRowKey
        let newEndRowKey = endRowKey

        if (
          shiftKey
          && (startRowKeyIndex > -1 || currentCell.rowIndex > -1)
        ) {
          newStartRowKey = isEmptyValue(currentCell.rowKey)
            ? startRowKey
            : currentCell.rowKey
          newEndRowKey = rowKey
        }
        else {
          const currentRowIndex = allRowKeys.indexOf(rowKey)
          // 从下往上拖动时起点下标大于终点下标，按上下边界判断（SEL-15）
          const topRowIndex = Math.min(startRowKeyIndex, endRowKeyIndex)
          const bottomRowIndex = Math.max(startRowKeyIndex, endRowKeyIndex)

          // 左键点击 || 不在当前选择行内
          if (
            mouseEventClickType
            === MOUSE_EVENT_CLICK_TYPE.LEFT_MOUSE
            || currentRowIndex < topRowIndex
            || currentRowIndex > bottomRowIndex
          ) {
            newStartRowKey = rowKey
            newEndRowKey = rowKey
          }
        }

        this.bodyIndicatorRowKeysChange({
          startRowKey: newStartRowKey,
          endRowKey: newEndRowKey,
        })
      }
      else {
        // body cell mousedown（在输入框中拖动选择文字时不扩展单元格选区，SEL-10）
        this.isBodyCellMousedown = !isWidgetMousedown
        if (this.isBodyCellMousedown)
          this.addSelectionDragListener()

        const isClearByRightClick
                    = isClearSelectionByBodyCellRightClick({
                      mouseEventClickType,
                      cellData: {
                        rowKey,
                        colKey,
                      },
                      cellSelectionData,
                      cellSelectionRangeData,
                      colgroups,
                      allRowKeys,
                    })

        if (isClearByRightClick) {
          // clear header indicator colKeys
          this.clearHeaderIndicatorColKeys()
          // clear body indicator colKeys
          this.clearBodyIndicatorRowKeys()

          if (shiftKey && currentCell.rowIndex > -1) {
            this.cellSelectionNormalEndCellChange({
              rowKey,
              colKey,
            })
          }
          else {
            // cell selection by click
            this.cellSelectionByClick({ rowData, column })
            this.clearCellSelectionNormalEndCell()
          }
        }
      }

      if (editOption) {
        this.editCellByClick({
          isDblclick: false,
          rowKey,
          colKey,
        })
      }
    },

    /*
         * @bodyCellMouseover
         * @desc  recieve td mouseover event
         * @param {object} rowData - row data
         * @param {object} column - column data
         */
    bodyCellMouseover({ event, rowData, column }) {
      // 拖动选择时没有按住左键：mouseup 已丢失，先结束拖动（SEL-18）
      this.endLostSelectionDrag(event)

      const {
        rowKeyFieldName,
        isBodyCellMousedown,
        isAutofillStarting,
        isHeaderCellMousedown,
        isBodyOperationColumnMousedown,
      } = this

      const rowKey = getRowKey(rowData, rowKeyFieldName)
      const colKey = column.key

      if (isBodyCellMousedown) {
        // 操作列不能单元格选中
        if (isOperationColumn(colKey, this.colgroups))
          return false

        this.cellSelectionNormalEndCellChange({
          rowKey,
          colKey,
        })
      }

      if (isBodyOperationColumnMousedown) {
        this.bodyIndicatorRowKeysChange({
          startRowKey: this.bodyIndicatorRowKeys.startRowKey,
          endRowKey: rowKey,
        })
      }

      // 允许在body cell mouseover 里补充 header indicator 信息
      if (isHeaderCellMousedown) {
        this.headerIndicatorColKeysChange({
          startColKey: this.headerIndicatorColKeys.startColKey,
          endColKey: colKey,
        })
      }

      if (isAutofillStarting) {
        /*
        经过单元格时没有按住左键：说明 mouseup 已丢失（例如在窗口外释放且浏览器没有派发），
        取消填充，避免下一次在表格内的 mouseup 提交（FILL-02）
        */
        if (event instanceof MouseEvent && (event.buttons & 1) === 0) {
          this.cancelAutofill()
          return false
        }

        // 操作列不能autofilling 效果
        if (isOperationColumn(colKey, this.colgroups))
          return false

        this.cellSelectionAutofillCellChange({
          rowKey,
          colKey,
        })
      }
    },

    /*
         * @bodyCellMousemove
         * @desc  recieve td mousemove event
         * @param {object} rowData - row data
         * @param {object} column - column data
         */
    bodyCellMousemove({ event, rowData: _rowData, column }) {
      this.tableContext.emit(HOOKS_NAME.BODY_CELL_MOUSEMOVE, {
        event,
        column,
      })
    },

    /*
         * @bodyCellMouseup
         * @desc  recieve td mouseup event
         * @param {object} rowData - row data
         * @param {object} column - column data
         */
    bodyCellMouseup({ event: _event, rowData: _rowData, column: _column }) {
      // feature...
    },

    // header cell click
    headerCellClick({ event: _event, column: _column }) {
      // feature...
    },

    // header cell contextmenu
    headerCellContextmenu({ event: _event, column }) {
      this.setContextmenuOptions(column)
    },

    // header cell mousedown
    headerCellMousedown({ event, column }) {
      if (!this.enableCellSelection)
        return false

      this.isHeaderCellMousedown = true
      this.addSelectionDragListener()

      const { shiftKey } = event

      const {
        isGroupHeader,
        colgroups,
        headerIndicatorColKeys,
        cellSelectionData,
      } = this

      // clear body indicator colKeys
      this.clearBodyIndicatorRowKeys()

      let colKeys
      if (isGroupHeader) {
        // 使用 colgroups 中真实的列 key，数字 key 才能匹配（COL-13）
        colKeys = getColgroupKeysByHeaderColumn({
          headerColumnItem: column,
          colgroups,
        })
      }
      else {
        colKeys = [column.key]
      }

      const currentCellStartColKey = colKeys[0]
      const currentCellEndColKey = colKeys[colKeys.length - 1]

      const { currentCell } = cellSelectionData

      if (isOperationColumn(column.key, colgroups)) {
        // clear cell selection
        this.clearCellSelectionCurrentCell()
        this.clearCellSelectionNormalEndCell()
        this.$nextTick(() => {
          // select all cell
          this[INSTANCE_METHODS.SET_ALL_CELL_SELECTION]()
        })
        return false
      }

      // 需要先将之前选中单元格元素清空
      if (isEmptyValue(headerIndicatorColKeys.startColKey)) {
        // 值的比较（currentCell.colKey 会变化）
        if (
          JSON.stringify(colKeys)
          !== JSON.stringify([currentCell.colKey])
        ) {
          this.cellSelectionRef.clearCurrentCellRect()
        }

        this.cellSelectionRef.clearNormalEndCellRect()
      }

      const { startColKey, endColKey } = headerIndicatorColKeys
      // 下标按当前列顺序计算（SEL-09）
      const {
        startColIndex: startColKeyIndex,
        endColIndex: endColKeyIndex,
      } = this.getIndicatorIndexes()

      let newStartColKey = startColKey
      let newEndColKey = endColKey
      if (shiftKey) {
        if (isEmptyValue(startColKey)) {
          if (!isEmptyValue(currentCell.colKey)) {
            const leftColKey = getLeftmostColKey({
              colgroups,
              colKeys: colKeys.concat([currentCell.colKey]),
            })

            newStartColKey = currentCell.colKey
            if (leftColKey === currentCell.colKey)
              newEndColKey = currentCellEndColKey

            else
              newEndColKey = currentCellStartColKey
          }
          else {
            newStartColKey = currentCellStartColKey
            newEndColKey = currentCellEndColKey
          }
        }
        else {
          newStartColKey = startColKey
          const leftColKey = getLeftmostColKey({
            colgroups,
            colKeys: colKeys.concat([startColKey]),
          })

          if (leftColKey === startColKey)
            newEndColKey = currentCellEndColKey

          else
            newEndColKey = currentCellStartColKey
        }
      }
      else {
        const mouseEventClickType = getMouseEventClickType(event)
        const currentCellStartColIndex = colgroups.findIndex(
          x => x.key === currentCellStartColKey,
        )
        const currentCellEndColIndex = colgroups.findIndex(
          x => x.key === currentCellEndColKey,
        )
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

      this.headerIndicatorColKeysChange({
        startColKey: newStartColKey,
        endColKey: newEndColKey,
      })
    },

    // header cell mouseover
    headerCellMouseover({ event, column }) {
      // 拖动选择时没有按住左键：mouseup 已丢失，先结束拖动（SEL-18）
      this.endLostSelectionDrag(event)

      const {
        colgroups,
        isGroupHeader,
        isHeaderCellMousedown,
        headerIndicatorColKeys,
      } = this

      if (
        isHeaderCellMousedown
        && !isOperationColumn(column.key, colgroups)
      ) {
        let colKeys
        if (isGroupHeader) {
          // 使用 colgroups 中真实的列 key，数字 key 才能匹配（COL-13）
          colKeys = getColgroupKeysByHeaderColumn({
            headerColumnItem: column,
            colgroups,
          })
        }
        else {
          colKeys = [column.key]
        }

        const leftColKey = getLeftmostColKey({
          colgroups,
          colKeys: colKeys.concat([
            headerIndicatorColKeys.startColKey,
          ]),
        })

        let endColKey
        if (leftColKey === headerIndicatorColKeys.startColKey)
          endColKey = colKeys[colKeys.length - 1]

        else
          endColKey = colKeys[0]

        this.headerIndicatorColKeysChange({
          startColKey: this.headerIndicatorColKeys.startColKey,
          endColKey,
        })
      }
    },

    // header cell mousemove
    headerCellMousemove({ event, column }) {
      this.tableContext.emit(HOOKS_NAME.HEADER_CELL_MOUSEMOVE, {
        event,
        column,
      })
    },

    // header cell mouseleave
    headerCellMouseleave({ event: _event, column: _column }) {
      // todo
    },

    // header mouseleave
    headerMouseleave(_event) {
      this.setIsColumnResizerHover(false)
    },

    // table container mouseup
    tableContainerMouseup() {
      // 结束拖动选择，同时移除拖动期间的 mouseup / blur 监听（SEL-20）
      this.endSelectionDrag()
      // 在表格内释放：提交填充（通常 FILL-02 的 window 捕获监听已先处理）
      this.isAutofillStarting = false
    },

    // set highlight row
    [INSTANCE_METHODS.SET_HIGHLIGHT_ROW]({ rowKey }) {
      this.highlightRowKey = rowKey
    },
    // handle row insert
    handleRowInsert({ insertRowIndex }) {
      const { rowInsertOption } = this
      if (!rowInsertOption?.enable)
        return

      // Emit the row insert event to parent
      this.$emit(EMIT_EVENTS.ROW_INSERT, {
        insertRowIndex,
      })
    },

    // ── Extracted method modules (override any inline stubs above) ──
    ...contextmenuMethods,
  },
  render() {
    const {
      showHeader,
      tableViewportWidth,
      tableContainerStyle,
      tableStyle,
      tableClass,
      colgroups,
      groupColumns,
      fixedHeader,
      fixedFooter,
      actualRenderTableData,
      expandOption,
      checkboxOption,
      radioOption,
      rowKeyFieldName,
      virtualScrollOption,
      isVirtualScroll,
      sortOption,
      cellStyleOption,
      cellSelectionData,
      editOption,
      contextmenuOptions,
      allRowKeys,
      enableCellSelection,
      enableColumnResize,
      cellSelectionRangeData,
      headerIndicatorColKeys,
      bodyIndicatorRowKeys,
    } = this

    // header props
    const headerProps = {
      class: clsName('header'),
      style: {
        cursor:
                    this.isColumnResizerHover || this.isColumnResizing
                      ? 'col-resize'
                      : '',
      },
      columnsOptionResetTime: this.columnsOptionResetTime,
      // TODO：好像没用
      // tableViewportWidth,
      groupColumns,
      colgroups,
      isGroupHeader: this.isGroupHeader,
      fixedHeader,
      checkboxOption,
      sortOption,
      cellStyleOption,
      eventCustomOption: this.eventCustomOption,
      headerRows: this.headerRows,
      cellSelectionData,
      cellSelectionRangeData,
      headerIndicatorColKeys,
      onClick: () => {
        this[INSTANCE_METHODS.STOP_EDITING_CELL]()
      },
      onMouseleave: (event) => {
        this.headerMouseleave(event)
      },
    }

    // body props
    const bodyProps = {
      ref: 'tableBodyRef',
      // 虚拟滚动时 Body 渲染多个 <tbody>（片段根节点），class 无法 fall-through，因此作为 prop 显式传入
      bodyClass: [clsName('body'), this.tableBodyClass],
      stripe: this.tableBodyClass[clsName('stripe')],
      tableViewportWidth,
      colgroups,
      expandOption,
      checkboxOption,
      actualRenderTableData,
      rowKeyFieldName,
      radioOption,
      virtualScrollOption,
      isVirtualScroll,
      cellStyleOption,
      cellSpanOption: this.cellSpanOption,
      eventCustomOption: this.eventCustomOption,
      cellSelectionOption: this.cellSelectionOption,
      hasFixedColumn: this.hasFixedColumn,
      cellSelectionData,
      cellSelectionRangeData,
      allRowKeys,
      editOption,
      highlightRowKey: this.highlightRowKey,
      bodyIndicatorRowKeys,
      // TanStack virtual scroll data
      virtualItems: this.virtualItems,
      virtualPaddingTop: this.virtualPaddingTop,
      virtualPaddingBottom: this.virtualPaddingBottom,
      virtualMeasureElement: this.virtualScroll ? this.measureVirtualRow : undefined,
      [getEmitEventName(EMIT_EVENTS.HIGHLIGHT_ROW_CHANGE)]:
                    this[INSTANCE_METHODS.SET_HIGHLIGHT_ROW],
    }

    // footer props
    const footerProps = {
      class: [clsName('footer')],
      colgroups,
      footerData: this.footerData,
      rowKeyFieldName,
      cellStyleOption,
      fixedFooter,
      cellSpanOption: this.cellSpanOption,
      eventCustomOption: this.eventCustomOption,
      hasFixedColumn: this.hasFixedColumn,
      allRowKeys,
      footerRows: this.footerRows,
      onClick: () => {
        this[INSTANCE_METHODS.STOP_EDITING_CELL]()
      },
    }

    // table root props
    const tableRootProps = {
      ref: 'tableRootRef',
      class: {
        'vue-table-root': true,
        // SEL-08：表格模式下弱化活动单元格
        [clsName('keyboard-dormant')]:
          this.keyboardMode === KEYBOARD_MODE.TABLE
          && !isEmptyValue(cellSelectionData.currentCell.rowKey)
          && !isEmptyValue(cellSelectionData.currentCell.colKey),
      },
      // SEL-08：根元素可获得焦点（Esc 离开单元格导航后焦点停在这里，Tab 进入表格时也落在这里）
      tabindex: enableCellSelection ? 0 : undefined,
      // SEL-10：焦点进入单元格中的输入框等元素时，单元格导航休眠
      onFocusin: (event: FocusEvent) => {
        this.dealFocusin(event)
      },
    }

    // table container wrapper props
    const tableContainerWrapperProps = {
      ref: 'tableContainerWrapperRef',
      style: this.tableContainerWrapperStyle,
      class: {
        've-table': true,
        [clsName('border-around')]: this.borderAround,
      },
      tagName: 'div',
      onOnDomResizeChange: ({ height }) => {
        this.tableOffestHeight = height
        // Re-initialize virtual scroll when container resizes (e.g. maxHeight changes)
        if (this.isVirtualScroll && !this.virtualScroll) {
          this.$nextTick(() => this.initTanStackVirtualScroll())
        }
        // fixed #404
        this.initScrolling()
        this.setScrollBarStatus()
        this.tableContext.emit(HOOKS_NAME.TABLE_SIZE_CHANGE)
      },
    }

    // table container props
    const tableContainerProps = {
      ref: 'tableContainerRef',
      class: this.tableContainerClass,
      style: tableContainerStyle,
      onScroll: () => {
        const tableContainerRef
                        = this.tableContainerRef as HTMLElement

        this.tableContext.emit(
          HOOKS_NAME.TABLE_CONTAINER_SCROLL,
          tableContainerRef,
        )
        this.setScrolling(tableContainerRef)

        // TanStack Virtual handles scroll tracking internally via its own
        // scroll listener set up in _didMount(). No manual handling needed.
      },
      onMouseup: () => {
        // 事件的先后顺序 containerMouseup > bodyCellMousedown > bodyCellMouseup > bodyCellClick
        this.tableContainerMouseup()
      },
      onMousemove: (_event) => {
        // todo
      },
    }

    // table wrapper props
    const tableWrapperProps = {
      ref: 'tableContentWrapperRef',
      class: [clsName('content-wrapper')],
      tagName: 'div',
      onOnDomResizeChange: ({ height }) => {
        this.tableHeight = height
      },
    }

    // tale props
    const tableProps = {
      ref: 'tableRef',
      class: [clsName('content'), tableClass],
      style: tableStyle,
    }

    // selection props
    const selectionProps = {
      ref: 'cellSelectionRef',
      tableEl: this.tableRef as HTMLTableElement | undefined,
      allRowKeys,
      colgroups,
      parentRendered: this.parentRendered,
      cellSelectionData,
      isAutofillStarting: this.isAutofillStarting,
      autofillingDirection: this.autofillingDirection,
      cellSelectionRangeData,
      currentCellSelectionType: this.currentCellSelectionType,
      isVirtualScroll,
      virtualScrollVisibleIndexs: {
        start: this.virtualItems.length > 0 ? this.virtualItems[0].index : 0,
        end: this.virtualItems.length > 0 ? this.virtualItems[this.virtualItems.length - 1].index : 0,
      },
      isCellEditing: this.isCellEditing,
      cellAutofillOption: this.cellAutofillOption,
      [getEmitEventName(EMIT_EVENTS.CELL_SELECTION_RANGE_DATA_CHANGE)]: (newData) => {
        this.cellSelectionRangeDataChange(newData)
      },
    }

    // edit input props
    const editInputProps = {
      ref: 'editInputRef',
      parentRendered: this.parentRendered,
      inputStartValue: this.editorInputStartValue,
      rowKeyFieldName,
      tableData: this.tableData,
      cellSelectionData,
      colgroups,
      editingCell: this.editingCell,
      isCellEditing: this.isCellEditing,
      hasXScrollBar: this.hasXScrollBar,
      hasYScrollBar: this.hasYScrollBar,
      hasRightFixedColumn: this.hasRightFixedColumn,
      scrollBarWidth: this.getScrollBarWidth(),
      keyboardMode: this.keyboardMode,
      // edit input click
      [getEmitEventName(EMIT_EVENTS.EDIT_INPUT_CLICK)]: () => {
        this.enableStopEditing = false
      },
      // edit input value change
      [getEmitEventName(EMIT_EVENTS.EDIT_INPUT_VALUE_CHANGE)]: (value) => {
        this.updateEditingCellValue(value)
      },
      // copy
      [getEmitEventName(EMIT_EVENTS.EDIT_INPUT_COPY)]: (e) => {
        this.editorCopy(e)
      },
      // paste
      [getEmitEventName(EMIT_EVENTS.EDIT_INPUT_PASTE)]: (e) => {
        this.editorPaste(e)
      },
      // cut
      [getEmitEventName(EMIT_EVENTS.EDIT_INPUT_CUT)]: (e) => {
        this.editorCut(e)
      },
    }

    // 直接在组件上写事件，单元测试无法通过。如 on={{"on-node-click":()=>{}}}
    const contextmenuProps = {
      ref: 'contextmenuRef',
      eventTarget: this.contextmenuEventTarget as string | HTMLElement,
      options: contextmenuOptions,
      onOnNodeClick: (type: any) => {
        this.contextmenuItemClick(type)
      },
    }

    // column resizer props
    const columnResizerProps = {
      parentRendered: this.parentRendered,
      tableContainerEl: this.tableContainerRef as HTMLDivElement | undefined,
      colgroups,
      isColumnResizerHover: this.isColumnResizerHover,
      isColumnResizing: this.isColumnResizing,
      setIsColumnResizerHover: this.setIsColumnResizerHover,
      setIsColumnResizing: this.setIsColumnResizing,
      setColumnWidth: this.setColumnWidth,
      columnWidthResizeOption: this.columnWidthResizeOption,
    }

    return (
      <div {...tableRootProps}>
        <VueDomResizeObserver
          {...tableContainerWrapperProps}
          v-click-outside={(e) => {
            this.tableClickOutside(e)
          }}
        >
          <div {...tableContainerProps}>
            {/* virtual view phantom */}
            {this.getVirtualViewPhantom()}
            {/* vue 实例类型，访问dom时需要通过$el属性访问 */}
            <VueDomResizeObserver {...tableWrapperProps}>
              <table {...tableProps}>
                {/* colgroup */}
                <Colgroup
                  colgroups={colgroups}
                  enableColumnResize={enableColumnResize}
                />
                {/* table header */}
                {showHeader && <Header {...headerProps} />}
                {/* 列宽测量行（COL-07）：必须放在真实表格中，单元格宽度才与真实列宽一致
                    （未设置 scrollWidth 时表格宽度为 auto，浏览器按内容自动布局，独立的隐藏表格无法复现）。
                    使用独立的 <tbody>，不属于 tbody.ve-table-body，因此不影响斑马纹、虚拟滚动行与单元格查找 */}
                <tbody aria-hidden="true">
                  <tr style={{ height: 0 }}>
                    {colgroups.map((column) => {
                      const measureTdProps = {
                        // COL-15：只按列 key 复用，列变化时不再重新创建（宽度由 columnsOptionResetTime watcher 重新上报）
                        key: column.key,
                        tagName: 'td',
                        id: column.key,
                        onOnDomResizeChange: this.measureCellSizeChange,
                        style: {
                          padding: 0,
                          border: 0,
                          height: 0,
                        },
                      }
                      return <VueDomResizeObserver {...measureTdProps} />
                    })}
                  </tr>
                </tbody>
                {/* table body */}
                <Body {...bodyProps} />
                {/* table footer */}
                <Footer {...footerProps} />
              </table>
              {/* cell selection */}
              {enableCellSelection && (
                <Selection {...selectionProps} />
              )}
            </VueDomResizeObserver>
          </div>
          {/* edit input */}
          {enableCellSelection && <EditInput {...editInputProps} />}
          {/* contextmenu */}
          {(this.enableHeaderContextmenu
            || this.enableBodyContextmenu) && (
            <VeContextmenu {...contextmenuProps} />
          )}
          {/* column resizer */}
          {enableColumnResize && (
            <ColumnResizer {...columnResizerProps} />
          )}
        </VueDomResizeObserver>
        {/* row insert indicator - rendered outside the wrapper to avoid overflow clipping */}
        {this.rowInsertOption?.enable && (
          <RowInsertIndicator {...this.rowInsertIndicatorProps} />
        )}
      </div>
    )
  },
})
