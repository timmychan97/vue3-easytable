/**
 * 表格上下文（MOD-01）
 *
 * 取代原来的 emitter mixin（dispatch / on，基于 mitt 的事件总线）和 Hooks（addHook / triggerHook）：
 * - 一个表格一个上下文，由 ve-table 创建并 provide，子组件 inject；嵌套表格各自使用最近的上下文；
 * - 事件名来自 EMIT_EVENTS / HOOKS_NAME，参数类型由 TableEventMap 约束；
 * - 通过 useTableContext() 注册的监听器在组件（effect scope）销毁时自动注销，不会留下已卸载实例的回调；
 * - 分发时逐个隔离监听器的异常：一个监听器抛出异常不影响其余监听器，也不会抛给 emit 的调用方。
 *   异常交给 Vue 的错误处理（errorCaptured、app.config.errorHandler），没有组件实例时用 console.error 记录。
 */
import type { ComponentInternalInstance, InjectionKey } from 'vue'
import type { EMIT_EVENTS, HOOKS_NAME } from '../../util/constant'
import type { ColgroupData, ColumnOption } from '../../ve-table-types'
import { ErrorCodes, getCurrentInstance, getCurrentScope, handleError, inject, onScopeDispose, provide } from 'vue'

/* ---------------- 事件参数 ---------------- */

// 表体单元格事件（body-td → 表格）
export interface BodyCellEventPayload {
  event: MouseEvent
  rowData: Record<string, any>
  column: ColgroupData
}

// 表头单元格事件（header-th → 表格），分组表头时 column 为分组列
export interface HeaderCellEventPayload {
  event: MouseEvent
  column: ColumnOption
}

// 表头 / 表尾行高变化（header-tr、footer-tr → 表格）
export interface RowHeightChangePayload {
  rowIndex: number
  height: number
}

// 表体行点击（body-tr → body）
export interface BodyRowClickPayload {
  rowData: Record<string, any>
  rowIndex: number
}

// 列的排序状态：'asc' | 'desc' | ''
export type SortResult = string

// 排序参数（field → 排序状态），与 sortOption.sortChange 收到的相同（COL-12）
export type SortColumns = Record<string, SortResult>

// 点击排序图标后某一列的新排序状态（header-th → header），按列 key（COL-12）
export interface ColumnSortChangePayload {
  currentKey: string | number
  sortResult: SortResult
}

// 选区角标的鼠标事件（selection → 表格）
export interface SelectionCornerEventPayload {
  event: MouseEvent
}

// 单元格 mousemove（表格 → 列宽拖动等）
export interface CellMousemovePayload {
  event: MouseEvent
  column: ColumnOption
}

/**
 * 事件名 → 参数类型
 * void 表示该事件没有参数。HOOKS_NAME.TABLE_CONTAINER_MOUSEUP 从未触发，不列入。
 */
export interface TableEventMap {
  // ── 子组件 → 表格（原 emitter mixin 的 dispatch / on） ──
  [EMIT_EVENTS.SORT_CHANGE]: SortColumns
  [EMIT_EVENTS.COLUMN_SORT_CHANGE]: ColumnSortChangePayload
  [EMIT_EVENTS.HEADER_ROW_HEIGHT_CHANGE]: RowHeightChangePayload
  [EMIT_EVENTS.FOOTER_ROW_HEIGHT_CHANGE]: RowHeightChangePayload
  [EMIT_EVENTS.BODY_ROW_CLICK]: BodyRowClickPayload
  [EMIT_EVENTS.BODY_CELL_CLICK]: BodyCellEventPayload
  [EMIT_EVENTS.BODY_CELL_DOUBLE_CLICK]: BodyCellEventPayload
  [EMIT_EVENTS.BODY_CELL_CONTEXTMENU]: BodyCellEventPayload
  [EMIT_EVENTS.BODY_CELL_MOUSEOVER]: BodyCellEventPayload
  [EMIT_EVENTS.BODY_CELL_MOUSEDOWN]: BodyCellEventPayload
  [EMIT_EVENTS.BODY_CELL_MOUSEMOVE]: BodyCellEventPayload
  [EMIT_EVENTS.BODY_CELL_MOUSEUP]: BodyCellEventPayload
  [EMIT_EVENTS.HEADER_CELL_CLICK]: HeaderCellEventPayload
  [EMIT_EVENTS.HEADER_CELL_CONTEXTMENU]: HeaderCellEventPayload
  [EMIT_EVENTS.HEADER_CELL_MOUSEDOWN]: HeaderCellEventPayload
  [EMIT_EVENTS.HEADER_CELL_MOUSEOVER]: HeaderCellEventPayload
  [EMIT_EVENTS.HEADER_CELL_MOUSEMOVE]: HeaderCellEventPayload
  [EMIT_EVENTS.HEADER_CELL_MOUSELEAVE]: HeaderCellEventPayload
  [EMIT_EVENTS.SELECTION_CORNER_MOUSEDOWN]: SelectionCornerEventPayload
  [EMIT_EVENTS.SELECTION_CORNER_MOUSEUP]: SelectionCornerEventPayload

