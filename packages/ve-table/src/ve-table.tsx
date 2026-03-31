import type {
  BodyIndicatorRowKeys,
  CellSelectionData,
  CellSelectionRangeData,
  ColgroupData,
  ColumnOption,
  ContextmenuOption,
  EditingCell,
  HeaderIndicatorColKeys,
  RowHeight,
} from './ve-table-types'
import type { VirtualItem, VirtualScrollInstance } from './virtual-scroll'
import VueDomResizeObserver from '@vue3-easytable/common/comps/resize-observer'
import clickoutside from '@vue3-easytable/common/directives/clickoutside'
import emitter from '@vue3-easytable/common/mixins/emitter'
import {
  getValByUnit,
  isBoolean,
  isDefined,
  isEmptyArray,
  isEmptyValue,
  isFunction,
  isNumber,
  scrollTo,
} from '@vue3-easytable/common/utils'
import { MOUSE_EVENT_CLICK_TYPE } from '@vue3-easytable/common/utils/constant'
// isInputKeyCode moved to methods/keyboard.ts
import Hooks from '@vue3-easytable/common/utils/hooks-manager'
import { getMouseEventClickType } from '@vue3-easytable/common/utils/mouse-event'
import { getScrollbarWidth } from '@vue3-easytable/common/utils/scroll-bar'
import VeContextmenu from '@vue3-easytable/ve-contextmenu'
import { cloneDeep, debounce } from 'lodash'
import mitt from 'mitt'
import { defineComponent } from 'vue'
import Body from './body'
import Colgroup from './colgroup'
import ColumnResizer from './column-resizer'
import EditInput from './editor'
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
// Clipboard utils moved to methods/clipboard.ts
import {
  COLUMN_FIXED_TYPE,
  COMPS_CUSTOM_ATTRS,
  COMPS_NAME,
  CONTEXTMENU_TYPES,
  EMIT_EVENTS,
  HOOKS_NAME,
  INSTANCE_METHODS,
} from './util/constant.js'
import {
  clsName,
  getColKeysByHeaderColumn,
  getColumnByColkey,
  getDomResizeObserverCompKey,
  getEmitEventName,
  getLeftmostColKey,
  getRowKey,
  getSelectionRangeIndexes,
  getSelectionRangeKeys,
  initGroupColumns,
  isClearSelectionByBodyCellRightClick,
  isContextmenuPanelClicked,
  isOperationColumn,
  recursiveRemoveColumnByKey,
} from './util/index.js'
import { createVirtualScroll } from './virtual-scroll'

