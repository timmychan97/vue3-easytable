import emitter from '@vue3-easytable/common/mixins/emitter'
import { isEmptyValue } from '@vue3-easytable/common/utils'
import { markRaw } from 'vue'
import { clsName } from '../util'
import { COMPS_NAME, EMIT_EVENTS } from '../util/constant'
import { safeCall } from '../util/safe-call'
import HeaderTr from './header-tr'

export default defineComponent({
  name: COMPS_NAME.VE_TABLE_THADER,
  mixins: [emitter()],
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
      type: Array,
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
  data() {
    return {
      /*
            sort columns：列 key -> 排序方向（COL-12：按列 key 保存，同一个 field 的多列、没有 field 的列各自排序）
            不要使用computed代替，属性动态添加会造成响应式问题
            */
      sortColumns: {} as Record<string, string>,
      // COL-08：上一次看到的列排序配置（key -> sortBy），只用于比较，不需要响应式
      sortConfigsByKey: markRaw(new Map<string, string>()),
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
    sortChange({ currentKey, sortResult }) {
      const { sortColumns, sortOption } = this
      // INFRA-08：sortOption 和 sortChange 都是可选的
      const multipleSort = sortOption?.multipleSort
      const sortChange = sortOption?.sortChange
      const currentColKey = String(currentKey)

      sortColumns[currentColKey] = sortResult

      if (!multipleSort) {
        for (const colKey in sortColumns) {
          if (colKey !== currentColKey)
            sortColumns[colKey] = ''
        }
      }

      const sortParams = this.getSortParams()

      this.dispatch(
        COMPS_NAME.VE_TABLE,
        EMIT_EVENTS.SORT_CHANGE,
        sortParams,
      )

      // invoke（INFRA-13：抛出异常时只记录，排序状态已经更新）
      safeCall('sortOption.sortChange', sortChange, sortParams)
    },

    /*
     * sortChange 的参数仍按 field：{ [field]: 'asc' | 'desc' | '' }，顺序与列顺序一致（COL-12）
     * - 同一个 field 有多个可排序列时，取第一个有排序方向的列（单列排序时就是当前排序的列）；
     * - 没有 field 的列不出现在参数中（之前会以 "undefined" 为键）。
     */
    getSortParams() {
      const { colgroups, sortColumns } = this
      const result: Record<string, string> = {}

      colgroups.forEach((item: any) => {
        const colKey = String(item.key)
        if (!(colKey in sortColumns) || isEmptyValue(item.field))
          return

        const sortBy = sortColumns[colKey]
        if (!(item.field in result) || (!result[item.field] && sortBy))
          result[item.field] = sortBy
      })

      return result
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
      const nextConfigs = markRaw(new Map<string, string>())
      const sortColumns: Record<string, string> = {}

      colgroups.forEach((item: any) => {
        if (typeof item.sortBy !== 'string')
          return

        // 对象的键总是字符串，数字列 key 也转为字符串
        const colKey = String(item.key)
        const isSameConfig = prevConfigs.get(colKey) === item.sortBy && colKey in prevSortColumns
        sortColumns[colKey] = isSameConfig ? prevSortColumns[colKey] : item.sortBy
        nextConfigs.set(colKey, item.sortBy)
      })

      this.sortConfigsByKey = nextConfigs
      this.sortColumns = sortColumns
    },
  },
  mounted() {
    // receive sort change
    this.on(EMIT_EVENTS.SORT_CHANGE, (params) => {
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
