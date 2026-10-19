import emitter from '@vue3-easytable/common/mixins/emitter'
import { getTextContentOfVNode, isBoolean, isEmptyValue, isNumber } from '@vue3-easytable/common/utils/index'
import { h } from 'vue'
import { bindCustomEvents, getCustomEvents } from '../features/custom-events/bindCustomEvents'
import { injectFixedColumns } from '../features/fixed-columns/useFixedColumns'
import { clsName, getRowKeysByRangeRowKeys } from '../util'

import {
  COLUMN_TYPES,
  COMPS_CUSTOM_ATTRS,
  COMPS_NAME,
  EMIT_EVENTS,
  EXPAND_TRIGGER_TYPES,
} from '../util/constant'
import { safeCall } from '../util/safe-call'
import BodyCheckboxContent from './body-checkbox-content'
import BodyRadioContent from './body-radio-content'
import ExpandTrIcon from './expand-tr-icon'

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
    allRowKeys: {
      type: Array,
      required: true,
    },
    /*
        expand
        */
    // expand row option
    expandOption: {
      type: Object,
      default() {
        return null
      },
    },
    // is expand row
    isExpandRow: {
      type: Boolean,
      required: true,
    },
    // expanded row keys
    expandedRowkeys: {
      type: Array,
      default() {
        return []
      },
    },

    /*
        checkbox
        */
    // checkbox option
    checkboxOption: {
      type: Object,
      default() {
        return null
      },
    },

    /*
        radio
        */
    radioOption: {
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
    // cell selection data
    cellSelectionData: {
      type: Object,
      default() {
        return null
      },
    },
    // cell selection range data
    cellSelectionRangeData: {
      type: Object,
      default() {
        return null
      },
    },
    bodyIndicatorRowKeys: {
      type: Object,
      default() {
        return null
      },
    },
    // cell span option
    cellSpanOption: {
      type: Object,
      default() {
        return null
      },
    },
    // edit opttion
    editOption: {
      type: Object,
      default() {
        return null
      },
    },
  },
  setup() {
    return {
      fixedColumns: injectFixedColumns(),
    }
  },
  computed: {
    /*
        原始单元格数据
        RENDER-03：只读取本列字段。之前每个单元格都 deep 监听整行 rowData（行数 × 列数次深度遍历），
        且 column.field 变化时不会更新
        */
    rawCellValue() {
      const { rowData, column } = this
      return column ? rowData[column.field] : undefined
    },
    // 固定列的样式与 class（MOD-06，表格级计算一次）
    fixedInfo() {
      return this.fixedColumns.getColumnFixedInfo(this.column.key)
    },

    // current row key
    currentRowKey() {
      const { rowData, rowKeyFieldName } = this
      return rowData[rowKeyFieldName]
    },
  },
  methods: {
    /*
         * @bodyTdStyle
         * @desc body td style
         */
    bodyTdStyle() {
      return {
        'text-align': this.column.align || 'center',
        ...this.fixedInfo.style,
      }
    },

    /*
         * @bodyTdClass
         * @desc body td class
         */
    bodyTdClass() {
      const { fixedInfo } = this

      const { fixed, operationColumn } = this.column

      const result = {
        [clsName('body-td')]: true,
      }

      const {
        cellStyleOption,
        rowData,
        column,
        rowIndex,
        allRowKeys,
        cellSelectionData,
        cellSelectionRangeData,
        bodyIndicatorRowKeys,
        currentRowKey,
      } = this

      // column fixed
      if (fixed) {
        result[clsName('fixed-left')] = fixedInfo.class[clsName('fixed-left')]
        result[clsName('fixed-right')] = fixedInfo.class[clsName('fixed-right')]
      }

      // operation column
      if (operationColumn)
        result[clsName('operation-col')] = true

      // cell style option
      // INFRA-13：渲染时调用，抛出异常时只记录，不中断整个表格的渲染
      const { value: customClass } = safeCall(
        'cellStyleOption.bodyCellClass',
        cellStyleOption?.bodyCellClass,
        {
          row: rowData,
          column,
          rowIndex,
        },
      )
      if (customClass)
        result[customClass] = true

      if (cellSelectionData) {
        const { rowKey, colKey } = cellSelectionData.currentCell

        if (!isEmptyValue(rowKey) && !isEmptyValue(colKey)) {
          if (currentRowKey === rowKey) {
            // cell selection
            if (column.key === colKey)
              result[clsName('cell-selection')] = true
          }

          if (operationColumn) {
            const { topRowKey, bottomRowKey }
                            = cellSelectionRangeData
            const isIndicatorActive = !isEmptyValue(bodyIndicatorRowKeys.startRowKey)

            let indicatorRowKeys = []
            if (topRowKey === bottomRowKey) {
              indicatorRowKeys = [topRowKey]
            }
            else {
              indicatorRowKeys = getRowKeysByRangeRowKeys({
                topRowKey,
                bottomRowKey,
                allRowKeys,
              })
            }

            //  cell indicator (operation column)
            if (indicatorRowKeys.includes(currentRowKey)) {
              if (isIndicatorActive)
                result[clsName('cell-indicator-active')] = true

              else
                result[clsName('cell-indicator')] = true
            }
          }
        }
      }

      // last-left-fixed-column / first-right-fixed-column 放在最后（与之前 columnCollection 的顺序一致）
      return Object.assign(result, fixedInfo.class)
    },

    // get ellipsis content style
    getEllipsisContentStyle() {
      const result = {}

      const { ellipsis } = this.column

      if (ellipsis) {
        const { lineClamp } = ellipsis

        const _lineClamp = isNumber(lineClamp) ? lineClamp : 1
        result['-webkit-line-clamp'] = _lineClamp
      }

      return result
    },

    // get render content
    getRenderContent() {
      let content = null

      const { column, rowData, rowIndex, rawCellValue } = this

      // has render function
      // RENDER-01：第二个参数传入真正的 h（Vue 3 的 render 第一个参数是组件代理，不是 h）
      if (typeof column.renderBodyCell === 'function') {
        const renderResult = column.renderBodyCell(
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
        content = rawCellValue
      }

      // ellipisis
      if (column.ellipsis) {
        const { showTitle } = column.ellipsis

        // default true
        const isShowTitle = isBoolean(showTitle) ? showTitle : true

        content = (
          <span
            title={isShowTitle ? getTextContentOfVNode(content) : ''}
            style={this.getEllipsisContentStyle()}
            class={clsName('body-td-span-ellipsis')}
          >
            {content}
          </span>
        )
      }

      return content
    },

    // get chcekbox content
    getCheckboxContent() {
      if (this.column.type === COLUMN_TYPES.CHECKBOX) {
        // checkbox content props
        // RENDER-07：不再传 column（组件未声明该 prop，会作为 column="[object Object]" 透传到 DOM 上）
        const checkboxProps = {
          rowKey: this.rowData[this.rowKeyFieldName],
        }

        return <BodyCheckboxContent {...checkboxProps} />
      }
      return null
    },

    // get radio content
    getRadioContent() {
      if (this.column.type === COLUMN_TYPES.RADIO) {
        // radio props
        // RENDER-07：同上，不传未声明的 column
        const radioProps = {
          rowKey: this.rowData[this.rowKeyFieldName],
        }

        return <BodyRadioContent {...radioProps} />
      }
      return null
    },

    // get cell span
    getCellSpan() {
      const { cellSpanOption, rowData, column, rowIndex } = this
      let rowspan = 1
      let colspan = 1

      if (cellSpanOption) {
        const { bodyCellSpan } = cellSpanOption

        if (typeof bodyCellSpan === 'function') {
          const result = bodyCellSpan({
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
    // 通知 ve-table 单元格事件（选区、右键菜单等）
    dispatchCellEvent(eventName, event) {
      const { column, rowData } = this

      this.dispatch(COMPS_NAME.VE_TABLE, eventName, {
        event,
        rowData,
        column,
      })
    },
    /*
     * cell click
     * ROW-09：展开图标不再自己处理点击，点击冒泡到这里，因此用户的 bodyCellEvents.click
     * 在 bindCustomEvents 中先被调用；之前图标调用 cellClick 并阻止冒泡，用户的处理函数被跳过
     */
    cellClick(e) {
      const { column, expandOption } = this

      this.dispatchCellEvent(EMIT_EVENTS.BODY_CELL_CLICK, e)

      if (column.type !== COLUMN_TYPES.EXPAND)
        return false

      if (expandOption) {
        const eventTargetName = e.target.nodeName

        const trigger = expandOption.trigger

        // expand row by click icon
        if (!trigger || trigger === EXPAND_TRIGGER_TYPES.ICON) {
          if (eventTargetName !== 'TD') {
            e.stopPropagation()
            this.$emit(EMIT_EVENTS.EXPAND_ROW_CHANGE)
          }
        }
        // expand row by click cell(td)
        else if (trigger === EXPAND_TRIGGER_TYPES.CELL) {
          e.stopPropagation()
          this.$emit(EMIT_EVENTS.EXPAND_ROW_CHANGE)
        }
      }
    },
  },
  render() {
    const {
      column,
      rowData,
      isExpandRow,
      expandOption,
      expandedRowkeys,
      rowKeyFieldName,
      eventCustomOption,
      rowIndex,
    } = this

    // expand icon props
    // ROW-09：图标的点击冒泡到 td，由 cellClick 处理（trigger 为 row 时再冒泡到 tr）
    const expandIconProps = {
      rowData,
      column,
      expandOption,
      expandedRowkeys,
      rowKeyFieldName,
    }

    const { rowspan, colspan } = this.getCellSpan()
    if (!rowspan || !colspan)
      return null

    // custom on cell event（MOD-07, INFRA-13）
    const customEvents = getCustomEvents(eventCustomOption, 'bodyCellEvents', { row: rowData, column, rowIndex })
    const dispatchCellEvent = eventName => e => this.dispatchCellEvent(eventName, e)
    const events = bindCustomEvents(
      customEvents,
      {
        click: this.cellClick,
        dblclick: dispatchCellEvent(EMIT_EVENTS.BODY_CELL_DOUBLE_CLICK),
        contextmenu: dispatchCellEvent(EMIT_EVENTS.BODY_CELL_CONTEXTMENU),
        mousemove: dispatchCellEvent(EMIT_EVENTS.BODY_CELL_MOUSEMOVE),
        mouseover: dispatchCellEvent(EMIT_EVENTS.BODY_CELL_MOUSEOVER),
        mousedown: dispatchCellEvent(EMIT_EVENTS.BODY_CELL_MOUSEDOWN),
        mouseup: dispatchCellEvent(EMIT_EVENTS.BODY_CELL_MOUSEUP),
      },
      'eventCustomOption.bodyCellEvents',
    )

    // td props
    const tdProps = {
      class: this.bodyTdClass(),
      style: this.bodyTdStyle(),
      rowspan,
      colspan,
      [COMPS_CUSTOM_ATTRS.BODY_COLUMN_KEY]: column.key,
      ...events,
    }

    return (
      <td {...tdProps}>
        {/* expadn tr icon */}
        {isExpandRow && <ExpandTrIcon {...expandIconProps} />}
        {/* checkbox content */}
        {this.getCheckboxContent()}
        {/* radio content */}
        {this.getRadioContent()}
        {/* other cell content */}
        {this.getRenderContent()}
      </td>
    )
  },
})
