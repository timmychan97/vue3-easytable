import type { TableContext } from '@/ve-table/src/features/table-context'
import {
  createTableContext,
  injectTableContext,
  provideTableContext,
  useTableContext,
} from '@/ve-table/src/features/table-context'
import { EMIT_EVENTS, HOOKS_NAME } from '@/ve-table/src/util/constant'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, effectScope, h, nextTick, ref } from 'vue'

/*
 * 表格上下文（MOD-01）的单元测试：类型化的订阅与分发、作用域销毁时自动注销、
 * 监听器异常隔离、子组件卸载后不留下监听器。
 */

const HEADER_ROW_HEIGHT = EMIT_EVENTS.HEADER_ROW_HEIGHT_CHANGE
const SCROLL = HOOKS_NAME.TABLE_CONTAINER_SCROLL
const SIZE_CHANGE = HOOKS_NAME.TABLE_SIZE_CHANGE

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createTableContext', () => {
  it('delivers the payload to the listeners of that event only', () => {
    const ctx = createTableContext()
    const rowHeight = vi.fn()
    const sizeChange = vi.fn()

    ctx.on(HEADER_ROW_HEIGHT, rowHeight)
    ctx.on(SIZE_CHANGE, sizeChange)

    ctx.emit(HEADER_ROW_HEIGHT, { rowIndex: 1, height: 40 })
    expect(rowHeight).toHaveBeenCalledWith({ rowIndex: 1, height: 40 })
    expect(sizeChange).not.toHaveBeenCalled()

    // 没有参数的事件
    ctx.emit(SIZE_CHANGE)
    expect(sizeChange).toHaveBeenCalledTimes(1)
    expect(rowHeight).toHaveBeenCalledTimes(1)
  })

  it('checks event names and payload types', () => {
    const ctx = createTableContext()
    const typeChecks = () => {
      ctx.on(HEADER_ROW_HEIGHT, ({ rowIndex, height }) => rowIndex + height)
      // @ts-expect-error 参数缺少 height
      ctx.emit(HEADER_ROW_HEIGHT, { rowIndex: 1 })
      // @ts-expect-error 没有参数的事件不接受参数
      ctx.emit(SIZE_CHANGE, 1)
      // @ts-expect-error 未知的事件名
      ctx.emit('on-unknown-event')
    }
    expect(typeChecks).toBeTypeOf('function')
  })

  it('the disposer removes only that listener and can be called twice', () => {
    const ctx = createTableContext()
    const a = vi.fn()
    const b = vi.fn()

    const disposeA = ctx.on(SIZE_CHANGE, a)
    ctx.on(SIZE_CHANGE, b)
    expect(ctx.listenerCount(SIZE_CHANGE)).toBe(2)

    disposeA()
    disposeA()
    ctx.emit(SIZE_CHANGE)

    expect(a).not.toHaveBeenCalled()
    expect(b).toHaveBeenCalledTimes(1)
    expect(ctx.listenerCount(SIZE_CHANGE)).toBe(1)
    expect(ctx.listenerCount()).toBe(1)
  })

  it('the same function registered twice gets two independent registrations', () => {
    const ctx = createTableContext()
    const handler = vi.fn()

    const disposeFirst = ctx.on(SIZE_CHANGE, handler)
    ctx.on(SIZE_CHANGE, handler)
    disposeFirst()
    ctx.emit(SIZE_CHANGE)

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('a throwing listener is logged and does not stop the others', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const ctx = createTableContext()
    const before = vi.fn()
    const after = vi.fn()

    ctx.on(SIZE_CHANGE, before)
    ctx.on(SIZE_CHANGE, () => {
      throw new Error('boom')
    })
    ctx.on(SIZE_CHANGE, after)

    expect(() => ctx.emit(SIZE_CHANGE)).not.toThrow()
    expect(before).toHaveBeenCalledTimes(1)
    expect(after).toHaveBeenCalledTimes(1)
    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(String(errorSpy.mock.calls[0][0])).toContain(SIZE_CHANGE)
  })

  it('a listener that disposes itself does not skip the next one', () => {
    const ctx = createTableContext()
    const second = vi.fn()

    const dispose = ctx.on(SIZE_CHANGE, () => dispose())
    ctx.on(SIZE_CHANGE, second)

    ctx.emit(SIZE_CHANGE)
    expect(second).toHaveBeenCalledTimes(1)
    expect(ctx.listenerCount(SIZE_CHANGE)).toBe(1)
  })

  it('a listener removed during a dispatch is not called by that dispatch', () => {
    const ctx = createTableContext()
    const removed = vi.fn()

    let disposeRemoved = () => {}
    ctx.on(SIZE_CHANGE, () => disposeRemoved())
    disposeRemoved = ctx.on(SIZE_CHANGE, removed)

    ctx.emit(SIZE_CHANGE)
    expect(removed).not.toHaveBeenCalled()
  })

  it('a listener added during a dispatch runs from the next dispatch on', () => {
    const ctx = createTableContext()
    const added = vi.fn()

    const dispose = ctx.on(SIZE_CHANGE, () => {
      dispose()
      ctx.on(SIZE_CHANGE, added)
    })

    ctx.emit(SIZE_CHANGE)
    expect(added).not.toHaveBeenCalled()
    ctx.emit(SIZE_CHANGE)
    expect(added).toHaveBeenCalledTimes(1)
  })
})

