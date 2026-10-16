import veLoading from '@/ve-loading'
import { later, wrapMount as mount } from '@test-utils'

describe('veLoading', () => {
  const PARENT_RELATIVE_CLASS = 've-loading-parent-relative'
  const PARENT_LOCK_CLASS = 've-loading-parent-lock'

  // spin names
  const SPIN_NAMES = {
    PLANE: 'plane',
    GRID: 'grid',
    WAVE: 'wave',
    FLOW: 'flow',
    BOUNCE: 'bounce',
    PULSE: 'pulse',
  }

  it('render normal', () => {
    const wrapper = mount({
      render() {
        return (
          <div>
            {Object.values(SPIN_NAMES).map((name) => {
              return <div id={`loading-${name}`} />
            })}
          </div>
        )
      },
    })

    Object.values(SPIN_NAMES).forEach((spinName) => {
      veLoading({
        target: wrapper.vm.$el.querySelector(`#loading-${spinName}`),
        name: spinName as any,
      }).show()
    })

    expect(wrapper.html()).toMatchSnapshot()

    wrapper.unmount()
  })

  it('fullscreen prop', async () => {
    const instance = veLoading({
      fullscreen: true,
      name: 'bounce',
      lock: true,
    })

    await later()

    // body
    expect(
      document.body.classList.contains('ve-loading-parent-relative'),
    ).toBe(true)

    const loadingEl = document.querySelector('.ve-loading')

    expect(loadingEl).not.toBeNull()

    expect(loadingEl!.classList.contains('ve-loading-hide')).toBe(true)

    instance.show()
    await later()
    expect(loadingEl!.classList.contains('ve-loading-hide')).toBe(false)
  })

  it('lock prop', async () => {
    const _instance = veLoading({
      fullscreen: true,
      name: 'bounce',
      lock: true,
    })

    await later()

    const loadingEl = document.querySelector('.ve-loading')

    expect(loadingEl!.classList.contains('ve-loading-fixed')).toBe(true)

    // 父元素 class：创建时加 relative，show 时加 lock，close 时移除 lock，destroy 时全部移除
    const target = document.createElement('div')
    document.body.appendChild(target)

    const instance = veLoading({ target, name: 'bounce', lock: true })
    await later()

    expect(target.classList.contains(PARENT_RELATIVE_CLASS)).toBe(true)
    expect(target.classList.contains(PARENT_LOCK_CLASS)).toBe(false)

    instance.show()
    await later()
    expect(target.classList.contains(PARENT_LOCK_CLASS)).toBe(true)

    instance.close()
    await later()
    expect(target.classList.contains(PARENT_LOCK_CLASS)).toBe(false)
    expect(target.classList.contains(PARENT_RELATIVE_CLASS)).toBe(true)

    instance.show()
    await later()
    instance.destroy()
    await later()
    expect(target.classList.contains(PARENT_RELATIVE_CLASS)).toBe(false)
    expect(target.classList.contains(PARENT_LOCK_CLASS)).toBe(false)

    target.remove()
  })

  it('does not lock the parent without the lock prop', async () => {
    const target = document.createElement('div')
    document.body.appendChild(target)

    const instance = veLoading({ target, name: 'bounce' })
    instance.show()
    await later()

    expect(target.classList.contains(PARENT_RELATIVE_CLASS)).toBe(true)
    expect(target.classList.contains(PARENT_LOCK_CLASS)).toBe(false)

    instance.destroy()
    expect(target.classList.contains(PARENT_RELATIVE_CLASS)).toBe(false)

    target.remove()
  })

  // 同一 tick 内 show() 后立即 destroy()，nextTick 回调不应再给父元素加 class
  it('show then destroy in the same tick leaves no parent classes', async () => {
    const target = document.createElement('div')
    document.body.appendChild(target)

    const instance = veLoading({ target, name: 'bounce', lock: true })
    instance.show()
    instance.destroy()
    await later()

    expect(target.classList.contains(PARENT_RELATIVE_CLASS)).toBe(false)
    expect(target.classList.contains(PARENT_LOCK_CLASS)).toBe(false)
    expect(target.querySelector('.ve-loading')).toBeNull()

    target.remove()
  })

  // 多个 loading 共用同一个 target 时，按引用计数移除父元素 class
  it('keeps the parent classes while another loading shares the target', async () => {
    const target = document.createElement('div')
    document.body.appendChild(target)

    const first = veLoading({ target, name: 'bounce', lock: true })
    const second = veLoading({ target, name: 'pulse', lock: true })

    first.show()
    second.show()
    await later()
    expect(target.classList.contains(PARENT_LOCK_CLASS)).toBe(true)

    first.close()
    await later()
    expect(target.classList.contains(PARENT_LOCK_CLASS)).toBe(true)

    // 重复 destroy 不应多减引用计数
    first.destroy()
    first.destroy()
    await later()
    expect(target.classList.contains(PARENT_RELATIVE_CLASS)).toBe(true)
    expect(target.classList.contains(PARENT_LOCK_CLASS)).toBe(true)

    second.close()
    await later()
    expect(target.classList.contains(PARENT_LOCK_CLASS)).toBe(false)
    expect(target.classList.contains(PARENT_RELATIVE_CLASS)).toBe(true)

    second.destroy()
    expect(target.classList.contains(PARENT_RELATIVE_CLASS)).toBe(false)

    target.remove()
  })

  it('tip prop', async () => {
    const wrapper = mount({
      render() {
        return (
          <div>
            <div class="loading-item"></div>
          </div>
        )
      },
    })

    const tip = 'loading...'
    const _instance = veLoading({
      target: wrapper.vm.$el.querySelector('.loading-item'),
      name: 'pulse',
      tip,
    })

    expect(wrapper.find('.ve-loading-spin-tip').text()).toBe(tip)

    wrapper.unmount()
  })

  it('overlayBackgroundColor prop', async () => {
    const wrapper = mount({
      render() {
        return (
          <div>
            <div class="loading-item"></div>
          </div>
        )
      },
    })

    const bgColor = 'rgba(255, 255, 255, 0.1)'
    const _instance = veLoading({
      target: wrapper.vm.$el.querySelector('.loading-item'),
      name: 'pulse',
      overlayBackgroundColor: bgColor,
    })

    expect(wrapper.find('.ve-loading').attributes('style')).toBe(
      `background-color: ${bgColor};`,
    )

    wrapper.unmount()
  })

  it('show and close method', async () => {
    const wrapper = mount({
      render() {
        return (
          <div>
            <div class="loading-item"></div>
          </div>
        )
      },
    })

    const instance = veLoading({
      target: wrapper.vm.$el.querySelector('.loading-item'),
      name: 'pulse',
    })

    await later()
    expect(wrapper.find('.ve-loading-hide').exists()).toBe(true)

    instance.show()
    await later()
    expect(wrapper.find('.ve-loading-hide').exists()).toBe(false)

    instance.close()
    await later()
    expect(wrapper.find('.ve-loading-hide').exists()).toBe(true)

    wrapper.unmount()
  })

  it('destory method', async () => {
    const wrapper = mount({
      render() {
        return (
          <div>
            <div class="loading-item"></div>
          </div>
        )
      },
    })

    const instance = veLoading({
      target: wrapper.vm.$el.querySelector('.loading-item'),
      name: 'pulse',
    })

    expect(wrapper.find('.ve-loading-spin').exists()).toBe(true)

    instance.destroy()
    await later()
    expect(wrapper.find('.ve-loading-spin').exists()).toBe(false)

    wrapper.unmount()
  })
})
