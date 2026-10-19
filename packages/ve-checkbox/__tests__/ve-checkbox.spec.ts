import veCheckbox from '@/ve-checkbox'
import veCheckboxGroup, { CheckboxGroupInjectionKey } from '@/ve-checkbox-group'
import { wrapMount as mount } from '@test-utils'
import { describe, expect } from 'vitest'

describe('veCheckbox', () => {
  it('render normal', () => {
    const wrapper = mount(veCheckbox, {
      props: {
        modelValue: true,
        label: 'orange',
      },
    })

    expect(wrapper.html()).toMatchSnapshot()
  })
  it('render with checkbox group', async () => {
    const wrapper = mount({
      template: `
                <ve-checkbox-group v-model="checkboxValue">
                    <ve-checkbox label="南瓜" />
                    <ve-checkbox disabled label="西红柿" />
                    <ve-checkbox label="哈密瓜" />
                    <ve-checkbox label="水蜜桃" />
                </ve-checkbox-group>
            `,
      data() {
        return {
          checkboxValue: ['西红柿', '哈密瓜'],
        }
      },
    })

    expect(wrapper.html()).toMatchSnapshot()
  })

  it('render with indeterminate', () => {
    const wrapper = mount(veCheckbox, {
      props: {
        modelValue: true,
        label: 'orange',
        disabled: true,
      },
    })

    expect(wrapper.html()).toMatchSnapshot()
  })

  it('render with disabled', () => {
    const wrapper = mount(veCheckbox, {
      props: {
        modelValue: true,
        label: 'orange',
        indeterminate: true,
      },
    })

    expect(wrapper.html()).toMatchSnapshot()
  })

  it('value prop', () => {
    const wrapper = mount(veCheckbox, {
      propsData: {
        modelValue: true,
        label: 'orange',
      },
    })

    expect(wrapper.find('.ve-checkbox-checked').exists()).toBe(true)
  })

  it('label prop', () => {
    const wrapper = mount(veCheckbox, {
      propsData: {
        modelValue: true,
        label: 'orange',
      },
    })

    expect(wrapper.find('.ve-checkbox-label').text()).toBe('orange')
  })

  it('label content slot', () => {
    const wrapper = mount(veCheckbox, {
      slots: {
        default: 'orange',
      },
    })

    expect(wrapper.find('.ve-checkbox-label').text()).toBe('orange')
  })

  it('disbled prop', () => {
    const wrapper = mount(veCheckbox, {
      propsData: {
        disabled: true,
        label: 'orange',
      },
    })

    expect(wrapper.find('.ve-checkbox-disabled').exists()).toBe(true)
  })

  it('disbled selected with checked statue', async () => {
    const wrapper = mount(veCheckbox, {
      propsData: {
        modelValue: true,
        disabled: true,
        label: 'orange',
      },
    })
    expect(wrapper.find('.ve-checkbox-checked').exists()).toBe(true)

    await wrapper.find('.ve-checkbox').trigger('click')
    expect(wrapper.find('.ve-checkbox-checked').exists()).toBe(true)
  })

  it('disbled selected with unchecked statue', async () => {
    const wrapper = mount(veCheckbox, {
      propsData: {
        value: false,
        disabled: true,
        label: 'orange',
      },
    })
    expect(wrapper.find('.ve-checkbox-checked').exists()).toBe(false)

    await wrapper.find('.ve-checkbox').trigger('click')
    expect(wrapper.find('.ve-checkbox-checked').exists()).toBe(false)
  })

  it('indeterminate prop', () => {
    const wrapper = mount(veCheckbox, {
      propsData: {
        indeterminate: true,
        label: 'orange',
      },
    })
    expect(wrapper.find('.ve-checkbox-indeterminate').exists()).toBe(true)
  })

  it('isControlled prop', async () => {
    const wrapper = mount(veCheckbox, {
      propsData: {
        isControlled: true,
        label: 'orange',
      },
    })

    await wrapper.setProps({ isSelected: true })
    expect(wrapper.find('.ve-checkbox-checked').exists()).toBe(true)

    await wrapper.setProps({ isSelected: false })
    expect(wrapper.find('.ve-checkbox-checked').exists()).toBe(false)
  })

  it('isSelected prop', () => {
    const wrapper = mount(veCheckbox, {
      propsData: {
        isControlled: true,
        isSelected: true,
        label: 'orange',
      },
    })

    expect(wrapper.find('.ve-checkbox-checked').exists()).toBe(true)
  })

  it('click event', async () => {
    const wrapper = mount({
      template: `
            <ve-checkbox v-model="checkboxValue">orange</ve-checkbox>`,
      data() {
        return {
          checkboxValue: false,
        }
      },
    })
    await wrapper.find('.ve-checkbox').trigger('click')
    expect(wrapper.find('.ve-checkbox-checked').exists()).toBe(true)
  })

  it('checked change emit', async () => {
    const wrapper = mount(veCheckbox, {
      propsData: {
        modelValue: false,
        label: 'orange',
      },
    })

    await wrapper.find('.ve-checkbox').trigger('click')
    await wrapper.find('.ve-checkbox').trigger('click')

    expect(wrapper.emitted('on-checked-change')!.length).toEqual(2)
  })

  it('checkboxGroup data change', async () => {
    const wrapper = mount({
      template: `
                <ve-checkbox-group v-model="checkboxValue">
                    <ve-checkbox label="南瓜" />
                    <ve-checkbox disabled label="西红柿" />
                    <ve-checkbox label="哈密瓜" />
                    <ve-checkbox label="水蜜桃" />
                </ve-checkbox-group>
            `,
      data() {
        return {
          checkboxValue: ['西红柿', '哈密瓜'],
        }
      },
    })

    const checkeds1 = wrapper.findAll('.ve-checkbox-checked')

    expect(checkeds1.length).toBe(2)

    await wrapper.setData({ checkboxValue: ['西红柿'] })

    const checkeds2 = wrapper.findAll('.ve-checkbox-checked')

    expect(checkeds2.length).toBe(1)

    await wrapper.setData({ checkboxValue: ['西红柿', '水蜜桃'] })

    const checkeds3 = wrapper.findAll('.ve-checkbox-checked')

    expect(checkeds3.length).toBe(2)
  })

  it('checkbox data change width checkboxGroup', async () => {
    const wrapper = mount({
      template: `
                <ve-checkbox-group v-model="checkboxValue">
                    <ve-checkbox label="南瓜" />
                    <ve-checkbox disabled label="西红柿" />
                    <ve-checkbox label="哈密瓜" />
                    <ve-checkbox label="水蜜桃" />
                </ve-checkbox-group>
            `,
      data() {
        return {
          checkboxValue: ['西红柿', '哈密瓜'],
        }
      },
    })

    await wrapper.find('.ve-checkbox').trigger('click')

    expect((wrapper.vm as any).checkboxValue).toEqual(['西红柿', '哈密瓜', '南瓜'])
  })

  it('unmounted checkboxes stop receiving group updates (FORM-01)', async () => {
    // 探针：包装 group 提供的 onCheckboxGroupUpdate，统计回调被调用的次数
    let groupCallbackCalls = 0
    const CallbackCounter = defineComponent({
      setup() {
        const payload = inject(CheckboxGroupInjectionKey)!
        const register = payload.onCheckboxGroupUpdate
        payload.onCheckboxGroupUpdate = cb => register((val) => {
          groupCallbackCalls++
          cb(val)
        })
        return () => null
      },
    })

    const wrapper = mount({
      components: { CallbackCounter },
      template: `
                <ve-checkbox-group v-model="checkboxValue">
                    <callback-counter />
                    <ve-checkbox v-for="item in options" :key="item" :label="item" />
                </ve-checkbox-group>
            `,
      data() {
        return {
          options: ['a', 'b', 'c'],
          checkboxValue: [] as string[],
        }
      },
    })

    // v-for 的选项多次整体替换，旧的 checkbox 全部卸载
    for (let i = 0; i < 3; i++) {
      await wrapper.setData({ options: [`x${i}`, `y${i}`, `z${i}`] })
    }

    groupCallbackCalls = 0
    await wrapper.setData({ checkboxValue: ['x2'] })

    // 只有当前挂载的 3 个 checkbox 收到更新
    expect(groupCallbackCalls).toBe(3)
    expect(wrapper.findAll('.ve-checkbox-checked').length).toBe(1)
  })

  describe('disabled and uncontrolled state (FORM-02)', () => {
    it('a disabled checkbox follows modelValue changes', async () => {
      const wrapper = mount(veCheckbox, {
        props: { modelValue: false, disabled: true, label: 'orange' },
      })

      await wrapper.setProps({ modelValue: true })
      expect(wrapper.find('.ve-checkbox-checked').exists()).toBe(true)

      await wrapper.setProps({ modelValue: false })
      expect(wrapper.find('.ve-checkbox-checked').exists()).toBe(false)
    })

    it('a disabled checkbox in a group follows the group value', async () => {
      const wrapper = mount({
        template: `
                <ve-checkbox-group v-model="checkboxValue">
                    <ve-checkbox label="a" />
                    <ve-checkbox disabled label="b" />
                </ve-checkbox-group>
            `,
        data() {
          return { checkboxValue: ['a'] }
        },
      })
      const disabledBox = () => wrapper.findAll('.ve-checkbox')[1]

      expect(disabledBox().find('.ve-checkbox-checked').exists()).toBe(false)

      await wrapper.setData({ checkboxValue: ['a', 'b'] })
      expect(disabledBox().find('.ve-checkbox-checked').exists()).toBe(true)

      await wrapper.setData({ checkboxValue: [] })
      expect(disabledBox().find('.ve-checkbox-checked').exists()).toBe(false)
    })

    it('a disabled checkbox ignores clicks and keeps the native input in sync', async () => {
      const wrapper = mount(veCheckbox, {
        props: { modelValue: true, disabled: true, label: 'orange' },
      })

      await wrapper.find('.ve-checkbox').trigger('click')

      expect(wrapper.emitted('update:modelValue')).toBeUndefined()
      expect(wrapper.emitted('on-checked-change')).toBeUndefined()
      expect(wrapper.find('.ve-checkbox-checked').exists()).toBe(true)
      expect((wrapper.find('input').element as HTMLInputElement).checked).toBe(true)
    })

    it('an uncontrolled checkbox without v-model shows its own checked state', async () => {
      const wrapper = mount(veCheckbox, {
        props: { label: 'orange' },
      })

      await wrapper.find('.ve-checkbox').trigger('click')
      expect(wrapper.find('.ve-checkbox-checked').exists()).toBe(true)
      expect(wrapper.emitted('update:modelValue')).toEqual([[true]])

      await wrapper.find('.ve-checkbox').trigger('click')
      expect(wrapper.find('.ve-checkbox-checked').exists()).toBe(false)
      expect(wrapper.emitted('on-checked-change')).toEqual([[true], [false]])
    })

    it('a checkbox in a group without v-model shows its own checked state', async () => {
      const wrapper = mount({
        template: `
                <ve-checkbox-group>
                    <ve-checkbox label="a" />
                    <ve-checkbox label="b" />
                </ve-checkbox-group>
            `,
      })

      await wrapper.findAll('.ve-checkbox')[1].trigger('click')

      const checked = wrapper.findAll('.ve-checkbox-checked')
      expect(checked).toHaveLength(1)
      expect(wrapper.findAll('.ve-checkbox')[1].find('.ve-checkbox-checked').exists()).toBe(true)
    })
  })

  describe('checkbox-group leftovers (FORM-03)', () => {
    it('every exposed member exists on the instance', () => {
      const wrapper = mount({
        template: `
                <ve-checkbox-group ref="group" v-model="checkboxValue">
                    <ve-checkbox label="a" />
                </ve-checkbox-group>
            `,
        data() {
          return { checkboxValue: ['a'] }
        },
      })
      const group = (wrapper.vm.$refs as any).group

      const exposed = (veCheckboxGroup as any).expose as string[]
      expect(exposed.length).toBeGreaterThan(0)
      exposed.forEach((key) => {
        expect(group[key], `exposed member "${key}"`).not.toBeUndefined()
      })
      expect(group.modelValue).toEqual(['a'])
    })

    it('does not provide debug values to its children', () => {
      let injected: unknown
      const Probe = defineComponent({
        setup() {
          injected = inject('aaa', 'not provided')
          return () => null
        },
      })

      mount({
        components: { Probe },
        template: `
                <ve-checkbox-group>
                    <probe />
                </ve-checkbox-group>
            `,
      })

      expect(injected).toBe('not provided')
    })
  })

  describe('a parent that rejects the change (FORM-04)', () => {
    const input = (wrapper: { find: (selector: string) => { element: Element } }) =>
      wrapper.find('input').element as HTMLInputElement

    it('isControlled: the native input goes back when isSelected does not change', async () => {
      const wrapper = mount(veCheckbox, {
        props: { isControlled: true, isSelected: false, label: 'orange' },
      })

      await wrapper.find('.ve-checkbox').trigger('click')
      await nextTick()

      expect(wrapper.emitted('on-checked-change')).toEqual([[true]])
      expect(input(wrapper).checked).toBe(false)
      expect(wrapper.find('.ve-checkbox-checked').exists()).toBe(false)
    })

    it('isControlled: an accepted change stays checked', async () => {
      const wrapper = mount(veCheckbox, {
        props: {
          'isControlled': true,
          'isSelected': false,
          'label': 'orange',
          'onOn-checked-change': (checked: boolean) => wrapper.setProps({ isSelected: checked }),
        },
      })

      await wrapper.find('.ve-checkbox').trigger('click')
      await nextTick()

      expect(input(wrapper).checked).toBe(true)
      expect(wrapper.find('.ve-checkbox-checked').exists()).toBe(true)
    })

    it('v-model: a rejected update:modelValue keeps the old state', async () => {
      const wrapper = mount({
        template: `<ve-checkbox :modelValue="value" @update:modelValue="reject" label="orange" />`,
        data() {
          return { value: false }
        },
        methods: {
          reject() {},
        },
      })

      await wrapper.find('.ve-checkbox').trigger('click')
      await nextTick()

      expect(input(wrapper).checked).toBe(false)
      expect(wrapper.find('.ve-checkbox-checked').exists()).toBe(false)
    })

    it('v-model: an accepted update:modelValue is shown', async () => {
      const wrapper = mount({
        template: `<ve-checkbox v-model="value" label="orange" />`,
        data() {
          return { value: false }
        },
      })

      await wrapper.find('.ve-checkbox').trigger('click')
      await nextTick()

      expect((wrapper.vm as any).value).toBe(true)
      expect(input(wrapper).checked).toBe(true)
      expect(wrapper.find('.ve-checkbox-checked').exists()).toBe(true)
    })

    it('checkbox-group v-model: a rejected group update keeps the old state', async () => {
      const wrapper = mount({
        template: `
                <ve-checkbox-group :modelValue="value" @update:modelValue="reject">
                    <ve-checkbox label="a" />
                    <ve-checkbox label="b" />
                </ve-checkbox-group>
            `,
        data() {
          return { value: ['a'] }
        },
        methods: {
          reject() {},
        },
      })
      const box = () => wrapper.findAll('.ve-checkbox')[1]

      await box().trigger('click')
      await nextTick()

      expect((box().find('input').element as HTMLInputElement).checked).toBe(false)
      expect(box().find('.ve-checkbox-checked').exists()).toBe(false)
    })
  })

  describe('disabled attribute (FORM-05)', () => {
    it('a disabled checkbox renders a disabled native input', async () => {
      const wrapper = mount(veCheckbox, {
        props: { modelValue: false, disabled: true, label: 'orange' },
      })

      expect((wrapper.find('input').element as HTMLInputElement).disabled).toBe(true)

      await wrapper.setProps({ disabled: false })
      expect((wrapper.find('input').element as HTMLInputElement).disabled).toBe(false)
    })

    it('a disabled checkbox in a group renders a disabled native input', () => {
      const wrapper = mount({
        template: `
                <ve-checkbox-group v-model="value">
                    <ve-checkbox label="a" />
                    <ve-checkbox disabled label="b" />
                </ve-checkbox-group>
            `,
        data() {
          return { value: [] }
        },
      })
      const inputs = wrapper.findAll('input').map(x => (x.element as HTMLInputElement).disabled)

      expect(inputs).toEqual([false, true])
    })
  })
})
