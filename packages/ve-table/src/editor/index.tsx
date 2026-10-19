import type { ColgroupData } from '../ve-table-types'
import focus from '@vue3-easytable/common/directives/focus.js'
import { autoResize } from '@vue3-easytable/common/utils/auto-resize'
import { getCaretPosition, setCaretPosition } from '@vue3-easytable/common/utils/dom'
import { isEmptyValue } from '@vue3-easytable/common/utils/index.js'
import { debounce } from 'lodash'
import { useTableContext } from '../features/table-context'
import { clsName, getFixedTotalWidthByColumnKey } from '../util'
import { queryCell } from '../util/cell-dom'
import { COMPS_NAME, EMIT_EVENTS, HOOKS_NAME, KEYBOARD_MODE } from '../util/constant'
import { INSTANCE_METHODS } from './constant'

export default defineComponent({
  name: COMPS_NAME.VE_TABLE_EDIT_INPUT,
  directives: {
    focus,
  },
  props: {
    parentRendered: {
      type: Boolean,
      required: true,
    },
    // start input value every time
    inputStartValue: {
      type: [String, Number],
      required: true,
    },
    rowKeyFieldName: {
      type: String,
      default: null,
    },
    // table data
    tableData: {
      type: Array,
      required: true,
    },
    colgroups: {
      type: Array as PropType<ColgroupData[]>,
      required: true,
    },
    // cell selection option
    cellSelectionData: {
      type: Object,
      required: true,
    },
    // editing cell
    editingCell: {
      type: Object,
      required: true,
    },
    // is editing cell
    isCellEditing: {
      type: Boolean,
      required: true,
    },
    // has horizontal scroll bar
    hasXScrollBar: {
      type: Boolean,
      required: true,
    },
    // has vertical scroll bar
    hasYScrollBar: {
      type: Boolean,
      required: true,
    },
    // has right fixed column
    hasRightFixedColumn: {
      type: Boolean,
      required: true,
    },
    scrollBarWidth: {
      type: Number,
      required: true,
    },
    // 键盘模式（SEL-08）：表格模式下编辑框不抢焦点（焦点停在表格根元素上）
    keyboardMode: {
      type: String,
      default: KEYBOARD_MODE.CELL,
    },
  },
  setup() {
    return {
      // 表格上下文（MOD-01）：订阅表格滚动、尺寸变化，卸载时自动注销
      tableEvents: useTableContext(),
    }
  },
  data() {
    return {
      textareaInputRef: 'textareaInputRef',
      // raw cell value
      rawCellValue: '',
      // display textarea
      displayTextarea: false,
      // virtual scroll overflowViewport
      overflowViewport: false,
      // textarea element rect
      textareaRect: {
        left: 0,
        top: 0,
      },
      // table element
      tableEl: null,
      // cell element
      cellEl: null,
      // auto resize
      autoResize: null,
      // is edit cell focus
      isEditCellFocus: false,
      // 已订阅的表格事件的注销函数（重新订阅前先注销）
      hookDisposers: [] as (() => void)[],
      // 聚焦定时器（卸载时需要清除）
      focusTimer: null as ReturnType<typeof setTimeout> | null,
    }
  },
  computed: {
    // current column
    currentColumn() {
      let result = null

      const { colgroups, cellSelectionData } = this

      const { currentCell } = cellSelectionData

      if (
        !isEmptyValue(currentCell.rowKey)
        && !isEmptyValue(currentCell.colKey)
      ) {
        result = colgroups.find(x => x.key === currentCell.colKey)
      }

      return result
    },

    // container class
    containerClass() {
      let result = null

      const { displayTextarea, overflowViewport } = this

      result = {
        [clsName('edit-input-container')]: true,
        [clsName('edit-input-container-show')]:
                    displayTextarea && !overflowViewport,
      }

      return result
    },

    // container style
    containerStyle() {
      let result = {}

      const {
        displayTextarea,
        overflowViewport,
        textareaRect,
        currentColumn: column,
      } = this

      const { top, left } = textareaRect

      if (displayTextarea && !overflowViewport) {
        result = {
          'top': `${top}px`,
          'left': `${left}px`,
          'height': null,
          // because @ve-fixed-body-cell-index: 10;
          'z-index': column?.fixed ? 10 : 0,
          'opacity': 1,
        }
      }
      else {
        result = {
          'top': `${top}px`,
          'left': `${left}px`,
          'height': '1px',
          'z-index': -1,
          'opacity': 0,
        }
      }

      return result
    },

    // textarea class
    textareaClass() {
      let result = null

      result = {
        [clsName('edit-input')]: true,
      }

      return result
    },
  },

  watch: {
    'parentRendered': {
      handler(val) {
        if (val) {
          // fixed #471
          this.setTableEl()

          // 先注销旧的订阅，避免重复注册
          this.removeHooks()
          // 组件卸载时由表格上下文自动注销
          this.hookDisposers = [
            // add table container scroll hook
            this.tableEvents.on(
              HOOKS_NAME.TABLE_CONTAINER_SCROLL,
              () => {
                if (this.displayTextarea) {
                  if (!this.cellEl)
                    this.setCellEl()
                }
                this.debounceSetCellEl()
                this.setTextareaPosition()
                this.debounceSetTextareaPosition()
              },
            ),
            // add table size change hook
            this.tableEvents.on(HOOKS_NAME.TABLE_SIZE_CHANGE, () => {
              this.setTextareaPosition()
            }),
          ]
        }
      },
      immediate: true,
    },
    // cell selection key data
    'cellSelectionData.currentCell': {
      handler(val) {
        this.isEditCellFocus = false

        const { rowKey, colKey } = val
        if (!isEmptyValue(rowKey) && !isEmptyValue(colKey)) {
          this.setCellEl()
          // wait for selection cell rendered
          this.$nextTick(() => {
            // 组件可能已在等待期间卸载
            if (this.$.isUnmounted)
              return
            this.setTextareaPosition()
            if (this.focusTimer)
              clearTimeout(this.focusTimer)
            this.focusTimer = setTimeout(() => {
              this.focusTimer = null
              this.isEditCellFocus = true
            })
          })
        }
      },
      deep: true,
      immediate: true,
    },
    // watch normal end cell
    'cellSelectionData.normalEndCell': {
      handler(val) {
        /*
                trigger editor(textarea) element select
                解决通过点击的区域选择，无法复制的问题
                */
        if (!isEmptyValue(val.colKey))
          this[INSTANCE_METHODS.TEXTAREA_SELECT]()
      },
      deep: true,
      immediate: true,
    },
    // is editing cell
    'isCellEditing': {
      handler(val) {
        if (val)
          this.showTextarea()
        else
          this.hideTextarea()
      },
      deep: true,
      immediate: true,
    },
    'inputStartValue': {
      handler() {
        this.setRawCellValue()
      },
      immediate: true,
    },
  },

  methods: {
    // set table element
    setTableEl() {
      this.$nextTick(() => {
        const tableEl = this.$el.previousElementSibling
        this.tableEl = tableEl
      })
    },

    // set cell element
    setCellEl() {
      const { cellSelectionData, tableEl } = this

      const { rowKey, colKey } = cellSelectionData.currentCell

      if (tableEl) {
        // 普通模式与虚拟滚动模式通用，key 会被转义，找不到返回 null
        const cellEl = queryCell(tableEl, rowKey, colKey)

        if (cellEl) {
          this.cellEl = cellEl
          this.overflowViewport = false
        }
        else {
          /*
          单元格未渲染（虚拟滚动窗口之外、被合并的单元格等）：丢弃上一个单元格，
          否则编辑框会停留在旧单元格上，而编辑的是新单元格（EDIT-03）。
          滚动后由 TABLE_CONTAINER_SCROLL hook 重新查找
          */
          this.cellEl = null
          this.overflowViewport = true
        }
      }
    },

    // set textarea position
    setTextareaPosition() {
      const {
        hasXScrollBar,
        hasYScrollBar,
        scrollBarWidth,
        colgroups,
        hasRightFixedColumn,
        currentColumn: column,
        cellEl,
        tableEl,
      } = this

      if (cellEl && tableEl) {
        const {
          left: tableLeft,
          top: tableTop,
          right: tableRight,
          bottom: tableBottom,
        } = tableEl.getBoundingClientRect()

        const {
          left: cellLeft,
          top: cellTop,
          height: cellHeight,
          width: cellWidth,
          right: cellRight,
          bottom: cellBottom,
        } = cellEl.getBoundingClientRect()

        if (cellHeight && cellWidth) {
          let maxHeight = cellHeight + tableBottom - cellBottom
          let maxWidth = cellWidth + tableRight - cellRight

          // has horizontal scroll bar
          if (hasXScrollBar)
            maxHeight -= scrollBarWidth

          // has vertical scroll bar
          if (hasYScrollBar)
            maxWidth -= scrollBarWidth

          /*
                    If the right fixed column is included, the max width of the textarea needs to be subtracted from the sum of the right fixed columns
                    如果包含右固定列，编辑框最大宽度需要去减去右固定列之和的宽度
                    */
          if (hasRightFixedColumn) {
            if (column && !column.fixed) {
              const rightFixedTotalWidth
                                = getFixedTotalWidthByColumnKey({
                                  colgroups,
                                  colKey: column.key,
                                  fixed: 'right',
                                })
              if (rightFixedTotalWidth)
                maxWidth -= rightFixedTotalWidth
            }
          }

          this.autoResize.init(
            this.$refs[this.textareaInputRef],
            {
              minHeight: Math.min(cellHeight, maxHeight),
              maxHeight, // TEXTAREA should never be higher than visible part of the viewport (should not cover the scrollbar)
              minWidth: Math.min(cellWidth, maxWidth),
              maxWidth, // TEXTAREA should never be wider than visible part of the viewport (should not cover the scrollbar)
            },
            true, // observe textarea change\cut\paste etc.
          )

          this.textareaRect = {
            left: cellLeft - tableLeft,
            top: cellTop - tableTop,
          }
        }
        else {
          /*
                    存在以下可能：
                    1、虚拟滚动超出viewport
                    2、单元格被删除（通过右键菜单等方式）
                    */

          // fixed #477
          this.textareaRect = {
            left: 0,
            top: 0,
          }
          this.cellEl = null
          this.overflowViewport = true
        }
      }
    },

    // show textarea
    showTextarea() {
      this.setRawCellValue()
      this.displayTextarea = true

      // 选中时单元格未渲染、之后才滚动进来（未编辑时滚动不会重新查找）：开始编辑时重新查找并定位（EDIT-03）
      if (!this.cellEl && this.overflowViewport) {
        this.setCellEl()
        this.setTextareaPosition()
      }
    },

    // hide textarea
    hideTextarea() {
      this.displayTextarea = false
      this.textareaUnObserve()
    },

    // textarea unObserve
    textareaUnObserve() {
      if (this.autoResize)
        this.autoResize.unObserve()
    },

    // set raw cell value
    setRawCellValue() {
      this.rawCellValue = this.inputStartValue
    },

    // textarea value change
    textareaValueChange(val) {
      this.$emit(EMIT_EVENTS.EDIT_INPUT_VALUE_CHANGE, val)
    },

    // textarea select
    [INSTANCE_METHODS.TEXTAREA_SELECT]() {
      const textareaInputEl = this.$refs[this.textareaInputRef]
      if (textareaInputEl)
        textareaInputEl.select()
    },

    // textarea add new line
    [INSTANCE_METHODS.TEXTAREA_ADD_NEW_LINE]() {
      const { isCellEditing, editingCell } = this

      if (isCellEditing) {
        const textareaInputEl = this.$refs[this.textareaInputRef]

        const caretPosition = getCaretPosition(textareaInputEl)

        // 单元格的值按列的 field 取，而不是 colKey（两者可以不同）
        let value = editingCell.row[editingCell.column.field]
        // solve error of number slice method
        value += ''

        const newValue = `${value.slice(
          0,
          caretPosition,
        )}\n${value.slice(caretPosition)}`

        // 直接更新 textarea 值
        textareaInputEl.value = newValue

        // 手动赋值不会触发textarea 文本变化事件,需要手动更新 editingCell 值
        this.textareaValueChange(newValue)

        setCaretPosition(textareaInputEl, caretPosition + 1)
      }
    },

    // 注销本组件订阅的所有表格事件
    removeHooks() {
      this.hookDisposers.forEach(dispose => dispose())
      this.hookDisposers = []
    },
  },
  created() {
    // debounce set textarea position
    this.debounceSetTextareaPosition = debounce(
      this.setTextareaPosition,
      210,
    )
    // debounce set cell el
    this.debounceSetCellEl = debounce(() => {
      if (this.displayTextarea) {
        if (!this.cellEl)
          this.setCellEl()
      }
    }, 200)
  },
  mounted() {
    this.autoResize = autoResize()
  },
  beforeUnmount() {
    // 订阅由表格上下文在组件卸载时自动注销（INFRA-01）
    // 取消未执行的防抖调用与聚焦定时器（否则卸载后会对已销毁的 textarea 定位并报错）
    ;(this.debounceSetTextareaPosition as unknown as ReturnType<typeof debounce>).cancel()
    ;(this.debounceSetCellEl as unknown as ReturnType<typeof debounce>).cancel()
    if (this.focusTimer) {
      clearTimeout(this.focusTimer)
      this.focusTimer = null
    }
    // 停止监听 textarea 尺寸变化（原 Vue 2 的 destroyed 钩子在 Vue 3 中不会执行）
    this.textareaUnObserve()
  },
  render() {
    const {
      containerClass,
      containerStyle,
      textareaClass,
      rawCellValue,
      isCellEditing,
      isEditCellFocus,
      keyboardMode,
    } = this

    const containerProps = {
      style: containerStyle,
      class: containerClass,
    }

    const textareaProps = {
      ref: this.textareaInputRef,
      class: textareaClass,
      value: rawCellValue,
      // title: rawCellValue,
      tabindex: -1,
      onInput: (e) => {
        if (isCellEditing) {
          this.textareaValueChange(e.target.value)
          this.rawCellValue = e.target.value
        }
      },
      onClick: () => {
        this.$emit(EMIT_EVENTS.EDIT_INPUT_CLICK)
      },
      onCopy: (e) => {
        this.$emit(EMIT_EVENTS.EDIT_INPUT_COPY, e)
      },
      onPaste: (e) => {
        this.$emit(EMIT_EVENTS.EDIT_INPUT_PASTE, e)
      },
      onCut: (e) => {
        this.$emit(EMIT_EVENTS.EDIT_INPUT_CUT, e)
      },
    }

    return (
      <div {...containerProps}>
        <textarea
          {...textareaProps}
          v-focus={{
            // 回到单元格导航时，编辑框随重新渲染重新获得焦点
            focus: isEditCellFocus && keyboardMode === KEYBOARD_MODE.CELL,
          }}
        >
        </textarea>
      </div>
    )
  },
})
