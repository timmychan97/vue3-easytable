import { useI18N } from '@vue3-easytable/common/locale'
import { isFunction } from '@vue3-easytable/common/utils'
import { ICON_NAMES } from '@vue3-easytable/common/utils/constant'
import VeDropdown from '@vue3-easytable/ve-dropdown'
import VeIcon from '@vue3-easytable/ve-icon'
import { defineComponent, h } from 'vue'
import { clsName, getEmitEventName } from '../util'
import { COMPS_NAME, EMIT_EVENTS, LOCALE_COMP_NAME } from '../util/constant'
import { safeCall } from '../util/safe-call'

export default defineComponent({
  name: COMPS_NAME.VE_TABLE_HEADER_FILTER_CONTENT,
  props: {
    column: {
      type: Object,
      required: true,
    },
  },
  setup() {
    // 解析语言包（最近的 ConfigProvider，否则为全局语言包）
    return { t: useI18N(LOCALE_COMP_NAME) }
  },
  data() {
    return {
      filterList: [],
    }
  },
  watch: {
    column: {
      handler(column) {
        if (column.filter && Array.isArray(column.filter.filterList))
          this.filterList = column.filter.filterList
      },
      immediate: true,
      deep: true,
    },
  },
  methods: {
    /*
         * @filterConfirm
         * @desc  filter confirm
         * @param {Array} val - filter list
         */
    filterConfirm() {
      // INFRA-13：抛出异常时只记录
      safeCall('filter.filterConfirm', this.column.filter.filterConfirm, this.filterList)
    },
    // filter reset
    filterReset() {
      safeCall('filter.filterReset', this.column.filter.filterReset, this.filterList)
    },
    // getIcon
    // RENDER-01：filterIcon 接收真正的 h
    getIcon() {
      let result
      const { filterIcon } = this.column.filter
      if (isFunction(filterIcon))
        result = filterIcon(h)

      else
        result = <VeIcon name={ICON_NAMES.FILTER} />

      return result
    },
  },
  render() {
    const { filterList, isMultiple, maxHeight, beforeVisibleChange }
            = this.column.filter

    const compProps = {
      'modelValue': filterList,
      'showOperation': true,
      isMultiple,
      'showRadio': true, // when single selection
      'confirmFilterText': this.t('确认筛选'),
      'resetFilterText': this.t('重置筛选'),
      beforeVisibleChange,
      [getEmitEventName(EMIT_EVENTS.HEADER_FILTER_CONFIRM)]: this.filterConfirm,
      [getEmitEventName(EMIT_EVENTS.HEADER_FILTER_RESET)]: this.filterReset,
      // v-model
      'onUpdate:modelValue': (val) => {
        this.filterList = val
      },
    }

    if (typeof maxHeight === 'number')
      compProps.maxHeight = maxHeight

    return (
      <VeDropdown {...compProps}>
        {/* icon */}
        <span
          class={clsName('filter')}
          onMousedown={(e: MouseEvent) => e.stopPropagation()}
        >
          <span class={clsName('filter-icon')}>
            {this.getIcon()}
          </span>
        </span>
      </VeDropdown>
    )
  },
})
