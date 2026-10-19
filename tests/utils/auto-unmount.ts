import type { VueWrapper } from '@vue/test-utils'
import { config } from '@vue/test-utils'
import { afterAll, afterEach, beforeEach } from 'vitest'

/*
 * 自动卸载测试中挂载的组件（在 setup.ts 中调用 enableAutoUnmount()）
 *
 * - 记录每一次 VTU mount（包括 wrapMount 和直接调用 @vue/test-utils 的 mount）创建的根 wrapper
 * - 在用例中（含 beforeEach）挂载的 wrapper：该用例结束后卸载
 * - 在 describe 层（收集阶段）或 beforeAll 中挂载的 wrapper：整个文件结束后卸载
 * - 卸载时同时移除 VTU 创建的挂载容器（attachTo 时 VTU 不会移除它，body 中会残留一个 div）
 * - 用例中手动调用 wrapper.unmount() 也会移除容器；重复调用不会报错
 *
 * 没有卸载的组件会让 resize-observer-polyfill 一直监听 document，
 * jsdom 环境销毁时清空 body 会触发它的 requestAnimationFrame 回调，
 * 回调在已关闭的 window 上运行，抛出 "Cannot read properties of null (reading '_location')"。
 */

type RootWrapper = VueWrapper<any> & {
  __app: { _container?: Element | null } | null
}

let inTest = false
const testWrappers = new Set<RootWrapper>()
const fileWrappers = new Set<RootWrapper>()

function track(wrapper: RootWrapper) {
  const container = wrapper.__app?._container ?? null
  const unmount = wrapper.unmount.bind(wrapper)
  let isUnmounted = false

  wrapper.unmount = () => {
    if (isUnmounted)
      return
    isUnmounted = true
    testWrappers.delete(wrapper)
    fileWrappers.delete(wrapper)
    try {
      unmount()
    }
    finally {
      container?.remove()
    }
  }

  ;(inTest ? testWrappers : fileWrappers).add(wrapper)
}

function unmountAll(wrappers: Set<RootWrapper>) {
  const errors: unknown[] = []
  // 复制一份：unmount 会从集合中删除自己
  ;[...wrappers].forEach((wrapper) => {
    try {
      wrapper.unmount()
    }
    catch (e) {
      errors.push(e)
    }
  })
  wrappers.clear()
  // 卸载报错说明组件的卸载逻辑有问题，不能吞掉
  if (errors.length)
    throw errors[0]
}

export function enableAutoUnmount() {
  config.plugins.VueWrapper.install((wrapper) => {
    // 只有 mount 返回的根 wrapper 带有 __app；findComponent 等返回的子 wrapper 为 null
    const root = wrapper as RootWrapper
    if (root.__app)
      track(root)
    return {}
  })

  beforeEach(() => {
    inTest = true
  })

  afterEach(() => {
    inTest = false
    unmountAll(testWrappers)
  })

  afterAll(() => {
    unmountAll(fileWrappers)
  })
}
