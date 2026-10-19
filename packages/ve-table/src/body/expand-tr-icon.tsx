import { ICON_NAMES } from '@vue3-easytable/common/utils/constant'
import VeIcon from '@vue3-easytable/ve-icon'
import { computed, defineComponent } from 'vue'
import { clsName } from '../util'
import { COLUMN_TYPES, COMPS_NAME } from '../util/constant'

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
     * 图标本身不处理点击：点击冒泡到 td，由 body-td 的 cellClick 统一处理（先调用用户的
     * bodyCellEvents.click，再派发 BODY_CELL_CLICK，icon / cell 触发时展开并阻止冒泡），
     * trigger 为 row 时继续冒泡到 tr 展开行。
     * ROW-06：之前图标和 td 各派发一次 BODY_CELL_CLICK；
     * ROW-09：之前 icon / cell 触发时图标调用 cellClick 并阻止冒泡，用户的 bodyCellEvents.click 被跳过。
     */
    return () => {
      if (props.column.type === COLUMN_TYPES.EXPAND) {
        return (
          <span class={expandRowIconContainerClass.value}>
            <VeIcon name={ICON_NAMES.RIGHT_ARROW} />
          </span>
        )
      }
      return null
    }
  },
})
