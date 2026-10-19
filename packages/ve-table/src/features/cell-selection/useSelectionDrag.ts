/**
 * 拖动选择（MOD-02）：单元格区域、整行（操作列）、整列（表头）的拖动状态
 *
 * 拖动期间在 document 上监听 mouseup（捕获阶段）、在 window 上监听 blur，结束拖动（SEL-11、SEL-18）。
 * 在表格外松开时，浏览器在公共祖先上触发的 click 不再清除选区（clickoutside 忽略从表格内开始的拖动），
 * 所以拖动状态不能依赖 tableClickOutside 重置。
 */
import type { Ref } from 'vue'
import { onUnmounted, ref } from 'vue'

export interface UseSelectionDrag {
  isHeaderCellMousedown: Ref<boolean>
  isBodyCellMousedown: Ref<boolean>
  isBodyOperationColumnMousedown: Ref<boolean>
  addSelectionDragListener: () => void
  removeSelectionDragListener: () => void
  endSelectionDrag: () => void
  endLostSelectionDrag: (event: unknown) => void
}

export function useSelectionDrag(): UseSelectionDrag {
  const isHeaderCellMousedown = ref(false)
  const isBodyCellMousedown = ref(false)
  const isBodyOperationColumnMousedown = ref(false)

  let disposeDragListeners: (() => void) | null = null

  // 移除拖动选择期间的 document / window 监听
  function removeSelectionDragListener() {
    const dispose = disposeDragListeners
    disposeDragListeners = null
    dispose?.()
  }

  // 结束拖动选择：之后鼠标经过单元格 / 表头不再扩展选区（填充由 FILL-02 的 window 监听单独处理）
  function endSelectionDrag() {
    removeSelectionDragListener()
    isHeaderCellMousedown.value = false
    isBodyCellMousedown.value = false
    isBodyOperationColumnMousedown.value = false
  }

  /*
   * 拖动期间监听 document 的 mouseup（捕获阶段）结束拖动（SEL-11）；
   * 同时监听 window blur：拖动中窗口失焦（如 Alt+Tab）时 mouseup 可能永远不会到达，失焦即结束拖动（SEL-18）
   */
  function addSelectionDragListener() {
    removeSelectionDragListener()

    const onEnd = () => {
      endSelectionDrag()
    }
    document.addEventListener('mouseup', onEnd, true)
    window.addEventListener('blur', onEnd)

    disposeDragListeners = () => {
      document.removeEventListener('mouseup', onEnd, true)
      window.removeEventListener('blur', onEnd)
    }
  }

  /*
   * 拖动选择中，鼠标经过单元格 / 表头时没有按住左键：mouseup 已丢失（例如在窗口外释放且浏览器没有派发），
   * 结束拖动，不再扩展选区（SEL-18，与填充的 FILL-02 相同）
   */
  function endLostSelectionDrag(event: unknown) {
    const isDragging = isBodyCellMousedown.value
      || isHeaderCellMousedown.value
      || isBodyOperationColumnMousedown.value

    if (isDragging && event instanceof MouseEvent && (event.buttons & 1) === 0)
      endSelectionDrag()
  }

  // 拖动选择中卸载：移除 document 上的监听（SEL-11）
  onUnmounted(() => {
    removeSelectionDragListener()
  })

  return {
    isHeaderCellMousedown,
    isBodyCellMousedown,
    isBodyOperationColumnMousedown,
    addSelectionDragListener,
    removeSelectionDragListener,
    endSelectionDrag,
    endLostSelectionDrag,
  }
}
