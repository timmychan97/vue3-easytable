/**
 * 安全调用用户回调（INFRA-07）
 *
 * 用户回调（beforePaste、afterAutofill、afterCellValueChange 等）抛出异常时，
 * 不能让表格内部状态停在“改了一半”的位置：
 * - 异常通过 console.error 输出，不再向上抛出；
 * - 返回 undefined，调用方据此继续执行内部清理。
 *
 * 注意：对 before* 回调来说，返回 undefined 等同于“未阻止”，
 * 调用方如需在异常时取消操作，应自行检查 `threw`。
 */

export interface SafeCallResult<R> {
  /** 回调的返回值；未提供回调或回调抛出异常时为 undefined */
  value: R | undefined
  /** 回调是否抛出了异常 */
  threw: boolean
}

export function safeCall<A extends unknown[], R>(
  name: string,
  fn: ((...args: A) => R) | null | undefined,
  ...args: A
): SafeCallResult<R> {
  if (typeof fn !== 'function')
    return { value: undefined, threw: false }

  try {
    return { value: fn(...args), threw: false }
  }
  catch (error) {
    console.error(`[vue3-easytable] "${name}" callback threw an error:`, error)
    return { value: undefined, threw: true }
  }
}
