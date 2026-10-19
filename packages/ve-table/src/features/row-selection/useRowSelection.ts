import type { MaybeRefOrGetter } from 'vue'
import { computed, shallowRef, toValue, watch } from 'vue'

/**
 * 行勾选（checkbox）与行单选（radio）的状态（MOD-08）
 *
 * 设计要点（D2）：
 * - 受控模式（`selectedRowKeys` / `selectedRowKey`）下直接读取用户的数据，不再复制一份“镜像”，
 *   因此用户原地修改数组（push / splice，官方 demo 的写法）也能被 computed 追踪到；
 * - 只有非受控模式才持有内部状态，且每次变更都生成新数组，从不原地修改；
 * - 表头全选状态、单行选中状态都是派生出来的 computed，组件里不再保存本地副本。
 */

export type RowKey = string | number

export interface CheckboxOption {
  selectedRowKeys?: RowKey[]
  defaultSelectedRowKeys?: RowKey[]
  defaultSelectedAllRows?: boolean
  disableSelectedRowKeys?: RowKey[]
  hideSelectAll?: boolean
  selectedRowChange?: (params: { row: any, isSelected: boolean, selectedRowKeys: RowKey[] }) => void
  selectedAllChange?: (params: { isSelected: boolean, selectedRowKeys: RowKey[] }) => void
}

export interface RadioOption {
  selectedRowKey?: RowKey | null
  defaultSelectedRowKey?: RowKey | null
  disableSelectedRowKeys?: RowKey[]
  selectedRowChange?: (params: { row: any }) => void
}

export interface UseRowSelectionOptions {
  checkboxOption: MaybeRefOrGetter<CheckboxOption | null | undefined>
  // 当前表格数据的全部 rowKey
  allRowKeys: MaybeRefOrGetter<RowKey[]>
  // 根据 rowKey 取行数据（selectedRowChange 回调需要 row）
  getRowByKey?: (rowKey: RowKey) => any
}

// 读取用户数组：迭代响应式数组会追踪其长度和每一项，原地修改也会触发更新
function toKeySet(keys: RowKey[] | null | undefined): Set<RowKey> {
  return new Set(Array.isArray(keys) ? keys : [])
}

/**
 * 行勾选（checkbox）
 */
