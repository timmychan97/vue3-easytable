import type { VNode } from 'vue'
import type { VeDropdownItem } from './type'
import clickoutside from '@vue3-easytable/common/directives/clickoutside'
import { usePopper } from '@vue3-easytable/common/popper'
import { isBoolean, isFunction } from '@vue3-easytable/common/utils'
import { getRandomId } from '@vue3-easytable/common/utils/random'
import VeCheckbox from '@vue3-easytable/ve-checkbox'
import VeRadio from '@vue3-easytable/ve-radio'
import { computed, defineComponent, ref } from 'vue'
import { COMPS_NAME, EMIT_EVENTS } from './util/constant'
import { clsName } from './util/index'

export default defineComponent({
  name: COMPS_NAME.VE_DROPDOWN,
  directives: {
    'click-outside': clickoutside,
  },
  props: {
    // 如果是select 组件将特殊处理
    isSelect: {
      type: Boolean,
      default: false,
    },
    showOperation: {
      type: Boolean,
      default: false,
    },

    width: {
      type: Number,
      default: 90,
    },

    // select的最大宽度(超出隐藏)
    maxWidth: {
      type: Number,
      default: 0,
    },
    // max height
    maxHeight: {
      type: Number,
      default: 1000,
    },

    // 如果为true 会包含 checkbox
    isMultiple: {
      type: Boolean,
      default: false,
    },

    // 用户传入v-model 的值 [{value/label/selected}]
    modelValue: {
      type: Array as PropType<VeDropdownItem[]>,
      default: null,
    },

    // 文本居中方式 left|center|right
    textAlign: {
      type: String as PropType<'left' | 'center' | 'right'>,
      default: 'left',
    },

    // 是否支持输入input
    isInput: {
      type: Boolean,
      default: false,
    },
    // confirm filter text
    confirmFilterText: {
      type: String,
      default: '',
    },
    // confirm filter text
    resetFilterText: {
      type: String,
      default: '',
    },
    // hide by single selection item click
    hideByItemClick: {
      type: Boolean,
      default: false,
    },
    // is show radio when single selection
    showRadio: {
      type: Boolean,
      default: false,
    },
    // 当 isControlled=true ,visible 生效
    visible: {
      type: Boolean,
      default: false,
    },
    // is controlled
    isControlled: {
      type: Boolean,
      default: false,
    },
    // is custom content
    isCustomContent: {
      type: Boolean,
      default: false,
    },
    // instance between dropdown items and trigger element
    defaultInstance: {
      type: Number,
      default: 5,
    },
    // popper append to element
    // 不传时在挂载后使用 document.body（不能在默认值里访问 document，否则 SSR 导入会崩溃）
    popperAppendTo: {
      type: [String, Object] as PropType<string | HTMLElement>,
      default: undefined,
    },
    /*
        before visible change
        如果返回false 则阻止显示或者关闭
        */
    beforeVisibleChange: {
      type: Function,
      default: null,
    },
  },
  setup(props) {
    const internalVisible = ref(false)
    const isDropdownVisible = computed(() => props.isControlled ? props.visible : internalVisible.value)

    // 模板引用（渲染函数中使用同名的字符串 ref）
    const dropdownTrigger = ref<HTMLElement | null>(null)
    const dropdownPopper = ref<HTMLElement | null>(null)

    // 弹出层由 <Teleport> 渲染到 popperAppendTo（默认 body），不再手动创建容器或移动 DOM（MOD-09）
    const popper = usePopper(dropdownTrigger, {
      visible: isDropdownVisible,
      appendTo: () => props.popperAppendTo,
      placement: 'bottom-start',
      popperRef: dropdownPopper,
      offset: () => props.defaultInstance,
      name: COMPS_NAME.VE_DROPDOWN,
    })

    return {
      internalVisible,
      isDropdownVisible,
      dropdownTrigger,
      dropdownPopper,
      popper,
    }
  },
  data() {
    return {
      internalOptions: [] as VeDropdownItem[],
      inputValue: '',
      // 弹出层的 id（挂载后生成，SSR 输出中没有随机 id）
      rootId: '',
      // clickoutside 延迟处理的定时器（卸载时需要清除）
      clickOutsideTimer: null as ReturnType<typeof setTimeout> | null,
    }
  },
  computed: {
    // 获取最大宽度(不设置则是无穷大)
    getMaxWidth() {
      let result = Number.POSITIVE_INFINITY
      const maxWidth = this.maxWidth
      const width = this.width

      if (maxWidth && maxWidth > 0 && maxWidth > width)
        result = maxWidth

      return result
    },
    selectedLabels() {
      return this.internalOptions
        .filter(x => x.selected)
        .map((x) => {
          if (x.selected)
            return x.label
          return undefined
        })
    },
    // operation buttons class
    // 重置按钮只在未确认的勾选和 modelValue 中都没有选中项时显示为禁用（DD-08）
    operationFilterClass() {
      const hasSelection = this.selectedLabels.length > 0
        || (this.modelValue ?? []).some(x => x.selected)
      return {
        [clsName('filter-disable')]: !hasSelection,
      }
    },
    // dropdown items class
    dropdownItemsClass() {
      return {
        [clsName('dd')]: true,
        [clsName('dd-show')]: this.isDropdownVisible,
      }
    },
  },
  watch: {
    modelValue() {
      this.init()
    },
    // 初始值在 mounted 中处理：不能用 immediate，否则 SSR 渲染时也会执行并访问 document
    visible(visible: boolean) {
      this.syncControlledVisible(visible)
    },
  },

  created() {
    this.init()
  },
  mounted() {
    this.rootId = this.getRandomIdWithPrefix()
    this.syncControlledVisible(this.visible)
  },

  beforeUnmount() {
    // 清除待执行的定时器，避免卸载后仍然触发隐藏逻辑
    this.clearClickOutsideTimer()
  },

  methods: {
    init() {
      // 复制每个选项对象：用户确认之前不能修改调用方传入的对象（例如 ve-table 的 column.filter.filterList）
      this.internalOptions = (this.modelValue ?? []).map(x => ({ ...x }))

      if (this.isInput)
        this.setInputValue()
    },

    // operation filter confirm
    confirm() {
      // 使用户传入的v-model 生效
      this.$emit('update:modelValue', this.internalOptions)
      this.$emit(EMIT_EVENTS.FILTER_CONFIRM, this.internalOptions)
      this.hideDropDown()
    },

    // operation filter reset
    // 总是发出重置（DD-08）：未确认的勾选可能已全部取消，但已确认（已生效）的筛选仍需清除；
    // 下拉框无法可靠地知道调用方已确认的状态，所以不根据勾选判断是否发出
    reset() {
      this.internalOptions = this.internalOptions.map(x => ({ ...x, selected: false }))

      // 使用户传入的v-model 生效
      this.$emit('update:modelValue', this.internalOptions)

      this.$emit(EMIT_EVENTS.FILTER_RESET, this.internalOptions)

      this.hideDropDown()
    },

    // 受控模式：根据 visible 显示或隐藏（只在挂载后调用）
    syncControlledVisible(visible: boolean) {
      if (!this.isControlled)
        return
      if (visible)
        this.showDropDown()

      else
        this.hideDropDown()
    },

    showDropDown() {
      const nextVisible = true

      const allowChange = this.beforeVisibleChangeCallback(nextVisible)
      if (isBoolean(allowChange) && !allowChange)
        return false

      // 显示后由 usePopper 在渲染完成时定位（绘制之前）
      this.internalVisible = true

      this.$emit(EMIT_EVENTS.VISIBLE_CHANGE, nextVisible)
    },

    hideDropDown() {
      const nextVisible = false

      const allowChange = this.beforeVisibleChangeCallback(nextVisible)
      if (isBoolean(allowChange) && !allowChange)
        return false

      this.$emit(EMIT_EVENTS.VISIBLE_CHANGE, nextVisible)

      // 同步隐藏，没有定时器（DD-01）：<Teleport> 被禁用，内容回到组件内部并隐藏
      this.internalVisible = false
    },

    // before visible change callback
    beforeVisibleChangeCallback(nextVisible: boolean) {
      const { beforeVisibleChange, isDropdownVisible } = this

      if (
        nextVisible !== isDropdownVisible
        && isFunction(beforeVisibleChange)
      ) {
        // next visible
        return beforeVisibleChange({
          nextVisible,
        })
      }
    },

    // 清除 clickoutside 的定时器
    clearClickOutsideTimer() {
      if (this.clickOutsideTimer) {
        clearTimeout(this.clickOutsideTimer)
        this.clickOutsideTimer = null
      }
    },

    // 重新计算弹出层位置
    changDropdownPanelPosition() {
      this.popper.update()
    },

    // 设置文本框的值
    setInputValue() {
      let result

      const labels = this.selectedLabels
      if (Array.isArray(labels) && labels.length > 0)
        result = labels.join()

      this.inputValue = result || ''
    },

    dropdownPanelClick() {
      this.dropdownShowToggle()
    },

    dropdownShowToggle() {
      if (this.isDropdownVisible)
        this.hideDropDown()
      else
        this.showDropDown()
    },

    singleSelectOptionClick(e: MouseEvent, item: VeDropdownItem) {
      // 生成新的选项对象，不修改原对象（它们可能已通过 update:modelValue 交给了调用方）
      this.internalOptions = this.internalOptions.map(x => ({
        ...x,
        selected: item.label === x.label,
      }))

      if (this.hideByItemClick)
        this.hideDropDown()

      if (this.isInput)
        this.setInputValue()

      // 使用户传入的v-model 生效
      this.$emit('update:modelValue', this.internalOptions)

      this.$emit(EMIT_EVENTS.ITEM_SELECT_CHANGE, this.internalOptions)
    },

    // 获取样式名称
    getTextAlignClass() {
      return clsName(`items-li-a-${this.textAlign}`)
    },

    dropdownClickOutside(e?: MouseEvent) {
      // 已关闭的下拉框不需要处理（否则页面上每个下拉框在每次点击时都会发出隐藏事件）
      if (!this.isDropdownVisible)
        return

      // 点击触发器时由 dropdownPanelClick 负责切换。
      // clickoutside 在捕获阶段执行，早于触发器自身的 click 事件，所以这里直接判断事件目标
      const triggerEl = this.$refs.dropdownTrigger as HTMLElement | undefined
      const target = e?.target as Node | null | undefined
      if (triggerEl && target && triggerEl.contains(target))
        return

      this.clearClickOutsideTimer()
      this.clickOutsideTimer = setTimeout(() => {
        this.clickOutsideTimer = null
        // 等待期间可能已经被关闭（例如受控模式下父组件已修改 visible）
        if (this.isDropdownVisible)
          this.hideDropDown()
      })
    },

    // checbox 受控属性管理
    checkedChangeControl(item: VeDropdownItem, isChecked: boolean) {
      this.internalOptions = this.internalOptions.map(i =>
        i.label === item.label ? { ...i, selected: isChecked } : i,
      )

      this.$emit(EMIT_EVENTS.ITEM_SELECT_CHANGE, this.internalOptions)
    },

    getRandomIdWithPrefix() {
      return clsName(getRandomId())
    },
  },

  render() {
    const {
      isMultiple,
      getTextAlignClass,
      internalOptions,
      isSelect,
      width,
      maxHeight,
      dropdownPanelClick,
      getMaxWidth,
      reset,
      singleSelectOptionClick,
      showOperation,
      isCustomContent,
      dropdownItemsClass,
    } = this

    // 下拉选项列表（DD-10：显式标注类型，否则 [] 被推断为 never[]）
    let content: VNode[] = []

    if (isMultiple) {
      content = internalOptions.map((item, index) => {
        const checkboxProps = {
          key: item.label,
          isControlled: true,
          label: item.label,
          showLine: item.showLine,
          isSelected: item.selected,
          onOnCheckedChange: (isChecked: boolean) =>
            this.checkedChangeControl(item, isChecked),
        }

        return (
          <li
            key={index}
            class={[
              clsName('items-multiple'),
              clsName('items-li'),
              getTextAlignClass(),
            ]}
          >
            <VeCheckbox {...checkboxProps} />
          </li>
        )
      })
    }
    else {
      content = internalOptions.map((item, index) => {
        const radioProps = {
          isControlled: true,
          isSelected: item.selected,
          onOnRadioChange: () => {},
        }

        return (
          <li
            key={index}
            class={[
              clsName('items-li'),
              item.selected ? 'active' : '',
            ]}
            onClick={e => singleSelectOptionClick(e, item)}
          >
            <a
              href="javascript:void(0);"
              class={[clsName('items-li-a'), getTextAlignClass()]}
            >
              {this.showRadio
                ? (
                    <VeRadio {...radioProps}>{item.label}</VeRadio>
                  )
                : (
                    item.label
                  )}
            </a>
          </li>
        )
      })
    }

    const dropdownProps = {
      class: ['ve-dropdown'],
    }

    const dropdownItemsProps = {
      class: dropdownItemsClass,
    }

    const itemsNode = (
      <dd {...dropdownItemsProps} v-click-outside={this.dropdownClickOutside}>
        <ul
          class={clsName('items')}
          style={{
            'min-width': `${width}px`,
            'max-width': `${getMaxWidth}px`,
          }}
        >
          {/* custom content */}
          {isCustomContent && this.$slots['custom-content']?.()}
          {/* not custom content */}
          {!isCustomContent && (
            <div>
              <div
                class={clsName('items-warpper')}
                style={{
                  'max-height': `${maxHeight}px`,
                }}
              >
                {content}
              </div>
              {showOperation && (
                <li class={clsName('operation')}>
                  <a
                    href="javascript:void(0)"
                    class={[
                      clsName('operation-item'),
                      this.operationFilterClass,
                    ]}
                    onClick={reset}
                  >
                    {this.resetFilterText}
                  </a>
                  <a
                    class={clsName(
                      'operation-item',
                    )}
                    href="javascript:void(0)"
                    onClick={this.confirm}
                  >
                    {this.confirmFilterText}
                  </a>
                </li>
              )}
            </div>
          )}
        </ul>
      </dd>
    )

    /*
      第一次显示之前（包括 SSR）内容隐藏在组件内部；之后由 <Teleport> 渲染：
      显示时在 popperAppendTo 中，隐藏时回到组件内部（保留插槽内容的组件状态）
      */
    const { isTeleported, position, renderTeleport } = this.popper
    let popperContent
    if (isTeleported.value) {
      const popperProps = {
        ref: 'dropdownPopper',
        id: this.rootId || undefined,
        class: { [clsName('popper')]: this.isDropdownVisible },
        style: {
          position: 'absolute' as const,
          left: position.value ? `${position.value.left}px` : undefined,
          top: position.value ? `${position.value.top}px` : undefined,
        },
      }
      popperContent = renderTeleport([<div {...popperProps}>{itemsNode}</div>])
    }
    else {
      popperContent = itemsNode
    }

    return (
      <dl {...dropdownProps}>
        <dt ref="dropdownTrigger" class="ve-dropdown-dt" onClick={dropdownPanelClick}>
          <a
            class={[isSelect ? clsName('dt-selected') : '']}
            style={{ width: `${width}px` }}
          >
            {this.$slots.default?.()}
          </a>
        </dt>
        <div style={{ display: 'none' }}>
          {popperContent}
        </div>
      </dl>
    )
  },
})
