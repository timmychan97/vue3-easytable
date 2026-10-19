<script lang="ts">
import { useData } from 'vitepress'
import * as Vue from 'vue'
import { computed, defineComponent, onErrorCaptured, onMounted, ref, shallowRef } from 'vue'
import { compileTemplate } from './runtimeCompiler'

// Modules demos may import. A runtime `import(spec)` cannot resolve bare specifiers
// in the browser, so each one must be a static import Vite can see and bundle.
const localeModules = import.meta.glob('../../../packages/common/locale/lang/*.ts')
const demoModules: Record<string, () => Promise<any>> = {
  'vue': async () => Vue,
  '@vue3-easytable/vue': () => import('@vue3-easytable/vue'),
  'echarts': () => import('echarts'),
  'element-plus': () => import('./elementPlus'),
  'lodash': () => import('lodash'),
  'mockjs': () => import('mockjs'),
}
for (const [file, load] of Object.entries(localeModules)) {
  const lang = file.match(/([\w-]+)\.ts$/)![1]
  demoModules[`@vue3-easytable/vue/libs/locale/lang/${lang}`] = load
}

function loadDemoModule(spec: string): Promise<any> {
  const load = demoModules[spec.replace(/\.js$/, '')]
  if (!load)
    throw new Error(`[DemoBlock] Unknown module "${spec}" — add it to demoModules in DemoBlock.vue`)
  return load()
}
</script>

<script setup lang="ts">
const props = defineProps<{
  code: string
  // Pre-rendered inline markdown from the :::demo plugin (trusted docs content)
  descriptionHtml?: string
}>()

const showCode = ref(false)
const demoComp = shallowRef<any>(null)
const errorMsg = ref('')

// Contain errors thrown by the demo itself (hooks, render, handlers). Left unhandled,
// dev mode rethrows them mid-patch and corrupts the page's vnode tree.
onErrorCaptured((err) => {
  errorMsg.value = String(err)
  console.error('[DemoBlock] Demo threw:', err)
  return false
})

const { lang } = useData()
const expandLabel = computed(() => {
  if (lang.value === 'nb-NO')
    return showCode.value ? 'Skjul kode' : 'Vis kode'
  if (lang.value === 'en-US')
    return showCode.value ? 'Hide code' : 'Show code'
  return showCode.value ? '收起代码' : '展开代码'
})

// Decode the base64-encoded demo source (UTF-8 safe)
const rawCode = new TextDecoder().decode(Uint8Array.from(atob(props.code), c => c.charCodeAt(0)))

onMounted(async () => {
  try {
    // Greedy: the root template may contain nested <template #slot> blocks
    const templateMatch = rawCode.match(/<template>([\s\S]*)<\/template>/)
    const scriptMatch = rawCode.match(/<script>([\s\S]*?)<\/script>/)

    const template = templateMatch ? templateMatch[1].trim() : '<div></div>'
    const script = scriptMatch ? scriptMatch[1].trim() : ''

    // Resolve import statements and transform script into executable code
    let options: any = {}
    if (script) {
      // Extract import statements and resolve them dynamically
      const importRegex = /^\s*import\s+(?:(\*\s+as\s+(\w+))|(\{[^}]+\})|(\w+))\s+from\s+["']([^"']+)["'];?\s*$/gm
      const imports: Record<string, any> = {}
      const importNames: string[] = []
      let match: RegExpExecArray | null

      const importMatches: Array<{ full: string, names: string[], modulePath: string, isNamespace: boolean, isDefault: boolean }> = []
      // eslint-disable-next-line no-cond-assign
      while ((match = importRegex.exec(script)) !== null) {
        const modulePath = match[5]
        if (match[2]) {
          // import * as Name from '...'
          importMatches.push({ full: match[0], names: [match[2]], modulePath, isNamespace: true, isDefault: false })
        }
        else if (match[3]) {
          // import { a, b } from '...'
          const names = match[3].replace(/[{}]/g, '').split(',').map(n => n.trim()).filter(Boolean)
          importMatches.push({ full: match[0], names, modulePath, isNamespace: false, isDefault: false })
        }
        else if (match[4]) {
          // import Name from '...'
          importMatches.push({ full: match[0], names: [match[4]], modulePath, isNamespace: false, isDefault: true })
        }
      }

      // Dynamically import all modules
      for (const imp of importMatches) {
        const mod = await loadDemoModule(imp.modulePath)
        if (imp.isNamespace) {
          imports[imp.names[0]] = mod
          importNames.push(imp.names[0])
        }
        else if (imp.isDefault) {
          imports[imp.names[0]] = mod.default || mod
          importNames.push(imp.names[0])
        }
        else {
          for (const name of imp.names) {
            // CJS packages (lodash) may only expose names on the default export
            imports[name] = mod[name] ?? mod.default?.[name]
            importNames.push(name)
          }
        }
      }

      // Strip import lines from script
      let cleanScript = script.replace(importRegex, '').trim()

      // Replace "export default" anywhere in the script (may have const declarations before it)
      cleanScript = cleanScript.replace(/export\s+default\s*/, 'return ')

      // eslint-disable-next-line no-new-func
      const getOptions = new Function('Vue', ...importNames, cleanScript)
      options = getOptions(Vue, ...importNames.map(n => imports[n]))
    }

    options.render = compileTemplate(template)
    demoComp.value = defineComponent(options)
  }
  catch (e) {
    errorMsg.value = String(e)
    console.error('[DemoBlock] Failed to compile demo:', e)
  }
})
</script>

<template>
  <div class="demo-block">
    <!-- eslint-disable-next-line vue/no-v-html -->
    <p v-if="descriptionHtml" class="demo-description" v-html="descriptionHtml" />
    <div class="demo-preview">
      <component :is="demoComp" v-if="demoComp" />
      <div v-if="errorMsg" class="demo-error">
        {{ errorMsg }}
      </div>
    </div>
    <div class="demo-footer">
      <button class="demo-toggle" @click="showCode = !showCode">
        {{ expandLabel }}
      </button>
    </div>
    <div v-show="showCode" class="demo-source">
      <pre><code>{{ rawCode }}</code></pre>
    </div>
  </div>
</template>

<style>
.demo-block {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  margin: 16px 0;
  overflow: hidden;
  resize: horizontal;
  min-width: 200px;
}

.demo-description {
  padding: 12px 16px 0;
  color: var(--vp-c-text-2);
  font-size: 14px;
  margin: 0;
}

.demo-preview {
  padding: 24px;
}

.demo-footer {
  border-top: 1px solid var(--vp-c-divider);
  padding: 8px 16px;
  display: flex;
  justify-content: flex-end;
}

.demo-toggle {
  font-size: 13px;
  color: var(--vp-c-brand-1);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
}

.demo-toggle:hover {
  color: var(--vp-c-brand-2);
}

.demo-source pre {
  margin: 0;
  border-radius: 0;
  border-top: 1px solid var(--vp-c-divider);
}

.demo-source code {
  font-size: 13px;
  white-space: pre;
  overflow-x: auto;
  display: block;
  padding: 16px;
  background: var(--vp-code-block-bg);
  color: var(--vp-code-block-color);
}

.demo-error {
  color: var(--vp-c-danger-1);
  padding: 8px;
  font-size: 13px;
}

.demo-anchor {
  margin-top: 32px;
}
</style>
