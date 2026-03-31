<script setup lang="ts">
import { useData } from 'vitepress'
import { computed, defineComponent, onMounted, ref, shallowRef } from 'vue'

const props = defineProps<{
  code: string
  description?: string
}>()

const showCode = ref(false)
const demoComp = shallowRef<any>(null)
const errorMsg = ref('')

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
    const templateMatch = rawCode.match(/<template>([\s\S]*?)<\/template>/)
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
        try {
          const mod = await import(/* @vite-ignore */ imp.modulePath)
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
              imports[name] = mod[name]
              importNames.push(name)
            }
          }
        }
        catch (e) {
          console.warn(`[DemoBlock] Failed to import "${imp.modulePath}":`, e)
        }
      }

      // Strip import lines from script
      let cleanScript = script.replace(importRegex, '').trim()

      // Replace "export default" anywhere in the script (may have const declarations before it)
      cleanScript = cleanScript.replace(/export\s+default\s*/, 'return ')

      // eslint-disable-next-line no-new-func
      const getOptions = new Function('Vue', ...importNames, cleanScript)
      const vueModule = await import('vue')
      options = getOptions(vueModule, ...importNames.map(n => imports[n]))
    }

    // Compile the template to a render function using Vue's compiler
    // Dynamic import to avoid SSR issues
    const { compile } = await import('@vue/compiler-dom')
    const { code: renderCode } = compile(template, {
      mode: 'function',
    })
    // eslint-disable-next-line no-new-func
    const renderFn = new Function('Vue', renderCode)({ ...await import('vue') })

    options.render = renderFn
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
    <p v-if="description" class="demo-description">
      {{ description }}
    </p>
    <div class="demo-preview">
      <component :is="demoComp" v-if="demoComp" />
      <div v-else-if="errorMsg" class="demo-error">
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
