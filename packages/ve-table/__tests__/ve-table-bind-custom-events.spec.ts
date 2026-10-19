import { bindCustomEvents, getCustomEvents } from '@/ve-table/src/features/custom-events/bindCustomEvents'

// MOD-07：bindCustomEvents / getCustomEvents 单元测试
describe('bindCustomEvents (MOD-07)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('binds only events that have a user or an internal handler', () => {
    const listeners = bindCustomEvents({ dblclick: () => {} }, { click: () => {} })

    expect(Object.keys(listeners).sort()).toEqual(['onClick', 'onDblclick'])
  })

  it('calls the user handler first, then the internal handler, with the event', () => {
    const calls: string[] = []
    const event = { type: 'click' }
    const listeners = bindCustomEvents(
      { click: (e: any) => calls.push(`user:${e.type}`) },
      { click: (e: any) => calls.push(`internal:${e.type}`) },
    )

    listeners.onClick!(event)

    expect(calls).toEqual(['user:click', 'internal:click'])
  })

  it('logs a throwing user handler and still runs the internal handler', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const internal = vi.fn()
    const listeners = bindCustomEvents(
      {
        mousedown: () => {
          throw new Error('boom')
        },
      },
      { mousedown: internal },
      'eventCustomOption.bodyCellEvents',
    )

    expect(() => listeners.onMousedown!({})).not.toThrow()
    expect(internal).toHaveBeenCalledTimes(1)
    expect(consoleError.mock.calls[0][0]).toContain('eventCustomOption.bodyCellEvents.mousedown')
  })

  it('ignores user values that are not functions', () => {
    const listeners = bindCustomEvents({ click: 'nope' as any, mouseup: null as any })

    expect(listeners).toEqual({})
  })

  it('getCustomEvents calls the factory only when it is a function and returns an object', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const click = () => {}
    const factory = vi.fn(() => ({ click }))

    expect(getCustomEvents({ bodyRowEvents: factory }, 'bodyRowEvents', { rowIndex: 1 })).toEqual({ click })
    expect(factory).toHaveBeenCalledWith({ rowIndex: 1 })

    expect(getCustomEvents(null, 'bodyRowEvents', {})).toEqual({})
    expect(getCustomEvents({ bodyRowEvents: {} }, 'bodyRowEvents', {})).toEqual({})
    expect(getCustomEvents({ bodyRowEvents: () => 'x' }, 'bodyRowEvents', {})).toEqual({})
    expect(consoleError).not.toHaveBeenCalled()

    expect(getCustomEvents({
      bodyRowEvents: () => {
        throw new Error('boom')
      },
    }, 'bodyRowEvents', {})).toEqual({})
    expect(consoleError.mock.calls[0][0]).toContain('eventCustomOption.bodyRowEvents')
  })
})
