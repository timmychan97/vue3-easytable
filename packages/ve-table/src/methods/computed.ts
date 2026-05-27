/**
 * Computed properties extracted from ve-table.
 * Spread into defineComponent({ computed: { ...computedProperties } })
 */
import type { VirtualItem, VirtualScrollInstance } from '../virtual-scroll'
import {
  getValByUnit,
  isBoolean,
  isEmptyValue,
  isNumber,
} from '@vue3-easytable/common/utils'
import {
  COLUMN_FIXED_TYPE,
  CONTEXTMENU_TYPES,
  EMIT_EVENTS,
} from '../util/constant.js'
import {
  clsName,
  getEmitEventName,
} from '../util/index.js'

export const computedProperties = {
  // actual render table data
  actualRenderTableData(this: any) {
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
  virtualItems(this: any): VirtualItem[] {
    if (!this.isVirtualScroll)
      return []
    void this._vsVersion // establish reactive dependency
    const vs = this._vs as VirtualScrollInstance | null
    return vs ? vs.getVirtualItems() : []
  },

  // Total scrollable height from TanStack (reactive via _vsVersion)
  virtualTotalSize(this: any): number {
    if (!this.isVirtualScroll)
      return 0
    void this._vsVersion // establish reactive dependency
    const vs = this._vs as VirtualScrollInstance | null
    return vs ? vs.getTotalSize() : 0
  },

  // Top spacer height for virtual scroll
  virtualPaddingTop(this: any): number {
    if (!this.isVirtualScroll)
      return 0
    void this._vsVersion // establish reactive dependency
    const vs = this._vs as VirtualScrollInstance | null
    return vs ? vs.getPaddingTop() : 0
  },

  // Bottom spacer height for virtual scroll
  virtualPaddingBottom(this: any): number {
    if (!this.isVirtualScroll)
      return 0
    void this._vsVersion // establish reactive dependency
    const vs = this._vs as VirtualScrollInstance | null
    return vs ? vs.getPaddingBottom() : 0
  },

  // return row keys
  allRowKeys(this: any): Array<string | number> {
    const { tableData, rowKeyFieldName } = this
    if (!rowKeyFieldName)
      return []
    return (tableData as any[]).map((x: any) => x[rowKeyFieldName])
  },

  // Overscan count for TanStack virtual (extra rows above/below visible area)
  virtualScrollOverscan(this: any) {
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
  virtualScrollEstimateSize(this: any) {
    const { virtualScrollOption, defaultVirtualScrollMinRowHeight } = this
    return isNumber(virtualScrollOption?.minRowHeight)
      ? virtualScrollOption.minRowHeight
      : defaultVirtualScrollMinRowHeight
  },

  // table container wrapper style
  tableContainerWrapperStyle(this: any) {
    return {
      width: '100%',
    }
  },

  // table container style
  tableContainerStyle(this: any) {
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
  tableStyle(this: any) {
    return {
      width: getValByUnit(this.scrollWidth),
    }
  },

  // table class
  tableClass(this: any) {
    return {
      [clsName('border-x')]: this.borderX,
      [clsName('border-y')]: this.borderY,
    }
  },

  // table container class
  tableContainerClass(this: any) {
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
  tableBodyClass(this: any): Record<string, boolean> {
    const { rowStyleOption } = this

    let hoverHighlight = true
    let clickHighlight = true
    let stripe = false

    if (rowStyleOption) {
      hoverHighlight = rowStyleOption.hoverHighlight ?? true
      clickHighlight = rowStyleOption.clickHighlight ?? true
      stripe = rowStyleOption.stripe ?? false
    }

    return {
      [clsName('stripe')]: stripe === true, // 默认不开启
      [clsName('row-hover')]: hoverHighlight !== false, // 默认开启
      [clsName('row-highlight')]: clickHighlight !== false, // 默认开启
    }
  },

  // is virtual scroll
  isVirtualScroll(this: any) {
    const { virtualScrollOption } = this
    return virtualScrollOption && virtualScrollOption.enable
  },

  // has fixed column
  hasFixedColumn(this: any) {
    return this.colgroups.some(
      (x: any) =>
        x.fixed === COLUMN_FIXED_TYPE.LEFT
        || x.fixed === COLUMN_FIXED_TYPE.RIGHT,
    )
  },

  // has left fixed column
  hasLeftFixedColumn(this: any) {
    return this.colgroups.some(
      (x: any) => x.fixed === COLUMN_FIXED_TYPE.LEFT,
    )
  },

  // has right fixed column
  hasRightFixedColumn(this: any) {
    return this.colgroups.some(
      (x: any) => x.fixed === COLUMN_FIXED_TYPE.RIGHT,
    )
  },

  // is editing cell
  isCellEditing(this: any) {
    const { editingCell } = this

    return (
      !isEmptyValue(editingCell.rowKey)
      && !isEmptyValue(editingCell.colKey)
    )
  },

  // has edit column
  hasEditColumn(this: any) {
    return this.colgroups.some((x: any) => x.edit)
  },

  // enable header contextmenu
  enableHeaderContextmenu(this: any) {
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
  enableBodyContextmenu(this: any) {
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
  contextMenuType(this: any) {
    if (this.headerIndicatorColKeys.startColKeyIndex > -1)
      return CONTEXTMENU_TYPES.HEADER_CONTEXTMENU

    else
      return CONTEXTMENU_TYPES.BODY_CONTEXTMENU
  },

  /*
    enable cell selection
    单元格编辑、剪贴板都依赖单元格选择
    */
  enableCellSelection(this: any) {
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
  enableClipboard(this: any) {
    return this.rowKeyFieldName
  },

  // enable width resize
  enableColumnResize(this: any) {
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
  rowInsertIndicatorProps(this: any) {
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
      [getEmitEventName(EMIT_EVENTS.ROW_INSERT)]: (params: { insertRowIndex: number }) => {
        this.handleRowInsert(params)
      },
    }
  },

  // header total height
  headerTotalHeight(this: any) {
    let result = 0
    if (this.showHeader) {
      result = this.headerRows.reduce((total: number, currentVal: any) => {
        return currentVal.rowHeight + total
      }, 0)
    }
    return result
  },

  // footer total height
  footerTotalHeight(this: any) {
    return this.footerRows.reduce((total: number, currentVal: any) => {
      return currentVal.rowHeight + total
    }, 0)
  },
}
