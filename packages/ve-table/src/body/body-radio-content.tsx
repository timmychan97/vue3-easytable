import emitter from '@easytable/common/mixins/emitter'
import VeRadio from '@easytable/ve-radio'
import { clsName } from '../util'
import { COMPS_NAME, EMIT_EVENTS } from '../util/constant'

export default defineComponent({
  name: COMPS_NAME.VE_TABLE_BODY_RADIO_CONTENT,
  mixins: [emitter()],
  props: {
    // checkbox option
    radioOption: {
      type: Object,
      default() {
        return null
      },
    },
    rowKey: {
      type: [String, Number],
      required: true,
    },
    internalRadioSelectedRowKey: {
      type: [String, Number],
      default: null,
    },
  },
  data() {
    return {
      isSelected: false,
    }
  },
  computed: {
    // disabled
    disabled() {
      let result = false

      const { radioOption, rowKey } = this

      if (!radioOption)
        return

      const { disableSelectedRowKeys } = radioOption

      if (
        Array.isArray(disableSelectedRowKeys)
        && disableSelectedRowKeys.includes(rowKey)
      ) {
        result = true
      }

      return result
    },

    // 是否是受控属性（取决于selectedRowKey）
    isControlledProp() {
      const { radioOption } = this

      return (
        radioOption
        && Object.keys(radioOption).includes('selectedRowKey')
      )
    },
  },
  watch: {
    // watch internal radio SelectedRowKey
    internalRadioSelectedRowKey: {
      handler() {
        this.initSelected()
      },
      immediate: true,
    },
  },
  methods: {
    // init selected
    initSelected() {
      this.isSelected = this.internalRadioSelectedRowKey === this.rowKey
    },

    // selected change
    selectedChange() {
      const { isControlledProp } = this

      // 非受控
      if (!isControlledProp)
        this.isSelected = true

      this.dispatch(
        COMPS_NAME.VE_TABLE_BODY,
        EMIT_EVENTS.RADIO_SELECTED_ROW_CHANGE,
        {
          rowKey: this.rowKey,
        },
      )
    },
  },
  render() {
    const { isSelected, selectedChange, disabled } = this

    const radioProps = {
      class: clsName('radio-wrapper'),
      isControlled: true,
      isSelected,
      disabled,
      onOnRadioChange: () => selectedChange(),
    }

    return <VeRadio {...radioProps} />
  },
})
