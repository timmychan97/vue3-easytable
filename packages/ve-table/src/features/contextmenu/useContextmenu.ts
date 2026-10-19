import type { LocaleMessage } from '@vue3-easytable/common/locale/types'
/**
 * 表格右键菜单（MOD-02）：表头 / 表体菜单的选项与菜单项的操作
 *
 * 菜单组件（ve-contextmenu）监听表格内容区（eventTarget）的右键事件；
 * 右键单元格时表格先生成菜单选项（setContextmenuOptions），点击菜单项时执行对应的操作。
 * 表头指示器（整列选择）存在时是表头菜单，否则是表体菜单。
 */
import type { ComputedRef, Ref } from 'vue'
import type { VeTableProps } from '../../ve-table-props'
import type { ColgroupData, ColumnOption, ContextmenuOption, EditorInstance } from '../../ve-table-types'
import type { UseAutofill } from '../cell-selection/useAutofill'
import type { UseCellSelectionState } from '../cell-selection/useCellSelectionState'
import type { UseSelectionDrag } from '../cell-selection/useSelectionDrag'
import type { UseClipboard } from '../clipboard/useClipboard'
import type { TableContext } from '../table-context'
import { createI18N } from '@vue3-easytable/common/locale'
import { isBoolean, isEmptyValue, isFunction } from '@vue3-easytable/common/utils'
import { computed, nextTick, onMounted, ref } from 'vue'
import {
  COLUMN_FIXED_TYPE,
  CONTEXTMENU_NODE_TYPES,
  CONTEXTMENU_TYPES,
  HOOKS_NAME,
  LOCALE_COMP_NAME,
} from '../../util/constant'
import {
  cancelColumnFixed,
  clsName,
  createEmptyRowData,
  getSelectionRangeIndexes,
  getSelectionRangeKeys,
  setBodyContextmenuOptions,
  setColumnFixed,
  setHeaderContextmenuOptions,
} from '../../util/index'

type RowKey = string | number

export interface UseContextmenuOptions {
  props: Pick<VeTableProps, 'contextmenuHeaderOption' | 'contextmenuBodyOption' | 'tableData' | 'rowKeyFieldName'>
  // 语言包（最近的 ConfigProvider，否则为全局语言包）
  locale: Readonly<Ref<LocaleMessage>>
  rootElement: Ref<HTMLElement | null>
  editor: Ref<EditorInstance | null>
  colgroups: Ref<ColgroupData[]>
  allRowKeys: ComputedRef<RowKey[]>
  // 右键菜单固定 / 取消固定列时替换
  cloneColumns: Ref<ColumnOption[]>
  enableColumnResize: ComputedRef<boolean>
  state: Pick<
    UseCellSelectionState,
    | 'cellSelectionData'
    | 'cellSelectionRangeData'
    | 'headerIndicatorColKeys'
    | 'bodyIndicatorRowKeys'
    | 'clearCellSelectionCurrentCell'
    | 'clearCellSelectionNormalEndCell'
  >
  clipboard: Pick<UseClipboard, 'contextmenuCopyOrCut' | 'deleteCellSelectionRangeValue'>
  selectionDrag: Pick<UseSelectionDrag, 'endSelectionDrag'>
  autofill: Pick<UseAutofill, 'isAutofillStarting' | 'cancelAutofill'>
  tableContext: TableContext
}

export interface UseContextmenu {
  // 菜单监听右键事件的元素（表格内容区），挂载后设置
  contextmenuEventTarget: Ref<string | HTMLElement>
  contextmenuOptions: Ref<ContextmenuOption[]>
  enableHeaderContextmenu: ComputedRef<boolean>
  enableBodyContextmenu: ComputedRef<boolean>
  contextMenuType: ComputedRef<string>
  setContextmenuOptions: (column: ColumnOption) => void
  contextmenuItemClick: (type: string) => void
  headerContextmenuItemClick: (type: string) => false | void
  bodyContextmenuItemClick: (type: string) => false | void
}

type HeaderMenuOption = Parameters<typeof setHeaderContextmenuOptions>[0]['contextmenuHeaderOption']
type BodyMenuOption = Parameters<typeof setBodyContextmenuOptions>[0]['contextmenuBodyOption']

// 菜单配置中有菜单项时才开启
function hasContextmenus(option: Record<string, any> | null | undefined) {
  const contextmenus = option?.contextmenus
  return Array.isArray(contextmenus) && contextmenus.length > 0
}

