/*
单元格选区层（MOD-05）
- geometry.ts：纯几何计算（选区范围、边框、角标、填充预览、填充方向）
- useSelectionPositions.ts：单元格元素与位置跟踪、表格事件（滚动、尺寸变化等）的订阅、防抖、卸载清理
- SelectionBorders.tsx：边框、角标与区域浮层的展示组件
本组件把三者组合起来：按左固定 / 中间 / 右固定三个区域渲染当前单元格、区域选择、填充预览与区域浮层
*/
import type { PropType, VNode } from 'vue'
import type { AutofillingDirection, CellSelectionRange, SelectionBorders as SelectionBordersData, SelectionCell } from './geometry'
import type { SelectionPositionsProps } from './useSelectionPositions'
import { computed, defineComponent } from 'vue'
import { useTableContext } from '../features/table-context'
import {
  COLUMN_FIXED_TYPE,
  COMPS_NAME,
  CURRENT_CELL_SELECTION_TYPES,
  EMIT_EVENTS,
} from '../util/constant'
import {
  clsName,
  getColKeysByFixedTypeWithinColKeys,
  getColKeysByRangeColKeys,
  getLeftmostColKey,
  getTotalWidthByColKeys,
  isExistGivenFixedColKey,
  isExistNotFixedColKey,
} from '../util/index'
import { INSTANCE_METHODS } from './constant'
import {
  adjustSelectionBorders,
  getAreaLayerRect,
  getAutofillAreaBorders,
  getAutofillAreaColKeys,
  getCellSelectionRange,
  getCornerCellInfo,
  getCornerPosition,
  getCurrentCellBorders,
  isFirstNotFixedSelectionCol as getIsFirstNotFixedSelectionCol,
  isFirstSelectionCol as getIsFirstSelectionCol,
  isFirstSelectionRow as getIsFirstSelectionRow,
  getRangeBorders,
  isCornerEnabled,
  isSelectionInVirtualView,
} from './geometry'
import { SelectionAreaLayer, SelectionBorders } from './SelectionBorders'
import { useSelectionPositions } from './useSelectionPositions'

// 某个区域（左固定 / 中间 / 右固定）中要渲染的边框
interface BordersParams {
  className: string
  borders: SelectionBordersData
  fixedType: string
  totalColKeys: any[] | null
}

