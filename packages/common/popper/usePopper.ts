import type { ComputedRef, MaybeRefOrGetter, Ref, VNode, VNodeArrayChildren } from 'vue'
import type { PopperPosition, ViewportRect } from './position'
import { computed, h, onMounted, ref, shallowRef, Teleport, toValue, watch } from 'vue'
import { getViewportOffset, getViewportOffsetWithinContainer } from '../utils/dom'
import { getBottomStartPosition } from './position'

// 弹出层挂载目标：选择器字符串或元素；不传时为 document.body
export type PopperAppendTo = string | HTMLElement | null | undefined

/*
  'bottom-start'：由 usePopper 定位在触发元素下方（下拉框）
  'manual'：组件自己计算位置（例如右键菜单按鼠标位置定位）
*/
export type PopperPlacement = 'bottom-start' | 'manual'

export interface UsePopperOptions {
  // 弹出层是否显示
  visible: MaybeRefOrGetter<boolean>
  appendTo?: MaybeRefOrGetter<PopperAppendTo>
  placement?: PopperPlacement
  // 'bottom-start' 时需要：弹出层根元素（用于测量尺寸）
  popperRef?: Ref<HTMLElement | null | undefined>
  // 弹出层与触发元素之间的距离
  offset?: MaybeRefOrGetter<number>
  // 组件名，用于警告信息
  name?: string
}

/*
  解析弹出层的挂载目标（只能在挂载后调用：需要 document）
  字符串按选择器查找，元素直接使用，其余情况使用 document.body。
  选择器找不到元素时给出警告并回退到 document.body（DD-06）。
*/
export function resolveAppendTo(appendTo: PopperAppendTo, name = 'popper'): HTMLElement {
  if (typeof appendTo === 'string' && appendTo.length > 0) {
    const el = document.querySelector<HTMLElement>(appendTo)
    if (el)
      return el

    console.warn(
      `[${name}] popperAppendTo "${appendTo}" does not match any element; falling back to document.body.`,
    )
    return document.body
  }

  if (appendTo && typeof (appendTo as HTMLElement).appendChild === 'function')
    return appendTo as HTMLElement

  return document.body
}

// 当前可视区域（文档坐标）
export function getViewportRect(): ViewportRect {
  const doc = document.documentElement
  return {
    scrollX: window.pageXOffset || doc.scrollLeft || 0,
    scrollY: window.pageYOffset || doc.scrollTop || 0,
    width: doc.clientWidth,
    height: doc.clientHeight,
  }
}

export interface UsePopperReturn {
  isMounted: Readonly<Ref<boolean>>
  // 挂载后解析出的目标元素（SSR 与挂载前为 null）
  appendToEl: Readonly<Ref<HTMLElement | null>>
  isAppendToBody: ComputedRef<boolean>
  // 是否已经通过 <Teleport> 渲染（第一次显示之后）
  isTeleported: ComputedRef<boolean>
  teleportProps: ComputedRef<{ to: string | HTMLElement, disabled: boolean }>
  // 'bottom-start' 计算出的位置（未定位时为 null）
  position: Readonly<Ref<PopperPosition | null>>
  // 重新计算 'bottom-start' 的位置
  update: () => void
  // 用 <Teleport> 包裹弹出层内容
  renderTeleport: (children: VNodeArrayChildren) => VNode
}

