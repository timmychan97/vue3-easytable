import type { ComponentInternalInstance } from 'vue'

/**
 * 组件当前是否通过 v-model 绑定了 modelValue：
 * 父组件同时传入了 `modelValue` 和 `onUpdate:modelValue`。
 * 此时 modelValue 是唯一的数据来源，父组件不接受 update:modelValue 时组件应保持原状态。
 * 只监听事件、或只传入 modelValue 作为初始值时，仍按非受控处理（保持本地状态）。
 */
export function isModelValueBound(instance: ComponentInternalInstance | null): boolean {
  const props = instance?.vnode.props
  if (!props)
    return false

  const hasValue = 'modelValue' in props || 'model-value' in props
  const hasListener = !!(props['onUpdate:modelValue'] || props['onUpdate:model-value'])
  return hasValue && hasListener
}
