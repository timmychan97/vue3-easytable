import type Hooks from '@vue3-easytable/common/utils/hooks-manager'
/**
 * Factory function that returns the initial reactive state for ve-table.
 * Use as: data() { return createVeTableState() }
 */
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
import type { VirtualScrollInstance } from './virtual-scroll'
import mitt from 'mitt'

export function createVeTableState() {
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
}
