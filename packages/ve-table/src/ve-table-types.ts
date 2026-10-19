/**
 * Shared TypeScript interfaces for ve-table and its extracted method modules.
 */

import type { h, VNodeChild } from 'vue'

// ── Render callbacks ──

/*
 * RENDER-08：渲染回调的第二个参数是 Vue 的 h（RENDER-01 之后传入的是真正的 h）
 */
export type RenderH = typeof h

// renderBodyCell 的参数
export interface RenderBodyCellParams {
  row: any
  column: ColumnOption
  rowIndex: number
}

// renderHeaderCell 的参数（column 是表头单元格对应列的浅拷贝，分组表头时可能是分组列）
export interface RenderHeaderCellParams {
  column: ColumnOption
}

// renderFooterCell 的参数（row 为 footerData 中的一行）
export interface RenderFooterCellParams {
  row: any
  column: ColumnOption
  rowIndex: number
}

// ── Header filter ──

export interface ColumnFilterItem {
  value: any
  label: string
  selected: boolean
  [key: string]: any
}

export interface ColumnFilterOption {
  filterList: ColumnFilterItem[]
  // 是否多选
  isMultiple?: boolean
  // 下拉框最大高度
  maxHeight?: number
  // 下拉框显示 / 隐藏前的回调，返回 false 阻止
  beforeVisibleChange?: (params: { nextVisible: boolean }) => boolean | void
  // 确认筛选（参数为当前的 filterList）
  filterConfirm?: (filterList: ColumnFilterItem[]) => void
  // 重置筛选（参数为当前的 filterList）
  filterReset?: (filterList: ColumnFilterItem[]) => void
  // 自定义筛选图标
  filterIcon?: (h: RenderH) => VNodeChild
  [key: string]: any
}

// ── Column / Colgroup ──

// 固定列方向；'' 表示不固定（右键菜单取消固定列、隐藏 / 显示列恢复列状态时写入）（COL-11）
export type ColumnFixedType = 'left' | 'right' | ''

export interface ColumnOption {
  // 叶子列必须有 key（数字列 key，包括 0，也是有效的列 key，SEL-14）；分组表头列可以没有 key
  key?: string | number
  field?: string
  title?: string
  width?: number | string
  fixed?: ColumnFixedType
  align?: 'left' | 'center' | 'right'
  edit?: boolean
  sortBy?: string
  renderBodyCell?: (params: RenderBodyCellParams, h: RenderH) => VNodeChild
  renderHeaderCell?: (params: RenderHeaderCellParams, h: RenderH) => VNodeChild
  renderFooterCell?: (params: RenderFooterCellParams, h: RenderH) => VNodeChild
  filter?: ColumnFilterOption
  children?: ColumnOption[]
  [key: string]: any
}

// colgroups 里只有叶子列，叶子列一定有 key
export interface ColgroupData extends ColumnOption {
  key: string | number
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

// ── Child component instances reached through template refs (MOD-02) ──

// 编辑框（editor/index.tsx）
export interface EditorInstance {
  textareaSelect: () => void
  textareaAddNewLine: () => void
  $refs: { textareaInputRef?: HTMLTextAreaElement | null }
}

// 选区层（selection/index.tsx）
export interface SelectionInstance {
  clearCurrentCellRect: () => void
  clearNormalEndCellRect: () => void
}
