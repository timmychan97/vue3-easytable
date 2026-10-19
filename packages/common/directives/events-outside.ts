/*
events outside
desc:绑定元素触发的事件不在指定事件中，将会触发。此指令可替代 clickoutside

--------------------vue 模板用法如下：-----------------------------------
```vue
<tempate>
    <button v-events-outside="{
        events:["mousedown","mouseover"],
        callback:(e)=>{} //
    }">删除</button>
</tempate>
```

--------------------vue jsx 用法如下：-----------------------------------
<script>
    export default{
        render(){
                const props = {
                        directives: [
                                        {
                                            name: "events-outside",
                                            value: {
                                                events: ["mousedown","mouseover"],
                                                callback: (e) => {
                                                    //
                                                },
                                            },
                                        }
                                    ]
                    };

            return (
                <div>
                    <button {...props}>删除</button>
                </div>
            )
        }
    }
</script>

*/
import type { Directive, DirectiveBinding } from 'vue'

interface EventsOutsideValue {
  events?: string[]
  callback?: (e: Event) => void
}

interface EventsOutsideState {
  handler: (e: Event) => void
  // 当前已在 document 上注册的事件
  events: string[]
  // 最新的回调（updated 时更新）
  callback: ((e: Event) => void) | null
}

interface EventsOutsideEl extends HTMLElement {
  __eventsOutside__?: EventsOutsideState | null
}

// 取出合法的事件列表与回调；绑定值不合法时返回 null
function parseValue(value: EventsOutsideValue | null | undefined) {
  const { events, callback } = value ?? {}
  if (Array.isArray(events) && events.length && typeof callback === 'function')
    return { events: [...events], callback }
  return null
}

function reportInvalid(binding: DirectiveBinding) {
  const compName = binding.instance?.$options.name
  console.error(
    `[events-outside] Please provided 'events' and 'callback' in ${compName}`,
  )
}

function bind(state: EventsOutsideState, events: string[]) {
  events.forEach((eventName) => {
    document.addEventListener(eventName, state.handler, true)
  })
  state.events = events
}

function unbind(state: EventsOutsideState) {
  state.events.forEach((eventName) => {
    document.removeEventListener(eventName, state.handler, true)
  })
  state.events = []
}

const eventsOutside: Directive<EventsOutsideEl, EventsOutsideValue | null | undefined> = {
  beforeMount(el, binding) {
    const parsed = parseValue(binding.value)

    const state: EventsOutsideState = {
      handler: (e: Event) => {
        if (state.callback && !el.contains(e.target as Node) && el !== e.target)
          state.callback(e)
      },
      events: [],
      callback: null,
    }
    el.__eventsOutside__ = state

    if (parsed) {
      state.callback = parsed.callback
      bind(state, parsed.events)
    }
    else {
      reportInvalid(binding)
    }
  },

  // 绑定值通常是渲染时新建的对象：回调总是更新为最新的，事件列表内容变化时才重新注册
  updated(el, binding) {
    const state = el.__eventsOutside__
    if (!state)
      return

    const parsed = parseValue(binding.value)
    if (!parsed) {
      if (state.callback)
        reportInvalid(binding)
      state.callback = null
      unbind(state)
      return
    }

    state.callback = parsed.callback
    if (parsed.events.join(',') !== state.events.join(',')) {
      unbind(state)
      bind(state, parsed.events)
    }
  },

  beforeUnmount(el) {
    const state = el.__eventsOutside__
    if (state)
      unbind(state)
    el.__eventsOutside__ = null
  },
}

export default eventsOutside
