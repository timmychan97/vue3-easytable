import VeCheckbox from '@vue3-easytable/ve-checkbox'
import { computed, defineComponent } from 'vue'
import { injectRowState } from '../features/row-state'
import { clsName } from '../util'
import { COMPS_NAME } from '../util/constant'

export default defineComponent({
  name: COMPS_NAME.VE_TABLE_BODY_CHECKBOX_CONTENT,
  props: {
    rowKey: {
      type: [String, Number],
      required: true,
    },
  },
  setup(props) {
    // 选中 / 禁用状态都从表格级的行勾选状态派生（MOD-08），不再保存本地副本
    const { selection } = injectRowState()

    const isSelected = computed(() => selection.isRowSelected(props.rowKey))
    const disabled = computed(() => selection.isRowDisabled(props.rowKey))

    // 受控时只通知用户，选中状态由 selectedRowKeys 决定
    function selectedChange(value: boolean) {
      selection.selectRow(props.rowKey, value)
    }

    return () => {
      const checkboxProps = {
        class: clsName('checkbox-wrapper'),
        isControlled: true,
        isSelected: isSelected.value,
        disabled: disabled.value,
        onOnCheckedChange: selectedChange,
      }
      return <VeCheckbox {...checkboxProps} />
    }
  },
})
