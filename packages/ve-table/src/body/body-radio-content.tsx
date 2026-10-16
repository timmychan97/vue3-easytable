import VeRadio from '@vue3-easytable/ve-radio'
import { computed, defineComponent } from 'vue'
import { injectRowState } from '../features/row-state'
import { clsName } from '../util'
import { COMPS_NAME } from '../util/constant'

export default defineComponent({
  name: COMPS_NAME.VE_TABLE_BODY_RADIO_CONTENT,
  props: {
    rowKey: {
      type: [String, Number],
      required: true,
    },
  },
  setup(props) {
    // 选中 / 禁用状态都从表格级的行单选状态派生（MOD-08），不再保存本地副本
    const { radio } = injectRowState()

    const isSelected = computed(() => radio.isRowSelected(props.rowKey))
    const disabled = computed(() => radio.isRowDisabled(props.rowKey))

    // 受控时只通知用户，选中状态由 selectedRowKey 决定
    function selectedChange() {
      radio.selectRow(props.rowKey)
    }

    return () => {
      const radioProps = {
        class: clsName('radio-wrapper'),
        isControlled: true,
        isSelected: isSelected.value,
        disabled: disabled.value,
        onOnRadioChange: selectedChange,
      }
      return <VeRadio {...radioProps} />
    }
  },
})
