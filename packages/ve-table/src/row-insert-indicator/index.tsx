import emitter from '@easytable/common/mixins/emitter'
import { computed, defineComponent, nextTick, onUnmounted, ref, watch } from 'vue'
import { clsName } from '../util'
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
      type: HTMLElement,
      default: null,
    },
    // Table element reference
    tableEl: {
      type: HTMLTableElement,
      default: null,
    },
    // All row keys
    allRowKeys: {
      type: Array,
      required: true,
    },
    // Column groups (for detecting operation column width)
    colgroups: {
      type: Array,
      required: true,
    },
    // Row key field name
    rowKeyFieldName: {
      type: String,
      default: null,
    },
    // Table data
    tableData: {
      type: Array,
      required: true,
    },
    // Virtual scroll option
    virtualScrollOption: {
      type: Object,
      default: null,
    },
    // Is virtual scroll enabled
    isVirtualScroll: {
      type: Boolean,
      default: false,
    },
    // Virtual scroll positions (for calculating row positions)
    virtualScrollPositions: {
      type: Array,
      default: () => [],
    },
    // Virtual scroll visible indexes
    virtualScrollVisibleIndexs: {
      type: Object,
      default: () => ({ start: 0, end: 0 }),
    },
    // Row insert option
    rowInsertOption: {
      type: Object,
      default: null,
    },
    // Fixed header
    fixedHeader: {
      type: Boolean,
      default: true,
    },
    // Show header
    showHeader: {
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

    // Get header height
    const getHeaderHeight = () => {
      if (!props.showHeader || !props.tableEl)
        return 0

      const thead = props.tableEl.querySelector('thead')
      if (thead)
        return thead.getBoundingClientRect().height

      return 0
    }

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

    // Find the closest row boundary to the mouse position
    const findClosestRowBoundary = (mouseY: number, containerRect: DOMRect) => {
      if (!props.tableEl || !props.tableContainerEl)
        return { index: -1, top: 0 }

      const rootEl = getRootElement()
      const rootRect = rootEl ? rootEl.getBoundingClientRect() : containerRect
      const headerHeight = getHeaderHeight()

      // Get relative Y position within the table body area (relative to container)
      const relativeY = mouseY - containerRect.top

      // Calculate offset from root to container for positioning
      const containerOffsetTop = containerRect.top - rootRect.top

      // If mouse is in header area, return first row boundary
      if (relativeY < headerHeight) {
        return { index: 0, top: headerHeight + containerOffsetTop }
      }

      const tbody = props.tableEl.querySelector('tbody')
      if (!tbody)
        return { index: -1, top: 0 }

      // Get all body rows (excluding measure row)
      const rows = Array.from(tbody.querySelectorAll('tr.ve-table-body-tr'))
      if (rows.length === 0)
        return { index: -1, top: 0 }

      let closestIndex = -1
      let closestTop = 0
      let minDistance = Number.POSITIVE_INFINITY

      // Check top of first row (for inserting before first row)
      const firstRowRect = rows[0].getBoundingClientRect()
      const firstRowTop = firstRowRect.top - containerRect.top
      const distanceToFirstTop = Math.abs(relativeY - firstRowTop)

      if (distanceToFirstTop < minDistance) {
        minDistance = distanceToFirstTop
        closestIndex = 0
        closestTop = firstRowTop + containerOffsetTop
      }

      // Check bottom of each row
      rows.forEach((row, index) => {
        const rowRect = row.getBoundingClientRect()
        const rowBottom = rowRect.bottom - containerRect.top
        const distance = Math.abs(relativeY - rowBottom)

        if (distance < minDistance) {
          minDistance = distance
          // Insert after this row means index + 1
          closestIndex = index + 1
          closestTop = rowBottom + containerOffsetTop
        }
      })

      // Only show if within reasonable distance (30px threshold)
      if (minDistance > 30) {
        return { index: -1, top: 0 }
      }

      // For virtual scroll, we need to get the actual data index
      if (props.isVirtualScroll) {
        const { start } = props.virtualScrollVisibleIndexs
        // Adjust index based on virtual scroll start
        if (closestIndex > 0) {
          closestIndex = start + closestIndex
        }
      }

      return { index: closestIndex, top: closestTop }
    }

    // Mouse move handler
    const handleMouseMove = (event: MouseEvent) => {
      if (!props.tableContainerEl || !props.rowInsertOption?.enable)
        return

      const containerRect = props.tableContainerEl.getBoundingClientRect()
      const mouseX = event.clientX - containerRect.left
      const mouseY = event.clientY

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

      const { index, top } = findClosestRowBoundary(mouseY, containerRect)

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

    // Mouse leave handler for container
    const handleMouseLeave = (event: MouseEvent) => {
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

    // Watch for parent rendered
    watch(
      () => props.parentRendered,
      (val) => {
        if (val) {
          nextTick(() => {
            setupEventListeners()

            // Add scroll hook
            props.hooks.addHook(HOOKS_NAME.TABLE_CONTAINER_SCROLL, handleScroll)
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
      removeEventListeners()
      clearHideTimeout()
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
