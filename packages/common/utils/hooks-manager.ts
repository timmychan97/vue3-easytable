/*
hook system

*/
type HookCallback = (...args: any[]) => void

export default class Hooks {
  hooks: Record<string, HookCallback[]>
  constructor() {
    // ...

    this.hooks = {
      /*
            table-scroll1:[
                function(){},
                function(){}
            ],
            table-scroll2:[
                function(){},
                function(){}
            ]

            */
    }
  }

  /**
   * Add listener to plugin hooks system.
   *
   * @param {string} hookName The hook name.
   * @param {Function} callback The listener function to add.
   * @returns {Function} 注销函数：调用后移除该回调（组件卸载时必须调用，否则已卸载的实例仍会被触发）
   */
  addHook(hookName: string, callback: HookCallback): () => void {
    // let hooks: Function[]

    if (!this.hooks[hookName])
      this.hooks[hookName] = []

    const hooks = this.hooks[hookName]

    // exclude repeat hook
    let isRepeat = false
    for (let i = 0; i < hooks.length; i++) {
      if (hooks[i] === callback) {
        isRepeat = true
        break
      }
    }

    if (isRepeat)
      console.warn(`Repeat hook name:${hookName}`)

    else
      hooks.push(callback)

    return () => this.removeHook(hookName, callback)
  }

  /**
   * Remove listener from plugin hooks system.
   *
   * @param {string} hookName The hook name.
   * @param {Function} callback The listener function to remove.
   */
  removeHook(hookName: string, callback: HookCallback) {
    const hooks = this.hooks[hookName]
    if (!hooks)
      return

    const index = hooks.indexOf(callback)
    if (index > -1)
      hooks.splice(index, 1)
  }

  /**
   * Trigger hook.
   *
   * @param {string} hookName The hook name.
   * @param {Argument} args
   */
  triggerHook(hookName: string, ...args: any[]) {
    const hooks = this.hooks[hookName]

    if (hooks && hooks.length) {
    //   const args = Array.prototype.slice.call(arguments)

      // 复制一份再遍历：回调内注销自身时不会跳过后面的回调
      hooks.slice().forEach((hook) => {
        // 单个回调出错不应中断其余回调
        try {
          hook(...args)
        }
        catch (error) {
          console.error(`[vue3-easytable] hook "${hookName}" callback error:`, error)
        }
      })
    }
    // else {
    //     console.warn(`Can't find hook name:${hookName}`);
    // }
  }
}
