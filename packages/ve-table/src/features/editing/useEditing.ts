/**
 * 单元格编辑（MOD-02）：编辑状态、开始 / 停止 / 放弃编辑，以及 startEditingCell / stopEditingCell 实例方法
 *
 * editingCell.row 是行数据的副本，编辑框修改的是副本；停止编辑时才通过
 * beforeCellValueChange（可取消）写回 tableData，再调用 cellValueChange / afterCellValueChange（INFRA-07）。
 */
import type { ComputedRef, Ref } from 'vue'
import type { VeTableProps } from '../../ve-table-props'
import type { CellKey, CellSelectionData, ColgroupData, EditingCell } from '../../ve-table-types'
import type { TableContext } from '../table-context'
import { isBoolean, isDefined, isEmptyValue, isFunction } from '@vue3-easytable/common/utils'
import { cloneDeep } from 'lodash'
import { computed, nextTick, ref } from 'vue'
import { HOOKS_NAME } from '../../util/constant'
import { safeCall } from '../../util/safe-call'

type RowKey = string | number
type ColKey = string | number

export interface UseEditingOptions {
  props: Pick<VeTableProps, 'editOption' | 'tableData' | 'rowKeyFieldName'>
  colgroups: Ref<ColgroupData[]>
  // 开始编辑的单元格成为活动单元格
  cellSelectionData: Ref<CellSelectionData>
  cellSelectionCurrentCellChange: (cell: CellKey) => void
  tableContext: TableContext
}

export interface UseEditing {
  editingCell: Ref<EditingCell>
  // 编辑框打开时的初始值
  editorInputStartValue: Ref<string | number>
  // 方向键是否结束编辑（双击、F2 开始的编辑为 false，直接输入开始的编辑为 true）
  enableStopEditing: Ref<boolean>
  isCellEditing: ComputedRef<boolean>
  hasEditColumn: ComputedRef<boolean>
  isEditColumn: (colKey: ColKey) => boolean
  setEditingCell: (params: { rowKey: RowKey, colKey: ColKey, column: ColgroupData, row: any }) => void
  updateEditingCellValue: (value: any) => void
  clearEditingCell: () => void
  saveCellWhenStopEditing: () => false | void
  editCellByClick: (params: { isDblclick: boolean, rowKey: RowKey, colKey: ColKey }) => false | void
  startEditingCell: (params: { rowKey: RowKey, colKey: ColKey, defaultValue?: any }) => false | void
  stopEditingCell: () => false | void
  discardEditingCell: () => false | void
}

