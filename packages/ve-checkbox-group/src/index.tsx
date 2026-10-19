import { isModelValueBound } from '@vue3-easytable/common/utils/v-model'
import { provideCheckboxGroup } from './uses'
import { COMPS_NAME, EMIT_EVENTS } from './util/constant'

export default defineComponent({
  name: COMPS_NAME.VE_CHECKBOX_GROUP,
  props: {
    modelValue: {
      type: Array as PropType<string[]>,
      default() {
        return []
      },
    },
    // 是否垂直排列显示（当时checkbox组时生效）
    isVerticalShow: {
      type: Boolean,
      default: false,
    },
  },
  // 只暴露确实存在的成员（updateModel 从未实现）
  expose: ['modelValue'],
  setup(props, { slots, emit }) {
    const instance = getCurrentInstance()
    const { updateCheckbox } = provideCheckboxGroup({
      onCheckboxUpdate(label, checked) {
        // modelValue 被设为 null 等非数组时按空数组处理（FORM-06）
        const newValue = Array.isArray(props.modelValue) ? [...props.modelValue] : []
        const index = newValue.indexOf(label)
        if (index > -1) {
          if (!checked)
            newValue.splice(index, 1)
        }
        else {
          if (checked)
            newValue.push(label)
        }

        emit('update:modelValue', newValue)
        emit(EMIT_EVENTS.ON_CHECKED_CHANGE, newValue)
      },
      isVerticalShow: toRef(() => props.isVerticalShow),
      groupModelValue: toRef(() => props.modelValue),
      isGroupModelBound: () => isModelValueBound(instance),
    })
    // 更新子组件选中状态
    watch(() => props.modelValue, (newVal: string[]) => {
      updateCheckbox(newVal)
    })

    return () => (
      <div class="ve-checkbox-group">
        {slots.default?.()}
      </div>
    )
  },
})
