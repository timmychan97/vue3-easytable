import type { ExtractPropTypes, PropType } from 'vue'
import type { ColumnOption } from './ve-table-types'

/**
 * ve-table 的 props（MOD-02：从组件中拆出，setup() 与各功能的组合式函数共用这里的类型）
 */
export const veTableProps = {
  tableData: {
    required: true,
    type: Array,
  },
  footerData: {
    type: Array,
    default() {
      return []
    },
  },
  showHeader: {
    type: Boolean,
    default: true,
  },
  // INFRA-17：列配置的类型
  columns: {
    type: Array as PropType<ColumnOption[]>,
    required: true,
  },
  // row key field for row expand、row selection
  rowKeyFieldName: {
    type: String,
    default: null,
  },
  // table scroll width
  scrollWidth: {
    type: [Number, String],
    default: null,
  },
  // table max height
  maxHeight: {
    type: [Number, String],
    default: null,
  },
  // fixed header
  fixedHeader: {
    type: Boolean,
    default: true,
  },
  // fixed footer
  fixedFooter: {
    type: Boolean,
    default: true,
  },
  // border around
  borderAround: {
    type: Boolean,
    default: true,
  },
  // border horizontal
  borderX: {
    type: Boolean,
    default: true,
  },
  // border vertical
  borderY: {
    type: Boolean,
    default: false,
  },
  // event custom option
  eventCustomOption: {
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
  // cell span option
  cellSpanOption: {
    type: Object,
    default() {
      return null
    },
  },
  // row style option
  rowStyleOption: {
    type: Object,
    default() {
      return null
    },
  },
  /*
      virual scroll option
      {
          enable:true,
          bufferCount:10, // 缓冲的数据
          minRowHeight:40,
          scrolling:(startRowIndex,visibleStartIndex,visibleEndIndex,visibleAboveCount,visibleBelowCount)=>{}
      }
      */
  virtualScrollOption: {
    type: Object,
    default: null,
  },
  // sort option
  sortOption: {
    type: Object,
    default() {
      return null
    },
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
  // cell selection option
  cellSelectionOption: {
    type: Object,
    default() {
      return null
    },
  },
  // cell autofill option
  cellAutofillOption: {
    type: [Object, Boolean],
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
  // column hidden option
  columnHiddenOption: {
    type: Object,
    default() {
      return null
    },
  },
  // contextmenu header option
  contextmenuHeaderOption: {
    type: Object,
    default() {
      return null
    },
  },
  // contextmenu body option
  contextmenuBodyOption: {
    type: Object,
    default() {
      return null
    },
  },
  // clipboard option
  clipboardOption: {
    type: Object,
    default() {
      return null
    },
  },
  // column width resize option
  columnWidthResizeOption: {
    type: Object,
    default() {
      return null
    },
  },
  // row insert option
  rowInsertOption: {
    type: Object,
    default() {
      return null
    },
  },
}

export type VeTableProps = ExtractPropTypes<typeof veTableProps>
