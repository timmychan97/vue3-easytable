/*
fork from:
https://github.com/ElemeFE/element
*/
// function broadcast(componentName, eventName, params) {
//   this.$children.forEach((child) => {
//     const name = child.$options.name

//     if (name === componentName)
//       child.$emit([eventName].concat(params))

//     else
//       broadcast.apply(child, [componentName, eventName].concat([params]))
//   })
// }
import type { Emitter, EventType } from 'mitt'

type EventBus = Emitter< Record<EventType, unknown>>

export default (eventBusKey?: string) => defineComponent({
  provide() {
    return eventBusKey ? { eventBus: (this as any)[eventBusKey] } : {}
  },
  inject: eventBusKey ? [] : ['eventBus'],
  methods: {
    dispatch(componentName: string, eventName: string, params: any) {
      const bus = ((eventBusKey && (this as any)[eventBusKey]) || this.eventBus) as EventBus
      bus.emit([componentName, eventName].join(), params)
    },
    on(eventName: string, callback: (params: any) => void) {
      const bus = ((eventBusKey && (this as any)[eventBusKey]) || this.eventBus) as EventBus
      const type = [this.$options.name, eventName].join()
      const handler = callback.bind(this)
      bus.on(type, handler)

      // 记录已注册的事件，卸载时统一移除
      const self = this as any
      if (!self.busListeners)
        self.busListeners = []
      self.busListeners.push({ bus, type, handler })
    },
  },
  beforeUnmount() {
    // 移除本实例注册的所有事件，避免已卸载的实例继续响应（例如 showHeader 切换后排序回调执行多次）
    const self = this as any
    if (self.busListeners) {
      self.busListeners.forEach(({ bus, type, handler }: { bus: EventBus, type: string, handler: (params: any) => void }) => {
        bus.off(type, handler)
      })
      self.busListeners = []
    }
  },
})
