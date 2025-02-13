import { createLocale, isFunction } from '@easytable/common/utils'
import { ICON_NAMES } from '@easytable/common/utils/constant'
import VeDropdown from '@easytable/ve-dropdown'
import VeIcon from '@easytable/ve-icon'
import { defineComponent } from 'vue'
import { clsName, getEmitEventName } from '../util'
import { COMPS_NAME, EMIT_EVENTS, LOCALE_COMP_NAME } from '../util/constant'

const t = createLocale(LOCALE_COMP_NAME)

export default defineComponent({
  name: COMPS_NAME.VE_TABLE_HEADER_FILTER_CONTENT,
  props: {
    column: {
      type: Object,
      required: true,
    },
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
      const { filterConfirm } = this.column.filter
      filterConfirm && filterConfirm(this.filterList)
    },
    // filter reset
    filterReset() {
      const { filterReset } = this.column.filter
      filterReset && filterReset(this.filterList)
    },
    // getIcon
    getIcon(h) {
      let result
      const { filterIcon } = this.column.filter
      if (isFunction(filterIcon))
        result = filterIcon(h)

      else
        result = <VeIcon name={ICON_NAMES.FILTER} />

      return result
    },
  },
  render(h) {
    const { filterList, isMultiple, maxHeight, beforeVisibleChange }
            = this.column.filter

    const compProps = {
      'modelValue': filterList,
      'showOperation': true,
      isMultiple,
      'showRadio': true, // when single selection
      'confirmFilterText': t('confirmFilter'),
      'resetFilterText': t('resetFilter'),
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
        <span class={clsName('filter')}>
          <span class={clsName('filter-icon')}>
            {this.getIcon(h)}
          </span>
        </span>
      </VeDropdown>
    )
  },
})
