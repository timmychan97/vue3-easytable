import type { PropType } from 'vue'
import type { ColumnOption, ContextmenuOption } from './ve-table-types'
import clickoutside from '@vue3-easytable/common/directives/clickoutside'
import emitter from '@vue3-easytable/common/mixins/emitter'
import Hooks from '@vue3-easytable/common/utils/hooks-manager'
import { debounce } from 'lodash'
import { defineComponent } from 'vue'
import { cellSelectionMethods } from './methods/cell-selection'
import { clipboardMethods } from './methods/clipboard'
import { columnMethods } from './methods/columns'
import { computedProperties } from './methods/computed'
import { contextmenuMethods } from './methods/contextmenu'
import { editingMethods } from './methods/editing'
import { eventHandlerMethods } from './methods/event-handlers'
import { instanceApiMethods } from './methods/instance-api'
import { keyboardMethods } from './methods/keyboard'
import { registerMountedListeners } from './methods/lifecycle'
import { scrollingMethods } from './methods/scrolling'
import { watchHandlers } from './methods/watch'
import { renderVeTable } from './render'
import { COMPS_NAME } from './util/constant.js'
import { clsName } from './util/index.js'
import { createVeTableState } from './ve-table-state'

export default defineComponent({
  name: COMPS_NAME.VE_TABLE,
  directives: {
    'click-outside': clickoutside,
  },
  mixins: [emitter('eventBus')],

  props: {
    tableData: { type: Array as PropType<Record<string, any>[]>, required: true as const },
    footerData: { type: Array as PropType<Record<string, any>[]>, default: () => [] },
    showHeader: { type: Boolean, default: true },
    columns: { type: Array as PropType<ColumnOption[]>, required: true as const },
    // row key field for row expand / row selection
    rowKeyFieldName: { type: String, default: null },
    // table scroll width
    scrollWidth: { type: [Number, String] as PropType<number | string>, default: null },
    // table max height
    maxHeight: { type: [Number, String] as PropType<number | string>, default: null },
    // fixed header
    fixedHeader: { type: Boolean, default: true },
    // fixed footer
    fixedFooter: { type: Boolean, default: true },
    // border around
    borderAround: { type: Boolean, default: true },
    // border horizontal
    borderX: { type: Boolean, default: true },
    // border vertical
    borderY: { type: Boolean, default: false },
    // event custom option
    eventCustomOption: { type: Object, default: null },
    // cell style option
    cellStyleOption: { type: Object, default: null },
    // cell span option
    cellSpanOption: { type: Object, default: null },
    // row style option
    rowStyleOption: { type: Object as PropType<{ hoverHighlight?: boolean, clickHighlight?: boolean, stripe?: boolean }>, default: null },
    /*
        virtual scroll option
        {
            enable: true,
            bufferCount: 10,
            minRowHeight: 40,
            scrolling: (startRowIndex, visibleStartIndex, visibleEndIndex, visibleAboveCount, visibleBelowCount) => {}
        }
        */
    virtualScrollOption: { type: Object as PropType<{ enable?: boolean, bufferScale?: number, minRowHeight?: number, scrolling?: (...args: any[]) => void }>, default: null },
    // sort option
    sortOption: { type: Object, default: null },
    // expand row option
    expandOption: { type: Object, default: null },
    // checkbox option
    checkboxOption: { type: Object, default: null },
    // radio option
    radioOption: { type: Object, default: null },
    // cell selection option
    cellSelectionOption: { type: Object as PropType<{ enable?: boolean }>, default: null },
    // cell autofill option
    cellAutofillOption: { type: [Object, Boolean], default: null },
    // edit option
    editOption: { type: Object, default: null },
    // column hidden option
    columnHiddenOption: { type: Object as PropType<{ defaultHiddenColumnKeys?: string[] }>, default: null },
    // contextmenu header option
    contextmenuHeaderOption: { type: Object as PropType<{ contextmenus?: ContextmenuOption[] }>, default: null },
    // contextmenu body option
    contextmenuBodyOption: { type: Object as PropType<{ contextmenus?: ContextmenuOption[] }>, default: null },
    // clipboard option
    clipboardOption: { type: Object, default: null },
    // column width resize option
    columnWidthResizeOption: { type: Object as PropType<{ enable?: boolean }>, default: null },
    // row insert option
    rowInsertOption: { type: Object as PropType<{ enable?: boolean }>, default: null },
  },

  data() {
    return createVeTableState()
  },
  computed: {
    ...computedProperties,
  },
  watch: {
    ...watchHandlers,
  },
  created() {
    // bug fixed #467
    this.debouncedBodyCellWidthChange = debounce(
      this.bodyCellWidthChange,
      0,
    )
    // Debounced handler for the column-width measurement table
    this.measureColsWidths = new Map()
    this.debouncedMeasureCellWidthChange = debounce(
      this.measureCellWidthChange,
      0,
    )
    // TanStack virtual scroll instance (non-reactive, managed manually)
    this._vs = null
  },
  mounted() {
    this.parentRendered = true

    // set contextmenu event target
    this.contextmenuEventTarget = this.$el.querySelector(
      `.${clsName('content')}`,
    )

    // create hook instance
    this.hooks = new Hooks()

    // register all mounted event listeners
    registerMountedListeners(this)

    // add key down event listener
    document.addEventListener('keydown', this.dealKeydownEvent)

    // init scrolling
    this.initScrolling()

    // Initialize TanStack virtual scroll if enabled
    if (this.isVirtualScroll) {
      this.$nextTick(() => this.initTanStackVirtualScroll())
    }
  },
  unmounted() {
    // remove key down event listener
    document.removeEventListener('keydown', this.dealKeydownEvent)
    // Clean up TanStack virtual scroll instance
    this.destroyTanStackVirtualScroll()
  },
  methods: {
    ...columnMethods,
    ...eventHandlerMethods,
    ...instanceApiMethods,
    ...cellSelectionMethods,
    ...clipboardMethods,
    ...contextmenuMethods,
    ...editingMethods,
    ...keyboardMethods,
    ...scrollingMethods,
  },
  render: renderVeTable,
})
