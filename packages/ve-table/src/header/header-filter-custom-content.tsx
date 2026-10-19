import type { JSX } from 'vue/jsx-runtime'
import { isBoolean, isFunction } from '@vue3-easytable/common/utils'
import { ICON_NAMES } from '@vue3-easytable/common/utils/constant'
import VeDropdown from '@vue3-easytable/ve-dropdown'
import VeIcon from '@vue3-easytable/ve-icon'
import { h } from 'vue'
import { clsName } from '../util'
import { COMPS_NAME } from '../util/constant'
import { safeCall } from '../util/safe-call'

export default defineComponent({
  name: COMPS_NAME.VE_TABLE_HEADER_FILTER_CUSTOM_CONTENT,
  props: {
    column: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      internalVisible: false,
    }
  },
  watch: {
    column: {
      handler(column) {
        if (
          column.filterCustom
          && isBoolean(column.filterCustom.defaultVisible)
        ) {
          this.internalVisible = column.filterCustom.defaultVisible
        }
      },
      immediate: true,
      deep: true,
    },
  },
  methods: {
    // visible change
    visibleChange(visible) {
      this.internalVisible = visible
    },
    // get custom content
    // RENDER-01：作为插槽函数调用时参数是插槽 props，不是 h；这里始终传入真正的 h
    getCustomContent() {
      let result: JSX.Element | null = null

      const { render } = this.column.filterCustom
      if (isFunction(render)) {
        const props = {
          // slot: 'custom-content',
        }

        // INFRA-16：在下拉框的渲染中调用（下拉框隐藏时也会渲染），抛出异常时只记录，内容为空
        const { value: content } = safeCall(
          'filterCustom.render',
          render,
          {
            showFn: this.show,
            closeFn: this.close,
          },
          h,
        )

        result = (
          <div {...props}>
            {content}
          </div>
        )
      }
      return result
    },
    // getIcon
    getIcon() {
      let result
      const { filterIcon } = this.column.filterCustom
      // INFRA-16：渲染时调用，抛出异常时只记录，回退为默认图标
      if (isFunction(filterIcon))
        result = safeCall('filterCustom.filterIcon', filterIcon, h)

      if (!result || result.threw)
        return <VeIcon name={ICON_NAMES.FILTER} />

      return result.value
    },

    close() {
      this.internalVisible = false
    },
    show() {
      this.internalVisible = true
    },
  },
  render() {
    const compProps = {
      isCustomContent: true,
      isControlled: true,
      visible: this.internalVisible,
      beforeVisibleChange:
                    this.column.filterCustom.beforeVisibleChange,
      onOnDropdownVisibleChange: this.visibleChange,
    }

    return (
      <VeDropdown
        {...compProps}
        v-slots={{
          'custom-content': this.getCustomContent,
        }}
      >
        {/* icon */}
        <span
          class={clsName('filter')}
          onMousedown={(e: MouseEvent) => e.stopPropagation()}
        >
          <span class={clsName('filter-icon')}>
            {this.getIcon()}
          </span>
        </span>
        {/* custom content */}
        {/* {this.getCustomContent()} */}
      </VeDropdown>
    )
  },
})
