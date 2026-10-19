import { injectCheckboxGroup } from '@vue3-easytable/ve-checkbox-group'
import { clsName } from './util'
import { COMPS_NAME, EMIT_EVENTS } from './util/constant'

export default defineComponent({
  name: COMPS_NAME.VE_CHECKBOX,
  props: {
    // 当前checkbox 选中状态,实现 v-model
    modelValue: {
      type: [String, Number, Boolean],
      default: null,
    },
    label: {
      type: [String],
      default: null,
    },
    // is disabled checked
    disabled: Boolean,
    // partial selection effect
    indeterminate: Boolean,
    // 是否是可控组件
    isControlled: {
      type: Boolean,
      default: false,
    },
    // isControlled 为true 时生效
    isSelected: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { emit, slots }) {
    const { onCheckboxGroupUpdate, updateCheckboxGroup, inCheckboxGroup, isVerticalShow, groupModelValue } = injectCheckboxGroup()
    const offCheckboxGroupUpdate = onCheckboxGroupUpdate(updateModelByGroup)
    // 卸载后不再接收 checkbox-group 的更新
    onBeforeUnmount(() => {
      offCheckboxGroupUpdate?.()
    })

    // 当前checkbox 选中状态
    const model = ref(props.modelValue)

    // 是否横向显示还是纵向显示
    const checkboxStyle = computed(() => {
      return {
        display: isVerticalShow.value
          ? 'block'
          : 'inline-block',
      }
    })
    // 是否选中
    const internalIsSelected = computed(() => {
      return props.isControlled ? props.isSelected : model.value
    })

    const checkboxClass = computed(() => {
      return [
        clsName('content'),
        {
          [clsName('checked')]: internalIsSelected.value,
          [clsName('disabled')]: props.disabled,
          [clsName('indeterminate')]: props.indeterminate,
        },
      ]
    })

    watch(() => props.modelValue, () => {
      updateModelBySingle()
    })

    // checkbox change
    function checkboxChange(event: Event) {
      const target = event.target as HTMLInputElement

      // 禁用时只阻止用户操作：浏览器已经切换了原生 input，需要恢复为当前状态
      if (props.disabled) {
        target.checked = !!internalIsSelected.value
        return
      }

      const isChecked = target.checked

      if (!props.isControlled) {
        // 非受控：先更新本地状态，没有绑定 v-model 时也能显示选中样式；
        // 绑定了 v-model 时，父组件回传的 modelValue 与本地状态一致
        model.value = isChecked
        emit('update:modelValue', isChecked)
      }

      emit(EMIT_EVENTS.ON_CHECKED_CHANGE, isChecked)

      if (isCheckBoxGroup()) {
        // update parent comp:checkbox-group
        updateCheckboxGroup(props.label, isChecked)
      }
    }

    // is checkbox group
    function isCheckBoxGroup() {
      return inCheckboxGroup
    }

    // get label content
    function getLabelContent() {
      return props.label || slots.default?.()
    }

    function initModel() {
      if (isCheckBoxGroup()) {
        if (
          Array.isArray(groupModelValue.value)
          && groupModelValue.value.length > 0
        ) {
          if (groupModelValue.value.includes(props.label))
            model.value = true
        }
      }
      else {
        model.value = props.modelValue
      }
    }

    // 通过单选更新 model（disabled 只阻止用户操作，不阻止 v-model 同步）
    function updateModelBySingle() {
      model.value = props.modelValue
    }

    // 父组件调用更新 model（disabled 时同样要与 checkbox-group 的值保持一致）
    function updateModelByGroup(checkBoxGroup: string[]) {
      model.value = checkBoxGroup.includes(props.label)
    }

    initModel()

    return () => (
      <label class="ve-checkbox" style={checkboxStyle.value}>
        <span class={checkboxClass.value}>
          <input
            checked={!!internalIsSelected.value}
            class={clsName('input')}
            type="checkbox"
            value={props.label}
            onChange={checkboxChange}
          />
          <span class={clsName('inner')}></span>
        </span>
        <span class={clsName('label')}>{getLabelContent()}</span>
      </label>
    )
  },
})
