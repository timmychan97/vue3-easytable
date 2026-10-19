import type { ColgroupData } from '../ve-table-types'
import { markRaw } from 'vue'
import { useTableContext } from '../features/table-context'
import { clsName } from '../util'
import { COMPS_NAME, EMIT_EVENTS } from '../util/constant'
import { safeCall } from '../util/safe-call'
import HeaderTr from './header-tr'

export default defineComponent({
  name: COMPS_NAME.VE_TABLE_THADER,
  props: {
    columnsOptionResetTime: {
      type: Number,
      default: 0,
    },
    groupColumns: {
      type: Array,
      required: true,
    },
    colgroups: {
      type: Array as PropType<ColgroupData[]>,
      required: true,
    },
    fixedHeader: {
      type: Boolean,
      required: true,
    },
    isGroupHeader: {
      type: Boolean,
      required: true,
    },
    cellSelectionData: {
      type: Object,
      default() {
        return null
      },
    },
    // cell selection range data
    cellSelectionRangeData: {
      type: Object,
      default() {
        return null
      },
    },
    headerIndicatorColKeys: {
      type: Object,
      default() {
        return null
      },
    },
    headerRows: {
      type: Array,
      default() {
        return []
      },
    },
    // checkbox option
    checkboxOption: {
      type: Object,
      default() {
        return null
      },
    },
    // sort option
    sortOption: {
      type: Object,
      default() {
        return null
      },
    },
    // cell style option
    cellStyleOption: {
      type: Object,
      default() {
        return null
      },
    },
    // event custom option
    eventCustomOption: {
      type: Object,
      default() {
        return null
      },
    },
  },
  setup() {
    return {
      // 表格上下文（MOD-01）：接收表头单元格的排序点击，通知表格排序变化
      tableEvents: useTableContext(),
    }
  },
  data() {
    return {
      /*
            sort columns
            不要使用computed代替，属性动态添加会造成响应式问题
            */
      sortColumns: {},
      // COL-08：上一次看到的列排序配置（key -> { field, sortBy }），只用于比较，不需要响应式
      sortConfigsByKey: markRaw(new Map<string, { field: string, sortBy: string }>()),
    }
  },
  computed: {
    // header class
    headerClass() {
      return {
        [clsName('fixed-header')]: this.fixedHeader,
      }
    },
  },
  watch: {
    // watch colgroups
    colgroups: {
      handler() {
        this.initSortColumns()
      },
      immediate: true,
    },
  },
  methods: {
    // sort change
    sortChange({ currentField, sortResult }) {
      const { sortColumns, sortOption } = this
      // INFRA-08：sortOption 和 sortChange 都是可选的
      const multipleSort = sortOption?.multipleSort
      const sortChange = sortOption?.sortChange

      this.sortColumns[currentField] = sortResult

      if (!multipleSort) {
        for (const field in sortColumns) {
          if (field !== currentField)
            sortColumns[field] = ''
        }
      }

      this.tableEvents.emit(EMIT_EVENTS.SORT_CHANGE, sortColumns)

      // invoke（INFRA-13：抛出异常时只记录，排序状态已经更新）
      safeCall('sortOption.sortChange', sortChange, sortColumns)
    },

    /*
     * init sort columns
     * COL-08：列重新生成（隐藏/显示列、右键固定列、columns 变化）时，按列 key 保留当前排序状态。
     * 只有新出现的列，或配置的 sortBy 与上次不同的列，才使用配置值。
     * 之前每次都按配置的 sortBy 重建，表头图标会退回配置值，而数据仍按用户的选择排序。
     */
    initSortColumns() {
      const { colgroups, sortColumns: prevSortColumns } = this
      const prevConfigs = this.sortConfigsByKey
      const nextConfigs = markRaw(new Map<string, { field: string, sortBy: string }>())
      const sortColumns = {}

      colgroups.forEach((item: any) => {
        if (typeof item.sortBy !== 'string')
          return

        const prev = prevConfigs.get(item.key)
        const isSameConfig = prev && prev.sortBy === item.sortBy && prev.field in prevSortColumns
        sortColumns[item.field] = isSameConfig ? prevSortColumns[prev.field] : item.sortBy
        nextConfigs.set(item.key, { field: item.field, sortBy: item.sortBy })
      })

      this.sortConfigsByKey = nextConfigs
      this.sortColumns = sortColumns
    },
  },
  mounted() {
    // receive sort change（卸载时自动注销，INFRA-02）
    this.tableEvents.on(EMIT_EVENTS.COLUMN_SORT_CHANGE, (params) => {
      this.sortChange(params)
    })
  },
  render() {
    const {
      headerClass,
      groupColumns,
      colgroups,
      fixedHeader,
      headerRows,
      checkboxOption,
      sortOption,
      sortColumns,
      cellStyleOption,
      cellSelectionData,
    } = this

    return (
      <thead class={headerClass}>
        {groupColumns.map((groupColumn: any, rowIndex) => {
          const trProps = {
            key: rowIndex,
            columnsOptionResetTime: this.columnsOptionResetTime,
            groupColumn,
            headerRows,
            colgroups,
            fixedHeader,
            isGroupHeader: this.isGroupHeader,
            rowIndex,
            checkboxOption,
            sortOption,
            sortColumns,
            cellStyleOption,
            eventCustomOption: this.eventCustomOption,
            cellSelectionData,
            cellSelectionRangeData: this.cellSelectionRangeData,
            headerIndicatorColKeys: this.headerIndicatorColKeys,
          }
          return <HeaderTr {...trProps} />
        })}
      </thead>
    )
  },
})
