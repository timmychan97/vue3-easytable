import mdContainer from 'markdown-it-container'

export default (md: markdownit, options: any) => {
  md.use(mdContainer, 'demo', {
    validate(params: string) {
      // eslint-disable-next-line regexp/no-super-linear-backtracking
      return params.trim().match(/^demo\s*(.*)$/)
    },
    render(tokens: any[], idx: number) {
      // eslint-disable-next-line regexp/no-super-linear-backtracking
      const m = tokens[idx].info.trim().match(/^demo\s*(.*)$/)
      if (tokens[idx].nesting === 1) {
        const description = m && m.length > 1 ? m[1] : ''
        const content
          = tokens[idx + 1].type === 'fence' ? tokens[idx + 1].content : ''
        return `<demo-block>
        ${description ? `<div>${md.render(description)}</div>` : ''}
        <!--element-demo: ${content}:element-demo-->
        `
      }
      return '</demo-block>'
    },
  })

  md.use(mdContainer, 'anchor', {
    validate(params: string) {
      // eslint-disable-next-line regexp/no-super-linear-backtracking
      return params.trim().match(/^anchor\s*(.*)$/)
    },
    render(tokens: any[], idx: number) {
      // eslint-disable-next-line regexp/no-super-linear-backtracking
      const m = tokens[idx].info.trim().match(/^anchor\s*(.*)$/)
      if (tokens[idx].nesting === 1) {
        const label = m && m.length > 1 ? m[1] : ''

        return `<anchor is-edit label="${label}" fileName="${options.resourceFileName}" />
        `
      }
      return ''
    },
  })

  md.use(mdContainer, 'tip')
  md.use(mdContainer, 'warning')
}
