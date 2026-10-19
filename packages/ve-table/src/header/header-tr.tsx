import type { ColgroupData, RowHeight } from '../ve-table-types'
import VueDomResizeObserver from '@vue3-easytable/common/comps/resize-observer'
import { bindCustomEvents, getCustomEvents } from '../features/custom-events/bindCustomEvents'
import { injectTableContext } from '../features/table-context'
import { clsName } from '../util'
import { COMPS_NAME, EMIT_EVENTS } from '../util/constant'
import HeaderTh from './header-th'

export default defineComponent({
  name: COMPS_NAME.VE_TABLE_THADER_TR,
  props: {
    // 列配置变化（新的 columns、隐藏 / 显示列、右键固定列）时递增，用于重新上报行高（RENDER-12）
    columnsOptionResetTime: {
      type: Number,
      default: 0,
    },
    // group columns item
    groupColumn: {
      type: Array,
      required: true,
    },
    headerRows: {
      type: Array as PropType<RowHeight[]>,
      default() {
        return []
      },
    },
    colgroups: {
      type: Array as PropType<ColgroupData[]>,
      required: true,
    },
    fixedHeader: {
      type: Boolean,
      required: true,
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
      // 表格上下文（MOD-01）：只发出事件，不注册监听器
      tableContext: injectTableContext(),
      // ResizeObserver 最近一次测得的行高，不需要响应式；还没有测量过时为 null
      measuredHeight: null as number | null,
    }
  },
  watch: {
    /*
     * RENDER-12：列配置变化后表格会把 headerRows 重置为 0（groupColumns watcher → initHeaderRows），
     * 但行本身不再重新创建（之前 key 含 columnsOptionResetTime，整个表头随之重新挂载，组件局部状态丢失）。
     * 行高没有变化时 ResizeObserver 不会回调，所以这里重新上报最近测得的高度；
     * 高度确实变化时 ResizeObserver 之后会再上报新值。
     * flush: 'post'：在表格完成本次更新（包括重置 headerRows）之后执行
     */
    columnsOptionResetTime: {
      handler() {
        if (this.measuredHeight !== null)
          this.emitHeight(this.measuredHeight)
      },
      flush: 'post',
    },
  },
  methods: {
    // tr height change
    trHeightChange({ height }) {
      this.measuredHeight = height
      this.emitHeight(height)
    },
    emitHeight(height: number) {
      this.tableContext.emit(EMIT_EVENTS.HEADER_ROW_HEIGHT_CHANGE, {
        rowIndex: this.rowIndex,
        height,
      })
    },
  },
  render() {
    const {
      groupColumn,
      colgroups,
      headerRows,
      fixedHeader,
      rowIndex,
      trHeightChange,
      checkboxOption,
      sortOption,
      sortColumns,
      cellStyleOption,
      eventCustomOption,
      cellSelectionData,
    } = this

    // custom on row event（MOD-07, INFRA-13）
    const events = bindCustomEvents(
      getCustomEvents(eventCustomOption, 'headerRowEvents', { rowIndex }),
      {},
      'eventCustomOption.headerRowEvents',
    )

    const trProps = {
      class: clsName('header-tr'),
      tagName: 'tr',
      onOnDomResizeChange: trHeightChange,
      ...events,
    }

    return (
      <VueDomResizeObserver {...trProps}>
        {groupColumn.map((groupColumnItem: any) => {
          // th props
          const thProps = {
            key: groupColumnItem.key,
            groupColumn,
            groupColumnItem,
            colgroups,
            headerRows,
            fixedHeader,
            isGroupHeader: this.isGroupHeader,
            rowIndex,
            checkboxOption,
            sortOption,
            sortColumns,
            cellStyleOption,
            eventCustomOption: this.eventCustomOption,
            cellSelectionData,
            cellSelectionRangeData: this.cellSelectionRangeData,
            headerIndicatorColKeys: this.headerIndicatorColKeys,
          }

          return <HeaderTh {...thProps} />
        })}
      </VueDomResizeObserver>
    )
  },
})
