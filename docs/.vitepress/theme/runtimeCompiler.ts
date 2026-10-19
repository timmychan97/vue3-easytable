import { compile } from '@vue/compiler-dom'
import * as Vue from 'vue'

// VitePress aliases `vue` to the runtime-only build, so demos need their own compiler.
// Same as the full Vue build's compileToFunction: the `_rc` flag makes Vue render the
// `with (_ctx)` function through the runtime-compiled instance proxy, otherwise every
// render warns "Property undefined was accessed".
export function compileTemplate(template: string, options: Record<string, any> = {}) {
  const { code } = compile(template, { hoistStatic: true, ...options })
  // eslint-disable-next-line no-new-func
  const render = new Function('Vue', code)(Vue)
  render._rc = true
  return render
}

// Must run before createApp (i.e. at theme import): an app created while Vue is runtime-only
// warns on every read of config.compilerOptions, which happens for `template:` options in demos
if (!import.meta.env.SSR)
  Vue.registerRuntimeCompiler(compileTemplate as any)
