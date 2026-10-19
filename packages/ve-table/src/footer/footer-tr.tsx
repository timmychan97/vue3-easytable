import VueDomResizeObserver from '@vue3-easytable/common/comps/resize-observer'
import { bindCustomEvents, getCustomEvents } from '../features/custom-events/bindCustomEvents'
import { injectTableContext } from '../features/table-context'
import { clsName } from '../util'
import { COMPS_CUSTOM_ATTRS, COMPS_NAME, EMIT_EVENTS } from '../util/constant'
import FooterTd from './footer-td'

export default defineComponent({
  name: COMPS_NAME.VE_TABLE_BODY_TR,
  props: {
    rowData: {
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
      // 表格上下文（MOD-01）：只发出事件，不注册监听器
      tableContext: injectTableContext(),
    }
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

      result = {
        [clsName('footer-tr')]: true,
      }

      return result
    },
  },

  methods: {
    // tr height change
    trHeightChange({ height }) {
      /*  this.$emit(EMIT_EVENTS.FOOTER_ROW_HEIGHT_CHANGE, {
                rowIndex: this.rowIndex,
                height: height
            }); */

      this.tableContext.emit(EMIT_EVENTS.FOOTER_ROW_HEIGHT_CHANGE, {
        rowIndex: this.rowIndex,
        height,
      })
    },
  },

  render() {
    const {
      colgroups,
      rowKeyFieldName,
      rowIndex,
      rowData,
      cellStyleOption,
      eventCustomOption,
    } = this

    // get td content
    const getTdContent = () => {
      return colgroups.map((column) => {
        const tdProps = {
          key: column.key,
          rowIndex,
          rowData,
          column,
          colgroups,
          rowKeyFieldName,
          cellStyleOption,
          cellSelectionData: this.cellSelectionData,
          footerRows: this.footerRows,
          fixedFooter: this.fixedFooter,
          cellSpanOption: this.cellSpanOption,
          eventCustomOption: this.eventCustomOption,
        }
        return <FooterTd {...tdProps} />
      })
    }

    // custom on row event（MOD-07, INFRA-13）
    const events = bindCustomEvents(
      getCustomEvents(eventCustomOption, 'footerRowEvents', { row: rowData, rowIndex }),
      {},
      'eventCustomOption.footerRowEvents',
    )

    const props = {
      class: this.trClass,
      tagName: 'tr',
      [COMPS_CUSTOM_ATTRS.BODY_ROW_KEY]: this.currentRowKey,
      ...events,
      onOnDomResizeChange: this.trHeightChange,
    }

    return (
      <VueDomResizeObserver {...props}>
        {getTdContent()}
      </VueDomResizeObserver>
    )
  },
})