export function useRowSelection(options: UseRowSelectionOptions) {
  const { checkboxOption, allRowKeys, getRowByKey } = options

  const getOption = () => toValue(checkboxOption) || null

  // 非受控模式下的已选 key（只整体替换，不原地修改）
  // ROW-08：allRowKeys 变化时不清理不在数据中的 key（与 D7 相同：无法区分被删除的行和其他页的行），
  // 需要清理时使用受控的 selectedRowKeys
  const internalSelectedRowKeys = shallowRef<RowKey[]>([])

  // 是否受控（设置了 selectedRowKeys）
  const isControlled = computed(() => Array.isArray(getOption()?.selectedRowKeys))

  // 当前已选 key：受控时就是用户的数组本身
  const selectedRowKeys = computed<RowKey[]>(() => {
    const option = getOption()
    return isControlled.value ? option!.selectedRowKeys! : internalSelectedRowKeys.value
  })

  const selectedKeySet = computed(() => toKeySet(selectedRowKeys.value))

  const disabledKeySet = computed(() => toKeySet(getOption()?.disableSelectedRowKeys))

  /*
   * 是否全选（ROW-05：比较集合而不是数量）
   * 1、至少有一行可勾选（全部禁用时不算全选）
   * 2、每一行要么已选，要么被禁用
   * 其他页 / 不在数据里的 key 不参与计算
   */
  const isSelectedAll = computed(() => {
    const all = toValue(allRowKeys)
    const selected = selectedKeySet.value
    const disabled = disabledKeySet.value

    return (
      all.length > 0
      && all.some(key => !disabled.has(key))
      && all.every(key => selected.has(key) || disabled.has(key))
    )
  })

  // 是否半选：当前数据中有行被选中，但不是每一行都被选中
  const isIndeterminate = computed(() => {
    const all = toValue(allRowKeys)
    const selected = selectedKeySet.value
    const selectedCount = all.filter(key => selected.has(key)).length

    return selectedCount > 0 && selectedCount < all.length
  })

  function isRowSelected(rowKey: RowKey) {
    return selectedKeySet.value.has(rowKey)
  }

  function isRowDisabled(rowKey: RowKey) {
    return disabledKeySet.value.has(rowKey)
  }

  // 初始化非受控状态（选项对象被整体替换时重新初始化，与原行为一致）
  function initInternalSelectedRowKeys() {
    const option = getOption()
    if (!option)
      return

    // 受控模式不使用内部状态，这里只处理默认值
    const { defaultSelectedAllRows, defaultSelectedRowKeys } = option

    let result: RowKey[] = []
    if (defaultSelectedAllRows)
      result = toValue(allRowKeys).slice()
    else if (Array.isArray(defaultSelectedRowKeys))
      result = defaultSelectedRowKeys.slice()

    internalSelectedRowKeys.value = result
  }

  initInternalSelectedRowKeys()
  watch(getOption, initInternalSelectedRowKeys)

  // 非受控时更新内部状态；受控时只通知用户，由用户决定是否回写
  function commit(nextKeys: RowKey[]) {
    if (!isControlled.value)
      internalSelectedRowKeys.value = nextKeys
  }

  /**
   * 勾选 / 取消勾选单行
   */
  function selectRow(rowKey: RowKey, isSelected: boolean) {
    const option = getOption()
    if (!option)
      return

    const nextKeys = selectedRowKeys.value.slice()
    const index = nextKeys.indexOf(rowKey)

    if (isSelected) {
      // 通过行点击触发时可能重复，已存在则不再添加
      if (index === -1)
        nextKeys.push(rowKey)
    }
    else if (index > -1) {
      nextKeys.splice(index, 1)
    }

    commit(nextKeys)

    if (typeof option.selectedRowChange === 'function') {
      option.selectedRowChange({
        row: getRowByKey ? getRowByKey(rowKey) : undefined,
        isSelected,
        // 传出副本，避免用户修改回调参数时影响内部状态
        selectedRowKeys: nextKeys.slice(),
      })
    }
  }

  /**
   * 全选 / 取消全选（只作用于当前数据中的行）
   * 1、全选：当前数据的全部 key，但不包含“禁用且未选中”的行
   * 2、取消全选：当前数据中只保留“禁用且已选中”的行
   * 3、ROW-07：不在当前数据中的已选 key（例如分页时其他页的 key）保持不变并排在前面，
   *    因此可以跨页勾选；之前全选 / 取消全选都会丢掉这些 key
   */
  function selectAll(isSelected: boolean) {
    const option = getOption()
    if (!option)
      return

    const selected = selectedKeySet.value
    const disabled = disabledKeySet.value
    const all = toValue(allRowKeys)
    const inData = new Set(all)

    // 不在当前数据中的已选 key（集合已去重，保持原有顺序）
    const outsideKeys = [...selected].filter(key => !inData.has(key))

    const currentKeys = isSelected
      ? all.filter(key => !disabled.has(key) || selected.has(key))
      : all.filter(key => disabled.has(key) && selected.has(key))

    const nextKeys = outsideKeys.concat(currentKeys)

    commit(nextKeys)

    if (typeof option.selectedAllChange === 'function') {
      option.selectedAllChange({
        isSelected,
        selectedRowKeys: nextKeys.slice(),
      })
    }
  }

  return {
    isControlled,
    selectedRowKeys,
    selectedKeySet,
    disabledKeySet,
    isSelectedAll,
    isIndeterminate,
    isRowSelected,
    isRowDisabled,
    selectRow,
    selectAll,
  }
}

export type RowSelection = ReturnType<typeof useRowSelection>

export interface UseRowRadioOptions {
  radioOption: MaybeRefOrGetter<RadioOption | null | undefined>
  getRowByKey?: (rowKey: RowKey) => any
}

/**
 * 行单选（radio）
 */
export function useRowRadio(options: UseRowRadioOptions) {
  const { radioOption, getRowByKey } = options

  const getOption = () => toValue(radioOption) || null

  // 非受控模式下的选中 key
  const internalSelectedRowKey = shallowRef<RowKey | null>(null)

  // 是否受控（选项里出现了 selectedRowKey 属性，值可以为空）
  const isControlled = computed(() => {
    const option = getOption()
    return !!option && Object.keys(option).includes('selectedRowKey')
  })

  const selectedRowKey = computed<RowKey | null | undefined>(() =>
    isControlled.value ? getOption()!.selectedRowKey : internalSelectedRowKey.value,
  )

  const disabledKeySet = computed(() => toKeySet(getOption()?.disableSelectedRowKeys))

  function isRowSelected(rowKey: RowKey) {
    return selectedRowKey.value === rowKey
  }

  function isRowDisabled(rowKey: RowKey) {
    return disabledKeySet.value.has(rowKey)
  }

  function initInternalSelectedRowKey() {
    const option = getOption()
    if (!option)
      return

    internalSelectedRowKey.value = option.defaultSelectedRowKey ?? null
  }

  initInternalSelectedRowKey()
  watch(getOption, initInternalSelectedRowKey)

  function selectRow(rowKey: RowKey) {
    const option = getOption()
    if (!option)
      return

    if (!isControlled.value)
      internalSelectedRowKey.value = rowKey

    if (typeof option.selectedRowChange === 'function')
      option.selectedRowChange({ row: getRowByKey ? getRowByKey(rowKey) : undefined })
  }

  return {
    isControlled,
    selectedRowKey,
    disabledKeySet,
    isRowSelected,
    isRowDisabled,
    selectRow,
  }
}

export type RowRadio = ReturnType<typeof useRowRadio>
