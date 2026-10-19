import { config, VueWrapper } from '@vue/test-utils'
import { useVeTable } from '../../packages/vue/src/index'
import { enableAutoUnmount } from './auto-unmount'

declare module '@vue/test-utils' {
  interface VueWrapper {
    findResizeObserver: () => VueWrapper
    triggerResizeObserver: (options?: { width?: number, height?: number }) => void
  }
}

// 全局注册所有 ve 组件，供所有 mount 调用使用
config.global.plugins = [useVeTable()]

// 每个用例结束后卸载其中挂载的组件，并移除 attachTo 留在 body 中的容器（见 auto-unmount.ts）
enableAutoUnmount()

// add Wrapper prototype
Object.assign(VueWrapper.prototype, {
  findResizeObserver() {
    return (this as any).findComponent({ name: 'vue-dom-resize-observer' })
  },
  triggerResizeObserver({ width = 0, height = 0 }: { width?: number, height?: number }) {
    const ob = (this as any).findResizeObserver()
    ob.vm.resizeListener({ width, height })
  },
})
