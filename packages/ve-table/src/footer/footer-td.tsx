import type { ColgroupData } from '../ve-table-types'
import { getValByUnit } from '@vue3-easytable/common/utils/index.js'
import { h } from 'vue'
import { bindCustomEvents, getCustomEvents } from '../features/custom-events/bindCustomEvents'
import { injectFixedColumns } from '../features/fixed-columns/useFixedColumns'
import { clsName } from '../util'

import { COMPS_NAME } from '../util/constant'
import { safeCall } from '../util/safe-call'

export default defineComponent({
  name: COMPS_NAME.VE_TABLE_BODY_TD,
  props: {
    rowData: {
      type: Object,
      required: true,
    },
    column: {
      type: Object,
      required: true,
    },
    rowIndex: {
      type: Number,
      required: true,
    },
    colgroups: {
      type: Array as PropType<ColgroupData[]>,
      required: true,
    },
    rowKeyFieldName: {
      type: String,
      default: null,
    },
    // cell span option
    cellSpanOption: {
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
    // event custom option
    eventCustomOption: {
      type: Object,
      default() {
        return null
      },
    },
    // cell selection key data
    cellSelectionData: {
      type: Object,
      default() {
        return null
      },
    },
    // footer rows
    footerRows: {
      type: Array,
      default() {
        return []
      },
    },
    // fixed footer
    fixedFooter: {
      type: Boolean,
      default: true,
    },
  },
  setup() {
    return {
      fixedColumns: injectFixedColumns(),
    }
  },
  computed: {
    // 固定列的样式与 class（MOD-06，表格级计算一次）
    fixedInfo() {
      return this.fixedColumns.getColumnFixedInfo(this.column.key)
    },
  },
  methods: {
    /*
         * @getBodyTdClass
         * @desc  get body td class
         * @param {string} fixed - 固定方式
         */
    getBodyTdClass({ fixed }) {
      const result = {
        [clsName('footer-td')]: true,
      }

      const {
        cellStyleOption,
        rowData,
        column,
        rowIndex,
        cellSelectionData,
        rowKeyFieldName,
      } = this

      // column fixed：fixed-left、fixed-right、last-left-fixed-column、first-right-fixed-column（MOD-06）
      if (fixed)
        Object.assign(result, this.fixedInfo.class)

      // cell style option
      // INFRA-13：渲染时调用，抛出异常时只记录，不中断渲染
      const { value: customClass } = safeCall(
        'cellStyleOption.footerCellClass',
        cellStyleOption?.footerCellClass,
        {
          row: rowData,
          column,
          rowIndex,
        },
      )
      if (customClass)
        result[customClass as string] = true
      // cell selection option
      if (cellSelectionData) {
        const { rowKey, colKey } = cellSelectionData.currentCell
        if (
          rowData[rowKeyFieldName] === rowKey
          && column.key === colKey
        ) {
          result[clsName('cell-selection')] = true
        }
      }

      return result
    },

    /*
         * @getBodyTdStyle
         * @desc  get body td style
         * @param {string} align - 居中方式
         */
    getBodyTdStyle({ align }) {
      const { rowIndex, footerRows } = this

      const result: Record<string, any> = {
        // text align
        'text-align': align || 'center',
        // fixed left total width or right total width（MOD-06）
        ...this.fixedInfo.style,
      }

      // footer rows th fixed bottom
      if (this.fixedFooter) {
        let rowHeight = 0
        if (rowIndex !== footerRows.length - 1) {
          rowHeight = footerRows.reduce(
            (total, currentVal, index) => {
              return index > rowIndex
                ? currentVal.rowHeight + total
                : total
            },
            0,
          )
        }
        rowHeight = getValByUnit(rowHeight)

        result.bottom = rowHeight
      }

      return result
    },

    // get render content
    getRenderContent() {
      let content = null

      const { column, rowData, rowIndex } = this

      // has render function
      // RENDER-01：第二个参数传入真正的 h
      if (typeof column.renderFooterCell === 'function') {
        const renderResult = column.renderFooterCell(
          {
            row: rowData,
            column,
            rowIndex,
          },
          h,
        )

        content = renderResult
      }
      else {
        content = rowData[column.field]
      }
      return content
    },

    // get cell span
    getCellSpan() {
      const { cellSpanOption, rowData, column, rowIndex } = this
      let rowspan = 1
      let colspan = 1

      if (cellSpanOption) {
        const { footerCellSpan } = cellSpanOption

        if (typeof footerCellSpan === 'function') {
          const result = footerCellSpan({
            row: rowData,
            column,
            rowIndex,
          })

          // RENDER-04：只返回一个维度时，另一个维度默认为 1（之前为 undefined，单元格会消失）；返回 null 时不合并
          if (result && typeof result === 'object') {
            rowspan = result.rowspan ?? 1
            colspan = result.colspan ?? 1
          }
        }
      }

      return { rowspan, colspan }
    },
  },
  render() {
    const { column, rowData, rowIndex, eventCustomOption } = this

    const { rowspan, colspan } = this.getCellSpan()
    if (!rowspan || !colspan)
      return null

    // custom on cell event（MOD-07, INFRA-13）
    const events = bindCustomEvents(
      getCustomEvents(eventCustomOption, 'footerCellEvents', { row: rowData, column, rowIndex }),
      {},
      'eventCustomOption.footerCellEvents',
    )

    // td props
    const tdProps = {
      class: this.getBodyTdClass(column),
      style: this.getBodyTdStyle(column),
      rowspan,
      colspan,
      ...events,
    }

    return (
      <td {...tdProps}>
        {/* other cell content */}
        {this.getRenderContent()}
      </td>
    )
  },
})
