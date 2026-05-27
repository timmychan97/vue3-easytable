/**
 * Render function extracted from ve-table.
 * Used as: render: renderVeTable
 */
import type { VNode } from 'vue'
import type { CellSelectionRangeData, DomResizePayload } from './ve-table-types'
import VueDomResizeObserver from '@vue3-easytable/common/comps/resize-observer'
import VeContextmenu from '@vue3-easytable/ve-contextmenu'
import Body from './body'
import Colgroup from './colgroup'
import ColumnResizer from './column-resizer'
import EditInput from './editor'
import Footer from './footer'
import Header from './header'
import RowInsertIndicator from './row-insert-indicator'
import Selection from './selection'
import {
  EMIT_EVENTS,
  HOOKS_NAME,
  INSTANCE_METHODS,
} from './util/constant.js'
import {
  clsName,
  getDomResizeObserverCompKey,
  getEmitEventName,
} from './util/index.js'

export function renderVeTable(this: any): VNode {
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
    onMouseleave: (event: MouseEvent) => {
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
    onOnDomResizeChange: ({ height }: DomResizePayload) => {
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
    onMousemove: (_event: MouseEvent) => {
      // todo
    },
  }

  // table wrapper props
  const tableWrapperProps = {
    ref: this.tableContentWrapperRef,
    class: [clsName('content-wrapper')],
    tagName: 'div',
    onOnDomResizeChange: ({ height }: DomResizePayload) => {
      this.tableHeight = height
    },
  }

  // table props
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
    [getEmitEventName(EMIT_EVENTS.CELL_SELECTION_RANGE_DATA_CHANGE)]: (newData: Partial<CellSelectionRangeData>) => {
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
    [getEmitEventName(EMIT_EVENTS.EDIT_INPUT_VALUE_CHANGE)]: (value: string | number) => {
      this.updateEditingCellValue(value)
    },
    // copy
    [getEmitEventName(EMIT_EVENTS.EDIT_INPUT_COPY)]: (e: ClipboardEvent) => {
      this.editorCopy(e)
    },
    // paste
    [getEmitEventName(EMIT_EVENTS.EDIT_INPUT_PASTE)]: (e: ClipboardEvent) => {
      this.editorPaste(e)
    },
    // cut
    [getEmitEventName(EMIT_EVENTS.EDIT_INPUT_CUT)]: (e: ClipboardEvent) => {
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
                  {colgroups.map((column: any) => {
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
}