export default defineComponent({
  name: COMPS_NAME.VE_TABLE,
  directives: {
    'click-outside': clickoutside,
  },
  mixins: [emitter('eventBus')],
  props: {
    tableData: {
      required: true,
      type: Array,
    },
    footerData: {
      type: Array,
      default() {
        return []
      },
    },
    showHeader: {
      type: Boolean,
      default: true,
    },
    columns: {
      type: Array,
      required: true,
    },
    // row key field for row expand、row selection
    rowKeyFieldName: {
      type: String,
      default: null,
    },
    // table scroll width
    scrollWidth: {
      type: [Number, String],
      default: null,
    },
    // table max height
    maxHeight: {
      type: [Number, String],
      default: null,
    },
    // fixed header
    fixedHeader: {
      type: Boolean,
      default: true,
    },
    // fixed footer
    fixedFooter: {
      type: Boolean,
      default: true,
    },
    // border around
    borderAround: {
      type: Boolean,
      default: true,
    },
    // border horizontal
    borderX: {
      type: Boolean,
      default: true,
    },
    // border vertical
    borderY: {
      type: Boolean,
      default: false,
    },
    // event custom option
    eventCustomOption: {
      type: Object,
      default() {
        return null
      },
    },
    // cell style option
    cellStyleOption: {
      type: Object,
      default() {
        return null
      },
    },
    // cell span option
    cellSpanOption: {
      type: Object,
      default() {
        return null
      },
    },
    // row style option
    rowStyleOption: {
      type: Object,
      default() {
        return null
      },
    },
    /*
        virual scroll option
        {
            enable:true,
            bufferCount:10, // 缓冲的数据
            minRowHeight:40,
            scrolling:(startRowIndex,visibleStartIndex,visibleEndIndex,visibleAboveCount,visibleBelowCount)=>{}
        }
        */
    virtualScrollOption: {
      type: Object,
      default: null,
    },
    // sort option
    sortOption: {
      type: Object,
      default() {
        return null
      },
    },
    // expand row option
    expandOption: {
      type: Object,
      default() {
        return null
      },
    },
    // checkbox option
    checkboxOption: {
      type: Object,
      default() {
        return null
      },
    },
    // radio option
    radioOption: {
      type: Object,
      default() {
        return null
      },
    },
    // cell selection option
    cellSelectionOption: {
      type: Object,
      default() {
        return null
      },
    },
    // cell autofill option
    cellAutofillOption: {
      type: [Object, Boolean],
      default() {
        return null
      },
    },
    // edit option
    editOption: {
      type: Object,
      default() {
        return null
      },
    },
    // column hidden option
    columnHiddenOption: {
      type: Object,
      default() {
        return null
      },
    },
    // contextmenu header option
    contextmenuHeaderOption: {
      type: Object,
      default() {
        return null
      },
    },
    // contextmenu body option
    contextmenuBodyOption: {
      type: Object,
      default() {
        return null
      },
    },
    // clipboard option
    clipboardOption: {
      type: Object,
      default() {
        return null
      },
    },
    // column width resize option
    columnWidthResizeOption: {
      type: Object,
      default() {
        return null
      },
    },
    // row insert option
    rowInsertOption: {
      type: Object,
      default() {
        return null
      },
    },
  },
  data() {
    return {
      eventBus: mitt(),
      hooks: {} as InstanceType<typeof Hooks>,
      parentRendered: false,
      tableViewportWidth: 0,
      columnsOptionResetTime: 0,

      // Template refs (string keys)
      tableRootRef: 'tableRootRef' as const,
      tableContainerWrapperRef: 'tableContainerWrapperRef' as const,
      tableContainerRef: 'tableContainerRef' as const,
      tableRef: 'tableRef' as const,
      tableBodyRef: 'tableBodyRef' as const,
      tableContentWrapperRef: 'tableContentWrapperRef' as const,
      virtualPhantomRef: 'virtualPhantomRef' as const,
      editInputRef: 'editInputRef' as const,
      cellSelectionRef: 'cellSelectionRef' as const,
      contextmenuRef: 'contextmenuRef' as const,

      // Column state
      cloneColumns: [] as ColumnOption[],
      isGroupHeader: false,
      headerRows: [] as RowHeight[],
      footerRows: [] as RowHeight[],
      colgroups: [] as ColgroupData[],
      groupColumns: [] as ColumnOption[][],
      hiddenColumns: [] as string[],

      // Virtual scroll
      defaultVirtualScrollMinRowHeight: 40,
      defaultVirtualScrollBufferScale: 1,
      _vsVersion: 0,

      // Scrolling state
      isLeftScrolling: false,
      isRightScrolling: false,
      isVerticalScrolling: false,
      hasXScrollBar: false,
      hasYScrollBar: false,
      scrollBarWidth: 0,
      previewTableContainerScrollLeft: null as number | null,

      // Cell selection
      headerIndicatorColKeys: {
        startColKey: '',
        startColKeyIndex: -1,
        endColKey: '',
        endColKeyIndex: -1,
      } as HeaderIndicatorColKeys,
      bodyIndicatorRowKeys: {
        startRowKey: '',
        startRowKeyIndex: -1,
        endRowKey: '',
        endRowKeyIndex: -1,
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
      autofillingDirection: null as string | null,
      currentCellSelectionType: '',

      // Layout
      tableOffestHeight: 0,
      tableHeight: 0,

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

      // Column resize
      isColumnResizerHover: false,
      isColumnResizing: false,

      // Non-reactive instance properties (typed here for TypeScript)
      _vs: null as VirtualScrollInstance | null,
      measureColsWidths: new Map<string, number>(),
      debouncedBodyCellWidthChange: null as ((...args: any[]) => void) | null,
      debouncedMeasureCellWidthChange: null as ((...args: any[]) => void) | null,
    }
  },
  computed: {
    // actual render table data
    actualRenderTableData() {
      if (this.isVirtualScroll) {
        void this._vsVersion // establish reactive dependency
        const vs = this._vs as VirtualScrollInstance | null
        if (!vs)
          return []
        return vs.getVirtualItems().map((item: VirtualItem) => this.tableData[item.index])
      }
      return this.tableData
    },
    // TanStack virtual items (reactive via _vsVersion)
    virtualItems(): VirtualItem[] {
      if (!this.isVirtualScroll)
        return []
      void this._vsVersion // establish reactive dependency
      const vs = this._vs as VirtualScrollInstance | null
      return vs ? vs.getVirtualItems() : []
    },
    // Total scrollable height from TanStack (reactive via _vsVersion)
    virtualTotalSize(): number {
      if (!this.isVirtualScroll)
        return 0
      void this._vsVersion // establish reactive dependency
      const vs = this._vs as VirtualScrollInstance | null
      return vs ? vs.getTotalSize() : 0
    },
    // Top spacer height for virtual scroll
    virtualPaddingTop(): number {
      if (!this.isVirtualScroll)
        return 0
      void this._vsVersion // establish reactive dependency
      const vs = this._vs as VirtualScrollInstance | null
      return vs ? vs.getPaddingTop() : 0
    },
    // Bottom spacer height for virtual scroll
    virtualPaddingBottom(): number {
      if (!this.isVirtualScroll)
        return 0
      void this._vsVersion // establish reactive dependency
      const vs = this._vs as VirtualScrollInstance | null
      return vs ? vs.getPaddingBottom() : 0
    },
    // return row keys
    allRowKeys(): Array<string | number> {
      const { tableData, rowKeyFieldName } = this
      if (!rowKeyFieldName)
        return []
      return (tableData as any[]).map(x => x[rowKeyFieldName])
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
    // has fixed column
    hasFixedColumn() {
      return this.colgroups.some(
        x =>
          x.fixed === COLUMN_FIXED_TYPE.LEFT
          || x.fixed === COLUMN_FIXED_TYPE.RIGHT,
      )
    },
    // has left fixed column
    hasLeftFixedColumn() {
      return this.colgroups.some(
        x => x.fixed === COLUMN_FIXED_TYPE.LEFT,
      )
    },
    // has right fixed column
    hasRightFixedColumn() {
      return this.colgroups.some(
        x => x.fixed === COLUMN_FIXED_TYPE.RIGHT,
      )
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
      if (this.headerIndicatorColKeys.startColKeyIndex > -1)
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
    // eanble width resize
    enableColumnResize() {
      let result = false
      const { columnWidthResizeOption } = this
      if (columnWidthResizeOption) {
        const { enable } = columnWidthResizeOption
        if (isBoolean(enable))
          result = enable
      }
      return result
    },
    // row insert indicator props
    rowInsertIndicatorProps() {
      return {
        parentRendered: this.parentRendered,
        hooks: this.hooks,
        tableContainerEl: this.$refs[this.tableContainerRef] as HTMLElement | undefined,
        tableEl: this.$refs[this.tableRef] as HTMLTableElement | undefined,
        allRowKeys: this.allRowKeys,
        colgroups: this.colgroups,
        rowKeyFieldName: this.rowKeyFieldName,
        tableData: this.tableData,
        virtualScrollOption: this.virtualScrollOption,
        isVirtualScroll: this.isVirtualScroll,
        // Provide compatible virtual scroll data for row-insert-indicator
        virtualScrollPositions: [],
        virtualScrollVisibleIndexs: {
          start: this.virtualItems.length > 0 ? this.virtualItems[0].index : 0,
          end: this.virtualItems.length > 0 ? this.virtualItems[this.virtualItems.length - 1].index : 0,
        },
        rowInsertOption: this.rowInsertOption,
        fixedHeader: this.fixedHeader,
        showHeader: this.showHeader,
        [getEmitEventName(EMIT_EVENTS.ROW_INSERT)]: (params) => {
          this.handleRowInsert(params)
        },
      }
    },
    // header total height
    headerTotalHeight() {
      let result = 0
      if (this.showHeader) {
        result = this.headerRows.reduce((total, currentVal) => {
          return currentVal.rowHeight + total
        }, 0)
      }
      return result
    },
    // footer total height
    footerTotalHeight() {
      return this.footerRows.reduce((total, currentVal) => {
        return currentVal.rowHeight + total
      }, 0)
    },
  },
  watch: {
    // watch clone table data
    'tableData': {
      handler(newVal, oldVal) {
        // Update TanStack virtualizer when data changes
        if (this._vs && this.isVirtualScroll) {
          this._vs.setOptions({
            count: newVal?.length ?? 0,
            getItemKey: (index: number) => newVal[index]?.[this.rowKeyFieldName] ?? index,
          })
          // Re-measure all rows when data changes (rows may have different heights)
          if (oldVal)
            this._vs.measure()
        }
        // First render with virtual scroll enabled — create the instance
        if (!this._vs && this.isVirtualScroll && oldVal) {
          this.$nextTick(() => this.initTanStackVirtualScroll())
        }
      },
      immediate: true,
      deep: true,
    },
    'allRowKeys': {
      handler(newVal) {
        if (Array.isArray(newVal)) {
          const { currentCell, normalEndCell } = this.cellSelectionData
          // 行被移除，清空单元格选中
          if (currentCell.rowIndex > -1) {
            if (!newVal.includes(currentCell.rowKey)) {
              this.clearCellSelectionCurrentCell()
            }
            else {
              // Row still exists but index may have changed (e.g., row inserted above)
              // Update the rowIndex to reflect the new position
              const newRowIndex = newVal.indexOf(currentCell.rowKey)
              if (newRowIndex !== currentCell.rowIndex) {
                this.cellSelectionData.currentCell.rowIndex = newRowIndex
                // Also update normalEndCell rowIndex if it exists
                if (normalEndCell.rowIndex > -1 && newVal.includes(normalEndCell.rowKey)) {
                  this.cellSelectionData.normalEndCell.rowIndex = newVal.indexOf(normalEndCell.rowKey)
                }
                // Trigger selection position refresh after DOM updates
                this.$nextTick(() => {
                  this.hooks.triggerHook(HOOKS_NAME.CLIPBOARD_CELL_VALUE_CHANGE)
                })
              }
            }
          }
        }
      },
      immediate: false,
    },
    'columns': {
      handler(newVal, oldVal) {
        this.initColumns()
        this.initGroupColumns()
        this.initColumnWidthByColumnResize()

        // 排除首次
        if (newVal !== oldVal && oldVal) {
          this.columnsOptionResetTime++
          // 需要等待 initColumns 和 initGroupColumns 先执行
          this.initScrolling()
        }
      },
      immediate: true,
    },
    'cloneColumns': {
      handler() {
        this.initGroupColumns()
        // 右键（取消）固定列会操作 cloneColumns
        this.initColumnWidthByColumnResize()

        this.columnsOptionResetTime++
        // 需要等待 initColumns 和 initGroupColumns 先执行
        this.initScrolling()
      },
      immediate: false,
    },
    // group columns change watch
    'groupColumns': {
      handler(val) {
        if (!isEmptyArray(val))
          this.initHeaderRows()
      },
      immediate: true,
    },
    // footer data
    'footerData': {
      handler(val) {
        if (!isEmptyArray(val))
          this.initFooterRows()
      },
      immediate: true,
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
          this.setCellSelectionByAutofill()
          this.clearCellSelectionAutofillEndCell()
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
  created() {
    // bug fixed #467
    this.debouncedBodyCellWidthChange = debounce(
      this.bodyCellWidthChange,
      0,
    )
    // Debounced handler for the column-width measurement table
    this.measureColsWidths = new Map()
    this.debouncedMeasureCellWidthChange = debounce(
      this.measureCellWidthChange,
      0,
    )
    // TanStack virtual scroll instance (non-reactive, managed manually)
    this._vs = null as VirtualScrollInstance | null
  },
  mounted() {
    this.parentRendered = true

    // set contextmenu event target
    this.contextmenuEventTarget = this.$el.querySelector(
      `.${clsName('content')}`,
    )

    // create hook instance
    this.hooks = new Hooks()
    // receive sort change
    this.on(EMIT_EVENTS.SORT_CHANGE, (params) => {
      this.updateColgroupsBySortChange(params)
    })

    // receive row selected change
    this.on(EMIT_EVENTS.CHECKBOX_SELECTED_ALL_CHANGE, (params) => {
      this.selectedAllChange(params)
    })

    // receive selected all info
    this.on(EMIT_EVENTS.CHECKBOX_SELECTED_ALL_INFO, (params) => {
      this.setSelectedAllInfo(params)
    })

    // receive multiple header row height change
    this.on(EMIT_EVENTS.HEADER_ROW_HEIGHT_CHANGE, ({ rowIndex, height }: any) => {
      this.headerRowHeightChange({ rowIndex, height })
    })

    // receive footer row height change
    this.on(
      EMIT_EVENTS.FOOTER_ROW_HEIGHT_CHANGE,
      ({ rowIndex, height }) => {
        this.footRowHeightChange({ rowIndex, height })
      },
    )

    // recieve body cell click
    this.on(EMIT_EVENTS.BODY_CELL_CLICK, (params) => {
      this.bodyCellClick(params)
    })

    // recieve body cell mouseover
    this.on(EMIT_EVENTS.BODY_CELL_MOUSEOVER, (params) => {
      this.bodyCellMouseover(params)
    })

    // recieve body cell mousedown
    this.on(EMIT_EVENTS.BODY_CELL_MOUSEDOWN, (params) => {
      this.bodyCellMousedown(params)
    })

    // recieve body cell mousemove
    this.on(EMIT_EVENTS.BODY_CELL_MOUSEMOVE, (params) => {
      this.bodyCellMousemove(params)
    })

    // recieve body cell mouseup
    this.on(EMIT_EVENTS.BODY_CELL_MOUSEUP, (params) => {
      this.bodyCellMouseup(params)
    })

    // recieve selection corner mousedown
    this.on(EMIT_EVENTS.SELECTION_CORNER_MOUSEDOWN, (params) => {
      this.cellSelectionCornerMousedown(params)
    })

    // recieve selection corner mouseup
    this.on(EMIT_EVENTS.SELECTION_CORNER_MOUSEUP, (params) => {
      this.cellSelectionCornerMouseup(params)
    })

    // autofilling direction change
    this.on(EMIT_EVENTS.AUTOFILLING_DIRECTION_CHANGE, (params) => {
      this.autofillingDirectionChange(params)
    })

    // recieve body cell contextmenu(right click)
    this.on(EMIT_EVENTS.BODY_CELL_CONTEXTMENU, (params) => {
      this.bodyCellContextmenu(params)
    })

    // recieve body cell double click
    this.on(EMIT_EVENTS.BODY_CELL_DOUBLE_CLICK, (params) => {
      this.bodyCellDoubleClick(params)
    })

    // recieve header cell contextmenu(right click)
    this.on(EMIT_EVENTS.HEADER_CELL_CLICK, (params) => {
      this.headerCellClick(params)
    })

    // recieve header cell contextmenu(right click)
    this.on(EMIT_EVENTS.HEADER_CELL_CONTEXTMENU, (params) => {
      this.headerCellContextmenu(params)
    })

    // recieve header cell mousedown
    this.on(EMIT_EVENTS.HEADER_CELL_MOUSEDOWN, (params) => {
      this.headerCellMousedown(params)
    })

    // recieve header cell mouseover
    this.on(EMIT_EVENTS.HEADER_CELL_MOUSEOVER, (params) => {
      this.headerCellMouseover(params)
    })

    // recieve header cell mousemove
    this.on(EMIT_EVENTS.HEADER_CELL_MOUSEMOVE, (params) => {
      this.headerCellMousemove(params)
    })

    // recieve header cell mouseleave
    this.on(EMIT_EVENTS.HEADER_CELL_MOUSELEAVE, (params) => {
      this.headerCellMouseleave(params)
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
  },

  methods: {
    // int header rows
    initHeaderRows() {
      const { groupColumns } = this

      if (Array.isArray(groupColumns)) {
        this.headerRows = groupColumns.map(() => {
          return { rowHeight: 0 }
        })
      }
    },

    // int footer rows
    initFooterRows() {
      const { footerData } = this

      if (Array.isArray(footerData)) {
        this.footerRows = footerData.map(() => {
          return { rowHeight: 0 }
        })
      }
    },

    // header tr height resize
    headerRowHeightChange({ rowIndex, height }) {
      this.headerRows.splice(rowIndex, 1, { rowHeight: height })
    },

    // footer row height resize
    footRowHeightChange({ rowIndex, height }) {
      this.footerRows.splice(rowIndex, 1, { rowHeight: height })
    },

    // Called by the hidden measurement table's ResizeObserver cells
    measureCellSizeChange({ key, width }) {
      this.measureColsWidths.set(key, width)
      this.debouncedMeasureCellWidthChange?.(this.measureColsWidths)
    },

    // Applies measured column widths (replaces the old body measurement row)
    measureCellWidthChange(colWidths) {
      this.colgroups = this.colgroups.map((item) => {
        item._realTimeWidth = colWidths.get(item.key)
        return item
      })

      this.hooks.triggerHook(HOOKS_NAME.TABLE_CELL_WIDTH_CHANGE)
    },

    // body cell width change (kept for backwards compatibility)
    bodyCellWidthChange(colWidths) {
      this.colgroups = this.colgroups.map((item) => {
        item._realTimeWidth = colWidths.get(item.key)
        return item
      })

      this.hooks.triggerHook(HOOKS_NAME.TABLE_CELL_WIDTH_CHANGE)
    },

    // set column width for column resize
    setColumnWidth({ colKey, width }) {
      this.colgroups = this.colgroups.map((item) => {
        if (item.key === colKey)
          item._columnResizeWidth = width

        return item
      })
      this.$nextTick(() => {
        this.setScrollBarStatus()
      })
      this.hooks.triggerHook(HOOKS_NAME.TABLE_CELL_WIDTH_CHANGE)
    },

    // update colgroups by sort change
    updateColgroupsBySortChange(sortColumns) {
      // clear cell selection when sorting to avoid stale selection state
      this.clearCellSelectionCurrentCell()
      this.clearCellSelectionNormalEndCell()

      // stop editing cell if active
      this[INSTANCE_METHODS.STOP_EDITING_CELL]()

      this.colgroups = this.colgroups.map((item) => {
        // update colgroups by sort columns
        if (item.field && Object.keys(sortColumns).includes(item.field))
          item.sortBy = sortColumns[item.field]

        return item
      })
    },

    // init column width by column resize
    initColumnWidthByColumnResize() {
      const { enableColumnResize } = this

      const columnDefaultWidth = 50
      if (enableColumnResize) {
        this.colgroups = this.colgroups.map((item) => {
          let columnWidth = columnDefaultWidth
          if (isNumber(item.width))
            columnWidth = item.width

          item._columnResizeWidth = columnWidth
          return item
        })
      }
    },

    // init columns
    initColumns() {
      const { columnHiddenOption } = this
      if (columnHiddenOption) {
        const { defaultHiddenColumnKeys } = columnHiddenOption

        if (!isEmptyArray(defaultHiddenColumnKeys))
          this.hiddenColumns = defaultHiddenColumnKeys
      }

      this.showOrHideColumns()
    },

    // show or hide columns
    showOrHideColumns() {
      let cloneColumns = cloneDeep(this.columns) as ColumnOption[]

      cloneColumns = cloneColumns.map((col) => {
        // 操作列默认左固定
        if (col.operationColumn)
          col.fixed = COLUMN_FIXED_TYPE.LEFT as 'left'

        return col
      })

      const { hiddenColumns } = this

      if (!isEmptyArray(hiddenColumns)) {
        //  recursive remove column key
        hiddenColumns.forEach((key) => {
          cloneColumns = recursiveRemoveColumnByKey(
            cloneColumns,
            key,
          )
        })
      }

      this.cloneColumns = cloneColumns
    },

    // 初始化分组表头
    initGroupColumns() {
      const result = initGroupColumns(this.cloneColumns)

      // set is group header
      this.isGroupHeader = result.isGroupHeader
      // set colgroups
      this.colgroups = result.colgroups
      // set groupColumns
      this.groupColumns = result.groupColumns
    },

    // scroll bar width
    getScrollBarWidth() {
      let result = 0

      const { scrollBarWidth } = this

      if (scrollBarWidth) {
        result = scrollBarWidth
      }
      else {
        result = getScrollbarWidth()
        this.scrollBarWidth = result
      }

      return result
    },

    /*
         * @selectedAllChange
         * @desc  selected all change
         * @param {bool} isSelected - is selected
         */
    selectedAllChange({ isSelected }: { isSelected: boolean }) {
      this.dispatch(
        COMPS_NAME.VE_TABLE_BODY,
        EMIT_EVENTS.CHECKBOX_SELECTED_ALL_CHANGE,
        {
          isSelected,
        },
      )
    },

    /*
         * @setSelectedAllInfo
         * @desc  set selected all info
         * @param {bool} isSelected - is selected
         * @param {bool} isIndeterminate - is indeterminate
         */
    setSelectedAllInfo({ isSelected, isIndeterminate }: { isSelected: boolean, isIndeterminate: boolean }) {
      this.dispatch(
        COMPS_NAME.VE_TABLE_HEADER_CHECKBOX_CONTENT,
        EMIT_EVENTS.CHECKBOX_SELECTED_ALL_INFO,
        {
          isSelected,
          isIndeterminate,
        },
      )
    },

    // ── TanStack Virtual scroll management ──

    /**
     * Create the TanStack Virtual instance.
     * Must be called after the scroll container is in the DOM (mounted / nextTick).
     */
    initTanStackVirtualScroll() {
      // Guard: don't double-create
      if (this._vs)
        return
      if (!this.isVirtualScroll)
        return

      const scrollEl = this.$refs[this.tableContainerRef] as HTMLElement | null
      if (!scrollEl)
        return

      const { virtualScrollOption, tableData, rowKeyFieldName } = this
      const scrollingCb = isFunction(virtualScrollOption?.scrolling) ? virtualScrollOption.scrolling : undefined

      this._vs = createVirtualScroll({
        count: tableData?.length ?? 0,
        getScrollElement: () => this.$refs[this.tableContainerRef] as HTMLElement | null,
        estimateSize: this.virtualScrollEstimateSize,
        overscan: this.virtualScrollOverscan,
        getItemKey: (index: number) => tableData[index]?.[rowKeyFieldName] ?? index,
        onChange: () => {
          // Increment reactive counter → triggers re-render of computed properties
          this._vsVersion++
        },
        onScrolling: scrollingCb,
      })

      // Force initial render
      this._vsVersion++
    },

    /**
     * Destroy the TanStack Virtual instance and clean up listeners.
     */
    destroyTanStackVirtualScroll() {
      if (this._vs) {
        this._vs.destroy()
        this._vs = null
        this._vsVersion++
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
            ref={this.virtualPhantomRef}
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

      this.isHeaderCellMousedown = false
      this.isBodyCellMousedown = false
      this.isBodyOperationColumnMousedown = false
      this.isAutofillStarting = false
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
    bodyCellContextmenu({ event, rowData, column }) {
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
    bodyCellDoubleClick({ event, rowData, column }) {
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
    bodyCellClick({ event, rowData, column }) {
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

        const {
          startRowKey,
          endRowKey,
          startRowKeyIndex,
          endRowKeyIndex,
        } = bodyIndicatorRowKeys
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

          // 左键点击 || 不在当前选择行内
          if (
            mouseEventClickType
            === MOUSE_EVENT_CLICK_TYPE.LEFT_MOUSE
            || currentRowIndex < startRowKeyIndex
            || currentRowIndex > endRowKeyIndex
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
        // body cell mousedown
        this.isBodyCellMousedown = true

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
    bodyCellMousemove({ event, rowData, column }) {
      this.hooks.triggerHook(HOOKS_NAME.BODY_CELL_MOUSEMOVE, {
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
    bodyCellMouseup({ event, rowData, column }) {
      // feature...
    },

    // header cell click
    headerCellClick({ event, column }) {
      // feature...
    },

    // header cell contextmenu
    headerCellContextmenu({ event, column }) {
      this.setContextmenuOptions(column)
    },

    // header cell mousedown
    headerCellMousedown({ event, column }) {
      if (!this.enableCellSelection)
        return false

      this.isHeaderCellMousedown = true

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
        colKeys = getColKeysByHeaderColumn({
          headerColumnItem: column,
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
          this.$refs[this.cellSelectionRef].clearCurrentCellRect()
        }

        this.$refs[this.cellSelectionRef].clearNormalEndCellRect()
      }

      const { startColKey, endColKey, startColKeyIndex, endColKeyIndex }
                = headerIndicatorColKeys

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
          x => x.key === currentCellEndColKey,
        )
        const currentCellEndColIndex = colgroups.findIndex(
          x => x.key === currentCellStartColKey,
        )
        // 左键点击 || 不在当前选择列内
        if (
          mouseEventClickType === MOUSE_EVENT_CLICK_TYPE.LEFT_MOUSE
          || currentCellStartColIndex < startColKeyIndex
          || currentCellEndColIndex < startColKeyIndex
          || currentCellStartColIndex > endColKeyIndex
          || currentCellEndColIndex > endColKeyIndex
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
          colKeys = getColKeysByHeaderColumn({
            headerColumnItem: column,
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
      this.hooks.triggerHook(HOOKS_NAME.HEADER_CELL_MOUSEMOVE, {
        event,
        column,
      })
    },

    // header cell mouseleave
    headerCellMouseleave({ event, column }) {
      // todo
    },

    // header mouseleave
    headerMouseleave(event) {
      this.setIsColumnResizerHover(false)
    },

    // table container mouseup
    tableContainerMouseup() {
      this.isHeaderCellMousedown = false
      this.isBodyCellMousedown = false
      this.isBodyOperationColumnMousedown = false
      this.isAutofillStarting = false
    },

    // set isColumnResizerHover
    setIsColumnResizerHover(val) {
      this.isColumnResizerHover = val
    },

    // set isColumnResizing
    setIsColumnResizing(val) {
      this.isColumnResizing = val
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
        this.cellSelectionCurrentCellChange({
          rowKey,
          colKey,
        })

        const column = getColumnByColkey(colKey, this.colgroups)
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
        const column = getColumnByColkey(startColKey, this.colgroups)
        // column to visible
        this.columnToVisible(column)
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

    // hide columns by keys
    [INSTANCE_METHODS.HIDE_COLUMNS_BY_KEYS](keys) {
      if (!isEmptyArray(keys)) {
        /*
                将要隐藏的列添加到 hiddenColumns 中
                Add the columns you want to hide to hidden columns
                */
        this.hiddenColumns = Array.from(
          new Set(this.hiddenColumns.concat(keys)),
        )

        this.showOrHideColumns()
      }
    },

    // show columns by keys
    [INSTANCE_METHODS.SHOW_COLUMNS_BY_KEYS](keys) {
      if (!isEmptyArray(keys)) {
        /*
                将要显示的列从 hiddenColumns 中移除
                Remove the columns to show from hidden columns
                */
        for (let i = keys.length - 1; i >= 0; i--) {
          const delIndex = this.hiddenColumns.indexOf(keys[i])
          if (delIndex > -1)
            this.hiddenColumns.splice(delIndex, 1)
        }

        this.showOrHideColumns()
      }
    },

    // table scrollTo
    [INSTANCE_METHODS.SCROLL_TO](option) {
      scrollTo(this.$refs[this.tableContainerRef], option)
    },
    // table scroll to rowKey position
    [INSTANCE_METHODS.SCROLL_TO_ROW_KEY]({ rowKey }) {
      if (isEmptyValue(rowKey)) {
        console.warn('Row key can\'t be empty!')
        return false
      }

      const { isVirtualScroll, headerTotalHeight } = this
      const tableContainerRef = this.$refs[this.tableContainerRef]

      if (isVirtualScroll && this._vs) {
        // Find the row's index in tableData
        const index = this.tableData.findIndex(
          (row: any) => row[this.rowKeyFieldName] === rowKey,
        )
        if (index >= 0) {
          this._vs.scrollToIndex(index, { align: 'start', behavior: 'auto' })
        }
      }
      else {
        const rowEl = this.$el.querySelector(
          `tbody tr[${COMPS_CUSTOM_ATTRS.BODY_ROW_KEY}="${rowKey}"]`,
        )

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

      let currentRow = this.tableData.find(
        x => x[rowKeyFieldName] === rowKey,
      )

      currentRow = cloneDeep(currentRow)

      /*
            调用API编辑的情况，需要关闭之前编辑的单元格
            */
      if (
        editingCell.rowKey === rowKey
        && editingCell.colKey === colKey
      ) {
        return false
      }

      const currentColumn = colgroups.find(x => x.key === colKey)
      // 当前列是否可编辑
      if (!currentColumn.edit)
        return false

      const { beforeStartCellEditing } = editOption

      if (isFunction(beforeStartCellEditing)) {
        const allowContinue = beforeStartCellEditing({
          row: cloneDeep(currentRow),
          column: currentColumn,
          cellValue: isDefined(defaultValue)
            ? defaultValue
            : currentRow[currentColumn.field],
        })
        if (isBoolean(allowContinue) && !allowContinue)
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
      ref: this.tableBodyRef,
      class: [clsName('body'), this.tableBodyClass],
      tableViewportWidth,
      columnsOptionResetTime: this.columnsOptionResetTime,
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
      virtualMeasureElement: this._vs
        ? (el: HTMLElement | null) => this._vs!.measureElement(el)
        : undefined,
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
      ref: this.tableRootRef,
      class: {
        'vue-table-root': true,
      },
    }

    // table container wrapper props
    const tableContainerWrapperProps = {
      ref: this.tableContainerWrapperRef,
      style: this.tableContainerWrapperStyle,
      class: {
        've-table': true,
        [clsName('border-around')]: this.borderAround,
      },
      tagName: 'div',
      onOnDomResizeChange: ({ height }) => {
        this.tableOffestHeight = height
        // Re-initialize virtual scroll when container resizes (e.g. maxHeight changes)
        if (this.isVirtualScroll && !this._vs) {
          this.$nextTick(() => this.initTanStackVirtualScroll())
        }
        // fixed #404
        this.initScrolling()
        this.setScrollBarStatus()
        this.hooks.triggerHook(HOOKS_NAME.TABLE_SIZE_CHANGE)
      },
    }

    // table container props
    const tableContainerProps = {
      ref: this.tableContainerRef,
      class: this.tableContainerClass,
      style: tableContainerStyle,
      onScroll: () => {
        const tableContainerRef
                        = this.$refs[this.tableContainerRef] as HTMLElement

        this.hooks.triggerHook(
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
      onMousemove: (event) => {
        // todo
      },
    }

    // table wrapper props
    const tableWrapperProps = {
      ref: this.tableContentWrapperRef,
      class: [clsName('content-wrapper')],
      tagName: 'div',
      onOnDomResizeChange: ({ height }) => {
        this.tableHeight = height
      },
    }

    // tale props
    const tableProps = {
      ref: this.tableRef,
      class: [clsName('content'), tableClass],
      style: tableStyle,
    }

    // selection props
    const selectionProps = {
      ref: this.cellSelectionRef,
      tableEl: this.$refs[this.tableRef] as HTMLTableElement | undefined,
      allRowKeys,
      colgroups,
      parentRendered: this.parentRendered,
      hooks: this.hooks,
      cellSelectionData,
      isAutofillStarting: this.isAutofillStarting,
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
      ref: this.editInputRef,
      hooks: this.hooks,
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
      ref: this.contextmenuRef,
      eventTarget: this.contextmenuEventTarget as string | HTMLElement,
      options: contextmenuOptions as any,
      onOnNodeClick: (type: any) => {
        this.contextmenuItemClick(type)
      },
    }

    // column resizer props
    const columnResizerProps = {
      parentRendered: this.parentRendered,
      tableContainerEl: this.$refs[this.tableContainerRef] as HTMLDivElement | undefined,
      hooks: this.hooks,
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
                {/* table body */}
                <Body {...bodyProps} />
                {/* table footer */}
                <Footer {...footerProps} />
              </table>
              {/* Hidden table for measuring actual column widths.
                  Placed outside <table> so it is never included in clipboard
                  copies. Mirrors the main table's colgroup so the browser
                  layout algorithm assigns matching column widths. */}
              <table
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: tableStyle.width || '100%',
                  visibility: 'hidden',
                  pointerEvents: 'none',
                  zIndex: -1,
                }}
              >
                <Colgroup
                  colgroups={colgroups}
                  enableColumnResize={enableColumnResize}
                />
                <tbody>
                  <tr>
                    {colgroups.map((column) => {
                      const measureTdProps = {
                        key: getDomResizeObserverCompKey(
                          column.key,
                          this.columnsOptionResetTime,
                        ),
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