  // ── 表格 → 子组件（原 Hooks 的 triggerHook / addHook） ──
  [HOOKS_NAME.TABLE_CONTAINER_SCROLL]: HTMLElement
  [HOOKS_NAME.TABLE_SIZE_CHANGE]: void
  [HOOKS_NAME.TABLE_CELL_WIDTH_CHANGE]: void
  [HOOKS_NAME.CLIPBOARD_CELL_VALUE_CHANGE]: void
  [HOOKS_NAME.HEADER_CELL_MOUSEMOVE]: CellMousemovePayload
  [HOOKS_NAME.BODY_CELL_MOUSEMOVE]: CellMousemovePayload
}

export type TableEventName = keyof TableEventMap

export type TableEventHandler<K extends TableEventName> = (payload: TableEventMap[K]) => void

// 没有参数的事件 emit 时不传参数
export type TableEventArgs<K extends TableEventName> = TableEventMap[K] extends void
  ? []
  : [payload: TableEventMap[K]]

// 多个事件的处理函数表：事件名 → 处理函数
export type TableEventHandlers = {
  [K in TableEventName]?: TableEventHandler<K>
}

/* ---------------- 上下文 ---------------- */

export interface TableContext {
  /**
   * 注册监听器，返回注销函数（可重复调用）
   * 组件内请使用 useTableContext().on，卸载时会自动注销
   * @param instance 注册监听器的组件实例，监听器抛出的异常交给该实例的 Vue 错误处理
   */
  on: <K extends TableEventName>(
    name: K,
    handler: TableEventHandler<K>,
    instance?: ComponentInternalInstance | null,
  ) => () => void
  // 同步分发事件；每个监听器的异常单独处理，不会抛给调用方
  emit: <K extends TableEventName>(name: K, ...args: TableEventArgs<K>) => void
  // 已注册的监听器数量（不传事件名时为全部事件），用于测试与排查泄漏
  listenerCount: (name?: TableEventName) => number
}

interface Listener {
  handler: (payload: any) => void
  instance: ComponentInternalInstance | null
  // 注销后置为 false：分发过程中被注销的监听器不再执行
  active: boolean
}

// 监听器抛出的异常：交给注册它的组件的 Vue 错误处理，否则 console.error
function reportListenerError(error: unknown, name: TableEventName, instance: ComponentInternalInstance | null) {
  if (instance) {
    try {
      handleError(error, instance, ErrorCodes.COMPONENT_EVENT_HANDLER, false)
      return
    }
    catch (handlerError) {
      // app.config.errorHandler 本身抛出异常，或生产环境设置了 throwUnhandledErrorInProduction
      error = handlerError
    }
  }
  console.error(`[vue3-easytable] table event "${name}" listener error:`, error)
}

