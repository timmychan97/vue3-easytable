import type MarkdownIt from 'markdown-it'
import { Buffer } from 'node:buffer'
import { transformSync } from 'esbuild'
import container from 'markdown-it-container'

function escapeAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

/**
 * Transform JSX inside <script> blocks using esbuild at build time.
 * Converts JSX to Vue.h() calls so the runtime DemoBlock can use new Function().
 */
function transformScriptJSX(content: string): string {
  const scriptMatch = content.match(/(<script>)([\s\S]*?)(<\/script>)/)
  if (!scriptMatch)
    return content

  const scriptBody = scriptMatch[2]
  // Quick check: does the script contain JSX?
  if (!/<[\w-]/.test(scriptBody.replace(/<=/g, '')))
    return content

  try {
    const result = transformSync(scriptBody, {
      loader: 'jsx',
      jsxFactory: 'Vue.h',
      jsxFragment: 'Vue.Fragment',
    })
    return content.replace(scriptMatch[0], `${scriptMatch[1]}${result.code}${scriptMatch[3]}`)
  }
  catch (e) {
    console.warn('[demo] JSX transform failed:', e)
    return content
  }
}

/**
 * Transforms :::demo [description]\n```html\n...\n```\n::: blocks into
 * <ClientOnly><DemoBlock code="base64" description="..."></DemoBlock></ClientOnly>
 *
 * Also transforms :::anchor Title into <h2 class="demo-anchor">Title</h2>
 */
export function demoPlugin(md: MarkdownIt): void {
  // Handle :::anchor blocks
  md.use(container, 'anchor', {
    render(tokens: any[], idx: number) {
      const token = tokens[idx]
      if (token.nesting === 1) {
        const title = token.info.trim().replace(/^anchor\s*/, '')
        return `<h2 class="demo-anchor">${title}</h2>\n`
      }
      return ''
    },
  })

  // Handle :::demo blocks
  md.use(container, 'demo', {
    validate(params: string) {
      return !!params.trim().match(/^demo/)
    },
    render(tokens: any[], idx: number) {
      const token = tokens[idx]
      if (token.nesting === 1) {
        const description = token.info.trim().replace(/^demo\s*/, '')

        // Look ahead to find the fence token inside this container
        for (let i = idx + 1; i < tokens.length; i++) {
          const t = tokens[i]
          if (t.nesting === -1)
            break // closing tag for this container
          if (t.type === 'fence') {
            const transformed = transformScriptJSX(t.content)
            const code = Buffer.from(transformed).toString('base64')
            // Suppress the fence from rendering normally
            t.type = 'html_block'
            t.content = ''
            const descAttr = description ? ` description="${escapeAttr(description)}"` : ''
            return `<ClientOnly><DemoBlock code="${code}"${descAttr}>`
          }
        }
        return `<ClientOnly><DemoBlock>`
      }
      return `</DemoBlock></ClientOnly>\n`
    },
  })
}