export default defineComponent({
  name: COMPS_NAME.VE_TABLE_SELECTION,
  props: {
    tableEl: {
      // SSR：不能在模块顶层引用 HTMLTableElement（Node 中不存在）
      type: Object as PropType<HTMLTableElement | null>,
      default: null,
    },
    allRowKeys: {
      type: Array,
      required: true,
    },
    colgroups: {
      type: Array as PropType<any[]>,
      required: true,
    },
    parentRendered: {
      type: Boolean,
      required: true,
    },
    // cell autofill option
    cellAutofillOption: {
      type: [Object, Boolean],
      default() {
        return null
      },
    },
    cellSelectionData: {
      type: Object as PropType<SelectionPositionsProps['cellSelectionData']>,
      required: true,
    },
    cellSelectionRangeData: {
      type: Object as PropType<CellSelectionRange>,
      required: true,
    },
    isAutofillStarting: {
      type: Boolean,
      required: true,
    },
    // 填充方向，由表格根据行列位置计算（FILL-01），为 null 时不显示填充预览
    autofillingDirection: {
      type: String as PropType<AutofillingDirection | null>,
      default: null,
    },
    currentCellSelectionType: {
      type: String,
      default: '',
    },
    isVirtualScroll: {
      type: Boolean,
      default: false,
    },
    virtualScrollVisibleIndexs: {
      type: Object as PropType<{ start: number, end: number }>,
      required: true,
    },
    isCellEditing: {
      type: Boolean,
      default: false,
    },
  },
  emits: [EMIT_EVENTS.CELL_SELECTION_RANGE_DATA_CHANGE],

  setup(props, { emit }) {
    // 表格上下文（MOD-01）：角标的鼠标事件发给表格；表格的滚动、尺寸变化等事件由 useSelectionPositions 订阅，卸载时自动注销
    const tableEvents = useTableContext()

    // selection borders visibility（虚拟滚动时选区可能在已渲染的行之外）
    const selectionBordersVisibility = computed(() => {
      const { currentCell, normalEndCell } = props.cellSelectionData
      return isSelectionInVirtualView({
        isVirtualScroll: props.isVirtualScroll,
        selectionType: props.currentCellSelectionType,
        currentCell,
        normalEndCell,
        visibleIndexes: props.virtualScrollVisibleIndexs,
      })
    })

    // show corner
    const showCorner = computed(() => isCornerEnabled(props.cellAutofillOption))

    // corner cell info
    const cornerCellInfo = computed(() => {
      const { rightColKey, bottomRowKey } = props.cellSelectionRangeData
      return getCornerCellInfo({
        colgroups: props.colgroups,
        allRowKeys: props.allRowKeys,
        rightColKey,
        bottomRowKey,
      })
    })

    const isFirstSelectionRow = computed(() =>
      getIsFirstSelectionRow(props.allRowKeys, props.cellSelectionRangeData),
    )
    const isFirstSelectionCol = computed(() =>
      getIsFirstSelectionCol(props.colgroups, props.cellSelectionRangeData),
    )
    const isFirstNotFixedSelectionCol = computed(() =>
      getIsFirstNotFixedSelectionCol(props.colgroups, props.cellSelectionRangeData),
    )

    // 把当前单元格 / 结束单元格换算成选区范围，交给表格保存
    function setCellSelectionRangeData() {
      const { currentCell, normalEndCell } = props.cellSelectionData
      emit(
        EMIT_EVENTS.CELL_SELECTION_RANGE_DATA_CHANGE,
        getCellSelectionRange({
          selectionType: props.currentCellSelectionType,
          currentCell,
          normalEndCell,
          colgroups: props.colgroups,
        }),
      )
    }

    const positions = useSelectionPositions(props as unknown as SelectionPositionsProps, {
      isSelectionVisible: selectionBordersVisibility,
      onSelectionCellChange: setCellSelectionRangeData,
      tableEvents,
    })
    const { cellSelectionRect } = positions

    /*
    resolve borders
    判断当前区域（左固定 / 中间 / 右固定）是否需要渲染，并返回修正后的边框（新对象，不修改入参，SEL-07）
    */
    function resolveBorders({ borders, fixedType, totalColKeys }: Omit<BordersParams, 'className'>): SelectionBordersData | null {
      const { colgroups } = props

      const isRender = fixedType
        ? isExistGivenFixedColKey({ fixedType, colKeys: totalColKeys, colgroups })
        // middle normal area
        : isExistNotFixedColKey({ colKeys: totalColKeys, colgroups })

      if (!isRender)
        return null

      // isRender 为 true 时 totalColKeys 一定是数组，结果不会是 null
      const fixedColKeys: any[] = getColKeysByFixedTypeWithinColKeys({
        colKeys: totalColKeys,
        fixedType,
        colgroups,
      }) ?? []

      // fixed columns total width
      const fixedColsTotalWidth = fixedColKeys.length
        ? getTotalWidthByColKeys({ colKeys: fixedColKeys, colgroups })
        : 0

      // 在 isRender 判断之后再读取这些计算属性，不渲染时不必计算（SEL-01）
      return adjustSelectionBorders(borders, {
        fixedType,
        fixedColsTotalWidth,
        isAllColsFixed: (totalColKeys as any[]).length === fixedColKeys.length,
        isFirstSelectionRow: isFirstSelectionRow.value,
        isFirstSelectionCol: isFirstSelectionCol.value,
        isFirstNotFixedSelectionCol: isFirstNotFixedSelectionCol.value,
        showCorner: showCorner.value,
      })
    }

    // 边框与角标
    function getBorders({ className, ...params }: BordersParams) {
      const resolved = resolveBorders(params)
      if (!resolved)
        return null

      return (
        <SelectionBorders
          className={className}
          borders={resolved}
          cornerPosition={getCornerPosition(resolved.corner, cornerCellInfo.value)}
          onCornerMousedown={(event: MouseEvent) => {
            tableEvents.emit(EMIT_EVENTS.SELECTION_CORNER_MOUSEDOWN, { event })
          }}
          onCornerMouseup={(event: MouseEvent) => {
            tableEvents.emit(EMIT_EVENTS.SELECTION_CORNER_MOUSEUP, { event })
          }}
        />
      )
    }

    // 区域浮层：与边框围成的矩形一致（SEL-07）
    function getAreaLayer({ className, ...params }: BordersParams) {
      const resolved = resolveBorders(params)
      if (!resolved)
        return null

      return <SelectionAreaLayer className={className} rect={getAreaLayerRect(resolved)} />
    }

    /*
    填充预览。填充方向由表格根据选区与结束单元格的行列位置计算（FILL-01），这里只负责绘制；
    方向为 null（在选区内或方向不被允许）时不显示
    area：选区（当前单元格或区域）未经固定列修正的边框
    */
    function getSelectionAutofillArea({ area, fixedType }: { area: SelectionBordersData, fixedType: string }) {
      const { isAutofillStarting, autofillingDirection, currentCellSelectionType, colgroups } = props

      if (!isAutofillStarting || !autofillingDirection)
        return null

      const { currentCellRect, autoFillEndCellRect } = cellSelectionRect
      if (!currentCellRect.width || !autoFillEndCellRect.width)
        return null

      const isSingleSelection = currentCellSelectionType === CURRENT_CELL_SELECTION_TYPES.SINGLE
      const { currentCell, autoFillEndCell } = props.cellSelectionData

      let { leftColKey, rightColKey } = props.cellSelectionRangeData
      if (isSingleSelection) {
        leftColKey = currentCell.colKey
        rightColKey = currentCell.colKey
      }

      const borders = getAutofillAreaBorders({
        direction: autofillingDirection,
        area,
        autoFillEndCellRect,
        isSingleSelection,
      })
      const colKeyRange = getAutofillAreaColKeys({
        direction: autofillingDirection,
        leftColKey,
        rightColKey,
        autoFillEndColKey: autoFillEndCell.colKey,
        colgroups,
      })
      if (!borders || !colKeyRange)
        return null

      return getBorders({
        className: 'selection-autofill-area',
        borders,
        fixedType,
        totalColKeys: getColKeysByRangeColKeys({
          colKey1: colKeyRange[0],
          colKey2: colKeyRange[1],
          colgroups,
        }),
      })
    }

    /*
    get selection current
    1、selection current
    2、auto fill area（单个单元格选择时）
    */
    function getSelectionCurrent({ fixedType }: { fixedType: string }) {
      const result = {
        selectionCurrent: null as VNode | null,
        autoFillArea: null as VNode | null,
      }

      const { currentCellRect, normalEndCellRect } = cellSelectionRect
      if (!currentCellRect.width)
        return result

      // 存在结束单元格时角标由区域边框显示（SEL-13：角标是否允许显示统一由 resolveBorders 处理）
      const hasNormalEndCell = !!normalEndCellRect.width
      const borders = getCurrentCellBorders(currentCellRect, { hasNormalEndCell })

      // cell selection single autofill
      if (!hasNormalEndCell)
        result.autoFillArea = getSelectionAutofillArea({ area: borders, fixedType })

      result.selectionCurrent = getBorders({
        className: 'selection-current',
        borders,
        fixedType,
        totalColKeys: [props.cellSelectionData.currentCell.colKey],
      })

      return result
    }

    /*
    get selection areas
    1、normal area 与 area layer
    2、auto fill area（区域选择时）
    */
    function getSelectionAreas({ fixedType }: { fixedType: string }) {
      const result = {
        normalArea: null as VNode | null,
        normalAreaLayer: null as VNode | null,
        autoFillArea: null as VNode | null,
      }

      const { currentCell, normalEndCell } = props.cellSelectionData as { currentCell: SelectionCell, normalEndCell: SelectionCell }
      const { currentCellRect, normalEndCellRect } = cellSelectionRect

      if (!currentCellRect.width || !normalEndCellRect.width)
        return result

      // 需要用列的位置判断左右，不能根据单元格的 left 判断（固定列时）
      const leftmostColKey = getLeftmostColKey({
        colgroups: props.colgroups,
        colKeys: [currentCell.colKey, normalEndCell.colKey],
      })
      const leftmostCell = leftmostColKey === currentCell.colKey
        ? 'current'
        : leftmostColKey === normalEndCell.colKey ? 'normalEnd' : null

      const borders = getRangeBorders({ currentCellRect, normalEndCellRect, leftmostCell })

      result.autoFillArea = getSelectionAutofillArea({ area: borders, fixedType })

      const { leftColKey, rightColKey } = props.cellSelectionRangeData
      const params = {
        borders,
        fixedType,
        totalColKeys: getColKeysByRangeColKeys({
          colKey1: leftColKey,
          colKey2: rightColKey,
          colgroups: props.colgroups,
        }),
      }

      result.normalArea = getBorders({ className: 'selection-normal-area', ...params })
      result.normalAreaLayer = getAreaLayer({ className: 'selection-normal-area-layer', ...params })

      return result
    }

    return {
      // 计算属性（测试与调试中通过实例访问）
      selectionBordersVisibility,
      showCorner,
      cornerCellInfo,
      isFirstSelectionRow,
      isFirstSelectionCol,
      isFirstNotFixedSelectionCol,
      // 位置跟踪
      ...positions,
      setCellSelectionRangeData,
      // 渲染
      getSelectionCurrent,
      getSelectionAreas,
      // 表格通过 ref 调用
      [INSTANCE_METHODS.CLEAR_CURRENT_CELL_RECT]: positions.clearCurrentCellRect,
      [INSTANCE_METHODS.CLEAR_NORMAL_END_CELL_RECT]: positions.clearNormalEndCellRect,
    }
  },

  render() {
    if (!this.selectionBordersVisibility)
      return null

    // fixed left
    const fixedLeftSelectionCurrent = this.getSelectionCurrent({
      fixedType: COLUMN_FIXED_TYPE.LEFT,
    })
    const fixedLeftSelectionArea = this.getSelectionAreas({
      fixedType: COLUMN_FIXED_TYPE.LEFT,
    })

    const fixedLeftAutoFillArea
      = fixedLeftSelectionCurrent.autoFillArea
        || fixedLeftSelectionArea.autoFillArea

    // middle
    const middleSelectionCurrent = this.getSelectionCurrent({
      fixedType: '',
    })
    const middleSelectionArea = this.getSelectionAreas({
      fixedType: '',
    })

    const middleAutoFillArea
      = middleSelectionCurrent.autoFillArea
        || middleSelectionArea.autoFillArea

    // fixed right
    const fixedRightSelectionCurrent = this.getSelectionCurrent({
      fixedType: COLUMN_FIXED_TYPE.RIGHT,
    })
    const fixedRightSelectionArea = this.getSelectionAreas({
      fixedType: COLUMN_FIXED_TYPE.RIGHT,
    })

    const fixedRightAutoFillArea
      = fixedRightSelectionCurrent.autoFillArea
        || fixedRightSelectionArea.autoFillArea

    // 编辑时隐藏选区（空字符串表示不设置；SSR 输出保持不变）
    const wrapperStyle: Record<string, string> = { visibility: this.isCellEditing ? 'hidden' : '' }

    return (
      <div
        class={clsName('selection-wrapper')}
        style={wrapperStyle}
      >
        <div class={clsName('selection-fixed-left')}>
          {/* current */}
          {fixedLeftSelectionCurrent.selectionCurrent}
          {/* area */}
          {fixedLeftSelectionArea.normalArea}
          {/* auto fill */}
          {fixedLeftAutoFillArea}
          {/* area layer */}
          {fixedLeftSelectionArea.normalAreaLayer}
        </div>
        <div class={clsName('selection-middle')}>
          {/* current */}
          {middleSelectionCurrent.selectionCurrent}
          {/* area */}
          {middleSelectionArea.normalArea}
          {/* auto fill */}
          {middleAutoFillArea}
          {/* area layer */}
          {middleSelectionArea.normalAreaLayer}
        </div>
        <div class={clsName('selection-fixed-right')}>
          {/* current */}
          {fixedRightSelectionCurrent.selectionCurrent}
          {/* area */}
          {fixedRightSelectionArea.normalArea}
          {/* auto fill */}
          {fixedRightAutoFillArea}
          {/* area layer */}
          {fixedRightSelectionArea.normalAreaLayer}
        </div>
      </div>
    )
  },
})
