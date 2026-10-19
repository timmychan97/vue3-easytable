import type { ComponentPublicInstance } from 'vue'
import type { AutofillingDirection } from './selection/geometry'
import type { KeyboardMode } from './util/constant.js'
import type {
  BodyIndicatorRowKeys,
  CellSelectionData,
  CellSelectionRangeData,
  ColgroupData,
  ContextmenuOption,
  EditingCell,
  EditorInstance,
  HeaderIndicatorColKeys,
  SelectionInstance,
} from './ve-table-types'
import type { VirtualItem, VirtualScrollInstance } from './virtual-scroll'
import VueDomResizeObserver from '@vue3-easytable/common/comps/resize-observer'
import clickoutside from '@vue3-easytable/common/directives/clickoutside'
import { globalLocale, LocaleInjectionKey } from '@vue3-easytable/common/locale'
import {
  getValByUnit,
  isBoolean,
  isDefined,
  isEmptyValue,
  isFunction,
  isNumber,
  scrollTo,
} from '@vue3-easytable/common/utils'
import { MOUSE_EVENT_CLICK_TYPE } from '@vue3-easytable/common/utils/constant'
// isInputKeyCode moved to methods/keyboard.ts
import { getMouseEventClickType } from '@vue3-easytable/common/utils/mouse-event'
import { getScrollbarWidth } from '@vue3-easytable/common/utils/scroll-bar'
import VeContextmenu from '@vue3-easytable/ve-contextmenu'
import { cloneDeep } from 'lodash'
import { computed, defineComponent, getCurrentInstance, inject, markRaw, nextTick, provide, shallowRef, watch } from 'vue'
import Body from './body'
import Colgroup from './colgroup'
import ColumnResizer from './column-resizer'
import EditInput from './editor'
import { useColumnMeasure } from './features/columns/useColumnMeasure'
import { useColumns } from './features/columns/useColumns'
import { FIXED_COLUMNS_KEY, useFixedColumns } from './features/fixed-columns/useFixedColumns'
import { useTableLayout } from './features/layout/useTableLayout'
import { createRowState, ROW_STATE_KEY } from './features/row-state'
import { createTableContext, provideTableContext, useTableContext } from './features/table-context'
import Footer from './footer'
import Header from './header'
import { cellSelectionMethods } from './methods/cell-selection'
import { clipboardMethods } from './methods/clipboard'
import { contextmenuMethods } from './methods/contextmenu'
import { editingMethods } from './methods/editing'
import { keyboardMethods } from './methods/keyboard'
import { scrollingMethods } from './methods/scrolling'
import RowInsertIndicator from './row-insert-indicator'
import Selection from './selection'
import { getAutofillDirection } from './selection/geometry'
import { queryBodyRow } from './util/cell-dom'
// Clipboard utils moved to methods/clipboard.ts
import {
  COMPS_NAME,
  CONTEXTMENU_TYPES,
  CURRENT_CELL_SELECTION_TYPES,
  EMIT_EVENTS,
  HOOKS_NAME,
  INSTANCE_METHODS,
  KEYBOARD_MODE,
} from './util/constant.js'
import {
  clsName,
  getColgroupKeysByHeaderColumn,
  getColumnByColkey,
  getEmitEventName,
  getLeftmostColKey,
  getRowKey,
  getSelectionRangeIndexes,
  getSelectionRangeKeys,
  isClearSelectionByBodyCellRightClick,
  isContextmenuPanelClicked,
  isOperationColumn,
} from './util/index.js'
import { safeCall } from './util/safe-call.js'
import { veTableProps } from './ve-table-props'
import { createVirtualScroll } from './virtual-scroll'

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
    // 迁移过程中（MOD-02）尚未改为组合式函数的状态仍在 Options API 中，通过实例读取
    const vm = getCurrentInstance()!.proxy as any

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
    // 列：cloneColumns、分组表头、colgroups，隐藏 / 显示列，拖动列宽
    const columns = useColumns({
      props,
      tableContext,
      // 拖动列宽后，等 DOM 更新再刷新滚动条状态
      onColumnWidthResize: () => {
        nextTick(() => vm.setScrollBarStatus())
      },
    })
    // 迁移过程中（MOD-02）：列变化后刷新滚动状态
    watch(columns.columnsOptionResetTime, () => vm.initScrolling())
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

    return {
      tableContext,
      tableEvents,
      veLocale,
      allRowKeys,
      ...columns,
      ...columnMeasure,
      ...layout,
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

      // Virtual scroll
      defaultVirtualScrollMinRowHeight: 40,
      defaultVirtualScrollBufferScale: 1,
      virtualScrollVersion: 0,

      // Scrolling state
      isLeftScrolling: false,
      isRightScrolling: false,
      isVerticalScrolling: false,
      hasXScrollBar: false,
      hasYScrollBar: false,
      // 滚动条宽度缓存；null 表示尚未测量（覆盖式滚动条的宽度为 0，也需要缓存）
      scrollBarWidth: null as number | null,
      previewTableContainerScrollLeft: null as number | null,

      // Cell selection
      // 整列 / 整行选择的指示器，只保存 key（SEL-09）
      headerIndicatorColKeys: {
        startColKey: '',
        endColKey: '',
      } as HeaderIndicatorColKeys,
      bodyIndicatorRowKeys: {
        startRowKey: '',
        endRowKey: '',
      } as BodyIndicatorRowKeys,
      cellSelectionData: {
        currentCell: { rowKey: '', colKey: '', rowIndex: -1 },
        normalEndCell: { rowKey: '', colKey: '', rowIndex: -1 },
        autoFillEndCell: { rowKey: '', colKey: '' },
      } as CellSelectionData,
      cellSelectionRangeData: {
        leftColKey: '',
        rightColKey: '',
        topRowKey: '',
        bottomRowKey: '',
      } as CellSelectionRangeData,

      // Mouse interaction state
      isHeaderCellMousedown: false,
      isBodyCellMousedown: false,
      isBodyOperationColumnMousedown: false,
      isAutofillStarting: false,
      currentCellSelectionType: '',
      // 键盘模式（SEL-08）：单元格导航 / 表格（焦点在根元素上，Tab 交给浏览器）
      keyboardMode: KEYBOARD_MODE.TABLE as KeyboardMode,

      // Highlight
      highlightRowKey: '' as string | number,

      // Editing
      editingCell: {
        rowKey: '',
        colKey: '',
        row: null,
        column: null,
      } as EditingCell,
      editorInputStartValue: '' as string | number,
      enableStopEditing: true,

      // Context menu
      contextmenuEventTarget: '' as string | EventTarget,
      contextmenuOptions: [] as ContextmenuOption[],

      // 非响应式对象：TanStack 虚拟滚动实例（赋值时用 markRaw 包裹）。
      // 只有引用本身是响应式的（替换实例时触发依赖），对象内部不会被 Vue 深度代理
      virtualScroll: null as VirtualScrollInstance | null,
    }
  },
  computed: {
    /*
    填充方向（FILL-01）：由选区与 autofill 结束单元格的行列位置计算，不再由选区层在渲染时派发。
    结束单元格为空（拖动开始前 / 结束后）、在选区内或方向不被允许时为 null
    */
    autofillingDirection(): AutofillingDirection | null {
      const {
        cellAutofillOption,
        cellSelectionData,
        cellSelectionRangeData,
        currentCellSelectionType,
        colgroups,
        allRowKeys,
      } = this

      if (!cellAutofillOption)
        return null

      const { currentCell, autoFillEndCell } = cellSelectionData
      if (isEmptyValue(autoFillEndCell.rowKey) || isEmptyValue(autoFillEndCell.colKey))
        return null

      let { leftColKey, rightColKey, topRowKey, bottomRowKey } = cellSelectionRangeData
      if (currentCellSelectionType === CURRENT_CELL_SELECTION_TYPES.SINGLE) {
        leftColKey = currentCell.colKey
        rightColKey = currentCell.colKey
        topRowKey = currentCell.rowKey
        bottomRowKey = currentCell.rowKey
      }
      else if (currentCellSelectionType !== CURRENT_CELL_SELECTION_TYPES.RANGE) {
        return null
      }

      const colIndexOf = (colKey: unknown) => colgroups.findIndex((x: ColgroupData) => x.key === colKey)
      const { directionX, directionY } = isBoolean(cellAutofillOption) ? {} as Record<string, never> : cellAutofillOption

      return getAutofillDirection({
        range: {
          top: allRowKeys.indexOf(topRowKey),
          bottom: allRowKeys.indexOf(bottomRowKey),
          left: colIndexOf(leftColKey),
          right: colIndexOf(rightColKey),
        },
        endRowIndex: allRowKeys.indexOf(autoFillEndCell.rowKey),
        endColIndex: colIndexOf(autoFillEndCell.colKey),
        directionX,
        directionY,
      })
    },
    // actual render table data
    actualRenderTableData() {
      if (this.isVirtualScroll)
        return this.virtualItems.map((item: VirtualItem) => this.tableData[item.index])
      return this.tableData
    },
    // TanStack virtual items (reactive via virtualScrollVersion)
    virtualItems(): VirtualItem[] {
      if (!this.isVirtualScroll)
        return []
      void this.virtualScrollVersion // establish reactive dependency
      const vs = this.virtualScroll as VirtualScrollInstance | null
      return vs ? vs.getVirtualItems() : this.initialVirtualItems
    },
    /*
        VS-06：虚拟滚动实例要等滚动容器挂载后（mounted 之后的 nextTick）才能创建。
        在此之前按预估行高先排出首屏行，避免首次渲染没有任何行；实例创建后这些行按 key 复用并被测量。
        只有 maxHeight 是像素值时才能预估首屏行数，其他单位（%、vh 等）仍等待实例创建。
        */
    initialVirtualItems(): VirtualItem[] {
      const { maxHeight, tableData, virtualScrollEstimateSize: estimateSize } = this
      const viewportHeight = isNumber(maxHeight)
        ? maxHeight
        : /^\d+(?:\.\d+)?(?:px)?$/.test(String(maxHeight ?? '').trim())
          ? Number.parseFloat(String(maxHeight))
          : 0
      if (!viewportHeight || !estimateSize || !Array.isArray(tableData))
        return []

      const count = Math.min(
        tableData.length,
        Math.ceil(viewportHeight / estimateSize) + this.virtualScrollOverscan,
      )
      const result: VirtualItem[] = []
      for (let index = 0; index < count; index++) {
        result.push({
          index,
          key: this.getVirtualRowKey(index),
          start: index * estimateSize,
          size: estimateSize,
          end: (index + 1) * estimateSize,
          lane: 0,
        })
      }
      return result
    },
    // Total scrollable height from TanStack (reactive via virtualScrollVersion)
    virtualTotalSize(): number {
      if (!this.isVirtualScroll)
        return 0
      void this.virtualScrollVersion // establish reactive dependency
      const vs = this.virtualScroll as VirtualScrollInstance | null
      return vs ? vs.getTotalSize() : (this.tableData?.length ?? 0) * this.virtualScrollEstimateSize
    },
    // Top spacer height for virtual scroll
    virtualPaddingTop(): number {
      if (!this.isVirtualScroll)
        return 0
      void this.virtualScrollVersion // establish reactive dependency
      const vs = this.virtualScroll as VirtualScrollInstance | null
      return vs ? vs.getPaddingTop() : 0
    },
    // Bottom spacer height for virtual scroll
    virtualPaddingBottom(): number {
      if (!this.isVirtualScroll)
        return 0
      void this.virtualScrollVersion // establish reactive dependency
      const vs = this.virtualScroll as VirtualScrollInstance | null
      if (vs)
        return vs.getPaddingBottom()
      // 实例创建前：未渲染的行按预估行高占位
      const rendered = this.initialVirtualItems.length
      return Math.max((this.tableData?.length ?? 0) - rendered, 0) * this.virtualScrollEstimateSize
    },
    /*
        VS-03：虚拟滚动关心的行身份（行数 + 行 key）。
        只在增删、重排、替换行时变化；编辑单元格只修改行对象的字段，不会触发。
        */
    virtualRowIdentity(): { count: number, keys: Array<string | number> } {
      return {
        count: this.tableData?.length ?? 0,
        keys: this.allRowKeys,
      }
    },
    /*
        VS-06：表头 / 表尾对虚拟滚动可视区的影响
        - 固定表头 / 表尾（sticky）遮住滚动容器的顶部 / 底部：从容器高度中减去（stickyStart / stickyEnd）
        - 非固定表头随内容滚走：第 0 行从表头高度处开始（scrollMargin）
        */
    virtualScrollViewportOffsets(): { scrollMargin: number, stickyStart: number, stickyEnd: number } {
      const { headerTotalHeight, footerTotalHeight, fixedHeader, fixedFooter } = this
      return {
        scrollMargin: fixedHeader ? 0 : headerTotalHeight,
        stickyStart: fixedHeader ? headerTotalHeight : 0,
        stickyEnd: fixedFooter ? footerTotalHeight : 0,
      }
    },
    // 选区 / 编辑状态依赖的行列 key（SEL-01，供同步 watcher 使用）
    cellStateKeys(): [ColgroupData[], Array<string | number>] {
      return [this.colgroups, this.allRowKeys]
    },
    // Overscan count for TanStack virtual (extra rows above/below visible area)
    virtualScrollOverscan() {
      const { virtualScrollOption, defaultVirtualScrollBufferScale } = this
      if (!virtualScrollOption)
        return 5

      const bufferScale = isNumber(virtualScrollOption.bufferScale) && virtualScrollOption.bufferScale > 0
        ? virtualScrollOption.bufferScale
        : defaultVirtualScrollBufferScale

      // Map legacy bufferScale to a reasonable overscan count
      return Math.max(Math.ceil(bufferScale * 5), 3)
    },
    // Estimated row height for TanStack virtual
    virtualScrollEstimateSize() {
      const { virtualScrollOption, defaultVirtualScrollMinRowHeight } = this
      return isNumber(virtualScrollOption?.minRowHeight)
        ? virtualScrollOption.minRowHeight
        : defaultVirtualScrollMinRowHeight
    },
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
    // is virtual scroll
    isVirtualScroll() {
      const { virtualScrollOption } = this
      return virtualScrollOption && virtualScrollOption.enable
    },
    // is editing cell
    isCellEditing() {
      const { editingCell } = this

      return (
        !isEmptyValue(editingCell.rowKey)
        && !isEmptyValue(editingCell.colKey)
      )
    },
    // has edit column
    hasEditColumn() {
      return this.colgroups.some(x => x.edit)
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
    /*
        enable cell selection
        单元格编辑、剪贴板都依赖单元格选择
        */
    enableCellSelection() {
      let result = true

      const { cellSelectionOption, rowKeyFieldName } = this

      if (isEmptyValue(rowKeyFieldName)) {
        result = false
      }

      else if (
        cellSelectionOption
        && isBoolean(cellSelectionOption.enable)
        && cellSelectionOption.enable === false
      ) {
        result = false
      }

      return result
    },
    // enable clipboard
    enableClipboard() {
      return this.rowKeyFieldName
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
  watch: {
    /*
        VS-03：行数或行 key 变化时才更新虚拟滚动（不再 deep 监听 tableData）。
        编辑单元格后的行高变化由 TanStack 对每行 <tbody> 的 ResizeObserver（measureElement）测量；
        已测量的行高按 key 缓存，重排后仍然有效，因此不再调用 measure() 清空全部缓存。
        */
    'virtualRowIdentity': {
      handler(newVal, oldVal) {
        if (!this.isVirtualScroll)
          return
        if (
          oldVal
          && newVal.count === oldVal.count
          && newVal.keys.length === oldVal.keys.length
          && newVal.keys.every((key, index) => key === oldVal.keys[index])
        ) {
          return
        }

        if (this.virtualScroll) {
          // 传入新的 getItemKey，TanStack 会按新的 key 顺序重新排布（行高缓存保留）
          this.virtualScroll.setOptions({
            count: newVal.count,
            getItemKey: (index: number) => this.getVirtualRowKey(index),
          })
        }
        else {
          // 实例尚未创建（例如之前没有滚动容器），数据变化时再尝试创建
          this.$nextTick(() => this.initTanStackVirtualScroll())
        }
      },
    },
    // VS-06：virtualScrollOption 的后续变化同步给 TanStack
    'virtualScrollOverscan': {
      handler(overscan) {
        this.virtualScroll?.setOptions({ overscan })
      },
    },
    'virtualScrollEstimateSize': {
      handler(estimateSize) {
        this.virtualScroll?.setOptions({ estimateSize })
      },
    },
    'virtualScrollOption.scrolling': {
      handler(scrolling) {
        this.virtualScroll?.setOptions({ onScrolling: isFunction(scrolling) ? scrolling : null })
      },
    },
    'virtualScrollViewportOffsets': {
      handler(offsets) {
        this.virtualScroll?.setOptions(offsets)
      },
    },
    /*
        行或列变化后同步选区与编辑状态（SEL-01）
        包括原来 allRowKeys watcher 对 currentCell 的处理（行被移除时清空、行位置变化时更新 rowIndex）
        */
    'cellStateKeys': {
      handler() {
        this.reconcileCellState()
      },
      immediate: false,
    },
    /*
        watch virtualScrollOption enable
        允许按需开启虚拟滚动
        */
    'virtualScrollOption.enable': {
      handler(newVal) {
        if (newVal) {
          // Enable virtual scroll — create TanStack instance
          this.$nextTick(() => this.initTanStackVirtualScroll())
        }
        else {
          // Disable virtual scroll — destroy TanStack instance
          this.destroyTanStackVirtualScroll()
        }
      },
      immediate: false,
    },
    // is auto fill starting
    'isAutofillStarting': {
      handler(val) {
        if (!val) {
          // 填充过程中出现异常也要清除 autofill 结束单元格（INFRA-07）
          try {
            this.setCellSelectionByAutofill()
          }
          finally {
            this.clearCellSelectionAutofillEndCell()
            // 拖动已结束，移除 window 上的 mouseup / blur 监听（FILL-02）
            this.removeAutofillWindowListeners()
          }
        }
      },
    },
    // watch current cell
    'cellSelectionData.currentCell': {
      handler() {
        this.setCurrentCellSelectionType()
      },
      deep: true,
      immediate: true,
    },
    // watch normal end cell
    'cellSelectionData.normalEndCell': {
      handler() {
        this.setCurrentCellSelectionType()
      },
      deep: true,
      immediate: true,
    },
    // SEL-08：活动单元格变化（点击、API、键盘）时进入单元格导航（编辑框会获得焦点），清空时回到表格模式。
    // 只监听 key，rowIndex 因排序等变化时不切换模式
    'cellSelectionData.currentCell.rowKey': {
      handler() {
        this.syncKeyboardModeByCurrentCell()
      },
    },
    'cellSelectionData.currentCell.colKey': {
      handler() {
        this.syncKeyboardModeByCurrentCell()
      },
    },
    // watch header indicator colKeys
    'headerIndicatorColKeys': {
      handler() {
        this.setRangeCellSelectionByHeaderIndicator()
      },
      deep: true,
    },
    // watch body indicator rowKeys
    'bodyIndicatorRowKeys': {
      handler() {
        this.setRangeCellSelectionByBodyIndicator()
      },
      deep: true,
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

    // add key down event listener
    document.addEventListener('keydown', this.dealKeydownEvent)

    // init scrolling
    this.initScrolling()

    // Initialize TanStack virtual scroll if enabled
    if (this.isVirtualScroll) {
      this.$nextTick(() => this.initTanStackVirtualScroll())
    }
  },
  unmounted() {
    // remove key down event listener
    document.removeEventListener('keydown', this.dealKeydownEvent)
    // Clean up TanStack virtual scroll instance
    this.destroyTanStackVirtualScroll()
    // 拖动填充中卸载：移除 window 上的监听（FILL-02）
    this.removeAutofillWindowListeners()
    // 拖动选择中卸载：移除 document 上的监听（SEL-11）
    this.removeSelectionDragListener()
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

    // scroll bar width
    getScrollBarWidth() {
      const { scrollBarWidth } = this

      // RENDER-06：用 null 判断是否已测量。覆盖式滚动条（macOS、移动端）宽度为 0，
      // 若用真值判断会在每次渲染时都插入探测元素并强制两次布局
      if (scrollBarWidth !== null)
        return scrollBarWidth

      const result = getScrollbarWidth()
      this.scrollBarWidth = result
      return result
    },

    // ── TanStack Virtual scroll management ──

    /**
     * Create the TanStack Virtual instance.
     * Must be called after the scroll container is in the DOM (mounted / nextTick).
     */
    initTanStackVirtualScroll() {
      // Guard: don't double-create
      if (this.virtualScroll)
        return
      if (!this.isVirtualScroll)
        return

      const scrollEl = this.tableContainerRef as HTMLElement | null
      if (!scrollEl)
        return

      const { virtualScrollOption, tableData } = this
      const scrollingCb = isFunction(virtualScrollOption?.scrolling) ? virtualScrollOption.scrolling : undefined

      // markRaw：实例内部状态由 TanStack 自己管理，通过 virtualScrollVersion 通知 Vue 重新渲染
      this.virtualScroll = markRaw(createVirtualScroll({
        count: tableData?.length ?? 0,
        getScrollElement: () => this.tableContainerRef as HTMLElement | null,
        estimateSize: this.virtualScrollEstimateSize,
        overscan: this.virtualScrollOverscan,
        // 每次读取当前的 tableData，整体替换数组（同样的 key）时无需更新
        getItemKey: (index: number) => this.getVirtualRowKey(index),
        onChange: () => {
          // Increment reactive counter → triggers re-render of computed properties
          this.virtualScrollVersion++
        },
        onScrolling: scrollingCb,
        ...this.virtualScrollViewportOffsets,
      }))

      // Force initial render
      this.virtualScrollVersion++
    },

    // 虚拟滚动行的 key：有 rowKeyFieldName 时用行 key（行高缓存随行移动），否则退回下标
    getVirtualRowKey(index: number): string | number {
      const row = this.tableData?.[index]
      const key = row && this.rowKeyFieldName ? row[this.rowKeyFieldName] : undefined
      return isDefined(key) ? key : index
    },

    // 每行 <tbody> 的 ref 回调：交给 TanStack 测量。方法引用稳定，Vue 不会在每次渲染时重新绑定 ref
    measureVirtualRow(el: HTMLElement | null) {
      this.virtualScroll?.measureElement(el)
    },

    /**
     * Destroy the TanStack Virtual instance and clean up listeners.
     */
    destroyTanStackVirtualScroll() {
      if (this.virtualScroll) {
        this.virtualScroll.destroy()
        this.virtualScroll = null
        this.virtualScrollVersion++
      }
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

    // setScrolling, setScrollBarStatus, initScrolling → extracted to methods/scrolling.ts

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

    // saveCellWhenStopEditing → extracted to methods/editing.ts

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

    /*
        set cell selection and column to visible
        */
    [INSTANCE_METHODS.SET_CELL_SELECTION]({
      rowKey,
      colKey,
      isScrollToRow = true,
    }) {
      const { enableCellSelection } = this

      if (!enableCellSelection)
        return false

      if (!isEmptyValue(rowKey) && !isEmptyValue(colKey)) {
        const column = getColumnByColkey(colKey, this.colgroups)

        // 未知的行或列：不改变选区（SEL-06）
        if (!column || !this.allRowKeys.includes(rowKey))
          return false

        // 普通单元格选择，不再是整列 / 整行选择（SEL-09）
        this.clearIndicatorKeys()

        this.cellSelectionCurrentCellChange({
          rowKey,
          colKey,
        })
        // 选中单个单元格：清除之前区域选择的结束单元格（SEL-12）
        this.clearCellSelectionNormalEndCell()

        // column to visible
        this.columnToVisible(column)
        // row to visible
        if (isScrollToRow)
          this[INSTANCE_METHODS.SCROLL_TO_ROW_KEY]({ rowKey })
      }
    },

    /*
        set range cell selection and column to visible
        */
    [INSTANCE_METHODS.SET_RANGE_CELL_SELECTION]({
      startRowKey,
      startColKey,
      endRowKey,
      endColKey,
      isScrollToStartCell = false,
    }) {
      const { enableCellSelection } = this

      if (!enableCellSelection)
        return false

      if (
        isEmptyValue(startRowKey)
        || isEmptyValue(startColKey)
        || isEmptyValue(endRowKey)
        || isEmptyValue(endColKey)
      ) {
        return false
      }

      // 未知的行或列：不改变选区（SEL-06）
      const { allRowKeys, colgroups } = this
      const startColumn = getColumnByColkey(startColKey, colgroups)
      if (
        !allRowKeys.includes(startRowKey)
        || !allRowKeys.includes(endRowKey)
        || !startColumn
        || !getColumnByColkey(endColKey, colgroups)
      ) {
        return false
      }

      // 普通区域选择，不再是整列 / 整行选择（SEL-09）
      this.clearIndicatorKeys()

      this.cellSelectionCurrentCellChange({
        rowKey: startRowKey,
        colKey: startColKey,
      })

      this.cellSelectionNormalEndCellChange({
        rowKey: endRowKey,
        colKey: endColKey,
      })

      // row to visible
      if (isScrollToStartCell) {
        // column to visible
        this.columnToVisible(startColumn)
        this[INSTANCE_METHODS.SCROLL_TO_ROW_KEY]({
          rowKey: startRowKey,
        })
      }
    },

    /*
        get range cell selection
        */
    [INSTANCE_METHODS.GET_RANGE_CELL_SELECTION]() {
      const {
        cellSelectionData,
        cellSelectionRangeData,
        allRowKeys,
        colgroups,
      } = this

      const { rowKey, colKey } = cellSelectionData.currentCell

      if (!isEmptyValue(rowKey) && !isEmptyValue(colKey)) {
        const selectionRangeKeys = getSelectionRangeKeys({
          cellSelectionRangeData,
        })

        const selectionRangeIndexes = getSelectionRangeIndexes({
          cellSelectionRangeData,
          colgroups,
          allRowKeys,
        })

        return {
          selectionRangeKeys,
          selectionRangeIndexes,
        }
      }
    },

    /*
        set all cell selection and column to visible
        */
    [INSTANCE_METHODS.SET_ALL_CELL_SELECTION]() {
      const { enableCellSelection } = this

      if (!enableCellSelection)
        return false

      const { colgroups, allRowKeys } = this

      if (colgroups.length) {
        const colKeys = colgroups
          .filter(x => !x.operationColumn)
          .map(x => x.key)

        if (colKeys.length) {
          this.headerIndicatorColKeysChange({
            startColKey: colKeys[0],
            endColKey: colKeys[colKeys.length - 1],
          })
        }
      }

      if (allRowKeys.length) {
        this.bodyIndicatorRowKeysChange({
          startRowKey: allRowKeys[0],
          endRowKey: allRowKeys[allRowKeys.length - 1],
        })
      }
    },

    // table scrollTo
    [INSTANCE_METHODS.SCROLL_TO](option) {
      scrollTo(this.tableContainerRef, option)
    },
    // table scroll to rowKey position
    [INSTANCE_METHODS.SCROLL_TO_ROW_KEY]({ rowKey }) {
      if (isEmptyValue(rowKey)) {
        console.warn('Row key can\'t be empty!')
        return false
      }

      const { isVirtualScroll, headerTotalHeight } = this
      const tableContainerRef = this.tableContainerRef

      if (isVirtualScroll && this.virtualScroll) {
        // Find the row's index in tableData
        const index = this.tableData.findIndex(
          (row: any) => row[this.rowKeyFieldName] === rowKey,
        )
        if (index >= 0) {
          this.virtualScroll.scrollToIndex(index, { align: 'start', behavior: 'auto' })
        }
      }
      else {
        // key 会被转义；未渲染的行返回 null
        const rowEl = queryBodyRow(this.tableRootRef, rowKey)

        const scrollTop = rowEl ? rowEl.offsetTop - headerTotalHeight : 0

        scrollTo(tableContainerRef, {
          top: scrollTop,
          behavior: 'smooth',
        })
      }
    },
    // scroll to col key position
    [INSTANCE_METHODS.SCROLL_TO_COL_KEY]({ colKey }) {
      const column = getColumnByColkey(colKey, this.colgroups)
      if (column)
        this.columnToVisible(column)
    },
    // start editing cell
    [INSTANCE_METHODS.START_EDITING_CELL]({
      rowKey,
      colKey,
      defaultValue,
    }) {
      const {
        editOption,
        colgroups,
        rowKeyFieldName,
        editingCell,
        cellSelectionData,
      } = this

      if (!editOption)
        return false

      // 已经在编辑该单元格
      if (
        editingCell.rowKey === rowKey
        && editingCell.colKey === colKey
      ) {
        return false
      }

      const sourceRow = this.tableData.find(
        x => x[rowKeyFieldName] === rowKey,
      )
      const currentColumn = colgroups.find(x => x.key === colKey)

      // 未知的 rowKey / colKey 直接忽略，当前编辑保持不变（EDIT-04、SEL-01）
      if (!sourceRow || !currentColumn)
        return false

      // 当前列是否可编辑
      if (!currentColumn.edit)
        return false

      /*
            调用API编辑的情况，需要先关闭（并保存）之前编辑的单元格（EDIT-04）
            */
      if (this.isCellEditing) {
        // 停止编辑会重置 enableStopEditing，这里保留调用方（如 F2）设置的值
        const { enableStopEditing } = this
        this[INSTANCE_METHODS.STOP_EDITING_CELL]()
        this.enableStopEditing = enableStopEditing
      }

      // 在保存之后再拷贝，拿到上一个单元格保存后的行数据
      const currentRow = cloneDeep(sourceRow)

      const { beforeStartCellEditing } = editOption

      // INFRA-11：通过 safeCall 调用；与其他 before* 回调一致，抛出异常等同于返回 false（取消编辑）
      if (isFunction(beforeStartCellEditing)) {
        const { value: allowContinue, threw } = safeCall(
          'beforeStartCellEditing',
          beforeStartCellEditing,
          {
            row: cloneDeep(currentRow),
            column: currentColumn,
            cellValue: isDefined(defaultValue)
              ? defaultValue
              : currentRow[currentColumn.field],
          },
        )
        if (threw || (isBoolean(allowContinue) && !allowContinue))
          return false
      }

      // 给当前列赋默认值
      if (isDefined(defaultValue)) {
        this.editorInputStartValue = defaultValue
        // doesn't change cell original value
        currentRow[currentColumn.field] = defaultValue
      }
      else {
        this.editorInputStartValue = currentRow[currentColumn.field]
      }

      if (
        cellSelectionData.currentCell.colKey !== colKey
        || cellSelectionData.currentCell.rowKey !== rowKey
      ) {
        this.cellSelectionCurrentCellChange({
          rowKey,
          colKey,
        })
      }

      // set editing cell
      this.setEditingCell({
        rowKey,
        colKey,
        column: currentColumn,
        row: cloneDeep(currentRow),
      })
    },
    // stop editing cell
    [INSTANCE_METHODS.STOP_EDITING_CELL]() {
      const { editOption, isCellEditing } = this

      if (!editOption)
        return false

      // clear editor input start value
      this.editorInputStartValue = ''

      if (isCellEditing)
        this.saveCellWhenStopEditing()
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
    ...cellSelectionMethods,
    ...clipboardMethods,
    ...contextmenuMethods,
    ...editingMethods,
    ...keyboardMethods,
    ...scrollingMethods,
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
