import emitter from '@vue3-easytable/common/mixins/emitter'
import { caf, raf } from '@vue3-easytable/common/utils/animation-frame'
import { computed, defineComponent, nextTick, onUnmounted, ref, watch } from 'vue'
import { clsName } from '../util'
import { queryBodyRows } from '../util/cell-dom'
import { COMPS_NAME, EMIT_EVENTS, HOOKS_NAME } from '../util/constant'

// Row insert indicator component
// Displays a horizontal line and add button when hovering near row boundaries
export default defineComponent({
  name: COMPS_NAME.VE_TABLE_ROW_INSERT_INDICATOR,
  mixins: [emitter()],
  props: {
    // Parent rendered flag
    parentRendered: {
      type: Boolean,
      required: true,
    },
    // Hooks instance for table events
    hooks: {
      type: Object,
      required: true,
    },
    // Table container element reference
    tableContainerEl: {
      // SSR：不能在模块顶层引用 HTMLElement（Node 中不存在）
      type: Object as PropType<HTMLElement | null>,
      default: null,
    },
    // Table element reference
    tableEl: {
      // SSR：不能在模块顶层引用 HTMLTableElement（Node 中不存在）
      type: Object as PropType<HTMLTableElement | null>,
      default: null,
    },
    // Column groups (for detecting operation column width)
    colgroups: {
      type: Array,
      required: true,
    },
    // Row insert option
    rowInsertOption: {
      type: Object,
      default: null,
    },
    // 固定表头（th 吸顶，遮住容器顶部的行）
    fixedHeader: {
      type: Boolean,
      default: true,
    },
    // 固定表尾（td 吸底，遮住容器底部的行）
    fixedFooter: {
      type: Boolean,
      default: true,
    },
  },

  emits: [EMIT_EVENTS.ROW_INSERT],

  setup(props, { emit }) {
    // State
    const isVisible = ref(false)
    const indicatorTop = ref(0)
    const insertRowIndex = ref(-1)
    const isHoveringButton = ref(false)
    const detectionZoneWidth = ref(50) // Width of the hover detection zone on the left
    const hideTimeoutId = ref<ReturnType<typeof setTimeout> | null>(null)

    // Get the operation column (index column) if exists
    const operationColumn = computed(() => {
      return props.colgroups.find((col: any) => col.operationColumn)
    })

    // Get the actual column width (not including extra padding for detection)
    const indexColumnWidth = computed(() => {
      if (operationColumn.value && operationColumn.value._realTimeWidth) {
        return operationColumn.value._realTimeWidth
      }
      return detectionZoneWidth.value
    })

    // Get the detection zone width based on operation column (with extra padding for easier hover)
    const actualDetectionZoneWidth = computed(() => {
      return indexColumnWidth.value + 10
    })

    // Clear hide timeout
    const clearHideTimeout = () => {
      if (hideTimeoutId.value) {
        clearTimeout(hideTimeoutId.value)
        hideTimeoutId.value = null
      }
    }

    // Schedule hide with delay (short delay to allow button interaction)
    const scheduleHide = (immediate = false) => {
      clearHideTimeout()
      if (immediate) {
        isVisible.value = false
        return
      }
      hideTimeoutId.value = setTimeout(() => {
        if (!isHoveringButton.value) {
          isVisible.value = false
        }
      }, 100)
    }

    // Get the root element (parent of ve-table wrapper)
    const getRootElement = () => {
      if (!props.tableContainerEl)
        return null
      // Navigate up to find the vue-table-root element
      let el = props.tableContainerEl.parentElement
      while (el && !el.classList.contains('vue-table-root')) {
        el = el.parentElement
      }
      return el
    }

    /*
     * 可视区（视口坐标）：滚动容器的内容区，去掉固定表头 / 表尾遮住的部分（INS-01）
     * - 固定表头吸顶的是 th 单元格，<thead> 本身仍随内容滚走，所以用它的高度而不是位置
     * - 非固定表头随内容滚动：只有还没滚走的部分遮住行
     */
    const getVisibleRange = (containerEl: HTMLElement, containerRect: DOMRect, tableEl: HTMLTableElement) => {
      const contentTop = containerRect.top + containerEl.clientTop
      // clientHeight 不含横向滚动条；没有布局（为 0）时退回容器高度
      const contentBottom = contentTop + (containerEl.clientHeight || containerRect.height)

      let top = contentTop
      let bottom = contentBottom

      const thead = tableEl.tHead
      if (thead) {
        const theadRect = thead.getBoundingClientRect()
        top = Math.max(top, theadRect.bottom)
        if (props.fixedHeader)
          top = Math.max(top, contentTop + theadRect.height)
      }

      const tfoot = tableEl.tFoot
      if (tfoot && props.fixedFooter)
        bottom = Math.min(bottom, contentBottom - tfoot.getBoundingClientRect().height)

      return { top, bottom }
    }

    // 行对应的数据下标：虚拟滚动时每行在自己的 <tbody data-index> 中，普通模式下 DOM 顺序即数据顺序
    const getRowDataIndex = (row: HTMLTableRowElement, domIndex: number) => {
      const dataIndex = row.parentElement?.getAttribute('data-index')
      return dataIndex == null ? domIndex : Number(dataIndex)
    }

    // 行（含紧随其后的展开行）的底部
    const getRowBlockBottom = (row: HTMLTableRowElement) => {
      const next = row.nextElementSibling
      const last = next && next.classList.contains(clsName('expand-tr')) ? next : row
      return last.getBoundingClientRect().bottom
    }

    /*
     * 找到离鼠标最近的、可见的行边界（INS-01、INS-02）
     * 边界 k（0 <= k < n）是第 k 个已渲染行的顶部，即插入到该行之前；边界 n 是最后一行（含展开行）的底部。
     * 已渲染的行按 DOM 顺序从上到下排列，按顶部二分查找，每次只读取 O(log n) 个行的 rect。
     * 返回的 index 是数据下标（虚拟滚动时不等于 DOM 下标），top 相对于根元素。
     */
    const findClosestRowBoundary = (mouseY: number, containerRect: DOMRect) => {
      const { tableEl, tableContainerEl } = props
      const none = { index: -1, top: 0 }
      if (!tableEl || !tableContainerEl)
        return none

      // 本表格所有已渲染的 body 行（虚拟滚动时分布在多个 <tbody> 中，不含占位行与展开行）
      const rows = queryBodyRows(tableEl)
      const rowCount = rows.length
      if (rowCount === 0)
        return none

      const visible = getVisibleRange(tableContainerEl, containerRect, tableEl)
      if (visible.bottom <= visible.top)
        return none

      // 鼠标在固定表头 / 表尾上：取离它最近的可见边界（第一个 / 最后一个可见行的边界），不受距离阈值限制
      const isOverHeaderOrFooter = mouseY < visible.top || mouseY > visible.bottom
      const y = Math.min(Math.max(mouseY, visible.top), visible.bottom)

      // 本次查找中已读取过的边界位置
      const boundaryYs = new Map<number, number>()
      const getBoundaryY = (k: number) => {
        let value = boundaryYs.get(k)
        if (value === undefined) {
          value = k < rowCount
            ? rows[k].getBoundingClientRect().top
            : getRowBlockBottom(rows[rowCount - 1])
          boundaryYs.set(k, value)
        }
        return value
      }

      // 二分查找：最后一个顶部 <= y 的行（没有则为 -1）
      let low = 0
      let high = rowCount - 1
      let rowAbove = -1
      while (low <= high) {
        const mid = (low + high) >> 1
        if (getBoundaryY(mid) <= y) {
          rowAbove = mid
          low = mid + 1
        }
        else {
          high = mid - 1
        }
      }

      // 候选：y 上方的边界（该行顶部）与下方的边界（下一行顶部或最后一行底部）；
      // 被固定表头 / 表尾遮住的边界不算（允许 1px 的亚像素误差）
      let closest = -1
      let closestY = 0
      let minDistance = Number.POSITIVE_INFINITY
      for (const k of [rowAbove, rowAbove + 1]) {
        if (k < 0 || k > rowCount)
          continue
        const boundaryY = getBoundaryY(k)
        if (boundaryY < visible.top - 1 || boundaryY > visible.bottom + 1)
          continue
        const distance = Math.abs(y - boundaryY)
        if (distance < minDistance) {
          minDistance = distance
          closest = k
          closestY = boundaryY
        }
      }

      // Only show if within reasonable distance (30px threshold)
      if (closest < 0 || (!isOverHeaderOrFooter && minDistance > 30))
        return none

      const index = closest < rowCount
        ? getRowDataIndex(rows[closest], closest)
        : getRowDataIndex(rows[rowCount - 1], rowCount - 1) + 1

      // 指示线相对于根元素定位
      const rootEl = getRootElement()
      const rootTop = rootEl ? rootEl.getBoundingClientRect().top : containerRect.top

      return { index, top: closestY - rootTop }
    }

    // 处理一次鼠标移动（每帧最多一次，见 handleMouseMove）
    const processMouseMove = ({ clientX, clientY }: { clientX: number, clientY: number }) => {
      if (!props.tableContainerEl || !props.rowInsertOption?.enable)
        return

      const containerRect = props.tableContainerEl.getBoundingClientRect()
      const mouseX = clientX - containerRect.left

      // Check if mouse is within the detection zone on the left
      if (mouseX > actualDetectionZoneWidth.value || mouseX < 0) {
        // Mouse is outside the index column area - hide unless hovering button
        if (!isHoveringButton.value) {
          scheduleHide()
        }
        return
      }

      // Clear any pending hide - mouse is in detection zone
      clearHideTimeout()

      const { index, top } = findClosestRowBoundary(clientY, containerRect)

      if (index >= 0) {
        isVisible.value = true
        indicatorTop.value = top
        insertRowIndex.value = index
      }
      else {
        if (!isHoveringButton.value) {
          scheduleHide()
        }
      }
    }

    // INS-02：mousemove 只记录最新位置，布局读取放到下一帧，每帧最多处理一次
    let pendingMove: { clientX: number, clientY: number } | null = null
    let moveFrameId: number | null = null

    const cancelPendingMove = () => {
      if (moveFrameId !== null) {
        caf(moveFrameId)
        moveFrameId = null
      }
      pendingMove = null
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (!props.tableContainerEl || !props.rowInsertOption?.enable)
        return

      pendingMove = { clientX: event.clientX, clientY: event.clientY }
      if (moveFrameId !== null)
        return

      moveFrameId = raf(() => {
        moveFrameId = null
        const move = pendingMove
        pendingMove = null
        if (move)
          processMouseMove(move)
      })
    }

    // Mouse leave handler for container
    const handleMouseLeave = (event: MouseEvent) => {
      // 离开容器后，尚未处理的移动不再显示指示线
      cancelPendingMove()

      // Check if we're moving to the button (which is outside container)
      const relatedTarget = event.relatedTarget as HTMLElement
      if (relatedTarget && relatedTarget.closest('.ve-table-row-insert-indicator-button')) {
        return
      }

      if (!isHoveringButton.value) {
        scheduleHide()
      }
    }

    // Document-level mouse move to hide when completely outside table area
    const handleDocumentMouseMove = (event: MouseEvent) => {
      if (!isVisible.value || !props.tableContainerEl || isHoveringButton.value)
        return

      const containerRect = props.tableContainerEl.getBoundingClientRect()
      const mouseX = event.clientX
      const mouseY = event.clientY

      // Check if mouse is completely outside the container area (with some padding)
      const isOutside = mouseX < containerRect.left - 20
        || mouseX > containerRect.right + 20
        || mouseY < containerRect.top - 20
        || mouseY > containerRect.bottom + 20

      if (isOutside) {
        scheduleHide(true) // Hide immediately
      }
    }

    // Handle add button click
    const handleAddRowClick = (event: MouseEvent) => {
      event.stopPropagation()
      event.preventDefault()

      if (insertRowIndex.value < 0)
        return

      const { beforeInsertRow, afterInsertRow } = props.rowInsertOption || {}

      // Call before insert hook if defined
      if (typeof beforeInsertRow === 'function') {
        const shouldContinue = beforeInsertRow({
          insertRowIndex: insertRowIndex.value,
        })
        if (shouldContinue === false)
          return
      }

      // Emit the insert event
      emit(EMIT_EVENTS.ROW_INSERT, {
        insertRowIndex: insertRowIndex.value,
      })

      // Call after insert hook if defined
      if (typeof afterInsertRow === 'function') {
        nextTick(() => {
          afterInsertRow({
            insertRowIndex: insertRowIndex.value,
          })
        })
      }

      // Hide the indicator after insert
      isVisible.value = false
      isHoveringButton.value = false
    }

    // Button hover handlers
    const handleButtonMouseEnter = () => {
      clearHideTimeout()
      isHoveringButton.value = true
      isVisible.value = true
    }

    const handleButtonMouseLeave = () => {
      isHoveringButton.value = false
      scheduleHide()
    }

    // Handle scroll to reposition indicator
    const handleScroll = () => {
      // 滚动时隐藏：滚动前记录的移动也不再处理
      cancelPendingMove()

      if (!isVisible.value)
        return

      // Hide indicator while scrolling for smooth UX
      isVisible.value = false
      isHoveringButton.value = false
    }

    // Setup event listeners
    const setupEventListeners = () => {
      if (!props.tableContainerEl)
        return

      props.tableContainerEl.addEventListener('mousemove', handleMouseMove)
      props.tableContainerEl.addEventListener('mouseleave', handleMouseLeave)
      document.addEventListener('mousemove', handleDocumentMouseMove)
    }

    // Remove event listeners
    const removeEventListeners = () => {
      if (!props.tableContainerEl)
        return

      props.tableContainerEl.removeEventListener('mousemove', handleMouseMove)
      props.tableContainerEl.removeEventListener('mouseleave', handleMouseLeave)
      document.removeEventListener('mousemove', handleDocumentMouseMove)
    }

    // 组件是否已卸载（nextTick 回调可能在卸载之后才执行）
    let isUnmounted = false
    // scroll hook 的注销函数
    let removeScrollHook: (() => void) | null = null

    // Watch for parent rendered
    watch(
      () => props.parentRendered,
      (val) => {
        if (val) {
          nextTick(() => {
            if (isUnmounted)
              return

            setupEventListeners()

            // Add scroll hook
            removeScrollHook?.()
            removeScrollHook = props.hooks.addHook(HOOKS_NAME.TABLE_CONTAINER_SCROLL, handleScroll)
          })
        }
      },
      { immediate: true },
    )

    // Watch for tableContainerEl changes
    watch(
      () => props.tableContainerEl,
      (newEl, oldEl) => {
        if (oldEl) {
          oldEl.removeEventListener('mousemove', handleMouseMove)
          oldEl.removeEventListener('mouseleave', handleMouseLeave)
        }
        if (newEl && props.parentRendered) {
          setupEventListeners()
        }
      },
    )

    // Cleanup on unmount
    onUnmounted(() => {
      isUnmounted = true
      // 卸载后不再响应表格滚动 hook
      removeScrollHook?.()
      removeScrollHook = null
      removeEventListeners()
      clearHideTimeout()
      // INS-02：卸载后不再执行已排队的帧
      cancelPendingMove()
      document.removeEventListener('mousemove', handleDocumentMouseMove)
    })

    // Get container dimensions
    const getContainerDimensions = () => {
      if (!props.tableContainerEl)
        return { width: 0, left: 0 }

      const rootEl = getRootElement()
      if (!rootEl)
        return { width: props.tableContainerEl.clientWidth, left: 0 }

      const rootRect = rootEl.getBoundingClientRect()
      const containerRect = props.tableContainerEl.getBoundingClientRect()

      return {
        width: props.tableContainerEl.clientWidth,
        left: containerRect.left - rootRect.left,
      }
    }

    return {
      isVisible,
      indicatorTop,
      insertRowIndex,
      isHoveringButton,
      indexColumnWidth,
      handleAddRowClick,
      handleButtonMouseEnter,
      handleButtonMouseLeave,
      getContainerDimensions,
    }
  },

  render() {
    const {
      isVisible,
      indicatorTop,
      handleAddRowClick,
      handleButtonMouseEnter,
      handleButtonMouseLeave,
      rowInsertOption,
      indexColumnWidth,
      getContainerDimensions,
    } = this

    // Don't render if not enabled
    if (!rowInsertOption?.enable) {
      return null
    }

    const containerDimensions = getContainerDimensions()
    const buttonSize = 22 // Width/height of the button

    // Indicator line style - constrained to container width
    const indicatorStyle = {
      top: `${indicatorTop}px`,
      left: `${containerDimensions.left}px`,
      width: `${containerDimensions.width}px`,
      opacity: isVisible ? 1 : 0,
      pointerEvents: 'none' as const,
    }

    // Add button style - centered horizontally in the index column
    const buttonLeft = containerDimensions.left + (indexColumnWidth / 2) - (buttonSize / 2)
    const buttonStyle = {
      top: `${indicatorTop}px`,
      left: `${buttonLeft}px`,
      width: `${buttonSize}px`,
      height: `${buttonSize}px`,
      opacity: isVisible ? 1 : 0,
      pointerEvents: (isVisible ? 'auto' : 'none') as 'auto' | 'none',
    }

    return (
      <div class={clsName('row-insert-indicator-wrapper')}>
        {/* Horizontal line indicator */}
        <div
          class={clsName('row-insert-indicator-line')}
          style={indicatorStyle}
        />
        {/* Add row button */}
        <div
          class={clsName('row-insert-indicator-button')}
          style={buttonStyle}
          onClick={handleAddRowClick}
          onMouseenter={handleButtonMouseEnter}
          onMouseleave={handleButtonMouseLeave}
        >
          <span class={clsName('row-insert-indicator-icon')}>+</span>
        </div>
      </div>
    )
  },
})
