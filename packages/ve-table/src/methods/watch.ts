/**
 * Watch handlers extracted from ve-table.
 * Spread into defineComponent({ watch: { ...watchHandlers } })
 */
import { isEmptyArray } from '@vue3-easytable/common/utils'
import { HOOKS_NAME } from '../util/constant.js'

export const watchHandlers = {
  // watch clone table data
  'tableData': {
    handler(this: any, newVal: any, oldVal: any) {
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
    handler(this: any, newVal: any) {
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
    handler(this: any, newVal: any, oldVal: any) {
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
    handler(this: any) {
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
    handler(this: any, val: any) {
      if (!isEmptyArray(val))
        this.initHeaderRows()
    },
    immediate: true,
  },

  // footer data
  'footerData': {
    handler(this: any, val: any) {
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
    handler(this: any, newVal: any) {
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
    handler(this: any, val: any) {
      if (!val) {
        this.setCellSelectionByAutofill()
        this.clearCellSelectionAutofillEndCell()
      }
    },
  },

  // watch current cell
  'cellSelectionData.currentCell': {
    handler(this: any) {
      this.setCurrentCellSelectionType()
    },
    deep: true,
    immediate: true,
  },

  // watch normal end cell
  'cellSelectionData.normalEndCell': {
    handler(this: any) {
      this.setCurrentCellSelectionType()
    },
    deep: true,
    immediate: true,
  },

  // watch header indicator colKeys
  'headerIndicatorColKeys': {
    handler(this: any) {
      this.setRangeCellSelectionByHeaderIndicator()
    },
    deep: true,
  },

  // watch body indicator rowKeys
  'bodyIndicatorRowKeys': {
    handler(this: any) {
      this.setRangeCellSelectionByBodyIndicator()
    },
    deep: true,
  },
}
