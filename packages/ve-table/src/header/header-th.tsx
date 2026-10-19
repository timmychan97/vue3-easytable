import { getValByUnit, isEmptyValue } from '@vue3-easytable/common/utils'
import { ICON_NAMES } from '@vue3-easytable/common/utils/constant'
import VeIcon from '@vue3-easytable/ve-icon'
import { h } from 'vue'
import { bindCustomEvents, getCustomEvents } from '../features/custom-events/bindCustomEvents'
import { injectFixedColumns } from '../features/fixed-columns/useFixedColumns'
import { injectTableContext } from '../features/table-context'
import {
  clsName,
  getColKeysByHeaderColumn,
  getColKeysByRangeColKeys,
} from '../util'
import { COLUMN_TYPES, COMPS_NAME, EMIT_EVENTS } from '../util/constant'
import { safeCall } from '../util/safe-call'
import HeaderCheckboxContent from './header-checkbox-content'
import HeaderFilterContent from './header-filter-content'
import HeaderFilterCustomContent from './header-filter-custom-content'

export default defineComponent({
  name: COMPS_NAME.VE_TABLE_THADER_Th,
  props: {
    // group columns item
    groupColumn: {
      type: Array,
      required: true,
    },
    // group column item
    groupColumnItem: {
      type: Object,
      required: true,
    },
    colgroups: {
      type: Array,
      required: true,
    },
    headerRows: {
      type: Array,
      default() {
        return []
      },
    },
    fixedHeader: {
      type: Boolean,
    },
    isGroupHeader: {
      type: Boolean,
      required: true,
    },
    rowIndex: {
      type: Number,
      required: true,
    },
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
    headerIndicatorColKeys: {
      type: Object,
      default() {
        return null
      },
    },
    // checkbox option
    checkboxOption: {
      type: Object,
      default() {
        return null
      },
    },
    // sort option
    sortOption: {
      type: Object,
      default() {
        return null
      },
    },
    // sort columns
    sortColumns: {
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
  },
  setup() {
    return {
      fixedColumns: injectFixedColumns(),
      // 表格上下文（MOD-01）：只发出事件，不注册监听器
      tableContext: injectTableContext(),
    }
  },
  computed: {
    // 固定列的样式与 class（MOD-06，表格级计算；分组列由首尾叶子列得出）
    fixedInfo() {
      return this.fixedColumns.getHeaderFixedInfo(this.groupColumnItem)
    },
    // is last column
    isLastCloumn() {
      let result = false

      const { colgroups, groupColumnItem: column } = this

      const lastColumnKey = colgroups[colgroups.length - 1].key

      const keys = column._keys.split('|')

      if (keys.length) {
        if (keys.length === 1) {
          if (keys[0] === lastColumnKey)
            result = true
        }
        else if (keys[keys.length - 2] === lastColumnKey) {
          result = true
        }
      }

      return result
    },
    // is sortable column
    isSortableCloumn() {
      let result = false

      const { sortColumns, groupColumnItem } = this
      const currentField = groupColumnItem.field

      if (Object.keys(sortColumns).includes(currentField))
        result = true

      return result
    },
  },
  methods: {
    /*
         * @getTheadThClass
         * @desc  get thead th class
         * @param {string} fixed - 固定方式
         */
    getTheadThClass() {
      const result = {
        [clsName('header-th')]: true,
        // fixed-left、fixed-right、last-left-fixed-column、first-right-fixed-column
        ...this.fixedInfo.class,
        [clsName('last-column')]: this.isLastCloumn,
        [clsName('sortable-column')]: this.isSortableCloumn,
      }

      const {
        cellStyleOption,
        rowIndex,
        groupColumnItem: column,
        cellSelectionRangeData,
        colgroups,
        isGroupHeader,
        headerIndicatorColKeys,
      } = this

      if (cellSelectionRangeData) {
        const { leftColKey, rightColKey } = cellSelectionRangeData
        const isIndicatorActive = !isEmptyValue(headerIndicatorColKeys.startColKey)

        if (!isEmptyValue(leftColKey)) {
          let indicatorColKeys = []
          if (leftColKey === rightColKey) {
            indicatorColKeys = [leftColKey]
          }
          else {
            indicatorColKeys
                            = getColKeysByRangeColKeys({
                colKey1: leftColKey,
                colKey2: rightColKey,
                colgroups,
              }) ?? []
          }

          let showIndicator = false
          if (!isGroupHeader) {
            if (indicatorColKeys.includes(column.key))
              showIndicator = true
          }
          else {
            const colKeys = getColKeysByHeaderColumn({
              headerColumnItem: column,
            })
            showIndicator = colKeys.every((colKey) => {
              return indicatorColKeys.includes(colKey)
            })
          }
          if (showIndicator) {
            if (isIndicatorActive)
              result[clsName('cell-indicator-active')] = true

            else
              result[clsName('cell-indicator')] = true
          }
        }
      }

      // INFRA-13：渲染时调用，抛出异常时只记录，不中断渲染
      const { value: customClass } = safeCall(
        'cellStyleOption.headerCellClass',
        cellStyleOption?.headerCellClass,
        {
          column,
          rowIndex,
        },
      )
      if (customClass)
        result[customClass as string] = true

      return result
    },
    /*
         * @getTheadThStyle
         * @desc  get thead th style
         * @param {string} align - 居中方式
         * @param {number} rowIndex - 当前行号
         */
    getTheadThStyle({ align }, rowIndex) {
      const headerRows = this.headerRows

      const result: Record<string, any> = {
        // text align
        'text-align': align || 'center',
        // fixed left total width or right total width（MOD-06）
        ...this.fixedInfo.style,
      }

      // header row th fixed top
      if (this.fixedHeader) {
        let rowHeight = 0
        if (rowIndex > 0) {
          rowHeight = headerRows.reduce(
            (total, currentVal, index) => {
              return index < rowIndex
                ? currentVal.rowHeight + total
                : total
            },
            0,
          )
        }
        rowHeight = getValByUnit(rowHeight)

        result.top = rowHeight
      }

      return result
    },

    // get chcekbox content
    getCheckboxContent() {
      let result = null

      const { checkboxOption } = this

      if (this.groupColumnItem.type === COLUMN_TYPES.CHECKBOX) {
        // INFRA-08：没有 checkboxOption 时也渲染全选
        if (!checkboxOption?.hideSelectAll) {
          // RENDER-07：不传 column（组件未声明该 prop，会透传成 column="[object Object]"）
          result = <HeaderCheckboxContent />
        }
      }
      return result
    },
    // sort change
    sortChange() {
      let sortResult = ''
      const { sortColumns, groupColumnItem, sortOption } = this
      // INFRA-08：列设置了 sortBy 但没有 sortOption 时也能排序
      const sortAlways = sortOption?.sortAlways

      const currentField = groupColumnItem.field
      const sortBy = sortColumns[currentField]

      if (sortAlways) {
        sortResult = sortBy === 'asc' ? 'desc' : 'asc'
      }
      else {
        sortResult
                    = sortBy === 'asc' ? 'desc' : sortBy === 'desc' ? '' : 'asc'
      }

      // 通知表头（header/index.tsx）更新排序状态
      this.tableContext.emit(EMIT_EVENTS.COLUMN_SORT_CHANGE, {
        currentField,
        sortResult,
      })
    },

    // get sort content
    getSortContent() {
      let result = null

      const { sortColumns, groupColumnItem } = this
      const currentField = groupColumnItem.field

      if (Object.keys(sortColumns).includes(currentField)) {
        const sortBy = sortColumns[currentField]

        const props = {
          class: clsName('sort'),
          onMousedown: (e: MouseEvent) => {
            // Stop propagation to prevent header cell mousedown from selecting column
            e.stopPropagation()
          },
          onClick: (e: MouseEvent) => {
            // Stop propagation to prevent header cell click from interfering
            e.stopPropagation()
            this.sortChange()
          },
        }

        result = (
          <span {...props}>
            <VeIcon
              class={[
                clsName('sort-icon'),
                clsName('sort-icon-top'),
                sortBy === 'asc' ? 'active' : '',
              ]}
              name={ICON_NAMES.SORT_TOP_ARROW}
            />
            <VeIcon
              class={[
                clsName('sort-icon'),
                clsName('sort-icon-bottom'),
                sortBy === 'desc' ? 'active' : '',
              ]}
              name={ICON_NAMES.SORT_BOTTOM_ARROW}
            />
          </span>
        )
      }

      return result
    },

    // get filter content
    getFilterContent() {
      let result = null

      const { groupColumnItem } = this

      if (groupColumnItem.filter) {
        // filter content props
        const filterProps = {
          column: this.groupColumnItem,
        }
        result = <HeaderFilterContent {...filterProps} />
      }
      return result
    },

    // get filter custom content
    getFilterCustomContent() {
      let result = null

      const { groupColumnItem } = this

      if (groupColumnItem.filterCustom) {
        // filter content props
        const filterProps = {
          column: this.groupColumnItem,
        }
        result = <HeaderFilterCustomContent {...filterProps} />
      }
      return result
    },

    // 通知 ve-table 表头单元格事件（列选择、右键菜单等）
    dispatchCellEvent(eventName, event) {
      this.tableContext.emit(eventName, {
        event,
        column: this.groupColumnItem,
      })
    },
  },
  render() {
    const {
      groupColumnItem,
      getTheadThClass,
      getTheadThStyle,
      rowIndex,
      eventCustomOption,
    } = this

    let content

    // RENDER-01：第二个参数传入真正的 h
    if (typeof groupColumnItem.renderHeaderCell === 'function') {
      const { ...column } = groupColumnItem

      const renderResult = groupColumnItem.renderHeaderCell(
        {
          column,
        },
        h,
      )
      content = renderResult
    }
    else {
      content = groupColumnItem.title
    }

    // custom on cell event（MOD-07, INFRA-13）
    // 排序只由点击排序图标触发，不响应整个表头单元格的点击，避免与列选择冲突
    const customEvents = getCustomEvents(eventCustomOption, 'headerCellEvents', { column: groupColumnItem, rowIndex })
    const dispatchCellEvent = eventName => e => this.dispatchCellEvent(eventName, e)
    const events = bindCustomEvents(
      customEvents,
      {
        click: dispatchCellEvent(EMIT_EVENTS.HEADER_CELL_CLICK),
        contextmenu: dispatchCellEvent(EMIT_EVENTS.HEADER_CELL_CONTEXTMENU),
        mouseleave: dispatchCellEvent(EMIT_EVENTS.HEADER_CELL_MOUSELEAVE),
        mousemove: dispatchCellEvent(EMIT_EVENTS.HEADER_CELL_MOUSEMOVE),
        mouseover: dispatchCellEvent(EMIT_EVENTS.HEADER_CELL_MOUSEOVER),
        mousedown: dispatchCellEvent(EMIT_EVENTS.HEADER_CELL_MOUSEDOWN),
      },
      'eventCustomOption.headerCellEvents',
    )

    const thProps = {
      style: getTheadThStyle(groupColumnItem, rowIndex),
      class: getTheadThClass(),
      rowspan: groupColumnItem._rowspan,
      colspan: groupColumnItem._colspan,
      ...events,
    }

    return (
      <th {...thProps}>
        {/* checkbox content */}
        {this.getCheckboxContent()}
        {content}
        {/* sort content */}
        {this.getSortContent()}
        {/* filter content */}
        {this.getFilterContent()}
        {/* filter custom content */}
        {this.getFilterCustomContent()}
      </th>
    )
  },
})
