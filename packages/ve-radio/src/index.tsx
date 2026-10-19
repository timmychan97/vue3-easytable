import { isModelValueBound } from '@vue3-easytable/common/utils/v-model'
import { clsName } from './util'
import { COMPS_NAME, EMIT_EVENTS } from './util/constant'

export default defineComponent({
  name: COMPS_NAME.VE_RADIO,
  props: {
    // 当前checkbox 选中状态,实现 v-model
    modelValue: {
      type: [String, Number, Boolean],
      default: null,
    },
    label: {
      type: String,
      default: null,
    },
    disabled: Boolean,
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
  data() {
    return {
      // 当前checkbox 选中状态
      model: this.modelValue,
    }
  },

  computed: {
    radioClass() {
      return [
        clsName('container'),
        {
          [clsName('checked')]: this.internalIsSelected,
          [clsName('disabled')]: this.disabled,
        },
      ]
    },

    // 是否选中
    internalIsSelected() {
      return this.isControlled ? this.isSelected : this.model
    },
  },

  watch: {
    modelValue() {
      this.updateModelBySingle()
    },
  },

  methods: {
    checkedChange(event: Event) {
      const target = event.target as HTMLInputElement

      // 禁用时只阻止用户操作：浏览器已经切换了原生 input，需要恢复为当前状态
      if (this.disabled) {
        target.checked = !!this.internalIsSelected
        return false
      }

      const isChecked = target.checked

      if (!this.isControlled) {
        // 非受控：先更新本地状态，没有绑定 v-model 时也能显示选中样式
        this.model = isChecked
        this.$emit('update:modelValue', isChecked)
      }

      this.$emit(EMIT_EVENTS.ON_RADIO_CHANGE, isChecked)

      this.syncAfterChange(target)
    },

    /**
     * 受控时以父组件的值为准（FORM-04）：父组件处理完事件并重新渲染后，
     * 重新读取数据来源，并把原生 input 恢复为该状态。
     * 父组件不接受这次修改时（值没有变化），Vue 不会修补原生 input，需要在这里恢复。
     * isControlled 时以 isSelected 为准；通过 v-model 绑定时以 modelValue 为准；否则保持本地状态。
     */
    syncAfterChange(target: HTMLInputElement) {
      this.$nextTick(() => {
        if (!this.isControlled && isModelValueBound(this.$))
          this.updateModelBySingle()
        target.checked = !!this.internalIsSelected
      })
    },

    getLabelContent() {
      const { label, $slots } = this

      return label || $slots.default?.()
    },

    initModel() {
      this.model = this.modelValue
    },

    // 通过单选更新 model（disabled 只阻止用户操作，不阻止 v-model 同步）
    updateModelBySingle() {
      this.model = this.modelValue
    },
  },

  created() {
    this.initModel()
  },
  render() {
    const {
      label,
      radioClass,
      checkedChange,
      getLabelContent,
      internalIsSelected,
    } = this

    return (
      <label class="ve-radio">
        <span class={radioClass}>
          <input
            checked={!!internalIsSelected}
            class={clsName('input')}
            type="radio"
            value={label}
            disabled={this.disabled}
            onChange={checkedChange}
          />

          <span class={clsName('inner')}></span>
        </span>
        <span class={clsName('label')}>{getLabelContent()}</span>
      </label>
    )
  },
})
