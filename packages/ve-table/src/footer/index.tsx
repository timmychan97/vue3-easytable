import type { RowKey } from '../util/core'
import type { ColgroupData, RowHeight } from '../ve-table-types'
import { clsName } from '../util'
import { COMPS_NAME } from '../util/constant'
import FooterTr from './footer-tr'

// RENDER-10：用 defineComponent 包裹，this 与 JSX 用法才有类型
export default defineComponent({
  name: COMPS_NAME.VE_TABLE_FOOTER,
  props: {
    colgroups: {
      type: Array as PropType<ColgroupData[]>,
      required: true,
    },
    footerData: {
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
    // event custom option
    eventCustomOption: {
      type: Object,
      default() {
        return null
      },
    },
    // footer rows
    footerRows: {
      type: Array as PropType<RowHeight[]>,
      default() {
        return []
      },
    },
    // fixed footer
    fixedFooter: {
      type: Boolean,
      default: true,
    },
    // cell span option
    cellSpanOption: {
      type: Object,
      default() {
        return null
      },
    },
  },
  computed: {
    // footer class
    footerClass() {
      return {
        [clsName('fixed-footer')]: this.fixedFooter,
      }
    },
  },
  methods: {
    // get tr key
    getTrKey({ rowData, rowIndex }: { rowData: Record<string, any>, rowIndex: number }) {
      let result = rowIndex

      const { rowKeyFieldName } = this
      if (rowKeyFieldName)
        result = rowData[rowKeyFieldName]

      return result
    },
  },
  render() {
    const { colgroups, rowKeyFieldName, cellStyleOption } = this

    return (
      <tfoot class={this.footerClass}>
        {(this.footerData as Record<string, any>[]).map((rowData, rowIndex) => {
          const trProps = {
            key: this.getTrKey({ rowData, rowIndex }),
            rowIndex,
            rowData,
            colgroups,
            rowKeyFieldName,
            cellStyleOption,
            footerRows: this.footerRows,
            fixedFooter: this.fixedFooter,
            cellSpanOption: this.cellSpanOption,
            eventCustomOption: this.eventCustomOption,
          }

          return <FooterTr {...trProps} />
        })}
      </tfoot>
    )
  },
})
