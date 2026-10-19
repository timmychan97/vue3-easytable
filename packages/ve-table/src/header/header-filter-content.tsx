import type { VeDropdownItem } from '@vue3-easytable/ve-dropdown/src/type'
import type { InjectionKey } from 'vue'
import { useI18N } from '@vue3-easytable/common/locale'
import { isFunction } from '@vue3-easytable/common/utils'
import { ICON_NAMES } from '@vue3-easytable/common/utils/constant'
import VeDropdown from '@vue3-easytable/ve-dropdown'
import VeIcon from '@vue3-easytable/ve-icon'
import { cloneDeep, isEqual } from 'lodash'
import { defineComponent, h, inject, markRaw } from 'vue'
import { clsName, getEmitEventName } from '../util'
import { COMPS_NAME, EMIT_EVENTS, LOCALE_COMP_NAME } from '../util/constant'
import { safeCall } from '../util/safe-call'

/*
 * 表头筛选的已确认状态（DD-09），按列 key 保存在表头（header/index.tsx）中。
 * 列配置变化（新的 columns 数组、隐藏 / 显示列、右键固定列）时表头行会重新创建（key 含 columnsOptionResetTime），
 * 本组件的 data 随之丢失；重新创建时从这里恢复，只要用户的 filterList 按值没有变化。
 */
export interface HeaderFilterState {
  // 用户 filterList 的副本，只用于按值比较
  userFilterList: VeDropdownItem[]
  // 最近一次确认（或重置）后的选项
  confirmedFilterList: VeDropdownItem[]
}

export const HEADER_FILTER_STATES_KEY: InjectionKey<Map<string, HeaderFilterState>> = Symbol('veTableHeaderFilterStates')

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
    return {
      t: useI18N(LOCALE_COMP_NAME),
      // 不在 VeTable 表头中使用时没有，只是不保留状态
      filterStates: inject(HEADER_FILTER_STATES_KEY, null),
    }
  },
  data() {
    return {
      // 下拉框中正在编辑（未确认）的选项
      filterList: [] as VeDropdownItem[],
      // 最近一次确认（或重置）后的选项；下拉框没有确认就关闭时恢复为它（DD-07）
      confirmedFilterList: [] as VeDropdownItem[],
      // 上一次看到的用户 filterList 的副本，只用于按值比较，不需要响应式（DD-09）
      userFilterList: null as VeDropdownItem[] | null,
    }
  },
  watch: {
    column: {
      handler(column) {
        const filterList = column.filter?.filterList
        if (!Array.isArray(filterList))
          return

        // DD-09：列对象的其它变化（例如传入新的 columns 数组）不重置已确认的筛选；
        // 只有用户的 filterList 按值变化时，才以它为新的状态
        if (this.userFilterList && isEqual(this.userFilterList, filterList))
          return

        // 重新创建（表头行重建）时恢复已确认的状态
        const saved = this.filterStates?.get(String(column.key))
        if (saved && isEqual(saved.userFilterList, filterList)) {
          this.userFilterList = saved.userFilterList
          this.confirmedFilterList = saved.confirmedFilterList
          this.filterList = saved.confirmedFilterList.map(x => ({ ...x }))
          return
        }

        this.userFilterList = markRaw(cloneDeep(filterList))
        this.filterList = filterList
        this.confirmedFilterList = filterList
        this.saveConfirmedState()
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
      this.confirmedFilterList = this.filterList
      this.saveConfirmedState()
      // INFRA-13：抛出异常时只记录
      safeCall('filter.filterConfirm', this.column.filter.filterConfirm, this.filterList)
    },
    // filter reset
    filterReset() {
      this.confirmedFilterList = this.filterList
      this.saveConfirmedState()
      safeCall('filter.filterReset', this.column.filter.filterReset, this.filterList)
    },
    // 按列 key 保存已确认的状态，表头行重新创建后恢复（DD-09）
    saveConfirmedState() {
      if (this.filterStates && this.userFilterList) {
        this.filterStates.set(String(this.column.key), {
          userFilterList: this.userFilterList,
          confirmedFilterList: this.confirmedFilterList,
        })
      }
    },
    /*
         * 下拉框关闭时丢弃未确认的修改（DD-07）
         * 确认 / 重置在关闭之前触发，所以这里总是恢复为最近一次确认的状态。
         * 传入新的数组，下拉框会重新初始化内部选项（多选的勾选只保存在下拉框内部）。
         */
    visibleChange(visible: boolean) {
      if (!visible)
        this.filterList = this.confirmedFilterList.map(x => ({ ...x }))
    },
    // getIcon
    // RENDER-01：filterIcon 接收真正的 h
    getIcon() {
      let result
      const { filterIcon } = this.column.filter
      // INFRA-16：渲染时调用，抛出异常时只记录，回退为默认图标
      if (isFunction(filterIcon))
        result = safeCall('filter.filterIcon', filterIcon, h)

      if (!result || result.threw)
        return <VeIcon name={ICON_NAMES.FILTER} />

      return result.value
    },
  },
  render() {
    const { isMultiple, maxHeight, beforeVisibleChange }
            = this.column.filter

    const compProps = {
      // 传入本组件的副本，而不是 column.filter.filterList：关闭时才能恢复为已确认的状态（DD-07）
      'modelValue': this.filterList,
      'showOperation': true,
      isMultiple,
      'showRadio': true, // when single selection
      'confirmFilterText': this.t('确认筛选'),
      'resetFilterText': this.t('重置筛选'),
      beforeVisibleChange,
      [getEmitEventName(EMIT_EVENTS.HEADER_FILTER_CONFIRM)]: this.filterConfirm,
      [getEmitEventName(EMIT_EVENTS.HEADER_FILTER_RESET)]: this.filterReset,
      'onOnDropdownVisibleChange': this.visibleChange,
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
