import { wrapMount } from '@test-utils'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, onUnmounted } from 'vue'

// 记录被卸载的探针组件
const unmounted: string[] = []

function probe(name: string) {
  return defineComponent({
    setup() {
      onUnmounted(() => {
        unmounted.push(name)
      })
      return () => h('div', { class: `probe-${name}` }, name)
    },
  })
}

describe('tests/utils: every test wrapper is unmounted', () => {
  // 在 describe 层（收集阶段）挂载：整个文件内都应保持挂载，文件结束后才卸载
  const shared = wrapMount(probe('shared'))
  const bodyBaseline = document.body.children.length

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('mounts wrappers inside a test (wrapMount and a plain VTU mount)', () => {
    wrapMount(probe('wrap'))
    mount(probe('plain'))

    expect(document.body.children.length).toBe(bodyBaseline + 1)
    expect(document.querySelector('.probe-wrap')).not.toBeNull()
  })

  it('unmounts them after the test and removes the wrapMount container from body', () => {
    expect(unmounted).toContain('wrap')
    expect(unmounted).toContain('plain')
    expect(document.querySelector('.probe-wrap')).toBeNull()
    expect(document.body.children.length).toBe(bodyBaseline)
  })

  it('keeps a wrapper mounted at describe level for the whole file', () => {
    expect(unmounted).not.toContain('shared')
    expect(shared.element.isConnected).toBe(true)
    expect(document.querySelector('.probe-shared')).not.toBeNull()
  })

  it('an explicit unmount removes the body container and can be repeated', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    for (let i = 0; i < 5; i++)
      wrapMount(probe(`loop${i}`)).unmount()

    expect(document.body.children.length).toBe(bodyBaseline)

    const wrapper = wrapMount(probe('twice'))
    wrapper.unmount()
    expect(() => wrapper.unmount()).not.toThrow()

    // 重复卸载不应触发 Vue 的 "Cannot unmount an app that is not mounted" 警告
    const unmountWarnings = warnSpy.mock.calls.filter(args => String(args[0]).includes('Cannot unmount'))
    expect(unmountWarnings).toHaveLength(0)
  })

  describe('wrappers mounted in beforeEach', () => {
    let wrapper: ReturnType<typeof wrapMount>
    const elements: Element[] = []

    beforeEach(() => {
      wrapper = wrapMount(probe('each'))
      elements.push(wrapper.element)
    })

    it('are mounted during the test', () => {
      expect(wrapper.element.isConnected).toBe(true)
    })

    it('are unmounted after each test', () => {
      expect(elements).toHaveLength(2)
      expect(elements[0].isConnected).toBe(false)
      expect(elements[1].isConnected).toBe(true)
      expect(unmounted.filter(name => name === 'each')).toHaveLength(1)
    })
  })
})
