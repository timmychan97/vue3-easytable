import type { VNode } from 'vue'
import type { RowKey } from '../util/core'
import type { ColgroupData } from '../ve-table-types'
import { cloneVNode, defineComponent } from 'vue'
import { injectRowState } from '../features/row-state'
import { useTableContext } from '../features/table-context'
import {
  COLUMN_TYPES,
  COMPS_NAME,
  EMIT_EVENTS,
  EXPAND_TRIGGER_TYPES,
} from '../util/constant'
import { safeCall } from '../util/safe-call'

import BodyTr from './body-tr'
import ExpandTr from './expand-tr'

export default defineComponent({
  name: COMPS_NAME.VE_TABLE_BODY,
  // 虚拟滚动时根节点是片段，未声明的监听器无法 fall-through（会告警），因此显式声明
  emits: [EMIT_EVENTS.HIGHLIGHT_ROW_CHANGE],
  props: {
    // body 的 class（ve-table-body、斑马纹、悬浮、高亮）。
    // 普通模式加在唯一的 <tbody> 上，虚拟滚动模式加在每一行的 <tbody> 上
    bodyClass: {
      type: [String, Array, Object],
      default: null,
    },
    // 是否开启斑马纹（按数据行下标给行加 class，而不是依赖 nth-child）
    stripe: {
      type: Boolean,
      default: false,
    },
    tableViewportWidth: {
      type: Number,
      default: 0,
    },
    colgroups: {
      type: Array as PropType<ColgroupData[]>,
      required: true,
    },
    actualRenderTableData: {
      type: Array,
      required: true,
    },
    hasFixedColumn: {
      type: Boolean,
      default: false,
    },
    allRowKeys: {
      type: Array as PropType<RowKey[]>,
      required: true,
    },
    // expand row option
    expandOption: {
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
    // radio option
    radioOption: {
      type: Object,
      default() {
        return null
      },
    },
    // virual scroll
    virtualScrollOption: {
      type: Object,
      default: null,
    },
    // is virtual scroll
    isVirtualScroll: {
      type: Boolean,
      default: false,
    },
    // TanStack virtual items (VirtualItem[])
    virtualItems: {
      type: Array,
      default: () => [],
    },
    // Top spacer height (px) for virtual scroll
    virtualPaddingTop: {
      type: Number,
      default: 0,
    },
    // Bottom spacer height (px) for virtual scroll
    virtualPaddingBottom: {
      type: Number,
      default: 0,
    },
    // TanStack measureElement callback for dynamic row heights
    virtualMeasureElement: {
      type: Function,
      default: null,
    },
    rowKeyFieldName: {
      type: String,
      default: null,
    },
    // cell style option
    cellStyleOption: {
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
    // highlight row key
    highlightRowKey: {
      type: [String, Number],
      default: null,
    },
    // event custom option
    eventCustomOption: {
      type: Object,
      default() {
        return null
      },
    },
    // cell selection option
    cellSelectionOption: {
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
    // edit option
    editOption: {
      type: Object,
      default() {
        return null
      },
    },
  },
  setup() {
    // 行展开状态由 ve-table 提供（MOD-08），这里不再保存副本；
    // 行勾选 / 单选由各自的单元格组件直接读取
    const { expand } = injectRowState()
    return {
      rowExpand: expand,
      // 表格上下文（MOD-01）：接收行点击，卸载时自动注销
      tableEvents: useTableContext(),
    }
  },
  computed: {
    // 固定列的样式与 class 由 ve-table 提供（MOD-06），body-td 直接 inject，这里不再计算 columnCollection
    // expand column
    expandColumn() {
      return this.colgroups.find(x => x.type === COLUMN_TYPES.EXPAND)
    },
    // expanded row keys（受控时为用户的数组，非受控时为内部状态）
    expandedRowkeys() {
      return this.rowExpand.expandedRowKeys.value
    },
  },
  mounted() {
    // recieve tr click
    this.tableEvents.on(EMIT_EVENTS.BODY_ROW_CLICK, (params) => {
      this.rowClick(params)
    })
  },
  methods: {
    /*
         * @expandRowChange
         * @desc  row expand change
         * @param {object} rowData - row data
         * @param {number} rowIndex - row index
         */
    expandRowChange(rowData, rowIndex) {
      return this.rowExpand.toggleRowExpand({
        row: rowData,
        rowKey: rowData[this.rowKeyFieldName],
        rowIndex,
      })
    },

    /*
         * @rowClick
         * @desc  row expand click event
         * @param {object} rowData - row data
         * @param {number} rowIndex - row index
         */
    rowClick({ rowData, rowIndex }) {
      const {
        expandOption,
        isExpandRow,
        expandRowChange,
        rowKeyFieldName,
      } = this

      // 行高亮功能
      if (rowKeyFieldName) {
        const rowKey = rowData[rowKeyFieldName]
        this.$emit(EMIT_EVENTS.HIGHLIGHT_ROW_CHANGE, { rowKey })
      }

      // 行展开功能
      if (!isExpandRow({ rowData, rowIndex }))
        return false

      const trigger = expandOption.trigger

      // expand row by click row
      if (trigger === EXPAND_TRIGGER_TYPES.ROW)
        expandRowChange(rowData, rowIndex)
    },

    /*
         * @isExpandRow
         * @desc  is expand row
         * @param {object} rowData - row data
         * @param {number} rowIndex - row index
         */
    isExpandRow({ rowData, rowIndex }) {
      let result = false

      const { expandColumn, expandOption } = this

      if (expandColumn && expandOption) {
        // 是否允许展开
        let expandable: unknown = true
        if (typeof expandOption.expandable === 'function') {
          // INFRA-16：渲染时调用，抛出异常时只记录，按不可展开处理
          const { value, threw } = safeCall('expandOption.expandable', expandOption.expandable, {
            row: rowData,
            column: expandColumn,
            rowIndex,
          })
          expandable = threw ? false : value
        }

        if (expandable !== false)
          result = true
      }

      return result
    },

    // get expand row
    getExpandRowComp({ rowData, rowIndex }) {
      if (this.isExpandRow({ rowData, rowIndex })) {
        const expandTrProps = {
          tableViewportWidth: this.tableViewportWidth,
          colgroups: this.colgroups,
          expandOption: this.expandOption,
          expandedRowkeys: this.expandedRowkeys,
          expandColumn: this.expandColumn,
          rowKeyFieldName: this.rowKeyFieldName,
          rowData,
          rowIndex,
        }

        return <ExpandTr {...expandTrProps} />
      }

      return null
    },

    // get tr key
    getTrKey({ rowData, rowIndex }) {
      let result = rowIndex

      const { rowKeyFieldName } = this
      if (rowKeyFieldName)
        result = rowData[rowKeyFieldName]

      return result
    },

  },
  render() {
    const {
      colgroups,
      actualRenderTableData,
      expandOption,
      expandRowChange,
      isExpandRow,
      getExpandRowComp,
      expandedRowkeys,
      checkboxOption,
      radioOption,
      rowKeyFieldName,
      isVirtualScroll,
      cellStyleOption,
      virtualItems,
      virtualPaddingTop,
      virtualPaddingBottom,
      virtualMeasureElement,
      bodyClass,
      stripe,
    } = this

    // Build common trProps for a given rowData/rowIndex
    const buildTrProps = (rowData: any, rowIndex: number) => ({
      key: this.getTrKey({ rowData, rowIndex }),
      rowIndex,
      stripe,
      rowData,
      colgroups,
      expandOption,
      expandedRowkeys,
      checkboxOption,
      radioOption,
      rowKeyFieldName,
      allRowKeys: this.allRowKeys,
      expandRowChange,
      isVirtualScroll,
      isExpandRow: isExpandRow({ rowData, rowIndex }),
      cellStyleOption,
      cellSpanOption: this.cellSpanOption,
      highlightRowKey: this.highlightRowKey,
      eventCustomOption: this.eventCustomOption,
      cellSelectionData: this.cellSelectionData,
      editOption: this.editOption,
      cellSelectionRangeData: this.cellSelectionRangeData,
      bodyIndicatorRowKeys: this.bodyIndicatorRowKeys,
    })

    // ── Virtual scroll path: use TanStack padding-spacer approach ──
    if (isVirtualScroll && virtualItems.length > 0) {
      const colCount = colgroups.length
      const spacerCellStyle = { padding: 0, border: 0 }

      return (
        <>
          {/* Top spacer — pushes visible rows to correct scroll position */}
          {virtualPaddingTop > 0 && (
            <tbody aria-hidden="true">
              <tr>
                <td colspan={colCount} style={{ ...spacerCellStyle, height: `${virtualPaddingTop}px` }} />
              </tr>
            </tbody>
          )}

          {/* Virtual items — each wrapped in its own <tbody> for measurement.
              Multiple <tbody> elements in a <table> is valid HTML and lets
              TanStack's measureElement capture the full height of a row +
              its optional expand row together. */}
          {virtualItems.map((vItem: any, i: number) => {
            const rowData = actualRenderTableData[i]
            if (!rowData)
              return null

            const rowIndex = vItem.index
            const trProps = buildTrProps(rowData, rowIndex)

            return (
              <tbody
                key={trProps.key}
                class={bodyClass}
                data-index={vItem.index}
                ref={virtualMeasureElement as any}
              >
                <BodyTr {...trProps} />
                {getExpandRowComp({ rowData, rowIndex })}
              </tbody>
            )
          })}

          {/* Bottom spacer — fills remaining scroll height */}
          {virtualPaddingBottom > 0 && (
            <tbody aria-hidden="true">
              <tr>
                <td colspan={colCount} style={{ ...spacerCellStyle, height: `${virtualPaddingBottom}px` }} />
              </tr>
            </tbody>
          )}
        </>
      )
    }

    // ── Non-virtual path: render all rows in a single <tbody> ──
    // RENDER-02：子节点必须是扁平的带 key 数组。若每行返回 [行, 展开行]，Vue 会把它们包成
    // 无 key 的 Fragment 并按位置匹配，排序或在顶部插入行时所有后移的行都会被重新挂载
    const rows: VNode[] = []
    actualRenderTableData.forEach((rowData, rowIndex) => {
      const trProps = buildTrProps(rowData, rowIndex)
      rows.push(<BodyTr {...trProps} />)

      const expandRow = getExpandRowComp({ rowData, rowIndex })
      if (expandRow)
        rows.push(cloneVNode(expandRow, { key: `${trProps.key}__expand` }))
    })

    return <tbody class={bodyClass}>{rows}</tbody>
  },
})
