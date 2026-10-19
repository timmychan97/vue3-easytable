import type { PopperPosition } from '@vue3-easytable/common/popper'
import eventsOutside from '@vue3-easytable/common/directives/events-outside'
import { clampToViewport, getViewportRect, usePopper } from '@vue3-easytable/common/popper'
import { ICON_NAMES } from '@vue3-easytable/common/utils/constant'
import { getMousePosition, getViewportOffset } from '@vue3-easytable/common/utils/dom'
import { getRandomId } from '@vue3-easytable/common/utils/random'
import VeIcon from '@vue3-easytable/ve-icon'
import { cloneDeep, debounce } from 'lodash'
import { defineComponent, markRaw, ref } from 'vue'
import {
  COMPS_NAME,
  CONTEXTMENU_NODE_TYPES,
  EMIT_EVENTS,
  INIT_DATA,
  INSTANCE_METHODS,
} from './util/constant'
import { clsName } from './util/index'

export interface Option {
  // 可选：组件内部会为每个菜单生成 id（MENU-09）
  id?: string | number
  // 菜单类型：点击时作为 on-node-click 事件的参数；'SEPARATOR' 表示分隔线（MENU-10）
  type?: string
  // 分隔线不需要 label（MENU-10）
  label?: string
  disabled?: boolean
  children?: Option[]
}

interface InternalOption extends Option {
  // 内部选项的 id 总是已生成
  id: string | number
  deep: number
  hasChildren: boolean
  children?: InternalOption[]
}

interface PanelOption {
  id?: number
  parentId?: InternalOption['id']
  parentDeep?: number
  menus: InternalOption[]
}

// 等待渲染完成后再定位的菜单：根菜单按鼠标位置，子菜单按父菜单位置
interface PositionRequest {
  isRoot: boolean
  contextmenuId?: InternalOption['id']
  event: MouseEvent
}

// 不需要响应式的内部状态
interface PopperState {
  requests: PositionRequest[]
  // 最近一次打开根菜单的右键事件（options 在显示期间变化时用它重新定位）
  rootEvent: MouseEvent | null
  // 关闭菜单的定时器（重新打开或卸载时清除）
  hideTimers: Set<ReturnType<typeof setTimeout>>
}