/*
  弹出层（下拉框、右键菜单）共用的 <Teleport> 管理（MOD-09）
  组件不再自己在 body 上创建容器、也不再手动移动 Vue 渲染的 DOM，全部交给 <Teleport>。

  - 第一次显示之前（包括 SSR 与 hydration）不渲染 <Teleport>，弹出层内容以隐藏状态留在组件内部，
    由组件自己用 isTeleported 判断。禁用状态的 <Teleport> 在 hydration 时会把目标元素（body）中
    无关的第一个节点当作锚点，卸载时将其删除，所以不能在 SSR 中渲染 <Teleport>。
  - 第一次显示之后改为 <Teleport>：显示时移到目标元素中，隐藏时 disabled，内容回到组件内部（保留组件状态）。
  - 目标元素在挂载后解析（SSR 安全），选择器找不到时回退到 body 并警告（DD-06）。
  - 'bottom-start' 时在显示后（渲染完成的 post 阶段，绘制之前）计算位置，显示期间监听滚动与窗口大小变化。
    隐藏或卸载时移除监听；没有定时器。
*/
export function usePopper(
  triggerRef: Ref<HTMLElement | null | undefined> | null,
  options: UsePopperOptions,
): UsePopperReturn {
  const { placement = 'manual', name } = options

  const isMounted = ref(false)
  const appendToEl = shallowRef<HTMLElement | null>(null)
  const hasOpened = ref(false)
  const position = ref<PopperPosition | null>(null)

  const visible = computed(() => !!toValue(options.visible))

  // 不能访问 document：渲染函数在 SSR 中也会读取
  const isAppendToBody = computed(() => !appendToEl.value || appendToEl.value.tagName === 'BODY')

  const isTeleported = computed(() => isMounted.value && (hasOpened.value || visible.value))

  const teleportProps = computed(() => ({
    to: appendToEl.value ?? 'body',
    disabled: !visible.value,
  }))

  onMounted(() => {
    appendToEl.value = resolveAppendTo(toValue(options.appendTo), name)
    isMounted.value = true
  })

  watch(
    () => toValue(options.appendTo),
    (appendTo) => {
      if (isMounted.value)
        appendToEl.value = resolveAppendTo(appendTo, name)
    },
  )

  // 一旦显示过就一直使用 <Teleport>，避免内容在每次显示 / 隐藏时被重新创建
  watch([isMounted, visible], ([mounted, isVisible]) => {
    if (mounted && isVisible)
      hasOpened.value = true
  })

  function update() {
    if (placement !== 'bottom-start' || !visible.value)
      return

    const popperEl = options.popperRef?.value
    const triggerEl = triggerRef?.value
    const containerEl = appendToEl.value
    if (!popperEl || !triggerEl || !containerEl)
      return

    const { width, height } = popperEl.getBoundingClientRect()
    const { height: triggerHeight } = triggerEl.getBoundingClientRect()

    const isBody = isAppendToBody.value
    const { offsetLeft, offsetTop, right, bottom } = isBody
      ? getViewportOffset(triggerEl)
      : getViewportOffsetWithinContainer(triggerEl, containerEl)

    // 不是添加到 body 时需要考虑外层容器的滚动距离
    const scroll = isBody
      ? { left: 0, top: 0 }
      : { left: containerEl.scrollLeft, top: containerEl.scrollTop }

    position.value = getBottomStartPosition({
      trigger: { left: offsetLeft, top: offsetTop, height: triggerHeight, spaceRight: right, spaceBottom: bottom },
      popper: { width, height },
      offset: toValue(options.offset) ?? 0,
      scroll,
    })
  }

  if (placement === 'bottom-start') {
    // post：<Teleport> 已把内容移到目标元素中，可以测量；在同一次刷新中重新渲染，绘制前就位
    watch(
      [isMounted, visible, appendToEl],
      ([mounted, isVisible, containerEl], _old, onCleanup) => {
        if (!mounted || !isVisible || !containerEl)
          return

        update()

        // 挂载到 body 时监听 document 的滚动，否则监听容器自身的滚动
        const scrollTarget: Document | HTMLElement = isAppendToBody.value ? document : containerEl
        scrollTarget.addEventListener('scroll', update)
        window.addEventListener('resize', update)
        onCleanup(() => {
          scrollTarget.removeEventListener('scroll', update)
          window.removeEventListener('resize', update)
        })
      },
      { flush: 'post' },
    )
  }

  function renderTeleport(children: VNodeArrayChildren) {
    return h(Teleport, teleportProps.value, children)
  }

  return {
    isMounted,
    appendToEl,
    isAppendToBody,
    isTeleported,
    teleportProps,
    position,
    update,
    renderTeleport,
  }
}