export function useEditing(options: UseEditingOptions): UseEditing {
  const { props, colgroups, cellSelectionData, cellSelectionCurrentCellChange, tableContext } = options

  const editingCell = ref<EditingCell>({ rowKey: '', colKey: '', row: null, column: null })
  const editorInputStartValue = ref<string | number>('')
  const enableStopEditing = ref(true)

  const isCellEditing = computed(() =>
    !isEmptyValue(editingCell.value.rowKey) && !isEmptyValue(editingCell.value.colKey),
  )

  const hasEditColumn = computed(() => colgroups.value.some(x => x.edit))

  function isEditColumn(colKey: ColKey) {
    return colgroups.value.some(x => x.key === colKey && x.edit)
  }

  function setEditingCell({ rowKey, colKey, column, row }: { rowKey: RowKey, colKey: ColKey, column: ColgroupData, row: any }) {
    editingCell.value = {
      rowKey,
      row: cloneDeep(row),
      colKey,
      column,
    }
  }

  // 编辑框的值变化：只修改行数据的副本
  function updateEditingCellValue(value: any) {
    const { row, column } = editingCell.value
    row[column!.field!] = value
    editingCell.value.row = row
  }

  function clearEditingCell() {
    editingCell.value = { rowKey: '', colKey: '', row: null, column: null }
  }

  // 停止编辑时保存
  function saveCellWhenStopEditing() {
    const { rowKeyFieldName, editOption } = props
    const { cellValueChange, beforeCellValueChange, afterCellValueChange } = editOption!

    if (!isCellEditing.value)
      return

    const { rowKey, colKey } = editingCell.value

    try {
      const currentRow = (props.tableData as any[]).find(x => x[rowKeyFieldName] === rowKey)

      // 编辑中的行已被移除：无处保存，直接清除编辑状态（SEL-01）
      if (!currentRow) {
        clearEditingCell()
        return false
      }

      const currentColumn = colgroups.value.find(x => x.key === colKey)

      if (!currentColumn?.field) {
        clearEditingCell()
        return false
      }

      const changeValue = editingCell.value.row[currentColumn.field]

      /*
      beforeCellValueChange 抛出异常时视为“取消修改”（INFRA-07）：
      不写入数据、不触发 after 回调，但仍要清除编辑状态
      */
      const { value: allowChange, threw } = safeCall(
        'beforeCellValueChange',
        beforeCellValueChange,
        {
          row: cloneDeep(currentRow),
          column: currentColumn,
          changeValue,
        },
      )
      if (threw || (isBoolean(allowChange) && !allowChange)) {
        clearEditingCell()
        return false
      }

      currentRow[currentColumn.field] = changeValue

      // 先清除编辑状态，再调用 after 回调（INFRA-07）
      clearEditingCell()

      // 同 afterCellValueChange，未来被移除
      safeCall('cellValueChange', cellValueChange, {
        row: currentRow,
        column: currentColumn,
        changeValue,
      })

      safeCall('afterCellValueChange', afterCellValueChange, {
        row: currentRow,
        column: currentColumn,
        changeValue,
      })

      // 单元格内容变化后刷新选区位置
      nextTick(() => {
        tableContext.emit(HOOKS_NAME.CLIPBOARD_CELL_VALUE_CHANGE)
      })
    }
    finally {
      // reset status（无论保存、取消还是异常都要恢复）
      enableStopEditing.value = true
    }
  }

  // 实例方法：开始编辑
  function startEditingCell({ rowKey, colKey, defaultValue }: { rowKey: RowKey, colKey: ColKey, defaultValue?: any }) {
    const { editOption, rowKeyFieldName } = props

    if (!editOption)
      return false

    // 已经在编辑该单元格
    if (editingCell.value.rowKey === rowKey && editingCell.value.colKey === colKey)
      return false

    const sourceRow = (props.tableData as any[]).find(x => x[rowKeyFieldName] === rowKey)
    const currentColumn = colgroups.value.find(x => x.key === colKey)

    // 未知的 rowKey / colKey 直接忽略，当前编辑保持不变（EDIT-04、SEL-01）
    if (!sourceRow || !currentColumn)
      return false

    // 当前列是否可编辑
    if (!currentColumn.edit)
      return false

    // 调用 API 编辑的情况，需要先关闭（并保存）之前编辑的单元格（EDIT-04）
    if (isCellEditing.value) {
      // 停止编辑会重置 enableStopEditing，这里保留调用方（如 F2）设置的值
      const keepEnableStopEditing = enableStopEditing.value
      stopEditingCell()
      enableStopEditing.value = keepEnableStopEditing
    }

    // 在保存之后再拷贝，拿到上一个单元格保存后的行数据
    const currentRow = cloneDeep(sourceRow)
    const field = currentColumn.field as string

    const { beforeStartCellEditing } = editOption

    // INFRA-11：通过 safeCall 调用；与其他 before* 回调一致，抛出异常等同于返回 false（取消编辑）
    if (isFunction(beforeStartCellEditing)) {
      const { value: allowContinue, threw } = safeCall(
        'beforeStartCellEditing',
        beforeStartCellEditing,
        {
          row: cloneDeep(currentRow),
          column: currentColumn,
          cellValue: isDefined(defaultValue) ? defaultValue : currentRow[field],
        },
      )
      if (threw || (isBoolean(allowContinue) && !allowContinue))
        return false
    }

    // 给当前列赋默认值
    if (isDefined(defaultValue)) {
      editorInputStartValue.value = defaultValue
      // doesn't change cell original value
      currentRow[field] = defaultValue
    }
    else {
      editorInputStartValue.value = currentRow[field]
    }

    const { currentCell } = cellSelectionData.value
    if (currentCell.colKey !== colKey || currentCell.rowKey !== rowKey)
      cellSelectionCurrentCellChange({ rowKey, colKey })

    setEditingCell({
      rowKey,
      colKey,
      column: currentColumn,
      row: cloneDeep(currentRow),
    })
  }

  // 实例方法：停止编辑（保存）
  function stopEditingCell() {
    if (!props.editOption)
      return false

    // clear editor input start value
    editorInputStartValue.value = ''

    if (isCellEditing.value)
      saveCellWhenStopEditing()
  }

  /*
   * 单元格点击 / 双击：双击可编辑列开始编辑，否则结束正在进行的编辑
   */
  function editCellByClick({ isDblclick, rowKey, colKey }: { isDblclick: boolean, rowKey: RowKey, colKey: ColKey }) {
    if (!props.editOption)
      return false

    if (!hasEditColumn.value)
      return false

    if (isEmptyValue(rowKey) || isEmptyValue(colKey))
      return false

    if (editingCell.value && editingCell.value.rowKey === rowKey && editingCell.value.colKey === colKey)
      return false

    if (isCellEditing.value)
      stopEditingCell()

    if (isDblclick && isEditColumn(colKey)) {
      enableStopEditing.value = false
      startEditingCell({ rowKey, colKey })
    }
    else {
      enableStopEditing.value = true
    }
  }

  /*
   * 放弃编辑（D6）：关闭编辑框但不保存，单元格保持原值，
   * 不触发 beforeCellValueChange / afterCellValueChange
   */
  function discardEditingCell() {
    if (!isCellEditing.value)
      return false

    // 与 stopEditingCell 一致：清空编辑框初始值
    editorInputStartValue.value = ''
    // editingCell.row 是行数据的副本，清空即丢弃未提交的值
    clearEditingCell()
    // reset status
    enableStopEditing.value = true
  }

  return {
    editingCell,
    editorInputStartValue,
    enableStopEditing,
    isCellEditing,
    hasEditColumn,
    isEditColumn,
    setEditingCell,
    updateEditingCellValue,
    clearEditingCell,
    saveCellWhenStopEditing,
    editCellByClick,
    startEditingCell,
    stopEditingCell,
    discardEditingCell,
  }
}
