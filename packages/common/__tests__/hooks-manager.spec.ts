import Hooks from '@/common/utils/hooks-manager'
import { afterEach, expect, vi } from 'vitest'

describe('hooks manager', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('addHook returns a disposer that removes only that callback', () => {
    const hooks = new Hooks()
    const a = vi.fn()
    const b = vi.fn()

    const disposeA = hooks.addHook('scroll', a)
    hooks.addHook('scroll', b)

    disposeA()
    hooks.triggerHook('scroll', 1)

    expect(a).not.toHaveBeenCalled()
    expect(b).toHaveBeenCalledWith(1)
    expect(hooks.hooks.scroll.length).toBe(1)

    // 重复调用 disposer 不应误删其他回调
    disposeA()
    expect(hooks.hooks.scroll.length).toBe(1)
  })

  it('a throwing callback does not stop the remaining callbacks', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const hooks = new Hooks()
    const after = vi.fn()

    hooks.addHook('scroll', () => {
      throw new Error('boom')
    })
    hooks.addHook('scroll', after)

    expect(() => hooks.triggerHook('scroll')).not.toThrow()
    expect(after).toHaveBeenCalledTimes(1)
    expect(errorSpy).toHaveBeenCalledTimes(1)
  })

  it('a callback that disposes itself does not skip the next one', () => {
    const hooks = new Hooks()
    const second = vi.fn()

    const dispose = hooks.addHook('scroll', () => dispose())
    hooks.addHook('scroll', second)

    hooks.triggerHook('scroll')
    expect(second).toHaveBeenCalledTimes(1)
  })
})
