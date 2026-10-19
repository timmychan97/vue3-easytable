import { ICON_NAMES } from '@vue3-easytable/common/utils/constant'
import VeIcon from '@vue3-easytable/ve-icon'
import { computed, defineComponent } from 'vue'
import { clsName } from '../util'
import { COLUMN_TYPES, COMPS_NAME, EXPAND_TRIGGER_TYPES } from '../util/constant'

export default defineComponent({
  name: COMPS_NAME.VE_TABLE_EXPAND_TR_ICON,
  props: {
    column: {
      type: Object,
      required: true,
    },
    // expand row option
    expandOption: {
      type: Object,
      default() {
        return null
      },
    },
    rowData: {
      type: Object,
      required: true,
    },
    // expanded row keys
    expandedRowkeys: {
      type: Array,
      default() {
        return []
      },
    },
    rowKeyFieldName: {
      type: String,
      default: null,
    },
    // row expand click event
    cellClick: {
      type: Function,
      default: null,
    },
  },
  setup(props) {
    // is row expanded
    const isExpanded = computed((): boolean => {
      let result = false

      const { column, rowData, expandedRowkeys, rowKeyFieldName } = props

      if (column.type === COLUMN_TYPES.EXPAND) {
        const rowKey = rowData[rowKeyFieldName]
        result = expandedRowkeys.includes(rowKey)
      }

      return result
    })
    // expand row icon class
    const expandRowIconContainerClass = computed(() => {
      return {
        [clsName('row-expand-icon')]: true,
        [clsName('expand-icon-collapsed')]: isExpanded.value,
      }
    })

    /*
     * ROW-06：trigger 为 row 时图标不做处理，点击事件冒泡到 td（派发一次 BODY_CELL_CLICK）
     * 再冒泡到 tr（展开行）。之前图标和 td 各调用一次 cellClick，BODY_CELL_CLICK 被派发两次。
     * icon / cell 触发时由图标调用 cellClick 并阻止冒泡，行为不变。
     */
    function iconClick(e: MouseEvent) {
      if (props.expandOption?.trigger === EXPAND_TRIGGER_TYPES.ROW)
        return
      props.cellClick?.(e)
    }

    return () => {
      if (props.column.type === COLUMN_TYPES.EXPAND) {
        return (
          <span
            onClick={iconClick}
            class={expandRowIconContainerClass.value}
          >
            <VeIcon name={ICON_NAMES.RIGHT_ARROW} />
          </span>
        )
      }
      return null
    }
  },
})
