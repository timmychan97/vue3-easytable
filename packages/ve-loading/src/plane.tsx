import { getValByUnit } from '@easytable/common/utils'
import { clsName } from './util'
import { COMPS_NAME } from './util/constant'

export default defineComponent({
  name: COMPS_NAME.VE_LOADING_PLANE,
  props: {
    color: {
      type: String,
      required: true,
    },
    width: {
      type: [Number, String],
      required: true,
    },
    height: {
      type: [Number, String],
      required: true,
    },
  },
  computed: {
    spinStyle() {
      const { color, width, height } = this

      const result = {
        'width': getValByUnit(width),
        'height': getValByUnit(height),
        'background-color': color,
      }

      return result
    },
  },
  render() {
    return <div style={this.spinStyle} class={clsName('plane')} />
  },
})