describe('useTableContext', () => {
  it('disposes its listeners when the effect scope stops', () => {
    const ctx = createTableContext()
    const handler = vi.fn()
    const scope = effectScope()

    const events = scope.run(() => useTableContext(ctx))!
    events.on(SCROLL, handler)
    events.onMany({
      [SIZE_CHANGE]: handler,
      [HEADER_ROW_HEIGHT]: handler,
    })
    expect(ctx.listenerCount()).toBe(3)

    scope.stop()
    expect(ctx.listenerCount()).toBe(0)

    ctx.emit(SIZE_CHANGE)
    expect(handler).not.toHaveBeenCalled()

    // 作用域销毁后（例如卸载后才执行的回调）不再注册
    events.on(SIZE_CHANGE, handler)
    expect(ctx.listenerCount()).toBe(0)
  })

  it('onMany returns one disposer for all its listeners', () => {
    const ctx = createTableContext()
    const scope = effectScope()
    const events = scope.run(() => useTableContext(ctx))!

    const keep = events.on(SCROLL, () => {})
    const disposeMany = events.onMany({
      [SIZE_CHANGE]: () => {},
      [HOOKS_NAME.TABLE_CELL_WIDTH_CHANGE]: () => {},
    })
    disposeMany()
    expect(ctx.listenerCount()).toBe(1)

    keep()
    expect(ctx.listenerCount()).toBe(0)
    scope.stop()
  })

  it('emit goes through the context (a spy on the context sees it)', () => {
    const ctx = createTableContext()
    const scope = effectScope()
    const events = scope.run(() => useTableContext(ctx))!
    const emitSpy = vi.spyOn(ctx, 'emit')

    events.emit(SIZE_CHANGE)
    expect(emitSpy).toHaveBeenCalledWith(SIZE_CHANGE)
    scope.stop()
  })

  it('throws outside an effect scope', () => {
    expect(() => useTableContext(createTableContext())).toThrow(/useTableContext/)
  })

  it('throws when no table provides a context', () => {
    const Comp = defineComponent({
      setup() {
        injectTableContext()
        return () => null
      },
    })
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() => mount(Comp)).toThrow(/only available inside VeTable/)
  })
})

