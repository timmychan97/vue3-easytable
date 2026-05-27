/**
 * Registers all mounted() event listeners for ve-table.
 * Call as: registerMountedListeners(this) inside mounted()
 */
import { EMIT_EVENTS } from '../util/constant.js'

export function registerMountedListeners(ctx: any): void {
  // receive sort change
  ctx.on(EMIT_EVENTS.SORT_CHANGE, (params: any) => {
    ctx.updateColgroupsBySortChange(params)
  })

  // receive row selected change
  ctx.on(EMIT_EVENTS.CHECKBOX_SELECTED_ALL_CHANGE, (params: any) => {
    ctx.selectedAllChange(params)
  })

  // receive selected all info
  ctx.on(EMIT_EVENTS.CHECKBOX_SELECTED_ALL_INFO, (params: any) => {
    ctx.setSelectedAllInfo(params)
  })

  // receive multiple header row height change
  ctx.on(EMIT_EVENTS.HEADER_ROW_HEIGHT_CHANGE, ({ rowIndex, height }: { rowIndex: number, height: number }) => {
    ctx.headerRowHeightChange({ rowIndex, height })
  })

  // receive footer row height change
  ctx.on(
    EMIT_EVENTS.FOOTER_ROW_HEIGHT_CHANGE,
    ({ rowIndex, height }: { rowIndex: number, height: number }) => {
      ctx.footRowHeightChange({ rowIndex, height })
    },
  )

  // recieve body cell click
  ctx.on(EMIT_EVENTS.BODY_CELL_CLICK, (params: any) => {
    ctx.bodyCellClick(params)
  })

  // recieve body cell mouseover
  ctx.on(EMIT_EVENTS.BODY_CELL_MOUSEOVER, (params: any) => {
    ctx.bodyCellMouseover(params)
  })

  // recieve body cell mousedown
  ctx.on(EMIT_EVENTS.BODY_CELL_MOUSEDOWN, (params: any) => {
    ctx.bodyCellMousedown(params)
  })

  // recieve body cell mousemove
  ctx.on(EMIT_EVENTS.BODY_CELL_MOUSEMOVE, (params: any) => {
    ctx.bodyCellMousemove(params)
  })

  // recieve body cell mouseup
  ctx.on(EMIT_EVENTS.BODY_CELL_MOUSEUP, (params: any) => {
    ctx.bodyCellMouseup(params)
  })

  // recieve selection corner mousedown
  ctx.on(EMIT_EVENTS.SELECTION_CORNER_MOUSEDOWN, (params: any) => {
    ctx.cellSelectionCornerMousedown(params)
  })

  // recieve selection corner mouseup
  ctx.on(EMIT_EVENTS.SELECTION_CORNER_MOUSEUP, (params: any) => {
    ctx.cellSelectionCornerMouseup(params)
  })

  // autofilling direction change
  ctx.on(EMIT_EVENTS.AUTOFILLING_DIRECTION_CHANGE, (params: any) => {
    ctx.autofillingDirectionChange(params)
  })

  // recieve body cell contextmenu(right click)
  ctx.on(EMIT_EVENTS.BODY_CELL_CONTEXTMENU, (params: any) => {
    ctx.bodyCellContextmenu(params)
  })

  // recieve body cell double click
  ctx.on(EMIT_EVENTS.BODY_CELL_DOUBLE_CLICK, (params: any) => {
    ctx.bodyCellDoubleClick(params)
  })

  // recieve header cell click
  ctx.on(EMIT_EVENTS.HEADER_CELL_CLICK, (params: any) => {
    ctx.headerCellClick(params)
  })

  // recieve header cell contextmenu(right click)
  ctx.on(EMIT_EVENTS.HEADER_CELL_CONTEXTMENU, (params: any) => {
    ctx.headerCellContextmenu(params)
  })

  // recieve header cell mousedown
  ctx.on(EMIT_EVENTS.HEADER_CELL_MOUSEDOWN, (params: any) => {
    ctx.headerCellMousedown(params)
  })

  // recieve header cell mouseover
  ctx.on(EMIT_EVENTS.HEADER_CELL_MOUSEOVER, (params: any) => {
    ctx.headerCellMouseover(params)
  })

  // recieve header cell mousemove
  ctx.on(EMIT_EVENTS.HEADER_CELL_MOUSEMOVE, (params: any) => {
    ctx.headerCellMousemove(params)
  })

  // recieve header cell mouseleave
  ctx.on(EMIT_EVENTS.HEADER_CELL_MOUSELEAVE, (params: any) => {
    ctx.headerCellMouseleave(params)
  })
}
