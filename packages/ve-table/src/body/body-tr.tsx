import emitter from '@vue3-easytable/common/mixins/emitter'
import { isEmptyValue } from '@vue3-easytable/common/utils'
import { bindCustomEvents, getCustomEvents } from '../features/custom-events/bindCustomEvents'
import { clsName, getEmitEventName } from '../util'
import { COMPS_CUSTOM_ATTRS, COMPS_NAME, EMIT_EVENTS } from '../util/constant'
import BodyTd from './body-td'

export default defineComponent({
  name: COMPS_NAME.VE_TABLE_BODY_TR,
  mixins: [emitter()],
  props: {
    rowData: {
      type: Object,
      required: true,
    },
    rowIndex: {
      type: Number,
      required: true,
    },
    // 是否开启斑马纹
    stripe: {
      type: Boolean,
      default: false,
    },
    colgroups: {
      type: Array,
      required: true,
    },
    columnCollection: {
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
    // expand row change
    expandRowChange: {
      type: Function,
      default: null,
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
    // is virtual scroll
    isVirtualScroll: {
      type: Boolean,
      default: false,
    },
    // cell style option
    cellStyleOption: {
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
  computed: {
    // current row key
    currentRowKey() {
      const { rowKeyFieldName } = this
      return rowKeyFieldName ? this.rowData[rowKeyFieldName] : null
    },
    // tr class
    trClass() {
      let result = null

      const { highlightRowKey, currentRowKey } = this

      let isHighlight = false

      if (!isEmptyValue(highlightRowKey)) {
        if (highlightRowKey === currentRowKey)
          isHighlight = true
      }

      result = {
        [clsName('body-tr')]: true,
        [clsName('tr-highlight')]: isHighlight,
        // 斑马纹按数据行下标（第 1、3、5… 行），与 DOM 位置、展开行、虚拟滚动的 <tbody> 无关
        [clsName('body-tr-stripe')]: this.stripe && this.rowIndex % 2 === 0,
      }

      return result
    },
  },

  methods: {
    // click：通知 body 处理行高亮和按行展开
    rowClick() {
      const { rowData, rowIndex } = this

      this.dispatch(
        COMPS_NAME.VE_TABLE_BODY,
        EMIT_EVENTS.BODY_ROW_CLICK,
        {
          rowData,
          rowIndex,
        },
      )
    },
  },

  render() {
    const {
      colgroups,
      expandOption,
      expandRowChange,
      isExpandRow,
      expandedRowkeys,
      checkboxOption,
      rowKeyFieldName,
      rowIndex,
      rowData,
      radioOption,
      cellStyleOption,
      eventCustomOption,
    } = this

    // get td content
    const getTdContent = () => {
      return colgroups.map((column: any) => {
        const tdProps = {
          key: column.key,
          rowIndex,
          rowData,
          column,
          columnCollection: this.columnCollection,
          colgroups,
          expandOption,
          expandedRowkeys,
          checkboxOption,
          rowKeyFieldName,
          allRowKeys: this.allRowKeys,
          isExpandRow,
          radioOption,
          cellStyleOption,
          cellSpanOption: this.cellSpanOption,
          eventCustomOption,
          cellSelectionData: this.cellSelectionData,
          cellSelectionRangeData: this.cellSelectionRangeData,
          bodyIndicatorRowKeys: this.bodyIndicatorRowKeys,
          editOption: this.editOption,
          [getEmitEventName(EMIT_EVENTS.EXPAND_ROW_CHANGE)]: () =>
            expandRowChange(rowData, rowIndex),
        }
        return <BodyTd {...tdProps} />
      })
    }

    let result = null

    // custom on row event（MOD-07, INFRA-13）
    const customEvents = getCustomEvents(eventCustomOption, 'bodyRowEvents', { row: rowData, rowIndex })
    const events = bindCustomEvents(
      customEvents,
      { click: this.rowClick },
      'eventCustomOption.bodyRowEvents',
    )

    // Render a plain <tr> in all cases.
    // For virtual scroll, TanStack measures the parent <tbody> wrapper,
    // so VueDomResizeObserver is no longer needed on the row.
    const props = {
      class: this.trClass,
      [COMPS_CUSTOM_ATTRS.BODY_ROW_KEY]: this.currentRowKey,
      ...events,
    }

    result = <tr {...props}>{getTdContent()}</tr>

    return result
  },
})
