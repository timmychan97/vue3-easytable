import emitter from '@vue3-easytable/common/mixins/emitter'
import { getValByUnit } from '@vue3-easytable/common/utils/index.js'
import { h } from 'vue'
import { bindCustomEvents, getCustomEvents } from '../features/custom-events/bindCustomEvents'
import { clsName, getFixedTotalWidthByColumnKey } from '../util'

import { COMPS_NAME } from '../util/constant'
import { safeCall } from '../util/safe-call'

export default defineComponent({
  name: COMPS_NAME.VE_TABLE_BODY_TD,
  mixins: [emitter()],
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
      type: Array,
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
  computed: {
    // is last left fixed column
    isLastLeftFixedColumn() {
      let result = false

      const { colgroups, column } = this

      const { fixed } = column

      if (fixed === 'left') {
        // 按 key 比较：没有 field 的列（如复选框列、序号列）field 都是 undefined（COL-06）
        const { key } = column
        const leftFixedColumns = colgroups.filter(
          x => x.fixed === 'left',
        )
        const index = leftFixedColumns.findIndex(
          x => x.key === key,
        )

        if (index === leftFixedColumns.length - 1)
          result = true
      }
      return result
    },
    // is first right fixed column
    isfirstRightFixedColumn() {
      let result = false

      const { colgroups, column } = this

      const { fixed } = column

      if (fixed === 'right') {
        // 按 key 比较（COL-06）
        const { key } = column
        const rightFixedColumns = colgroups.filter(
          x => x.fixed === 'right',
        )

        if (rightFixedColumns[0].key === key)
          result = true
      }
      return result
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

      // column fixed
      if (fixed) {
        result[clsName('fixed-left')] = fixed === 'left'
        result[clsName('fixed-right')] = fixed === 'right'
        result[clsName('last-left-fixed-column')]
                    = this.isLastLeftFixedColumn
        result[clsName('first-right-fixed-column')]
                    = this.isfirstRightFixedColumn
      }

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
        result[customClass] = true
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
         * @param {any} key - column key
         * @param {string} align - 居中方式
         * @param {bool} fixed - 固定方式
         */
    getBodyTdStyle({ key, align, fixed }) {
      const result = {}

      const { colgroups, rowIndex, footerRows } = this

      // text align
      result['text-align'] = align || 'center'

      // fixed left total width or right total width
      if (fixed) {
        let totalWidth = 0
        // column index
        const columnIndex = colgroups.findIndex(x => x.key === key)
        if (
          (fixed === 'left' && columnIndex > 0)
          || (fixed === 'right' && columnIndex < colgroups.length - 1)
        ) {
          totalWidth = getFixedTotalWidthByColumnKey({
            colgroups,
            colKey: key,
            fixed,
          })

          totalWidth = getValByUnit(totalWidth)
        }

        result.left = fixed === 'left' ? totalWidth : ''
        result.right = fixed === 'right' ? totalWidth : ''
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
