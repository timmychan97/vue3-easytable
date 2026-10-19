import type { Option } from '@/ve-contextmenu/src'
import veContextmenu from '@/ve-contextmenu'
import { mount } from '@vue/test-utils'
import { expectTypeOf } from 'vitest'

/*
 * MENU-10：公开的 Option 类型（由 vue-tsc 检查；运行时只确认组件能用这些选项渲染）
 * - type 是可选的字符串：点击时作为 on-node-click 的参数，'SEPARATOR' 表示分隔线；
 * - 分隔线不需要 label，所以 label 是可选的。
 */
describe('contextmenu Option type (MENU-10)', () => {
  it('accepts menu items with a type and separators without a label', async () => {
    const options: Option[] = [
      { label: 'menu1', type: 'menu1-type' },
      { type: 'SEPARATOR' },
      {
        label: 'menu2',
        children: [
          { label: 'menu2-1', type: 'menu2-1-type', disabled: true },
          { type: 'SEPARATOR' },
          { label: 'menu2-2' },
        ],
      },
    ]

    expectTypeOf<Option['type']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<Option['label']>().toEqualTypeOf<string | undefined>()

    // 只做类型检查，不执行
    const typeErrors = (): Option[] => [
      // @ts-expect-error type 是字符串
      { label: 'a', type: 1 },
      // @ts-expect-error label 是字符串
      { label: 2 },
      // @ts-expect-error 子菜单同样检查
      { label: 'b', children: [{ type: false }] },
    ]
    expect(typeof typeErrors).toBe('function')

    const eventTarget = document.createElement('div')
    document.body.appendChild(eventTarget)
    const wrapper = mount(veContextmenu, { props: { options, eventTarget } })

    eventTarget.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
    await nextTick()

    const popper = document.querySelector('.ve-contextmenu-popper')!
    expect([...popper.querySelectorAll('.ve-contextmenu-node')].map(x => x.textContent)).toEqual(['menu1', 'menu2'])
    expect(popper.querySelectorAll('.ve-contextmenu-node-separator')).toHaveLength(1)

    wrapper.unmount()
    eventTarget.remove()
  })
})
