import VeCheckbox from '@vue3-easytable/ve-checkbox'
import { defineComponent } from 'vue'
import { injectRowState } from '../features/row-state'
import { clsName } from '../util'
import { COMPS_NAME } from '../util/constant'

export default defineComponent({
  name: COMPS_NAME.VE_TABLE_HEADER_CHECKBOX_CONTENT,
  setup() {
    // 全选 / 半选状态从表格级的行勾选状态派生（ROW-04）：
    // 数据或列变化、组件重新挂载后都会立即得到正确的状态
    const { selection } = injectRowState()

    function selectedChange(isSelected: boolean) {
      selection.selectAll(isSelected)
    }

    return () => {
      const checkboxProps = {
        class: clsName('checkbox-wrapper'),
        isControlled: true,
        isSelected: selection.isSelectedAll.value,
        indeterminate: selection.isIndeterminate.value,
        onOnCheckedChange: selectedChange,
      }
      return <VeCheckbox {...checkboxProps} />
    }
  },
})