export default defineComponent({
  name: COMPS_NAME.VE_CONTEXTMENU,
  directives: {
    'events-outside': eventsOutside,
  },
  props: {
    options: {
      type: Array as PropType<Option[]>,
      required: true,
    },
    /*
      event target
      contextmenu event will register on it
      */
    eventTarget: {
      // 不能直接引用 HTMLElement：Node（SSR）中没有该全局变量，导入时会崩溃
      type: [String, Object] as PropType<string | HTMLElement>,
      required: true,
    },
  },
  setup() {
    /*
      is panels remove
      true 表示菜单已关闭（防止hover后菜单被移除，仍然显示子集菜单的问题）
      */
    const isPanelsEmptyed = ref(true)

    // 菜单由 <Teleport> 渲染到 body，不再手动创建容器或移动 DOM（MOD-09）；位置由本组件计算
    const popper = usePopper(null, {
      visible: () => !isPanelsEmptyed.value,
      placement: 'manual',
      name: COMPS_NAME.VE_CONTEXTMENU,
    })

    return { isPanelsEmptyed, popper }
  },
  data() {
    return {
      internalOptions: [] as InternalOption[],
      panelOptions: [] as PanelOption[],
      // event target element
      eventTargetEl: null as (HTMLElement | null),
      // root contextmenu id
      rootContextmenuId: '',
      /*
            is children panels clicked
            如果点击了则不关闭 panels
            */
      isChildrenPanelsClicked: false,
      /*
            is panel right direction
            决定了子 panel 默认展示方向
            */
      isPanelRightDirection: true,
      // 每个菜单的位置（按 parentId），渲染到菜单的 style 上
      panelPositions: {} as Record<string, PopperPosition>,
      // 递增后在渲染完成（post）时处理 popperState.requests
      positionVersion: 0,
      popperState: markRaw({
        requests: [],
        rootEvent: null,
        hideTimers: new Set(),
      } as PopperState),
    }
  },

  computed: {
    // active menus ids
    activeMenuIds() {
      const { panelOptions } = this

      return panelOptions.map(x => x.parentId)
    },
  },

  watch: {
    /*
      只计算菜单数据，不访问 DOM（SSR 中也会执行，MENU-08）
      菜单显示期间 options 变化（例如 ve-table 在右键事件冒泡到 eventTarget 之前替换 options，MENU-06）
      时就地重建并重新定位，菜单保持打开
      */
    options: {
      handler(val) {
        if (Array.isArray(val) && val.length > 0) {
          this.rootContextmenuId = this.getRandomIdWithPrefix()
          this.createInternalOptions()
          this.resetContextmenu()
          if (!this.isPanelsEmptyed && this.popperState.rootEvent) {
            this.panelPositions = {}
            this.requestPanelPosition({ isRoot: true, event: this.popperState.rootEvent })
          }
        }
      },
      immediate: true,
    },
    /*
          首次注册放在 mounted：字符串选择器在 created 阶段可能还查询不到元素（MENU-02）
          之后每次变化都先移除旧元素上的监听，再注册到新元素
          */
    eventTarget() {
      this.registerContextmenuEvent()
    },
    // 渲染完成后（菜单已在 body 中，可以测量）计算位置；在同一次刷新中重新渲染，绘制前就位
    positionVersion: {
      handler() {
        this.flushPanelPositions()
      },
      flush: 'post',
    },
  },

  created() {
    // bug fixed #467
    this.debounceCreatePanelByHover = debounce(
      this.createPanelByHover,
      300,
    )
  },

  mounted() {
    this.registerContextmenuEvent()
  },

  beforeUnmount() {
    // 取消未执行的悬浮防抖与关闭定时器，避免卸载后再修改菜单
    this.cancelHoverDebounce()
    this.clearHideTimers()
    this.isPanelsEmptyed = true
  },

  unmounted() {
    this.removeContextmenuEvent()
  },

  methods: {
    getRandomIdWithPrefix() {
      return clsName(getRandomId())
    },

    hasChildren(option: InternalOption) {
      return Array.isArray(option.children) && option.children.length > 0
    },

    getPanelOptionByMenuId(options: InternalOption[], menuId: InternalOption['id']): InternalOption[] | undefined {
      for (let i = 0; i < options.length; i++) {
        if (options[i].id === menuId)
          return options[i].children

        if (options[i].children) {
          const panelOption = this.getPanelOptionByMenuId(
            options[i].children!,
            menuId,
          )
          if (panelOption)
            return panelOption
        }
      }
    },

    // 菜单的外层元素（<Teleport> 渲染到 body 中的 .ve-contextmenu-popper）
    getPopperEl(contextmenuId: PanelOption['parentId']): HTMLElement | undefined {
      return this.$refs[`popper-${contextmenuId}`] as HTMLElement | undefined
    },

    getParentContextmenuPanelEl(contextmenuPanelId: PanelOption['parentId']): HTMLElement | undefined {
      let result: HTMLElement | undefined

      const { panelOptions } = this

      const panelIndex = panelOptions.findIndex(
        x => x.parentId === contextmenuPanelId,
      )
      if (panelIndex > 0) {
        // preview panel's panelId
        const parentPanelId = panelOptions[panelIndex - 1].parentId
        result = this.getPopperEl(parentPanelId)
      }
      return result
    },

    cancelHoverDebounce() {
      ;(this.debounceCreatePanelByHover as unknown as ReturnType<typeof debounce>).cancel()
    },

    createPanelByHover({ event, menu }: { event: MouseEvent, menu: InternalOption }) {
      const { internalOptions, panelOptions } = this

      // 如果被移除则不创建
      if (this.isPanelsEmptyed)
        return false

      // has already exists
      if (panelOptions.findIndex(x => x.parentId === menu.id) > -1)
        return false

      /*
            移除 panel 深度大于等于当前悬浮菜单的。从后往前删除
            remove panels
            */
      const deletePanelDeeps = panelOptions
        .filter(x => x.parentDeep! >= menu.deep)
        .map(x => x.parentDeep)
        .reverse()

      if (deletePanelDeeps.length) {
        for (let i = deletePanelDeeps.length - 1; i >= 0; i--) {
          const delIndex = panelOptions.findIndex(
            x => x.parentDeep === deletePanelDeeps[i],
          )
          if (delIndex > -1)
            this.panelOptions.splice(delIndex, 1)
        }
      }

      const panelOption = this.getPanelOptionByMenuId(
        internalOptions,
        menu.id,
      )

      if (panelOption) {
        this.createPanelOptions({
          options: panelOption,
          currentMenu: menu,
        })

        // 子菜单渲染完成后再按父菜单的位置定位
        this.requestPanelPosition({
          isRoot: false,
          contextmenuId: menu.id,
          event,
        })
      }
    },

    createPanelOptions({ options, currentMenu }: { options: InternalOption[], currentMenu?: InternalOption }) {
      const { hasChildren, rootContextmenuId } = this

      if (Array.isArray(options)) {
        //
        const menus = options.map((option) => {
          return {
            ...option,
            hasChildren: hasChildren(option),
          }
        })

        this.panelOptions.push({
          parentId: currentMenu ? currentMenu.id : rootContextmenuId,
          parentDeep: currentMenu
            ? currentMenu.deep
            : INIT_DATA.PARENT_DEEP,
          menus,
        })
      }
    },

    createInternalOptionsRecursion(options: Option, deep = 0) {
      const opts = options as InternalOption
      opts.id = this.getRandomIdWithPrefix()
      opts.deep = deep
      deep++
      if (Array.isArray(opts.children)) {
        opts.children.map((option) => {
          return this.createInternalOptionsRecursion(option, deep)
        })
      }

      return opts
    },

    createInternalOptions() {
      this.internalOptions = cloneDeep(this.options).map((option) => {
        return this.createInternalOptionsRecursion(option)
      })
    },

    /*
          打开根菜单
          只修改状态，菜单在下一次渲染时出现，并在渲染完成后按鼠标位置定位（MENU-06）：
          ve-table 在单元格的 contextmenu 处理函数中同步替换 options，事件随后才冒泡到 eventTarget。
          options 的 watcher 在渲染之前执行，所以菜单总是用新的 options 显示。
          */
    showRootContextmenuPanel(event: MouseEvent) {
      event.preventDefault()

      // 重新打开时取消尚未执行的关闭与悬浮，避免刚打开的菜单被旧的定时器关闭
      this.clearHideTimers()
      this.cancelHoverDebounce()
      this.isChildrenPanelsClicked = false

      // refresh contextmenu
      this.resetContextmenu()
      this.panelPositions = {}
      this.popperState.rootEvent = event
      this.isPanelsEmptyed = false
      this.requestPanelPosition({ isRoot: true, event })
    },

    requestPanelPosition(request: PositionRequest) {
      const { requests } = this.popperState
      const index = requests.findIndex(x =>
        x.isRoot === request.isRoot && x.contextmenuId === request.contextmenuId,
      )
      if (index > -1)
        requests.splice(index, 1)
      requests.push(request)
      this.positionVersion++
    },

    // 处理等待定位的菜单（渲染完成后调用）
    flushPanelPositions() {
      const requests = this.popperState.requests.splice(0)

      if (this.isPanelsEmptyed)
        return

      requests.forEach((request) => {
        if (request.isRoot) {
          const panelEl = this.rootContextmenuId ? this.getPopperEl(this.rootContextmenuId) : undefined
          // 没有可显示的菜单（例如 options 为空）
          if (!panelEl) {
            this.hidePanels()
            return
          }
          this.setRootPanelPosition(panelEl, request.event)
        }
        else {
          const panelEl = this.getPopperEl(request.contextmenuId)
          if (panelEl)
            this.setChildPanelPosition(panelEl, request.contextmenuId!, request.event)
        }
      })
    },

    // 根菜单：显示在鼠标位置，右侧 / 下方空间不够时显示在左侧 / 上方
    setRootPanelPosition(panelEl: HTMLElement, event: MouseEvent) {
      const { width: currentPanelWidth, height: currentPanelHeight }
                  = panelEl.getBoundingClientRect()

      const {
        left: clickLeft,
        top: clickTop,
        right: clickRight,
        bottom: clickBottom,
      } = getMousePosition(event)

      let panelX = 0
      let panelY = 0

      // 右方宽度够显示
      if (clickRight >= currentPanelWidth) {
        panelX = clickLeft
        this.isPanelRightDirection = true
      }
      // 右方宽度不够显示在鼠标点击左方
      else {
        panelX = clickLeft - currentPanelWidth
        this.isPanelRightDirection = false
      }

      // 下方高度够显示
      if (clickBottom >= currentPanelHeight)
        panelY = clickTop

      // 下方高度不够显示在鼠标点击上方
      else
        panelY = clickTop - currentPanelHeight

      this.setPanelPosition(this.rootContextmenuId, {
        x: panelX,
        y: panelY,
        width: currentPanelWidth,
        height: currentPanelHeight,
      })
    },

    // 子菜单：紧贴父菜单右侧 / 左侧
    setChildPanelPosition(panelEl: HTMLElement, contextmenuId: InternalOption['id'], event: MouseEvent) {
      const parentContextmenuPanelEl
                  = this.getParentContextmenuPanelEl(contextmenuId)
      if (!parentContextmenuPanelEl)
        return

      const { width: currentPanelWidth, height: currentPanelHeight }
                  = panelEl.getBoundingClientRect()

      /*
            菜单是 body 上的绝对定位元素，位置使用文档坐标（含滚动距离）
            left / right 是视口内左右两侧的剩余空间，只用于判断方向（MENU-05）
            */
      const {
        offsetLeft: parentPanelOffsetLeft,
        left: parentPanelLeft,
        right: parentPanelRight,
      } = getViewportOffset(parentContextmenuPanelEl)

      const { top: clickTop, bottom: clickBottom }
                      = getMousePosition(event)

      const { width: parentPanelWidth }
                      = parentContextmenuPanelEl.getBoundingClientRect()

      // 紧贴父菜单右侧 / 左侧（向左展开时使用当前菜单自身的宽度）
      const rightSideX = parentPanelOffsetLeft + parentPanelWidth
      const leftSideX = parentPanelOffsetLeft - currentPanelWidth

      let panelX = 0
      let panelY = 0

      // 如果默认展示在右方向
      if (this.isPanelRightDirection) {
        // 右方宽度够显示，否则显示在父菜单左方
        panelX = parentPanelRight >= currentPanelWidth ? rightSideX : leftSideX
      }
      // 如果默认展示在左方向
      else {
        // 左方宽度够显示，否则显示在父菜单右方
        panelX = parentPanelLeft >= currentPanelWidth ? leftSideX : rightSideX
      }

      // 下方高度够显示
      if (clickBottom >= currentPanelHeight)
        panelY = clickTop

      // 下方高度不够显示在鼠标点击上方
      else
        panelY = clickTop - currentPanelHeight

      this.setPanelPosition(contextmenuId, {
        x: panelX,
        y: panelY,
        width: currentPanelWidth,
        height: currentPanelHeight,
      })
    },

    /*
          设置菜单位置（文档坐标），并限制在当前可视区域内（MENU-05）
          比视口还高的菜单限制为视口高度，可以滚动（MENU-07）
          */
    setPanelPosition(contextmenuId: InternalOption['id'], box: { x: number, y: number, width: number, height: number }) {
      this.panelPositions[contextmenuId] = clampToViewport(box, getViewportRect())
    },

    // 关闭菜单的定时器统一记录，重新打开或卸载时清除
    addHideTimer(callback: () => void, delay?: number) {
      const { hideTimers } = this.popperState
      const timer = setTimeout(() => {
        hideTimers.delete(timer)
        callback()
      }, delay)
      hideTimers.add(timer)
    },

    clearHideTimers() {
      const { hideTimers } = this.popperState
      hideTimers.forEach(timer => clearTimeout(timer))
      hideTimers.clear()
    },

    emptyContextmenuPanels() {
      // 已关闭的菜单不需要处理（根菜单的 events-outside 在关闭状态下也会收到页面上的每一次点击）
      if (this.isPanelsEmptyed)
        return

      /*
            wait for children panel clicked by setTimeout
            如果点击的是非 root panel 不关闭
            */
      this.addHideTimer(() => {
        if (this.isChildrenPanelsClicked)
          this.isChildrenPanelsClicked = false

        else if (!this.isPanelsEmptyed)
          this.hidePanels()
      })
    },

    // 关闭所有菜单：<Teleport> 被禁用，菜单回到组件内部并隐藏
    hidePanels() {
      this.cancelHoverDebounce()
      this.isPanelsEmptyed = true
      this.popperState.rootEvent = null
      this.resetContextmenu()
      this.panelPositions = {}
    },

    resetContextmenu() {
      this.panelOptions = []
      this.createPanelOptions({ options: this.internalOptions })
    },

    // 注册前先移除旧元素上的监听，保证同一时间只监听一个元素
    registerContextmenuEvent() {
      this.removeContextmenuEvent()

      const { eventTarget } = this

      if (typeof eventTarget === 'string')
        this.eventTargetEl = eventTarget ? document.querySelector<HTMLElement>(eventTarget) : null

      else
        this.eventTargetEl = (eventTarget as HTMLElement) || null

      if (this.eventTargetEl) {
        // contextmenu is on the current element
        this.eventTargetEl.addEventListener(
          'contextmenu',
          this.showRootContextmenuPanel,
        )
      }
    },

    removeContextmenuEvent() {
      if (this.eventTargetEl) {
        this.eventTargetEl.removeEventListener(
          'contextmenu',
          this.showRootContextmenuPanel,
        )
        this.eventTargetEl = null
      }
    },

    // hide contextmenu
    [INSTANCE_METHODS.HIDE_CONTEXTMENU]() {
      this.emptyContextmenuPanels()
    },
  },

  render() {
    const {
      panelOptions,
      activeMenuIds,
      hasChildren,
      emptyContextmenuPanels,
      isPanelsEmptyed,
      panelPositions,
    } = this
    const debounceCreatePanelByHover = this.debounceCreatePanelByHover as typeof this.createPanelByHover
    const { isTeleported, renderTeleport } = this.popper

    const contextmenuProps = {
      class: ['ve-contextmenu'],
      style: {
        display: 'none',
      },
    }

    const panels = panelOptions.map((panelOption, panelIndex) => {
      const contextmenuPanelProps = {
        class: {
          [clsName('panel')]: true,
        },
        onClick: () => {
          if (panelIndex !== 0)
            this.isChildrenPanelsClicked = true
        },
        onContextmenu: (e: Event) => {
          e.preventDefault()
        },
      }
      const panelNode = (
        <div
          {...contextmenuPanelProps}
          v-events-outside={{
            events: ['click'],
            callback: () => {
              // only for root panel
              if (panelIndex === 0)
                emptyContextmenuPanels()
            },
          }}
        >
          <ul class={clsName('list')}>
            {panelOption.menus.map((menu) => {
              let contextmenuNodeProps

              if (
                menu.type
                !== CONTEXTMENU_NODE_TYPES.SEPARATOR
              ) {
                contextmenuNodeProps = {
                  class: {
                    [clsName('node')]: true,
                    [clsName('node-active')]:
                                                activeMenuIds.includes(
                                                  menu.id,
                                                ),
                    [clsName('node-disabled')]:
                                                menu.disabled,
                  },
                  onMouseover: (event: MouseEvent) => {
                    // disable
                    if (!menu.disabled) {
                      debounceCreatePanelByHover(
                        {
                          event,
                          menu,
                        },
                      )
                    }
                  },
                  onClick: () => {
                    if (
                      !menu.disabled
                      && !hasChildren(menu)
                    ) {
                      this.$emit(
                        EMIT_EVENTS.ON_NODE_CLICK,
                        menu.type,
                      )
                      this.addHideTimer(() => {
                        emptyContextmenuPanels()
                      }, 50)
                    }
                  },
                }
              }
              // separator
              else {
                //
                contextmenuNodeProps = {
                  class: {
                    [clsName(
                      'node-separator',
                    )]: true,
                  },
                }
              }

              if (
                menu.type
                !== CONTEXTMENU_NODE_TYPES.SEPARATOR
              ) {
                return (
                  <li {...contextmenuNodeProps}>
                    <span
                      class={clsName(
                        'node-label',
                      )}
                    >
                      {menu.label}
                    </span>
                    {menu.hasChildren && (
                      <VeIcon
                        class={clsName(
                          'node-icon-postfix',
                        )}
                        name={
                          ICON_NAMES.RIGHT_ARROW
                        }
                      />
                    )}
                  </li>
                )
              }
              else {
                return (
                  <li {...contextmenuNodeProps}></li>
                )
              }
            })}
          </ul>
        </div>
      )

      // 第一次显示之前（包括 SSR）菜单隐藏在组件内部，不需要外层定位元素
      if (!isTeleported.value)
        return panelNode

      const position = panelPositions[panelOption.parentId!]
      const popperProps = {
        key: panelOption.parentId,
        ref: `popper-${panelOption.parentId}`,
        id: String(panelOption.parentId),
        class: { [clsName('popper')]: !isPanelsEmptyed },
        style: {
          position: 'absolute' as const,
          left: position ? `${position.left}px` : undefined,
          top: position ? `${position.top}px` : undefined,
          maxHeight: position?.maxHeight ? `${position.maxHeight}px` : undefined,
        },
      }
      return <div {...popperProps}>{panelNode}</div>
    })

    /*
      第一次显示之后由 <Teleport> 渲染：显示时在 body 中，关闭后回到组件内部并隐藏
      */
    return (
      <div {...contextmenuProps}>
        {isTeleported.value ? renderTeleport(panels) : panels}
      </div>
    )
  },
})
