import { addClass, removeClass } from '@easytable/common/utils/dom'
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

function createInstance(options: VeLoadingProps = {}) {
  const app = createApp(VeLoading, options)
  const instance = app.mount(document.createElement('div')) as InstanceType<typeof VeLoading>

  const show = function () {
    nextTick(() => {
      if (instance.lock && instance.parent__)
        addClass(instance.parent__, PARENT_LOCK_CLASS)

      instance.setVisible(true)
    })
  }

  const close = function () {
    nextTick(() => {
      if (instance.lock && instance.parent__)
        removeClass(instance.parent__, PARENT_LOCK_CLASS)

      instance.setVisible(false)
    })
  }

  const destroy = function () {
    if (instance.parent__) {
      removeClass(instance.parent__, PARENT_RELATIVE_CLASS)
      removeClass(instance.parent__, PARENT_LOCK_CLASS)
    }

    if (instance.$el && instance.$el.parentNode)
      instance.$el.parentNode.removeChild(instance.$el)

    app.unmount()
    instance.setVisible(false)
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

  const loadingInstance = createInstance(options)

  // set parent
  options.parent__ = options.fullscreen ? document.body : options.target as HTMLElement

  addClass(options.parent__ as HTMLElement, PARENT_RELATIVE_CLASS)

  options.parent__!.appendChild(loadingInstance.instance.$el)

  return loadingInstance
}

export default Loading
