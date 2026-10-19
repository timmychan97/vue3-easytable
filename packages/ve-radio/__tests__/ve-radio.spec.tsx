import veRadio from '@/ve-radio'
import { later, wrapMount as mount } from '@test-utils'

describe('veRadio', () => {
  it('render', () => {
    const wrapper = mount({
      render() {
        const { checked, unChecked } = this
        return (
          <div>
            <div>
              <veRadio modelValue={checked}>normal</veRadio>
            </div>
            <div>
              <veRadio disabled modelValue={checked}>
                disabled checked
              </veRadio>
            </div>
            <div>
              <veRadio disabled modelValue={unChecked}>
                disabled unChecked
              </veRadio>
            </div>
            <div>
              <veRadio isControlled isSelected={checked}>
                controlled
              </veRadio>
            </div>
          </div>
        )
      },
      data() {
        return {
          checked: true,
          unChecked: false,
        }
      },
    })

    expect(wrapper.html()).toMatchSnapshot()
    wrapper.unmount()
  })

  it('modelValue prop', async () => {
    const wrapper = mount(veRadio, {
      propsData: {
        modelValue: false,
      },
    })

    expect(wrapper.find('.ve-radio-checked').exists()).toBe(false)

    wrapper.setProps({ isSelected: true })

    await later()
    expect(wrapper.find('.ve-radio-checked').exists()).toBe(false)
    wrapper.unmount()
  })

  it('disable prop', () => {
    const wrapper = mount(veRadio, {
      propsData: {
        modelValue: true,
      },
    })

    expect(wrapper.find('.ve-radio-checked').exists()).toBe(true)
    wrapper.unmount()
  })

  it('label prop', () => {
    const wrapper = mount(veRadio, {
      propsData: {
        modelValue: false,
        label: 'test',
      },
    })

    expect(wrapper.find('.ve-radio-label').text()).toContain('test')
    wrapper.unmount()
  })

  it('isControlled prop', async () => {
    const wrapper = mount(veRadio, {
      propsData: {
        isControlled: true,
        isSelected: false,
      },
    })

    expect(wrapper.find('.ve-radio-checked').exists()).toBe(false)

    wrapper.setProps({ isSelected: true })

    await later()
    expect(wrapper.find('.ve-radio-checked').exists()).toBe(true)
    wrapper.unmount()
  })

  /*   it("click event", async () => {
        const wrapper = mount(veRadio, {
            propsData: {
                value: false,
                label: "test"
            }
        });

        wrapper.trigger("click");

        await later();
        expect(wrapper.find(".ve-radio-checked").exists()).toBe(true);
    }); */

  it('on-radio-change event', async () => {
    const wrapper = mount(veRadio, {
      propsData: {
        modelValue: false,
        label: 'test',
      },
    })

    wrapper.trigger('click')

    await later()
    expect(wrapper.emitted('on-radio-change')!.length).toEqual(1)
    expect(wrapper.emitted('on-radio-change')![0]).toEqual([true])
    wrapper.unmount()
  })

  describe('disabled and uncontrolled state (FORM-02)', () => {
    it('a disabled radio follows modelValue changes', async () => {
      const wrapper = mount(veRadio, {
        props: { modelValue: false, disabled: true, label: 'test' },
      })

      await wrapper.setProps({ modelValue: true })
      expect(wrapper.find('.ve-radio-checked').exists()).toBe(true)

      await wrapper.setProps({ modelValue: false })
      expect(wrapper.find('.ve-radio-checked').exists()).toBe(false)
    })

    it('a disabled radio ignores clicks and keeps the native input in sync', async () => {
      const wrapper = mount(veRadio, {
        props: { modelValue: false, disabled: true, label: 'test' },
      })

      await wrapper.find('.ve-radio').trigger('click')

      expect(wrapper.emitted('update:modelValue')).toBeUndefined()
      expect(wrapper.emitted('on-radio-change')).toBeUndefined()
      expect(wrapper.find('.ve-radio-checked').exists()).toBe(false)
      expect((wrapper.find('input').element as HTMLInputElement).checked).toBe(false)
    })

    it('an uncontrolled radio without v-model shows its own checked state', async () => {
      const wrapper = mount(veRadio, {
        props: { label: 'test' },
      })

      await wrapper.find('.ve-radio').trigger('click')

      expect(wrapper.find('.ve-radio-checked').exists()).toBe(true)
      expect(wrapper.emitted('update:modelValue')).toEqual([[true]])
    })
  })
})
