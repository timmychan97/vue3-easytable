/**
 * Shared TypeScript interfaces for ve-table and its extracted method modules.
 */

// ── Column / Colgroup ──

export interface ColumnOption {
  key: string
  field?: string
  title?: string
  width?: number | string
  fixed?: 'left' | 'right'
  align?: 'left' | 'center' | 'right'
  edit?: boolean
  sortBy?: string
  renderBodyCell?: (data: any, h: any) => any
  renderHeaderCell?: (data: any, h: any) => any
  children?: ColumnOption[]
  [key: string]: any
}

export interface ColgroupData extends ColumnOption {
  _realTimeWidth?: number
  _columnResizeWidth?: number
  _keys?: string
}

// ── Row height tracking ──

export interface RowHeight {
  rowHeight: number
}

// ── Cell identification ──

export interface CellKey {
  rowKey: string | number
  colKey: string | number
}

export interface CellPosition extends CellKey {
  rowIndex: number
}

// ── Cell selection ──

export interface CellSelectionData {
  currentCell: CellPosition
  normalEndCell: CellPosition
  autoFillEndCell: CellKey
}

export interface CellSelectionRangeData {
  leftColKey: string | number
  rightColKey: string | number
  topRowKey: string | number
  bottomRowKey: string | number
}

// 只保存 key，下标按需计算（SEL-09）
export interface HeaderIndicatorColKeys {
  startColKey: string | number
  endColKey: string | number
}

export interface BodyIndicatorRowKeys {
  startRowKey: string | number
  endRowKey: string | number
}

// ── Editing ──

export interface EditingCell {
  rowKey: string | number
  colKey: string | number
  row: any | null
  column: ColgroupData | null
}

// ── Virtual scroll visible indexes (used by selection / row-insert) ──

export interface VirtualScrollVisibleIndexes {
  start: number
  end: number
}

// ── Context menu option types ──

export interface ContextmenuOption {
  type?: string
  label?: string
  icon?: string
  children?: ContextmenuOption[]
  [key: string]: any
}
