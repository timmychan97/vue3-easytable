/**
 * Column-related methods extracted from ve-table.
 * Spread into defineComponent({ methods: { ...columnMethods } })
 */
import type { VNode } from 'vue'
import type { DomResizePayload } from '../ve-table-types'
import type { VirtualScrollInstance } from '../virtual-scroll'
import VueDomResizeObserver from '@vue3-easytable/common/comps/resize-observer'
import {
  isEmptyArray,
  isFunction,
  isNumber,
} from '@vue3-easytable/common/utils'
import { getScrollbarWidth } from '@vue3-easytable/common/utils/scroll-bar'
import { cloneDeep } from 'lodash'
import {
  COLUMN_FIXED_TYPE,
  COMPS_NAME,
  EMIT_EVENTS,
  INSTANCE_METHODS,
} from '../util/constant.js'
import {
  clsName,
  initGroupColumns,
  isContextmenuPanelClicked,
  recursiveRemoveColumnByKey,
} from '../util/index.js'
import { createVirtualScroll } from '../virtual-scroll'

export const columnMethods = {
  // init header rows
  initHeaderRows(this: any) {
    const { groupColumns } = this

    if (Array.isArray(groupColumns)) {
      this.headerRows = groupColumns.map(() => {
        return { rowHeight: 0 }
      })
    }
  },

  // init footer rows
  initFooterRows(this: any) {
    const { footerData } = this

    if (Array.isArray(footerData)) {
      this.footerRows = footerData.map(() => {
        return { rowHeight: 0 }
      })
    }
  },

  // header tr height resize
  headerRowHeightChange(this: any, { rowIndex, height }: { rowIndex: number, height: number }) {
    this.headerRows.splice(rowIndex, 1, { rowHeight: height })
  },

  // footer row height resize
  footRowHeightChange(this: any, { rowIndex, height }: { rowIndex: number, height: number }) {
    this.footerRows.splice(rowIndex, 1, { rowHeight: height })
  },

  // Called by the hidden measurement table's ResizeObserver cells
  measureCellSizeChange(this: any, { key, width }: { key: string, width: number }) {
    this.measureColsWidths.set(key, width)
    this.debouncedMeasureCellWidthChange?.(this.measureColsWidths)
  },

  // Applies measured column widths (replaces the old body measurement row)
  measureCellWidthChange(this: any, colWidths: Map<string, number>) {
    this.colgroups = this.colgroups.map((item: any) => {
      item._realTimeWidth = colWidths.get(item.key)
      return item
    })

    this.hooks.triggerHook('TABLE_CELL_WIDTH_CHANGE')
  },

  // body cell width change (kept for backwards compatibility)
  bodyCellWidthChange(this: any, colWidths: Map<string, number>) {
    this.colgroups = this.colgroups.map((item: any) => {
      item._realTimeWidth = colWidths.get(item.key)
      return item
    })

    this.hooks.triggerHook('TABLE_CELL_WIDTH_CHANGE')
  },

  // set column width for column resize
  setColumnWidth(this: any, { colKey, width }: { colKey: string, width: number }) {
    this.colgroups = this.colgroups.map((item: any) => {
      if (item.key === colKey)
        item._columnResizeWidth = width

      return item
    })
    this.$nextTick(() => {
      this.setScrollBarStatus()
    })
    this.hooks.triggerHook('TABLE_CELL_WIDTH_CHANGE')
  },

  // update colgroups by sort change
  updateColgroupsBySortChange(this: any, sortColumns: Record<string, string>) {
    // clear cell selection when sorting to avoid stale selection state
    this.clearCellSelectionCurrentCell()
    this.clearCellSelectionNormalEndCell()

    // stop editing cell if active
    this[INSTANCE_METHODS.STOP_EDITING_CELL]()

    this.colgroups = this.colgroups.map((item: any) => {
      // update colgroups by sort columns
      if (item.field && Object.keys(sortColumns).includes(item.field))
        item.sortBy = sortColumns[item.field]

      return item
    })
  },

  // init column width by column resize
  initColumnWidthByColumnResize(this: any) {
    const { enableColumnResize } = this

    const columnDefaultWidth = 50
    if (enableColumnResize) {
      this.colgroups = this.colgroups.map((item: any) => {
        let columnWidth = columnDefaultWidth
        if (isNumber(item.width))
          columnWidth = item.width

        item._columnResizeWidth = columnWidth
        return item
      })
    }
  },

  // init columns
  initColumns(this: any) {
    const { columnHiddenOption } = this
    if (columnHiddenOption) {
      const { defaultHiddenColumnKeys } = columnHiddenOption

      if (!isEmptyArray(defaultHiddenColumnKeys) && defaultHiddenColumnKeys)
        this.hiddenColumns = defaultHiddenColumnKeys
    }

    this.showOrHideColumns()
  },

  // show or hide columns
  showOrHideColumns(this: any) {
    let cloneColumns = cloneDeep(this.columns) as any[]

    cloneColumns = cloneColumns.map((col: any) => {
      // 操作列默认左固定
      if (col.operationColumn)
        col.fixed = COLUMN_FIXED_TYPE.LEFT as 'left'

      return col
    })

    const { hiddenColumns } = this

    if (!isEmptyArray(hiddenColumns)) {
      //  recursive remove column key
      hiddenColumns.forEach((key: string) => {
        cloneColumns = recursiveRemoveColumnByKey(
          cloneColumns,
          key,
        )
      })
    }

    this.cloneColumns = cloneColumns
  },

  // 初始化分组表头
  initGroupColumns(this: any) {
    const result = initGroupColumns(this.cloneColumns)

    // set is group header
    this.isGroupHeader = result.isGroupHeader
    // set colgroups
    this.colgroups = result.colgroups
    // set groupColumns
    this.groupColumns = result.groupColumns
  },

  // scroll bar width
  getScrollBarWidth(this: any): number {
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
  selectedAllChange(this: any, { isSelected }: { isSelected: boolean }) {
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
  setSelectedAllInfo(this: any, { isSelected, isIndeterminate }: { isSelected: boolean, isIndeterminate: boolean }) {
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
  initTanStackVirtualScroll(this: any) {
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
  destroyTanStackVirtualScroll(this: any) {
    if (this._vs) {
      (this._vs as VirtualScrollInstance).destroy()
      this._vs = null
      this._vsVersion++
    }
  },

  // get virtual phantom (kept for expand row + fixed column sticky workaround)
  getVirtualViewPhantom(this: any): VNode | null {
    let content: VNode | null = null

    const { hasLeftFixedColumn, expandOption } = this

    // This phantom is only needed for the non-virtual-scroll sticky expand row fix
    if (!this.isVirtualScroll && hasLeftFixedColumn && expandOption) {
      const props = {
        tagName: 'div',
        style: {
          width: '100%',
        },
        onOnDomResizeChange: ({ width }: DomResizePayload) => {
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

  // table click outside
  tableClickOutside(this: any, e: MouseEvent) {
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

  // table container mouseup
  tableContainerMouseup(this: any) {
    this.isHeaderCellMousedown = false
    this.isBodyCellMousedown = false
    this.isBodyOperationColumnMousedown = false
    this.isAutofillStarting = false
  },

  // set isColumnResizerHover
  setIsColumnResizerHover(this: any, val: boolean) {
    this.isColumnResizerHover = val
  },

  // set isColumnResizing
  setIsColumnResizing(this: any, val: boolean) {
    this.isColumnResizing = val
  },

  // handle row insert
  handleRowInsert(this: any, { insertRowIndex }: { insertRowIndex: number }) {
    const { rowInsertOption } = this

    if (!rowInsertOption?.enable)
      return

    // Emit the row insert event to parent
    this.$emit(EMIT_EVENTS.ROW_INSERT, {
      insertRowIndex,
    })
  },
}
