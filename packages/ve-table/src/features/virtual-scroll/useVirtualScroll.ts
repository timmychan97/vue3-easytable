/**
 * 虚拟滚动（MOD-02）：TanStack Virtual 适配器（virtual-scroll.ts）与表格状态之间的桥接
 *
 * - 实例要等滚动容器挂载之后（mounted 之后的 nextTick）才能创建；在此之前按预估行高先排出首屏行（VS-06）
 * - 实例本身不是响应式的（markRaw），状态变化时 TanStack 调用 onChange，
 *   这里递增 virtualScrollVersion，依赖它的 computed 随之重新计算
 * - 只有行数或行 key 变化时才更新实例（VS-03），编辑单元格不会触发
 */
import type { ComputedRef, Ref, ShallowRef } from 'vue'
import type { VeTableProps } from '../../ve-table-props'
import type { VirtualItem, VirtualScrollInstance } from './virtual-scroll'
import { isDefined, isFunction, isNumber } from '@vue3-easytable/common/utils'
import { computed, markRaw, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { createVirtualScroll } from './virtual-scroll'

// 没有设置 minRowHeight 时的预估行高
const DEFAULT_MIN_ROW_HEIGHT = 40
// 没有设置 bufferScale 时的缓冲倍数
const DEFAULT_BUFFER_SCALE = 1

export interface UseVirtualScrollOptions {
  props: Pick<
    VeTableProps,
    'virtualScrollOption' | 'tableData' | 'rowKeyFieldName' | 'maxHeight' | 'fixedHeader' | 'fixedFooter'
  >
  allRowKeys: ComputedRef<Array<string | number>>
  headerTotalHeight: ComputedRef<number>
  footerTotalHeight: ComputedRef<number>
  // 滚动容器（模板 ref）
  scrollElement: Ref<HTMLElement | null>
}

export interface UseVirtualScroll {
  // TanStack 实例（markRaw），未开启或尚未创建时为 null
  virtualScroll: ShallowRef<VirtualScrollInstance | null>
  // 实例状态变化的计数，供 computed 建立依赖
  virtualScrollVersion: Ref<number>
  isVirtualScroll: ComputedRef<boolean>
  virtualScrollOverscan: ComputedRef<number>
  virtualScrollEstimateSize: ComputedRef<number>
  virtualItems: ComputedRef<VirtualItem[]>
  initialVirtualItems: ComputedRef<VirtualItem[]>
  virtualTotalSize: ComputedRef<number>
  virtualPaddingTop: ComputedRef<number>
  virtualPaddingBottom: ComputedRef<number>
  virtualRowIdentity: ComputedRef<{ count: number, keys: Array<string | number> }>
  virtualScrollViewportOffsets: ComputedRef<{ scrollMargin: number, stickyStart: number, stickyEnd: number }>
  // 当前渲染的行数据（虚拟滚动时只有可视区 + 缓冲区的行）
  actualRenderTableData: ComputedRef<any[]>
  initTanStackVirtualScroll: () => void
  destroyTanStackVirtualScroll: () => void
  getVirtualRowKey: (index: number) => string | number
  measureVirtualRow: (el: HTMLElement | null) => void
}

export function useVirtualScroll(options: UseVirtualScrollOptions): UseVirtualScroll {
  const { props, allRowKeys, headerTotalHeight, footerTotalHeight, scrollElement } = options

  const virtualScroll = shallowRef<VirtualScrollInstance | null>(null)
  const virtualScrollVersion = ref(0)

  const isVirtualScroll = computed(() => !!props.virtualScrollOption?.enable)

  // TanStack 的 overscan（可视区上下额外渲染的行数）
  const virtualScrollOverscan = computed(() => {
    const { virtualScrollOption } = props
    if (!virtualScrollOption)
      return 5

    const bufferScale = isNumber(virtualScrollOption.bufferScale) && virtualScrollOption.bufferScale > 0
      ? virtualScrollOption.bufferScale
      : DEFAULT_BUFFER_SCALE

    // 旧的 bufferScale 映射为合理的 overscan 行数
    return Math.max(Math.ceil(bufferScale * 5), 3)
  })

  // TanStack 的预估行高
  const virtualScrollEstimateSize = computed<number>(() => {
    const minRowHeight = props.virtualScrollOption?.minRowHeight
    return isNumber(minRowHeight) ? minRowHeight : DEFAULT_MIN_ROW_HEIGHT
  })

  // 虚拟滚动行的 key：有 rowKeyFieldName 时用行 key（行高缓存随行移动），否则退回下标
  function getVirtualRowKey(index: number): string | number {
    const row = (props.tableData as any[])?.[index]
    const key = row && props.rowKeyFieldName ? row[props.rowKeyFieldName] : undefined
    return isDefined(key) ? key : index
  }

  /*
   * VS-06：虚拟滚动实例要等滚动容器挂载后（mounted 之后的 nextTick）才能创建。
   * 在此之前按预估行高先排出首屏行，避免首次渲染没有任何行；实例创建后这些行按 key 复用并被测量。
   * 只有 maxHeight 是像素值时才能预估首屏行数，其他单位（%、vh 等）仍等待实例创建。
   */
  const initialVirtualItems = computed<VirtualItem[]>(() => {
    const { maxHeight, tableData } = props
    const estimateSize = virtualScrollEstimateSize.value
    const viewportHeight = isNumber(maxHeight)
      ? maxHeight
      : /^\d+(?:\.\d+)?(?:px)?$/.test(String(maxHeight ?? '').trim())
        ? Number.parseFloat(String(maxHeight))
        : 0
    if (!viewportHeight || !estimateSize || !Array.isArray(tableData))
      return []

    const count = Math.min(
      tableData.length,
      Math.ceil(viewportHeight / estimateSize) + virtualScrollOverscan.value,
    )
    const result: VirtualItem[] = []
    for (let index = 0; index < count; index++) {
      result.push({
        index,
        key: getVirtualRowKey(index),
        start: index * estimateSize,
        size: estimateSize,
        end: (index + 1) * estimateSize,
        lane: 0,
      })
    }
    return result
  })

  // TanStack 的可渲染行（通过 virtualScrollVersion 建立依赖）
  const virtualItems = computed<VirtualItem[]>(() => {
    if (!isVirtualScroll.value)
      return []
    void virtualScrollVersion.value
    const vs = virtualScroll.value
    return vs ? vs.getVirtualItems() : initialVirtualItems.value
  })

  // 可滚动的总高度
  const virtualTotalSize = computed(() => {
    if (!isVirtualScroll.value)
      return 0
    void virtualScrollVersion.value
    const vs = virtualScroll.value
    return vs ? vs.getTotalSize() : (props.tableData?.length ?? 0) * virtualScrollEstimateSize.value
  })

  // 顶部占位高度
  const virtualPaddingTop = computed(() => {
    if (!isVirtualScroll.value)
      return 0
    void virtualScrollVersion.value
    const vs = virtualScroll.value
    return vs ? vs.getPaddingTop() : 0
  })

  // 底部占位高度
  const virtualPaddingBottom = computed(() => {
    if (!isVirtualScroll.value)
      return 0
    void virtualScrollVersion.value
    const vs = virtualScroll.value
    if (vs)
      return vs.getPaddingBottom()
    // 实例创建前：未渲染的行按预估行高占位
    const rendered = initialVirtualItems.value.length
    return Math.max((props.tableData?.length ?? 0) - rendered, 0) * virtualScrollEstimateSize.value
  })

  /*
   * VS-03：虚拟滚动关心的行身份（行数 + 行 key）。
   * 只在增删、重排、替换行时变化；编辑单元格只修改行对象的字段，不会触发。
   */
  const virtualRowIdentity = computed(() => ({
    count: props.tableData?.length ?? 0,
    keys: allRowKeys.value,
  }))

  /*
   * VS-06：表头 / 表尾对虚拟滚动可视区的影响
   * - 固定表头 / 表尾（sticky）遮住滚动容器的顶部 / 底部：从容器高度中减去（stickyStart / stickyEnd）
   * - 非固定表头随内容滚走：第 0 行从表头高度处开始（scrollMargin）
   */
  const virtualScrollViewportOffsets = computed(() => {
    const { fixedHeader, fixedFooter } = props
    return {
      scrollMargin: fixedHeader ? 0 : headerTotalHeight.value,
      stickyStart: fixedHeader ? headerTotalHeight.value : 0,
      stickyEnd: fixedFooter ? footerTotalHeight.value : 0,
    }
  })

  // 当前渲染的行数据
  const actualRenderTableData = computed(() => {
    if (isVirtualScroll.value)
      return virtualItems.value.map(item => (props.tableData as any[])[item.index])
    return props.tableData as any[]
  })

  /**
   * 创建 TanStack 实例。必须在滚动容器挂载之后调用（mounted / nextTick）
   */
  function initTanStackVirtualScroll() {
    // 不重复创建
    if (virtualScroll.value)
      return
    if (!isVirtualScroll.value)
      return
    if (!scrollElement.value)
      return

    const { virtualScrollOption, tableData } = props
    const scrollingCb = isFunction(virtualScrollOption?.scrolling) ? virtualScrollOption.scrolling : undefined

    // markRaw：实例内部状态由 TanStack 自己管理，通过 virtualScrollVersion 通知 Vue 重新渲染
    virtualScroll.value = markRaw(createVirtualScroll({
      count: tableData?.length ?? 0,
      getScrollElement: () => scrollElement.value,
      estimateSize: virtualScrollEstimateSize.value,
      overscan: virtualScrollOverscan.value,
      // 每次读取当前的 tableData，整体替换数组（同样的 key）时无需更新
      getItemKey: (index: number) => getVirtualRowKey(index),
      onChange: () => {
        virtualScrollVersion.value++
      },
      onScrolling: scrollingCb,
      ...virtualScrollViewportOffsets.value,
    }))

    // 首次渲染
    virtualScrollVersion.value++
  }

  // 销毁 TanStack 实例（移除滚动监听与 ResizeObserver）
  function destroyTanStackVirtualScroll() {
    if (virtualScroll.value) {
      virtualScroll.value.destroy()
      virtualScroll.value = null
      virtualScrollVersion.value++
    }
  }

  // 每行 <tbody> 的 ref 回调：交给 TanStack 测量。函数引用稳定，Vue 不会在每次渲染时重新绑定 ref
  function measureVirtualRow(el: HTMLElement | null) {
    virtualScroll.value?.measureElement(el)
  }

  /*
   * VS-03：行数或行 key 变化时才更新虚拟滚动（不再 deep 监听 tableData）。
   * 编辑单元格后的行高变化由 TanStack 对每行 <tbody> 的 ResizeObserver（measureElement）测量；
   * 已测量的行高按 key 缓存，重排后仍然有效，因此不再调用 measure() 清空全部缓存。
   */
  watch(virtualRowIdentity, (newVal, oldVal) => {
    if (!isVirtualScroll.value)
      return
    if (
      oldVal
      && newVal.count === oldVal.count
      && newVal.keys.length === oldVal.keys.length
      && newVal.keys.every((key, index) => key === oldVal.keys[index])
    ) {
      return
    }

    if (virtualScroll.value) {
      // 传入新的 getItemKey，TanStack 会按新的 key 顺序重新排布（行高缓存保留）
      virtualScroll.value.setOptions({
        count: newVal.count,
        getItemKey: (index: number) => getVirtualRowKey(index),
      })
    }
    else {
      // 实例尚未创建（例如之前没有滚动容器），数据变化时再尝试创建
      nextTick(() => initTanStackVirtualScroll())
    }
  })

  // VS-06：virtualScrollOption 的后续变化同步给 TanStack
  watch(virtualScrollOverscan, (overscan) => {
    virtualScroll.value?.setOptions({ overscan })
  })
  watch(virtualScrollEstimateSize, (estimateSize) => {
    virtualScroll.value?.setOptions({ estimateSize })
  })
  watch(() => props.virtualScrollOption?.scrolling, (scrolling) => {
    virtualScroll.value?.setOptions({ onScrolling: isFunction(scrolling) ? scrolling : null })
  })
  watch(virtualScrollViewportOffsets, (offsets) => {
    virtualScroll.value?.setOptions(offsets)
  })

  // 允许按需开启 / 关闭虚拟滚动
  watch(() => props.virtualScrollOption?.enable, (enable) => {
    if (enable)
      nextTick(() => initTanStackVirtualScroll())
    else
      destroyTanStackVirtualScroll()
  })

  onMounted(() => {
    if (isVirtualScroll.value)
      nextTick(() => initTanStackVirtualScroll())
  })

  onUnmounted(() => {
    destroyTanStackVirtualScroll()
  })

  return {
    virtualScroll,
    virtualScrollVersion,
    isVirtualScroll,
    virtualScrollOverscan,
    virtualScrollEstimateSize,
    virtualItems,
    initialVirtualItems,
    virtualTotalSize,
    virtualPaddingTop,
    virtualPaddingBottom,
    virtualRowIdentity,
    virtualScrollViewportOffsets,
    actualRenderTableData,
    initTanStackVirtualScroll,
    destroyTanStackVirtualScroll,
    getVirtualRowKey,
    measureVirtualRow,
  }
}
