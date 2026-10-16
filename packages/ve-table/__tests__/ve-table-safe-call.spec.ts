/*
safeCall 单元测试（INFRA-07）
*/

import { safeCall } from '@/ve-table/src/util/safe-call'

describe('safeCall', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the callback result', () => {
    const fn = vi.fn((a: number, b: number) => a + b)
    expect(safeCall('sum', fn, 1, 2)).toEqual({ value: 3, threw: false })
    expect(fn).toHaveBeenCalledWith(1, 2)
  })

  it('does nothing when no callback is given', () => {
    expect(safeCall('none', undefined)).toEqual({ value: undefined, threw: false })
    expect(safeCall('none', null)).toEqual({ value: undefined, threw: false })
  })

  it('logs and swallows a thrown error', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = new Error('boom')

    const result = safeCall('afterPaste', () => {
      throw error
    })

    expect(result).toEqual({ value: undefined, threw: true })
    expect(consoleError).toHaveBeenCalledTimes(1)
    expect(consoleError.mock.calls[0][0]).toContain('afterPaste')
    expect(consoleError.mock.calls[0][1]).toBe(error)
  })
})
