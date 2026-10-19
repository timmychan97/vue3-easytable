import type { ComponentPublicInstance } from 'vue'
import type {
  CellSelectionRangeData,
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
import VeContextmenu from '@vue3-easytable/ve-contextmenu'
import { computed, defineComponent, inject, markRaw, nextTick, onMounted, provide, ref, shallowRef } from 'vue'
import Body from './body'
import Colgroup from './colgroup'
import ColumnResizer from './column-resizer'
import EditInput from './editor'
import { useCellEvents } from './features/cell-events/useCellEvents'
import { useAutofill } from './features/cell-selection/useAutofill'
import { useCellSelection } from './features/cell-selection/useCellSelection'
import { useCellSelectionState } from './features/cell-selection/useCellSelectionState'
import { useSelectionDrag } from './features/cell-selection/useSelectionDrag'
import { useClipboard } from './features/clipboard/useClipboard'
import { useColumnMeasure } from './features/columns/useColumnMeasure'
import { useColumns } from './features/columns/useColumns'
import { useContextmenu } from './features/contextmenu/useContextmenu'
import { useEditing } from './features/editing/useEditing'
import { FIXED_COLUMNS_KEY, useFixedColumns } from './features/fixed-columns/useFixedColumns'
import { useKeyboard } from './features/keyboard/useKeyboard'
import { useTableLayout } from './features/layout/useTableLayout'
import { useRowInsert } from './features/row-insert/useRowInsert'
import { createRowState, ROW_STATE_KEY } from './features/row-state'
import { useScrolling } from './features/scrolling/useScrolling'
import { createTableContext, provideTableContext, useTableContext } from './features/table-context'
import { useVirtualScroll } from './features/virtual-scroll/useVirtualScroll'
import Footer from './footer'
import Header from './header'
import RowInsertIndicator from './row-insert-indicator'
import Selection from './selection'
import {
  COMPS_NAME,
  EMIT_EVENTS,
  HOOKS_NAME,
  KEYBOARD_MODE,
} from './util/constant.js'
import {
  clsName,
  getEmitEventName,
} from './util/index.js'
import { veTableProps } from './ve-table-props'

export default defineComponent({
  name: COMPS_NAME.VE_TABLE,
  directives: {
    'click-outside': clickoutside,
  },
  /*
   * INFRA-06：声明组件对外触发的全部事件（setup 的 emit）。
   * 未声明时监听器会作为属性透传到根元素上。内部组件之间的通信走表格上下文（MOD-01），不在此列。
   * - on-row-insert：行插入（rowInsertOption），参数 { insertRowIndex }
   */
  emits: [EMIT_EVENTS.ROW_INSERT],
  props: veTableProps,
  setup(props, { emit }) {
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

    // 表头 / 表体右键菜单
    const contextmenu = useContextmenu({
      props,
      locale: veLocale,
      rootElement: tableRootRef,
      editor: editInputRef,
      colgroups: columns.colgroups,
      allRowKeys,
      cloneColumns: columns.cloneColumns,
      enableColumnResize: columns.enableColumnResize,
      state: selectionState,
      clipboard,
      selectionDrag,
      autofill,
      tableContext,
    })

    // 表格已挂载（子组件据此注册依赖 DOM 的监听）
    const parentRendered = ref(false)

    // 子组件通过表格上下文发来的单元格 / 表头 / 选区角标事件
    const cellEvents = useCellEvents({
      props,
      colgroups: columns.colgroups,
      allRowKeys,
      cellSelectionRef,
      tableEvents,
      tableContext,
      columns,
      layout,
      state: selectionState,
      selection,
      selectionDrag,
      autofill,
      editing,
      keyboard,
      contextmenu,
    })

    // 行插入指示器
    const rowInsert = useRowInsert({
      props,
      emit,
      parentRendered,
      containerElement: tableContainerRef,
      tableElement: tableRef,
      colgroups: columns.colgroups,
    })

    // 点击行高亮
    const highlightRowKey = ref<string | number>('')

    // 实例方法：设置高亮行
    function setHighlightRow({ rowKey }: { rowKey: string | number }) {
      highlightRowKey.value = rowKey
    }

    function refreshScrollBarStatusAfterRender() {
      nextTick(() => scrolling.setScrollBarStatus())
    }

    /* ---------------- 渲染用的样式与 class ---------------- */

    const tableContainerWrapperStyle = computed(() => ({ width: '100%' }))

    const tableContainerStyle = computed(() => {
      const maxHeight = getValByUnit(props.maxHeight)

      let tableContainerHeight: string | number | undefined
      if (virtualScroll.isVirtualScroll.value) {
        if (maxHeight)
          tableContainerHeight = maxHeight as string | number
        else
          console.error('maxHeight prop is required when \'virtualScrollOption.enable = true\'')
      }
      else {
        let h = layout.tableHeight.value
        if (scrolling.hasXScrollBar.value)
          h += scrolling.getScrollBarWidth()

        tableContainerHeight = getValByUnit(h)
      }

      return {
        'max-height': maxHeight as string | number | undefined,
        'height': tableContainerHeight,
      }
    })

    const tableStyle = computed(() => ({ width: getValByUnit(props.scrollWidth) }))

    const tableClass = computed(() => ({
      [clsName('border-x')]: props.borderX,
      [clsName('border-y')]: props.borderY,
    }))

    const tableContainerClass = computed(() => ({
      [clsName('container')]: true,
      [clsName('virtual-scroll')]: virtualScroll.isVirtualScroll.value,
      [clsName('container-left-scrolling')]: scrolling.isLeftScrolling.value,
      [clsName('container-right-scrolling')]: scrolling.isRightScrolling.value,
      [clsName('container-vertical-scrolling')]: scrolling.isVerticalScrolling.value,
      [clsName('is-cell-editing')]: editing.isCellEditing.value,
      [clsName('autofilling')]: autofill.isAutofillStarting.value,
      // 如果开启单元格选择，则关闭 user-select
      [clsName('enable-cell-selection')]: selectionState.enableCellSelection.value,
    }))

    const tableBodyClass = computed(() => {
      const { rowStyleOption } = props

      let hoverHighlight = true
      let clickHighlight = true
      let stripe = false

      if (rowStyleOption) {
        hoverHighlight = rowStyleOption.hoverHighlight
        clickHighlight = rowStyleOption.clickHighlight
        stripe = rowStyleOption.stripe
      }

      return {
        [clsName('stripe')]: stripe === true, // 默认不开启
        [clsName('row-hover')]: hoverHighlight !== false, // 默认开启
        [clsName('row-highlight')]: clickHighlight !== false, // 默认开启
      }
    })

    /* ---------------- 渲染中绑定的 DOM 事件 ---------------- */

    // 表格容器外层尺寸变化（例如 maxHeight 变化）
    function tableContainerResize({ height }: { height: number }) {
      layout.tableOffestHeight.value = height
      // 之前没有滚动容器尺寸时尚未创建虚拟滚动实例
      if (virtualScroll.isVirtualScroll.value && !virtualScroll.virtualScroll.value)
        nextTick(() => virtualScroll.initTanStackVirtualScroll())
      // fixed #404
      scrolling.initScrolling()
      scrolling.setScrollBarStatus()
      tableContext.emit(HOOKS_NAME.TABLE_SIZE_CHANGE)
    }

    // 表格容器滚动：通知子组件（选区、编辑框、行插入指示器等），更新滚动阴影。
    // 虚拟滚动由 TanStack 自己监听滚动
    function tableContainerScroll() {
      const containerEl = tableContainerRef.value as HTMLElement
      tableContext.emit(HOOKS_NAME.TABLE_CONTAINER_SCROLL, containerEl)
      scrolling.setScrolling(containerEl)
    }

    // 展开行 + 左固定列时的视口占位（非虚拟滚动），宽度用于展开行的 sticky 定位
    function getVirtualViewPhantom() {
      if (virtualScroll.isVirtualScroll.value || !columns.hasLeftFixedColumn.value || !props.expandOption)
        return null

      const phantomProps = {
        tagName: 'div',
        style: {
          width: '100%',
        },
        onOnDomResizeChange: ({ width }: { width: number }) => {
          layout.tableViewportWidth.value = width
        },
      }

      return (
        <div
          ref="virtualPhantomRef"
          class={[
            clsName('virtual-phantom'),
          ]}
        >
          <VueDomResizeObserver {...phantomProps} />
        </div>
      )
    }

    onMounted(() => {
      parentRendered.value = true
    })

    /*
     * 返回值就是组件实例（模板 ref）上的成员：
     * - 文档中的实例方法（INSTANCE_METHODS）：scrollTo、scrollToRowKey、scrollToColKey、startEditingCell、
     *   stopEditingCell、setHighlightRow、setCellSelection、setRangeCellSelection、getRangeCellSelection、
     *   setAllCellSelection、hideColumnsByKeys、showColumnsByKeys；
     * - 其余状态与函数保持与 Options API 时相同的名字，render 通过 this 读取，测试与排查问题时也可以访问
     */
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
      ...contextmenu,
      ...cellEvents,
      ...rowInsert,
      parentRendered,
      highlightRowKey,
      setHighlightRow,
      tableContainerWrapperStyle,
      tableContainerStyle,
      tableStyle,
      tableClass,
      tableContainerClass,
      tableBodyClass,
      tableContainerResize,
      tableContainerScroll,
      getVirtualViewPhantom,
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
        this.stopEditingCell()
      },
      onMouseleave: (event: MouseEvent) => {
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
      [getEmitEventName(EMIT_EVENTS.HIGHLIGHT_ROW_CHANGE)]: this.setHighlightRow,
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
        this.stopEditingCell()
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
      onOnDomResizeChange: this.tableContainerResize,
    }

    // table container props
    const tableContainerProps = {
      ref: 'tableContainerRef',
      class: this.tableContainerClass,
      style: tableContainerStyle,
      onScroll: () => {
        this.tableContainerScroll()
      },
      onMouseup: () => {
        // 事件的先后顺序 containerMouseup > bodyCellMousedown > bodyCellMouseup > bodyCellClick
        this.tableContainerMouseup()
      },
      onMousemove: (_event: MouseEvent) => {
        // todo
      },
    }

    // table wrapper props
    const tableWrapperProps = {
      ref: 'tableContentWrapperRef',
      class: [clsName('content-wrapper')],
      tagName: 'div',
      onOnDomResizeChange: ({ height }: { height: number }) => {
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
      tableEl: this.tableRef,
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
      [getEmitEventName(EMIT_EVENTS.CELL_SELECTION_RANGE_DATA_CHANGE)]: (newData: Partial<CellSelectionRangeData>) => {
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
      [getEmitEventName(EMIT_EVENTS.EDIT_INPUT_VALUE_CHANGE)]: (value: any) => {
        this.updateEditingCellValue(value)
      },
      // copy
      [getEmitEventName(EMIT_EVENTS.EDIT_INPUT_COPY)]: (e: Event) => {
        this.editorCopy(e)
      },
      // paste
      [getEmitEventName(EMIT_EVENTS.EDIT_INPUT_PASTE)]: (e: Event) => {
        this.editorPaste(e)
      },
      // cut
      [getEmitEventName(EMIT_EVENTS.EDIT_INPUT_CUT)]: (e: Event) => {
        this.editorCut(e)
      },
    }

    // 直接在组件上写事件，单元测试无法通过。如 on={{"on-node-click":()=>{}}}
    const contextmenuProps = {
      ref: 'contextmenuRef',
      eventTarget: this.contextmenuEventTarget,
      options: contextmenuOptions,
      onOnNodeClick: (type: string) => {
        this.contextmenuItemClick(type)
      },
    }

    // column resizer props
    const columnResizerProps = {
      parentRendered: this.parentRendered,
      tableContainerEl: this.tableContainerRef as HTMLDivElement | null,
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
          v-click-outside={(e: MouseEvent) => {
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
