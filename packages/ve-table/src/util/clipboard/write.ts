/**
 * 主动写入系统剪贴板（CLIP-06，用于右键菜单的复制、剪切）
 *
 * 键盘复制（Ctrl+C）由浏览器派发 copy 事件，直接写 event.clipboardData 即可；
 * 右键菜单没有 copy 事件，需要主动写入：
 * 1. 优先使用 navigator.clipboard.writeText。它只在安全上下文（https、localhost）中存在，
 *    且 Safari 要求在用户手势中同步调用，因此调用之前不能有任何 await；
 * 2. 不可用或被拒绝（无权限、非安全上下文）时，退回已废弃但仍被广泛支持的
 *    document.execCommand('copy')：在捕获阶段监听这一次 copy 事件写入文本，
 *    并阻止事件继续传播，避免表格自身的 copy 处理（editorCopy）再执行一遍；
 * 3. 两者都失败时 Promise 被 reject，由调用方反馈给用户（clipboardOption.writeError）。
 */

/**
 * 通过 execCommand('copy') 写入文本，成功返回 true
 */
export function execCommandCopy(text: string): boolean {
  if (typeof document === 'undefined' || typeof document.execCommand !== 'function')
    return false

  let written = false

  const onCopy = (event: ClipboardEvent) => {
    if (!event.clipboardData)
      return
    event.clipboardData.setData('text/plain', text)
    // 不阻止默认行为的话，浏览器会改为复制当前选中的文本
    event.preventDefault()
    event.stopImmediatePropagation()
    written = true
  }

  document.addEventListener('copy', onCopy, true)
  try {
    // 返回 false：浏览器不支持或不允许（如不在用户手势中）
    return document.execCommand('copy') && written
  }
  catch {
    return false
  }
  finally {
    document.removeEventListener('copy', onCopy, true)
  }
}

function getAsyncClipboard(): Clipboard | undefined {
  if (typeof navigator === 'undefined')
    return undefined

  const { clipboard } = navigator
  return clipboard && typeof clipboard.writeText === 'function'
    ? clipboard
    : undefined
}

/**
 * 写入剪贴板文本；写入失败时 reject（navigator.clipboard 的错误优先）
 */
export function writeClipboardText(text: string): Promise<void> {
  const clipboard = getAsyncClipboard()

  // 非安全上下文没有 navigator.clipboard：在用户手势中同步回退
  if (!clipboard) {
    return execCommandCopy(text)
      ? Promise.resolve()
      : Promise.reject(
          new Error('[vue3-easytable] The clipboard is not available: navigator.clipboard is missing and document.execCommand("copy") failed.'),
        )
  }

  let request: Promise<void>
  try {
    request = clipboard.writeText(text)
  }
  catch (error) {
    request = Promise.reject(error)
  }

  return Promise.resolve(request).catch((error) => {
    if (execCommandCopy(text))
      return
    throw error
  })
}
