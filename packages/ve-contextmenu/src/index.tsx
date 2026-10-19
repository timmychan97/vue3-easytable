import eventsOutside from '@vue3-easytable/common/directives/events-outside'
import { ICON_NAMES } from '@vue3-easytable/common/utils/constant'
import { getMousePosition, getViewportOffset } from '@vue3-easytable/common/utils/dom'
import { getRandomId } from '@vue3-easytable/common/utils/random'
import VeIcon from '@vue3-easytable/ve-icon'
import { cloneDeep, debounce } from 'lodash'
import { defineComponent, markRaw } from 'vue'
import {
  COMPS_NAME,
  CONTEXTMENU_NODE_TYPES,
  EMIT_EVENTS,
  INIT_DATA,
  INSTANCE_METHODS,
} from './util/constant'
import { clsName } from './util/index'

export interface Option {
  id: string | number
  label: string
  disabled?: boolean
  children?: Option[]
}

interface InternalOption extends Option {
  type?: string
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
      type: [String, HTMLElement],
      required: true,
    },
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
      /*
            is panels remove
            防止hover后菜单被移除，仍然显示子集菜单的问题
            */
      isPanelsEmptyed: true,
      /*
            本组件在 body 上创建的所有菜单容器元素
            options 变化后 id 会重新生成，只靠 panelOptions 无法找回旧容器，所以单独记录
            */
      panelContainerEls: markRaw(new Set<HTMLElement>()),
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
    options: {
      handler(val) {
        if (Array.isArray(val) && val.length > 0) {
          /*
                    如果配置项修改,则重新销毁并创建
                    */
          this.removeAllPanelContainers()
          this.rootContextmenuId = this.getRandomIdWithPrefix()
          this.createInternalOptions()
          this.createPanelOptions({ options: this.internalOptions })
          this.resetContextmenu()
          this.addRootContextmenuPanelToBody()
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
    this.addRootContextmenuPanelToBody()
  },

  beforeUnmount() {
    // 取消未执行的悬浮防抖，避免卸载后再创建子菜单容器
    ;(this.debounceCreatePanelByHover as unknown as ReturnType<typeof debounce>).cancel()
    this.isPanelsEmptyed = true
  },

  unmounted() {
    this.removeContextmenuEvent()
    this.removeAllPanelContainers()
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

    getParentContextmenuPanelEl(contextmenuPanelId: PanelOption['parentId']) {
      let result

      const { panelOptions } = this

      const panelIndex = panelOptions.findIndex(
        x => x.parentId === contextmenuPanelId,
      )
      if (panelIndex > 0) {
        // preview panel's panelId
        const parentPanelId = panelOptions[panelIndex - 1].parentId
        result = document.querySelector<HTMLElement>(`#${parentPanelId}`)
      }
      return result
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

        this.$nextTick(() => {
          // 组件可能已在等待期间卸载
          if (this.$.isUnmounted)
            return

          this.addContextmenuPanelToBody({
            contextmenuId: menu.id,
          })

          this.showContextmenuPanel({
            event,
            contextmenuId: menu.id,
          })
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

    showRootContextmenuPanel(event: MouseEvent) {
      event.preventDefault()

      /*
            等待挂起的更新完成后再显示（MENU-06）
            ve-table 在单元格的 contextmenu 处理函数中同步替换 options，事件随后才冒泡到 eventTarget。
            若立即显示，会用旧的根菜单容器显示，随后 options 的 watcher 会移除该容器并重建，菜单随即消失。
            真实的用户右键在两个监听器之间有微任务检查点，所以只在脚本派发的事件（测试工具、dispatchEvent）中出现。
            $nextTick 会等待当前的刷新（watcher + 重新渲染）完成；没有挂起的更新时只延后一个微任务，仍在绘制前完成。
            */
      this.$nextTick(() => {
        // 组件可能已在等待期间卸载
        if (this.$.isUnmounted)
          return

        const { rootContextmenuId } = this

        if (rootContextmenuId) {
          // refresh contextmenu
          this.resetContextmenu()
          this.showContextmenuPanel({
            event,
            contextmenuId: rootContextmenuId,
            isRootContextmenu: true,
          })
          this.isPanelsEmptyed = false
        }
      })
    },

    showContextmenuPanel({ event, contextmenuId, isRootContextmenu }: { event: MouseEvent, contextmenuId: string | number, isRootContextmenu?: boolean }) {
      const { getParentContextmenuPanelEl } = this

      const contextmenuPanelEl = document.querySelector<HTMLElement>(
        `#${contextmenuId}`,
      )

      if (contextmenuPanelEl) {
        // remove first
        contextmenuPanelEl.innerHTML = ''

        contextmenuPanelEl.appendChild(this.$refs[contextmenuId] as HTMLElement)

        contextmenuPanelEl.style.position = 'absolute'
        contextmenuPanelEl.classList.add(clsName('popper'))

        const { width: currentPanelWidth, height: currentPanelHeight }
                    = contextmenuPanelEl.getBoundingClientRect()
        if (isRootContextmenu) {
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

          this.setPanelPosition(contextmenuPanelEl, {
            x: panelX,
            y: panelY,
            width: currentPanelWidth,
            height: currentPanelHeight,
          })
        }
        else {
          const parentContextmenuPanelEl
                        = getParentContextmenuPanelEl(contextmenuId)

          if (parentContextmenuPanelEl) {
            /*
                  菜单容器是 body 上的绝对定位元素，位置使用文档坐标（含滚动距离）
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

            this.setPanelPosition(contextmenuPanelEl, {
              x: panelX,
              y: panelY,
              width: currentPanelWidth,
              height: currentPanelHeight,
            })
          }
        }
      }
    },

    /*
          设置菜单位置（文档坐标），并限制在当前可视区域内（MENU-05）
          两侧都放不下时平移到视口内；比视口还大时贴住视口左 / 上边缘，保证菜单开头可见
          没有布局信息（视口尺寸为 0）时不做限制
          */
    setPanelPosition(panelEl: HTMLElement, { x, y, width, height }: { x: number, y: number, width: number, height: number }) {
      const doc = document.documentElement
      const scrollX = window.pageXOffset || doc.scrollLeft || 0
      const scrollY = window.pageYOffset || doc.scrollTop || 0
      const viewportWidth = doc.clientWidth
      const viewportHeight = doc.clientHeight

      const clamp = (value: number, scroll: number, viewportSize: number, size: number) => {
        if (!viewportSize)
          return value
        return Math.max(scroll, Math.min(value, scroll + viewportSize - size))
      }

      panelEl.style.left = `${clamp(x, scrollX, viewportWidth, width)}px`
      panelEl.style.top = `${clamp(y, scrollY, viewportHeight, height)}px`
    },

    emptyContextmenuPanels() {
      /*
            wait for children panel clicked by setTimeout
            如果点击的是非 root panel 不关闭
            */
      setTimeout(() => {
        if (this.isChildrenPanelsClicked) {
          this.isChildrenPanelsClicked = false
        }
        else {
          this.removeOrEmptyPanels()
          this.isPanelsEmptyed = true
        }
      })
    },

    // remove or empty panels
    removeOrEmptyPanels(isRemove?: boolean) {
      const { panelOptions } = this

      panelOptions.forEach((panelOption) => {
        const contextmenuPanelEl = document.querySelector(
          `#${panelOption.parentId}`,
        )
        if (contextmenuPanelEl) {
          if (isRemove)
            contextmenuPanelEl.remove()

          else
            contextmenuPanelEl.innerHTML = ''
        }
      })
    },

    resetContextmenu() {
      this.panelOptions = []
      this.createPanelOptions({ options: this.internalOptions })
    },

    addContextmenuPanelToBody({ contextmenuId }: { contextmenuId: string | number }) {
      const contextmenuPanelEl = document.querySelector(
        `#${contextmenuId}`,
      )

      if (contextmenuPanelEl) {
        return false
      }
      else {
        const containerEl = document.createElement('div')

        containerEl.setAttribute('id', `${contextmenuId}`)

        document.body.appendChild(containerEl)
        this.panelContainerEls.add(containerEl)
      }
    },

    // 移除本组件创建的所有菜单容器（包括 id 已失效的旧容器）
    removeAllPanelContainers() {
      this.panelContainerEls.forEach(el => el.remove())
      this.panelContainerEls.clear()
    },

    addRootContextmenuPanelToBody() {
      if (this.rootContextmenuId) {
        this.addContextmenuPanelToBody({
          contextmenuId: this.rootContextmenuId,
        })
      }
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
    } = this
    const debounceCreatePanelByHover = this.debounceCreatePanelByHover as typeof this.createPanelByHover

    const contextmenuProps = {
      class: ['ve-contextmenu'],
      style: {
        display: 'none',
      },
    }

    return (
      <div {...contextmenuProps}>
        {panelOptions.map((panelOption, panelIndex) => {
          const contextmenuPanelProps = {
            ref: `${panelOption.parentId}`,
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
          return (
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
                          setTimeout(() => {
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
        })}
      </div>
    )
  },
})
