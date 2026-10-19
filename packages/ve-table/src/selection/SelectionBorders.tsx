/*
选区边框的展示组件（MOD-05）：只根据传入的几何数据渲染，不读取表格状态
- SelectionBorders：上、右、下、左四条边框与填充角标
- SelectionAreaLayer：区域选择的背景浮层
*/
import type { FunctionalComponent } from 'vue'
import type { CornerPosition, SelectionBorders as SelectionBordersData } from './geometry'
import { clsName } from '../util/index'

export interface SelectionBordersProps {
  // 外层 class（不带前缀），如 'selection-current'
  className: string
  // 已修正（adjustSelectionBorders）的边框
  borders: SelectionBordersData
  // 角标位置（getCornerPosition）
  cornerPosition: CornerPosition
  onCornerMousedown: (event: MouseEvent) => void
  onCornerMouseup: (event: MouseEvent) => void
}

export const SelectionBorders: FunctionalComponent<SelectionBordersProps> = (props) => {
  const { className, borders, cornerPosition, onCornerMousedown, onCornerMouseup } = props
  const { borderWidth, borderHeight, topBorder, rightBorder, bottomBorder, leftBorder, corner } = borders

  // corner props
  const cornerProps = {
    class: clsName('selection-corner'),
    style: {
      display: corner.show ? 'block' : 'none',
      top: `${cornerPosition.top}px`,
      left: `${cornerPosition.left}px`,
      borderWidth: `1px ${cornerPosition.borderRightWidth}px ${cornerPosition.borderBottomWidth}px 1px`,
    },
    onMousedown: onCornerMousedown,
    onMouseup: onCornerMouseup,
  }

  return (
    <div class={clsName(className)}>
      {/* top */}
      <div
        style={{
          display: topBorder.show ? 'block' : 'none',
          width: `${borderWidth}px`,
          height: `${topBorder.height}px`,
          top: `${topBorder.top}px`,
          left: `${topBorder.left}px`,
        }}
        class={clsName('selection-border')}
      >
      </div>
      {/* right */}
      <div
        style={{
          display: rightBorder.show ? 'block' : 'none',
          width: `${rightBorder.width}px`,
          height: `${borderHeight}px`,
          top: `${rightBorder.top}px`,
          left: `${rightBorder.left}px`,
        }}
        class={clsName('selection-border')}
      >
      </div>
      {/* bottom */}
      <div
        style={{
          display: bottomBorder.show ? 'block' : 'none',
          width: `${borderWidth}px`,
          height: `${bottomBorder.height}px`,
          top: `${bottomBorder.top}px`,
          left: `${bottomBorder.left}px`,
        }}
        class={clsName('selection-border')}
      >
      </div>
      {/* left */}
      <div
        style={{
          display: leftBorder.show ? 'block' : 'none',
          width: `${leftBorder.width}px`,
          height: `${borderHeight}px`,
          top: `${leftBorder.top}px`,
          left: `${leftBorder.left}px`,
        }}
        class={clsName('selection-border')}
      >
      </div>
      {/* corner */}
      <div {...cornerProps}></div>
    </div>
  )
}

// 声明 props：onCornerMousedown 等不会作为透传属性落到根元素上
SelectionBorders.props = ['className', 'borders', 'cornerPosition', 'onCornerMousedown', 'onCornerMouseup']
SelectionBorders.inheritAttrs = false

export interface SelectionAreaLayerProps {
  className: string
  rect: { top: number, left: number, width: number, height: number }
}

export const SelectionAreaLayer: FunctionalComponent<SelectionAreaLayerProps> = ({ className, rect }) => (
  <div
    class={clsName(className)}
    style={{
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    }}
  >
  </div>
)

SelectionAreaLayer.props = ['className', 'rect']
SelectionAreaLayer.inheritAttrs = false
