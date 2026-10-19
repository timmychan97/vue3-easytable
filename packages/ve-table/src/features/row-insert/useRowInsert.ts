/**
 * 行插入指示器（MOD-02）：指示器的 props，点击插入按钮时触发表格的 on-row-insert 事件
 */
import type { ComputedRef, Ref } from 'vue'
import type { VeTableProps } from '../../ve-table-props'
import type { ColgroupData } from '../../ve-table-types'
import { computed } from 'vue'
import { EMIT_EVENTS } from '../../util/constant'

export interface UseRowInsertOptions {
  props: Pick<VeTableProps, 'rowInsertOption' | 'fixedHeader' | 'fixedFooter'>
  // 触发组件事件（setup 的 emit）
  emit: (event: typeof EMIT_EVENTS.ROW_INSERT, payload: { insertRowIndex: number }) => void
  // 表格已挂载：指示器之后才注册滚动等监听
  parentRendered: Ref<boolean>
  containerElement: Ref<HTMLElement | null>
  tableElement: Ref<HTMLTableElement | null>
  colgroups: Ref<ColgroupData[]>
}

// 行插入指示器（row-insert-indicator）的 props
export interface RowInsertIndicatorProps {
  parentRendered: boolean
  tableContainerEl: HTMLElement | null
  tableEl: HTMLTableElement | null
  colgroups: ColgroupData[]
  rowInsertOption: Record<string, any>
  fixedHeader: boolean
  fixedFooter: boolean
  onOnRowInsert: (params: { insertRowIndex: number }) => void
}

export interface UseRowInsert {
  rowInsertIndicatorProps: ComputedRef<RowInsertIndicatorProps>
  handleRowInsert: (params: { insertRowIndex: number }) => void
}

export function useRowInsert(options: UseRowInsertOptions): UseRowInsert {
  const { props, emit, parentRendered, containerElement, tableElement, colgroups } = options

  // 点击插入按钮：开启行插入时触发 on-row-insert
  function handleRowInsert({ insertRowIndex }: { insertRowIndex: number }) {
    if (!props.rowInsertOption?.enable)
      return

    emit(EMIT_EVENTS.ROW_INSERT, { insertRowIndex })
  }

  const rowInsertIndicatorProps = computed<RowInsertIndicatorProps>(() => ({
    parentRendered: parentRendered.value,
    tableContainerEl: containerElement.value,
    tableEl: tableElement.value,
    colgroups: colgroups.value,
    // INS-01 / VS-06：插入位置的数据下标直接从行的 <tbody data-index> 读取，
    // 不再依赖虚拟滚动区间（否则每次滚动都会重新渲染指示器）
    rowInsertOption: props.rowInsertOption,
    fixedHeader: props.fixedHeader,
    fixedFooter: props.fixedFooter,
    // on-row-insert 的监听器（getEmitEventName(EMIT_EVENTS.ROW_INSERT)）
    onOnRowInsert: (params: { insertRowIndex: number }) => {
      handleRowInsert(params)
    },
  }))

  return {
    rowInsertIndicatorProps,
    handleRowInsert,
  }
}
