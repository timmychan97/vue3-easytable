import type { ColgroupData } from '../ve-table-types'
import { isNumber } from '@vue3-easytable/common/utils'
import { useTableContext } from '../features/table-context'
import { clsName } from '../util'
import { COMPS_NAME, HOOKS_NAME } from '../util/constant'

export default defineComponent({
  name: COMPS_NAME.VE_TABLE_COLUMN_RESISZER,
  props: {
    parentRendered: {
      type: Boolean,
      required: true,
    },
    tableContainerEl: {
      // SSR：不能在模块顶层引用 HTMLDivElement（Node 中不存在）
      type: Object as PropType<HTMLDivElement | null>,
      default: null,
    },
    colgroups: {
      type: Array as PropType<ColgroupData[]>,
      required: true,
    },
    isColumnResizerHover: {
      type: Boolean,
      required: true,
    },
    isColumnResizing: {
      type: Boolean,
      required: true,
    },
    setIsColumnResizerHover: {
      type: Function,
      required: true,
    },
    setIsColumnResizing: {
      type: Function,
      required: true,
    },
    setColumnWidth: {
      type: Function,
      required: true,
    },
    // column width resize option
    columnWidthResizeOption: {
      type: Object,
      default() {
        return null
      },
    },
  },
  setup() {
    return {
      // 表格上下文（MOD-01）：订阅表头 mousemove，卸载时自动注销
      tableEvents: useTableContext(),
    }
  },
  data() {
    return {
      // column resizer start x
      columnResizerStartX: 0,
      // 拖动过程中最后一次（按住鼠标时）的 clientX，鼠标在窗口外松开时按此位置提交
      columnResizerLastX: null as number | null,
      // current resizing column
      currentResizingColumn: null,
      // column resizer handler width
      columnResizerHandlerWidth: 5,
      // column resizer rect
      columnResizerRect: {
        top: 0,
        left: 0,
        height: 0,
      },
      // 表头 mousemove 订阅的注销函数（重新订阅前先注销）
      removeHeaderCellMousemoveHook: null as (() => void) | null,
    }
  },
  computed: {
    // column min width
    columnMinWidth() {
      let result = 30

      const { columnWidthResizeOption } = this

      if (columnWidthResizeOption) {
        const { minWidth } = columnWidthResizeOption
        if (isNumber(minWidth) && minWidth > 0)
          result = minWidth
      }
      return result
    },
  },
  watch: {
    parentRendered: {
      handler(val) {
        if (val) {
          // 先注销旧的订阅，避免重复注册
          if (this.removeHeaderCellMousemoveHook)
            this.removeHeaderCellMousemoveHook()
          // header cell mousemove
          this.removeHeaderCellMousemoveHook = this.tableEvents.on(
            HOOKS_NAME.HEADER_CELL_MOUSEMOVE,
            ({ event, column }) => {
              if (column.disableResizing)
                return
              this.initColumnResizerPosition({ event, column })
            },
          )
        }
      },
      immediate: true,
    },
  },
  methods: {
    // init column resizer position
    initColumnResizerPosition({ event, column }) {
      const { tableContainerEl, isColumnResizing } = this

      if (tableContainerEl && !isColumnResizing) {
        const { left: tableContainerLeft, top: tableContainerTop }
                    = tableContainerEl.getBoundingClientRect()

        const col = this.colgroups.find(x => x.key === column.key)

        // 表头分组，不支持分组表头列宽拖动
        if (!col)
          return false

        if (col._realTimeWidth) {
          const target = event.target
          const cellRect = target.getBoundingClientRect()
          const { height, left, top } = cellRect

          this.columnResizerRect.left
                        = left + col._realTimeWidth - tableContainerLeft
          this.columnResizerRect.top = top - tableContainerTop
          this.columnResizerRect.height = height

          this.currentResizingColumn = col
          this.columnResizerStartX = left + col._realTimeWidth
        }
        else {
          console.warn('Resizer column needs set column width')
        }
      }
    },

    // set column resizer position byu drag
    setColumnResizerPositionByDrag(event) {
      const {
        tableContainerEl,
        isColumnResizing,
        currentResizingColumn,
      } = this

      // 鼠标已在窗口外松开（没有收到 mouseup），回到窗口时按最后一次拖动的位置结束拖动
      if (isColumnResizing && event.buttons === 0) {
        this.columnResizerMouseup({
          clientX: this.columnResizerLastX ?? this.columnResizerStartX,
        })
        return
      }

      if (isColumnResizing)
        this.columnResizerLastX = event.clientX

      if (tableContainerEl && isColumnResizing) {
        const { left: tableContainerLeft }
                    = tableContainerEl.getBoundingClientRect()

        if (isColumnResizing && currentResizingColumn) {
          const { columnResizerStartX, columnMinWidth } = this

          // 不允许拖动小于列最小宽度
          if (
            currentResizingColumn._realTimeWidth
            + (event.clientX - columnResizerStartX)
            > columnMinWidth
          ) {
            this.columnResizerRect.left
                            = event.clientX - tableContainerLeft
          }
        }
      }
    },

    // column resizer handler mousedown
    columnResizerHandlerMousedown({ event: _event }) {
      if (this.isColumnResizerHover) {
        this.setIsColumnResizing(true)

        this.columnResizerLastX = null
        this.addDragListeners()
      }
    },

    // 拖动期间的 document / window 监听
    addDragListeners() {
      document.addEventListener(
        'mousemove',
        this.setColumnResizerPositionByDrag,
      )
      document.addEventListener('mouseup', this.columnResizerMouseup)
      document.addEventListener('keydown', this.columnResizerKeydown)
      window.addEventListener('blur', this.cancelColumnResize)
      // 拖动时禁止选中文本和拖拽。用监听器而不是覆盖 document.onselectstart / ondragstart，
      // 以免清掉应用自己的处理函数（COL-05）
      document.addEventListener('selectstart', this.preventDefault)
      document.addEventListener('dragstart', this.preventDefault)
    },

    removeDragListeners() {
      document.removeEventListener(
        'mousemove',
        this.setColumnResizerPositionByDrag,
      )
      document.removeEventListener('mouseup', this.columnResizerMouseup)
      document.removeEventListener('keydown', this.columnResizerKeydown)
      window.removeEventListener('blur', this.cancelColumnResize)
      document.removeEventListener('selectstart', this.preventDefault)
      document.removeEventListener('dragstart', this.preventDefault)
    },

    preventDefault(event) {
      event.preventDefault()
    },

    // Esc 取消拖动
    columnResizerKeydown(event) {
      if (event.key === 'Escape')
        this.cancelColumnResize()
    },

    // 取消拖动，不改变列宽（Esc、窗口失焦）
    cancelColumnResize() {
      if (this.isColumnResizing)
        this.clearColumnResizerStatus()
      this.removeDragListeners()
    },

    // column resizer mouseup
    columnResizerMouseup(event) {
      const {
        isColumnResizing,
        currentResizingColumn,
        columnResizerStartX,
        setColumnWidth,
        columnWidthResizeOption,
        columnMinWidth,
      } = this

      if (!isColumnResizing || !currentResizingColumn) {
        // 未开始拖动列宽（如没有可拖动的列）也要结束拖动状态并移除监听
        if (isColumnResizing)
          this.clearColumnResizerStatus()
        this.removeDragListeners()
        return false
      }

      let differWidth
      // 拖动小于列最小宽度
      if (
        currentResizingColumn._realTimeWidth + (event.clientX - columnResizerStartX) < columnMinWidth
      ) {
        differWidth
                    = columnMinWidth - currentResizingColumn._realTimeWidth
      }
      else {
        differWidth = event.clientX - columnResizerStartX
      }
      differWidth = Math.floor(differWidth)

      // 偏差阈值，低于则不处理
      if (Math.abs(differWidth) > 1) {
        let nextColumnWidth = currentResizingColumn._realTimeWidth
        nextColumnWidth += differWidth

        // set column width
        setColumnWidth({
          colKey: currentResizingColumn.key,
          width: nextColumnWidth,
        })

        if (columnWidthResizeOption) {
          const { sizeChange } = columnWidthResizeOption
          sizeChange
          && sizeChange({
            column: currentResizingColumn,
            differWidth,
            columnWidth: nextColumnWidth,
          })
        }
      }

      this.clearColumnResizerStatus()
      this.removeDragListeners()
    },

    // clear column resizer status
    clearColumnResizerStatus() {
      this.currentResizingColumn = null
      this.columnResizerStartX = 0
      this.columnResizerLastX = null
      this.setIsColumnResizerHover(false)
      this.setIsColumnResizing(false)
    },
  },

  beforeUnmount() {
    // 表头 mousemove 订阅由表格上下文在组件卸载时自动注销（INFRA-01）
    // 拖动过程中卸载：移除 document / window 上的拖动监听（包括禁止文本选择的监听）
    this.removeDragListeners()
    if (this.isColumnResizing)
      this.clearColumnResizerStatus()
  },

  render() {
    const {
      isColumnResizerHover,
      isColumnResizing,
      columnResizerRect,
      columnResizerHandlerWidth,
    } = this

    const { left, top, height } = columnResizerRect

    const columnResizerHandlerProps = {
      class: {
        [clsName('column-resizer-handler')]: true,
        active: isColumnResizerHover || isColumnResizing,
      },
      style: {
        left: `${left - columnResizerHandlerWidth}px`,
        top: `${top}px`,
        height: `${height}px`,
      },
      onClick: () => {
        //
      },
      onMousedown: (event) => {
        this.columnResizerHandlerMousedown({ event })
      },
      onMouseenter: () => {
        this.setIsColumnResizerHover(true)
      },
      onMouseleave: () => {
        this.setIsColumnResizerHover(false)
      },
      onMouseup: (event) => {
        this.columnResizerMouseup(event)
      },
    }

    const columnResizerLineProps = {
      class: [clsName('column-resizer-line')],
      style: {
        display: isColumnResizing ? 'block' : 'none',
        left: `${left}px`,
      },
    }

    return (
      <div class={clsName('column-resizer')}>
        <div {...columnResizerHandlerProps} />
        <div {...columnResizerLineProps} />
      </div>
    )
  },
})
