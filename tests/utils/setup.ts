import { config, VueWrapper } from '@vue/test-utils'
import vueSnapshotSerializer from 'jest-serializer-vue'
import { useVeTable } from '../../packages/vue/src/index'

declare module '@vue/test-utils' {
  interface VueWrapper {
    findResizeObserver: () => VueWrapper
    triggerResizeObserver: (options?: { width?: number, height?: number }) => void
  }
}

expect.addSnapshotSerializer(vueSnapshotSerializer)

// 全局注册所有 ve 组件，供所有 mount 调用使用
config.global.plugins = [useVeTable()]

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
