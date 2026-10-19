import VueDomResizeObserver from '@vue3-easytable/common/comps/resize-observer'
import emitter from '@vue3-easytable/common/mixins/emitter'
import { bindCustomEvents, getCustomEvents } from '../features/custom-events/bindCustomEvents'
import { clsName, getDomResizeObserverCompKey } from '../util'
import { COMPS_NAME, EMIT_EVENTS } from '../util/constant'
import HeaderTh from './header-th'

export default defineComponent({
  name: COMPS_NAME.VE_TABLE_THADER_TR,
  mixins: [emitter()],
  props: {
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
      type: Array,
      default() {
        return []
      },
    },
    colgroups: {
      type: Array,
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
  methods: {
    // tr height change
    trHeightChange({ height }) {
      this.dispatch(
        COMPS_NAME.VE_TABLE,
        EMIT_EVENTS.HEADER_ROW_HEIGHT_CHANGE,
        {
          rowIndex: this.rowIndex,
          height,
        },
      )
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
      key: getDomResizeObserverCompKey(
        rowIndex,
        this.columnsOptionResetTime,
      ),
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
