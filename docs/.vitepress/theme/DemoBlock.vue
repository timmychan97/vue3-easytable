<script setup lang="ts">
import { defineComponent, onMounted, ref, shallowRef } from 'vue'

const props = defineProps<{
  code: string
  description?: string
}>()

const showCode = ref(false)
const demoComp = shallowRef<any>(null)
const errorMsg = ref('')

// Decode the base64-encoded demo source
const rawCode = atob(props.code)

onMounted(async () => {
  try {
    const templateMatch = rawCode.match(/<template>([\s\S]*?)<\/template>/)
    const scriptMatch = rawCode.match(/<script>([\s\S]*?)<\/script>/)

    const template = templateMatch ? templateMatch[1].trim() : '<div></div>'
    const script = scriptMatch ? scriptMatch[1].trim() : ''

    // Transform "export default { ... }" to a function that returns the options object
    let options: any = {}
    if (script) {
      // eslint-disable-next-line no-new-func
      const getOptions = new Function(`${script.replace(/^\s*export\s+default\s*/, 'return ')}`)
      options = getOptions()
    }

    // Compile the template to a render function using Vue's compiler
    // Dynamic import to avoid SSR issues
    const { compile } = await import('@vue/compiler-dom')
    const { createApp, h } = await import('vue')

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
        {{ showCode ? '收起代码' : '展开代码' }}
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