export function useContextmenu(options: UseContextmenuOptions): UseContextmenu {
  const {
    props,
    locale,
    rootElement,
    editor,
    colgroups,
    allRowKeys,
    cloneColumns,
    enableColumnResize,
    state,
    clipboard,
    selectionDrag,
    autofill,
    tableContext,
  } = options
  const { cellSelectionData, cellSelectionRangeData, headerIndicatorColKeys, bodyIndicatorRowKeys } = state

  const contextmenuEventTarget = ref<string | HTMLElement>('')
  const contextmenuOptions = ref<ContextmenuOption[]>([])

  const enableHeaderContextmenu = computed(() => hasContextmenus(props.contextmenuHeaderOption))
  const enableBodyContextmenu = computed(() => hasContextmenus(props.contextmenuBodyOption))

  const contextMenuType = computed(() =>
    !isEmptyValue(headerIndicatorColKeys.value.startColKey)
      ? CONTEXTMENU_TYPES.HEADER_CONTEXTMENU
      : CONTEXTMENU_TYPES.BODY_CONTEXTMENU,
  )

  // 右键单元格（菜单显示之前）：生成菜单选项
  function setContextmenuOptions(column: ColumnOption) {
    // 使用注入的语言包（最近的 ConfigProvider，否则为全局语言包）
    const t = createI18N(LOCALE_COMP_NAME, () => locale.value)

    if (contextMenuType.value === CONTEXTMENU_TYPES.HEADER_CONTEXTMENU) {
      contextmenuOptions.value = setHeaderContextmenuOptions({
        column,
        contextmenuHeaderOption: props.contextmenuHeaderOption as HeaderMenuOption,
        cellSelectionRangeData: cellSelectionRangeData.value,
        colgroups: colgroups.value,
        allRowKeys: allRowKeys.value,
        headerIndicatorColKeys: headerIndicatorColKeys.value,
        enableHeaderContextmenu: enableHeaderContextmenu.value,
        t,
      })
    }
    else {
      contextmenuOptions.value = setBodyContextmenuOptions({
        enableBodyContextmenu: enableBodyContextmenu.value,
        contextmenuBodyOption: props.contextmenuBodyOption as BodyMenuOption,
        cellSelectionRangeData: cellSelectionRangeData.value,
        colgroups: colgroups.value,
        allRowKeys: allRowKeys.value,
        bodyIndicatorRowKeys: bodyIndicatorRowKeys.value,
        t,
      })
    }
  }

  // 当前选区的 key 与下标（afterMenuClick 的参数）
  function getSelectionRange() {
    return {
      selectionRangeKeys: getSelectionRangeKeys({ cellSelectionRangeData: cellSelectionRangeData.value }),
      selectionRangeIndexes: getSelectionRangeIndexes({
        cellSelectionRangeData: cellSelectionRangeData.value,
        colgroups: colgroups.value,
        allRowKeys: allRowKeys.value,
      }),
    }
  }

  // cut / copy：通过 navigator.clipboard 写入（不可用时退回 execCommand），失败时调用 clipboardOption.writeError（CLIP-06）
  function copyOrCutByMenu(type: string) {
    // 焦点回到编辑 textarea，菜单关闭后可继续用键盘操作
    editor.value?.textareaSelect()
    clipboard.contextmenuCopyOrCut(CONTEXTMENU_NODE_TYPES.CUT === type ? 'cut' : 'copy')
  }

  // 表头菜单项
  function headerContextmenuItemClick(type: string) {
    const { rowKey, colKey } = cellSelectionData.value.currentCell
    const { afterMenuClick } = props.contextmenuHeaderOption!

    if (isEmptyValue(rowKey) || isEmptyValue(colKey))
      return

    const { selectionRangeKeys, selectionRangeIndexes } = getSelectionRange()

    if (isFunction(afterMenuClick)) {
      const callback = afterMenuClick({ type, selectionRangeKeys, selectionRangeIndexes })
      if (isBoolean(callback) && !callback)
        return false
    }

    const fixedOptions = {
      cloneColumns: cloneColumns.value,
      colgroups: colgroups.value,
      enableColumnResize: enableColumnResize.value,
    }

    if (CONTEXTMENU_NODE_TYPES.CUT === type || CONTEXTMENU_NODE_TYPES.COPY === type) {
      copyOrCutByMenu(type)
    }
    // empty column
    else if (CONTEXTMENU_NODE_TYPES.EMPTY_COLUMN === type) {
      clipboard.deleteCellSelectionRangeValue()
    }
    // left fixed column to
    else if (CONTEXTMENU_NODE_TYPES.LEFT_FIXED_COLUMN_TO === type) {
      cloneColumns.value = setColumnFixed({
        ...fixedOptions,
        cellSelectionRangeData: cellSelectionRangeData.value,
        fixedType: COLUMN_FIXED_TYPE.LEFT,
      })
    }
    // cancel left fixed column to
    else if (CONTEXTMENU_NODE_TYPES.CANCEL_LEFT_FIXED_COLUMN_TO === type) {
      cloneColumns.value = cancelColumnFixed({ ...fixedOptions, fixedType: COLUMN_FIXED_TYPE.LEFT })
    }
    // right fixed column to
    else if (CONTEXTMENU_NODE_TYPES.RIGHT_FIXED_COLUMN_TO === type) {
      cloneColumns.value = setColumnFixed({
        ...fixedOptions,
        cellSelectionRangeData: cellSelectionRangeData.value,
        fixedType: COLUMN_FIXED_TYPE.RIGHT,
      })
    }
    // cancel right fixed column to
    else if (CONTEXTMENU_NODE_TYPES.CANCEL_RIGHT_FIXED_COLUMN_TO === type) {
      cloneColumns.value = cancelColumnFixed({ ...fixedOptions, fixedType: COLUMN_FIXED_TYPE.RIGHT })
    }
  }

  // 插入行之后，等 DOM 更新再刷新选区位置
  function refreshSelectionAfterRender() {
    nextTick(() => {
      tableContext.emit(HOOKS_NAME.CLIPBOARD_CELL_VALUE_CHANGE)
    })
  }

  // 表体菜单项
  function bodyContextmenuItemClick(type: string) {
    const { tableData, rowKeyFieldName } = props
    // 在调用 afterMenuClick 之前取行 key，插入行的位置以菜单打开时的行顺序为准
    const rowKeys = allRowKeys.value
    const { rowKey, colKey } = cellSelectionData.value.currentCell
    const { afterMenuClick } = props.contextmenuBodyOption!

    if (isEmptyValue(rowKey) || isEmptyValue(colKey))
      return

    const { selectionRangeKeys, selectionRangeIndexes } = getSelectionRange()

    if (isFunction(afterMenuClick)) {
      const callback = afterMenuClick({ type, selectionRangeKeys, selectionRangeIndexes })
      if (isBoolean(callback) && !callback)
        return false
    }

    const { startRowIndex, endRowIndex } = selectionRangeIndexes
    const currentRowIndex = rowKeys.findIndex(x => x === rowKey)

    if (CONTEXTMENU_NODE_TYPES.CUT === type || CONTEXTMENU_NODE_TYPES.COPY === type) {
      copyOrCutByMenu(type)
    }
    // remove rows
    else if (CONTEXTMENU_NODE_TYPES.REMOVE_ROW === type) {
      tableData.splice(startRowIndex, endRowIndex - startRowIndex + 1)
      // 选中的行已删除，清除选区
      state.clearCellSelectionCurrentCell()
      state.clearCellSelectionNormalEndCell()
    }
    // empty rows / empty cells
    else if (CONTEXTMENU_NODE_TYPES.EMPTY_ROW === type || CONTEXTMENU_NODE_TYPES.EMPTY_CELL === type) {
      clipboard.deleteCellSelectionRangeValue()
    }
    // insert row above
    else if (CONTEXTMENU_NODE_TYPES.INSERT_ROW_ABOVE === type) {
      tableData.splice(currentRowIndex, 0, createEmptyRowData({ colgroups: colgroups.value, rowKeyFieldName }))
      refreshSelectionAfterRender()
    }
    // insert row below
    else if (CONTEXTMENU_NODE_TYPES.INSERT_ROW_BELOW === type) {
      tableData.splice(currentRowIndex + 1, 0, createEmptyRowData({ colgroups: colgroups.value, rowKeyFieldName }))
      refreshSelectionAfterRender()
    }
  }

  // 菜单项点击
  function contextmenuItemClick(type: string) {
    // 结束拖动选择，菜单操作后选区不再跟随鼠标；同时移除拖动期间的 mouseup / blur 监听（SEL-19）
    selectionDrag.endSelectionDrag()
    // 拖动角标期间点击菜单项：取消填充，而不是提交到最后经过的单元格（FILL-07，与 FILL-02 一致）
    if (autofill.isAutofillStarting.value)
      autofill.cancelAutofill()

    if (contextMenuType.value === CONTEXTMENU_TYPES.HEADER_CONTEXTMENU)
      headerContextmenuItemClick(type)
    else
      bodyContextmenuItemClick(type)
  }

  onMounted(() => {
    // 菜单监听表格内容区的右键事件
    contextmenuEventTarget.value = rootElement.value!.querySelector(`.${clsName('content')}`) as HTMLElement
  })

  return {
    contextmenuEventTarget,
    contextmenuOptions,
    enableHeaderContextmenu,
    enableBodyContextmenu,
    contextMenuType,
    setContextmenuOptions,
    contextmenuItemClick,
    headerContextmenuItemClick,
    bodyContextmenuItemClick,
  }
}
