/*
  弹出层定位的纯函数：不访问 DOM，便于单元测试。
  坐标均为弹出层所在容器（body 时即文档）中的坐标，单位 px。
*/

// 当前可视区域：滚动距离与视口尺寸
export interface ViewportRect {
  scrollX: number
  scrollY: number
  width: number
  height: number
}

// 期望的位置与弹出层自身的尺寸
export interface PopperBox {
  x: number
  y: number
  width: number
  height: number
}

export interface PopperPosition {
  left: number
  top: number
  // 弹出层比视口还高时限制的最大高度（配合样式中的 overflow-y: auto 滚动）
  maxHeight?: number
}

/*
  限制在可视区域内（MENU-05）
  两侧都放不下时平移到视口内；比视口还大时贴住视口左 / 上边缘，保证开头可见。
  比视口还高时同时返回 maxHeight = 视口高度，超出的部分可以滚动（MENU-07）。
  没有布局信息（视口尺寸为 0，例如 jsdom）时不做限制。
*/
export function clampToViewport(box: PopperBox, viewport: ViewportRect): PopperPosition {
  const clamp = (value: number, scroll: number, viewportSize: number, size: number) => {
    if (!viewportSize)
      return value
    return Math.max(scroll, Math.min(value, scroll + viewportSize - size))
  }

  const result: PopperPosition = {
    left: clamp(box.x, viewport.scrollX, viewport.width, box.width),
    top: clamp(box.y, viewport.scrollY, viewport.height, box.height),
  }

  if (viewport.height && box.height > viewport.height)
    result.maxHeight = viewport.height

  return result
}

// 触发元素的位置（容器坐标）及其右侧 / 下方的剩余空间
export interface TriggerOffset {
  left: number
  top: number
  height: number
  spaceRight: number
  spaceBottom: number
}

/*
  'bottom-start'：显示在触发元素下方并左对齐（下拉框原有的定位逻辑）
  右侧空间不够时显示在左侧，下方空间不够时显示在上方。
  scroll 为容器自身的滚动距离（挂载到 body 时为 0）。
*/
export function getBottomStartPosition({
  trigger,
  popper,
  offset,
  scroll = { left: 0, top: 0 },
}: {
  trigger: TriggerOffset
  popper: { width: number, height: number }
  offset: number
  scroll?: { left: number, top: number }
}): PopperPosition {
  const left = trigger.spaceRight >= popper.width
    ? trigger.left + scroll.left
    : trigger.left - popper.width + scroll.left

  const top = trigger.spaceBottom >= popper.height
    ? trigger.top + trigger.height + offset + scroll.top
    : trigger.top - popper.height - offset + scroll.top

  return { left, top }
}