describe('table context in components', () => {
  // 模拟表格：provide 上下文，按 show 渲染子组件
  function createTable(Child: any) {
    let context!: TableContext
    const show = ref(true)
    const Table = defineComponent({
      setup() {
        context = provideTableContext()
        return () => h('div', show.value ? [h(Child)] : [])
      },
    })
    return { Table, show, getContext: () => context }
  }

  it('no listener is left after a setup() child unmounts', async () => {
    const handler = vi.fn()
    const Child = defineComponent({
      setup() {
        const events = useTableContext()
        events.on(SCROLL, handler)
        events.on(SIZE_CHANGE, handler)
        return () => h('span')
      },
    })
    const { Table, show, getContext } = createTable(Child)
    const wrapper = mount(Table)

    expect(getContext().listenerCount()).toBe(2)

    for (let i = 0; i < 3; i++) {
      show.value = false
      await nextTick()
      expect(getContext().listenerCount()).toBe(0)
      show.value = true
      await nextTick()
      expect(getContext().listenerCount()).toBe(2)
    }

    show.value = false
    await nextTick()
    getContext().emit(SIZE_CHANGE)
    expect(handler).not.toHaveBeenCalled()

    wrapper.unmount()
  })

  it('an Options API child can subscribe from created() and later hooks, and is cleaned up on unmount', async () => {
    const handler = vi.fn()
    const Child = defineComponent({
      data() {
        return { tableEvents: null as ReturnType<typeof useTableContext> | null }
      },
      created() {
        // created 执行时组件实例的 scope 已激活
        this.tableEvents = useTableContext()
      },
      mounted() {
        // mounted 时 scope 未激活，但订阅仍属于 created 中创建的作用域
        this.tableEvents!.on(SIZE_CHANGE, handler)
      },
      render() {
        return h('span')
      },
    })
    const { Table, show, getContext } = createTable(Child)
    const wrapper = mount(Table)

    getContext().emit(SIZE_CHANGE)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(getContext().listenerCount()).toBe(1)

    show.value = false
    await nextTick()
    expect(getContext().listenerCount()).toBe(0)

    wrapper.unmount()
  })

  it('a throwing component listener goes to the app errorHandler and the other listeners still run', () => {
    const errorHandler = vi.fn()
    const after = vi.fn()
    const error = new Error('listener boom')
    const Child = defineComponent({
      setup() {
        const events = useTableContext()
        events.on(SIZE_CHANGE, () => {
          throw error
        })
        events.on(SIZE_CHANGE, after)
        return () => h('span')
      },
    })
    const { Table, getContext } = createTable(Child)
    const wrapper = mount(Table, { global: { config: { errorHandler } } })

    expect(() => getContext().emit(SIZE_CHANGE)).not.toThrow()
    expect(errorHandler).toHaveBeenCalledTimes(1)
    expect(errorHandler.mock.calls[0][0]).toBe(error)
    expect(after).toHaveBeenCalledTimes(1)

    wrapper.unmount()
  })

  it('nested providers are separate: a child uses the nearest table', () => {
    const outerHandler = vi.fn()
    const innerHandler = vi.fn()
    let outer!: TableContext
    let inner!: TableContext

    const Leaf = defineComponent({
      setup() {
        useTableContext().on(SIZE_CHANGE, innerHandler)
        return () => h('span')
      },
    })
    const InnerTable = defineComponent({
      setup() {
        inner = provideTableContext()
        return () => h(Leaf)
      },
    })
    const OuterTable = defineComponent({
      setup() {
        outer = provideTableContext()
        // 提供者自己 inject 不到自己 provide 的值，需要显式传入（ve-table 同样如此）
        useTableContext(outer).on(SIZE_CHANGE, outerHandler)
        return () => h(InnerTable)
      },
    })
    const wrapper = mount(OuterTable)

    inner.emit(SIZE_CHANGE)
    expect(innerHandler).toHaveBeenCalledTimes(1)
    expect(outerHandler).not.toHaveBeenCalled()

    outer.emit(SIZE_CHANGE)
    expect(outerHandler).toHaveBeenCalledTimes(1)
    expect(innerHandler).toHaveBeenCalledTimes(1)

    wrapper.unmount()
  })
})
