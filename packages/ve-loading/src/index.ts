import { addClass, removeClass } from '@vue3-easytable/common/utils/dom'
import { nextTick } from 'vue'
import VeLoading from './loading'
import { clsName } from './util'
import { COMPS_NAME, SPIN_NAMES } from './util/constant'

type VeLoadingProps = NonNullable<Partial<(typeof VeLoading)['__defaults']>>

// default options
const defaultOptions: VeLoadingProps = {
  name: 'plane',
  visible: false,
  color: '#1890ff',
  overlayBackgroundColor: 'rgba(255, 255, 255, 0.5)',
  width: 40,
  height: 40,
  tip: '',
  fullscreen: false,
  target: '',
  lock: false,
  // parent “__parent__”会被忽略
  parent__: null,
}

const PARENT_RELATIVE_CLASS = clsName('parent-relative')
const PARENT_LOCK_CLASS = clsName('parent-lock')

// 多个 loading 共用同一个父元素时，按引用计数增删父元素上的 class
const parentClassRefCounts = new WeakMap<HTMLElement, Record<string, number>>()

function addParentClass(parent: HTMLElement, cls: string) {
  const counts = parentClassRefCounts.get(parent) ?? {}
  counts[cls] = (counts[cls] ?? 0) + 1
  parentClassRefCounts.set(parent, counts)

  addClass(parent, cls)
}

function removeParentClass(parent: HTMLElement, cls: string) {
  const counts = parentClassRefCounts.get(parent)
  if (!counts || !counts[cls])
    return

  counts[cls]--
  // 最后一个引用移除后才真正移除 class
  if (counts[cls] === 0)
    removeClass(parent, cls)
}

function createInstance(options: VeLoadingProps = {}) {
  // parent__ 需在挂载前确定（根组件 props 挂载后不会再更新）
  const { parent__: parent, lock } = options

  const app = createApp(VeLoading, options)
  const instance = app.mount(document.createElement('div')) as InstanceType<typeof VeLoading>

  // 实例是否已销毁（nextTick 回调中需判断）
  let isDestroyed = false
  // 当前实例是否持有父元素的 lock class 引用
  let isLocked = false

  const unlockParent = function () {
    if (isLocked && parent) {
      removeParentClass(parent, PARENT_LOCK_CLASS)
      isLocked = false
    }
  }

  if (parent)
    addParentClass(parent, PARENT_RELATIVE_CLASS)

  const show = function () {
    nextTick(() => {
      if (isDestroyed)
        return

      if (lock && parent && !isLocked) {
        addParentClass(parent, PARENT_LOCK_CLASS)
        isLocked = true
      }

      instance.setVisible(true)
    })
  }

  const close = function () {
    nextTick(() => {
      if (isDestroyed)
        return

      unlockParent()

      instance.setVisible(false)
    })
  }

  const destroy = function () {
    if (isDestroyed)
      return
    isDestroyed = true

    unlockParent()
    if (parent)
      removeParentClass(parent, PARENT_RELATIVE_CLASS)

    if (instance.$el && instance.$el.parentNode)
      instance.$el.parentNode.removeChild(instance.$el)

    app.unmount()
  }

  return {
    instance,
    show,
    close,
    destroy,
  }
}

function checkSpinName(name: VeLoadingProps['name']) {
  if (!name || !Object.values(SPIN_NAMES).includes(name))
    console.error(`${name} is not found in ${COMPS_NAME.VE_LOADING}.`)
}

// Loading instance
function Loading(options: VeLoadingProps = {}) {
  options = Object.assign({}, defaultOptions, options)

  if (typeof options.target === 'string' && options.target.length > 0)
    options.target = document.querySelector<HTMLElement>(options.target) ?? undefined

  options.target = options.target || document.body

  checkSpinName(options.name)

  if (options.target !== document.body)
    options.fullscreen = false

  else
    options.fullscreen = true

  // set parent（须在 createInstance 之前设置，才能作为 props 传入）
  options.parent__ = options.fullscreen ? document.body : options.target as HTMLElement

  const loadingInstance = createInstance(options)

  options.parent__!.appendChild(loadingInstance.instance.$el)

  return loadingInstance
}

export default Loading