export function createTableContext(): TableContext {
  const listeners = new Map<TableEventName, Listener[]>()

  function on<K extends TableEventName>(
    name: K,
    handler: TableEventHandler<K>,
    instance: ComponentInternalInstance | null = null,
  ) {
    const listener: Listener = { handler, instance, active: true }
    const list = listeners.get(name)
    if (list)
      list.push(listener)
    else
      listeners.set(name, [listener])

    return () => {
      if (!listener.active)
        return
      listener.active = false

      const current = listeners.get(name)
      if (!current)
        return
      const index = current.indexOf(listener)
      if (index > -1)
        current.splice(index, 1)
      if (!current.length)
        listeners.delete(name)
    }
  }

  function emit<K extends TableEventName>(name: K, ...args: TableEventArgs<K>) {
    const list = listeners.get(name)
    if (!list)
      return

    // 复制一份再遍历：监听器内注册或注销监听器不会打乱本次分发
    list.slice().forEach((listener) => {
      if (!listener.active)
        return
      try {
        listener.handler(args[0])
      }
      catch (error) {
        reportListenerError(error, name, listener.instance)
      }
    })
  }

  function listenerCount(name?: TableEventName) {
    if (name)
      return listeners.get(name)?.length ?? 0

    let count = 0
    listeners.forEach((list) => {
      count += list.length
    })
    return count
  }

  return { on, emit, listenerCount }
}

export const TABLE_CONTEXT_KEY: InjectionKey<TableContext> = Symbol('veTableContext')

/**
 * 在 setup() 中创建并 provide 表格上下文
 * ve-table 仍是 Options API（MOD-02），在 data() 中创建、在 provide() 选项中提供
 */
export function provideTableContext(context: TableContext = createTableContext()): TableContext {
  provide(TABLE_CONTEXT_KEY, context)
  return context
}

// 只需要 emit 的组件（例如每个单元格）直接 inject，不必创建订阅作用域
export function injectTableContext(): TableContext {
  const context = inject(TABLE_CONTEXT_KEY, null)
  if (!context)
    throw new Error('[vue3-easytable] table context is only available inside VeTable')
  return context
}

/* ---------------- 组件内的订阅作用域 ---------------- */

export interface TableEventScope {
  // 注册监听器，返回注销函数；所在作用域销毁时自动注销
  on: <K extends TableEventName>(name: K, handler: TableEventHandler<K>) => () => void
  // 一次注册多个事件（事件名 → 处理函数），返回注销全部的函数
  onMany: (handlers: TableEventHandlers) => () => void
  emit: TableContext['emit']
}

/**
 * 在组件中使用表格上下文，注册的监听器随组件卸载自动注销（onScopeDispose）
 *
 * 必须在 effect scope 激活时调用：
 * - Composition API：setup() 中；
 * - Options API：data() / provide() / created() 中（Vue 执行这些选项时组件实例的 scope 已激活）。
 *   返回值可以保存在实例上，之后在 mounted、watch 回调等任意时刻调用 on，监听器仍随组件卸载注销。
 *
 * @param context 默认 inject 最近的表格上下文；ve-table 传入自己创建的上下文
 */
export function useTableContext(context?: TableContext): TableEventScope {
  if (!getCurrentScope())
    throw new Error('[vue3-easytable] useTableContext() must be called in setup(), or in data() / provide() / created()')

  const ctx = context ?? injectTableContext()
  const instance = getCurrentInstance()
  const disposers = new Set<() => void>()
  // 作用域销毁后不再注册（例如卸载后才执行的 nextTick 回调）
  let isScopeActive = true

  function on<K extends TableEventName>(name: K, handler: TableEventHandler<K>) {
    if (!isScopeActive)
      return () => {}

    const remove = ctx.on(name, handler, instance)
    const dispose = () => {
      remove()
      disposers.delete(dispose)
    }
    disposers.add(dispose)
    return dispose
  }

  function onMany(handlers: TableEventHandlers) {
    const list = (Object.keys(handlers) as TableEventName[]).map(name =>
      on(name, handlers[name] as TableEventHandler<typeof name>),
    )
    return () => list.forEach(dispose => dispose())
  }

  onScopeDispose(() => {
    isScopeActive = false
    disposers.forEach(dispose => dispose())
    disposers.clear()
  })

  return {
    on,
    onMany,
    // 调用时再读取 ctx.emit（测试可以 spy 上下文的 emit）
    emit: (name, ...args) => ctx.emit(name, ...args),
  }
}
