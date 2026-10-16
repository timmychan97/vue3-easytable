interface Payload {
  // 返回注销函数，checkbox 卸载时必须调用
  onCheckboxGroupUpdate: (cb: (val: string[]) => void) => () => void
  updateCheckboxGroup: (label: string, checked: boolean) => void
  inCheckboxGroup: boolean
  isVerticalShow: Ref<boolean>
  groupModelValue: Ref<string[]>
}

export const CheckboxGroupInjectionKey: InjectionKey<Payload> = Symbol('CheckboxGroupInjectionKey')

export function provideCheckboxGroup({ onCheckboxUpdate, isVerticalShow, groupModelValue }: {
  onCheckboxUpdate: Payload['updateCheckboxGroup']
  isVerticalShow: Payload['isVerticalShow']
  groupModelValue: Payload['groupModelValue']
}) {
  const callbacks: ((val: string[]) => void)[] = []
  provide(CheckboxGroupInjectionKey, {
    onCheckboxGroupUpdate(cb) {
      callbacks.push(cb)
      return () => {
        const index = callbacks.indexOf(cb)
        if (index > -1)
          callbacks.splice(index, 1)
      }
    },
    updateCheckboxGroup: onCheckboxUpdate,
    inCheckboxGroup: true,
    isVerticalShow,
    groupModelValue,
  })

  return {
    updateCheckbox(val: string[]) {
      callbacks.forEach(cb => cb(val))
    },
  }
}

export function injectCheckboxGroup() {
  return inject(CheckboxGroupInjectionKey, {
    onCheckboxGroupUpdate() {
      return () => {}
    },
    updateCheckboxGroup() {},
    inCheckboxGroup: false,
    isVerticalShow: ref(false),
    groupModelValue: ref([]),
  })
}
