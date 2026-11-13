const MarkdownIt = require('markdown-it')
const { tex } = require('@mdit/plugin-tex')
const { escapeHTML } = require('hexo-util')

const createRenderer = () => {
  const md = new MarkdownIt({ html: true, xhtmlOut: true, linkify: true, typographer: true })
  for (const name of ['abbr', 'dl', 'footnote', 'ins', 'mark', 'sub', 'sup', 'tasklist', 'spoiler']) {
    md.use(require(`@mdit/plugin-${name}`)[name])
  }
  md.use(require('markdown-it-anchor'), { level: 1, permalink: false })
  md.use(tex, {
    delimiters: 'all',
    render: (source, display) => `<span class="math-source" data-display="${Number(display)}" data-tex="${encodeURIComponent(source)}">${escapeHTML(source)}</span>`
  })
  return data => md.render(data.text)
}

// Wait until site plugins and scripts have registered their renderers.
hexo.on('ready', () => {
  const mode = hexo.config.theme_config?.markdown?.renderer || 'auto'
  if (!['auto', 'theme', 'external'].includes(mode)) throw new Error('markdown.renderer must be auto, theme or external')
  const extensions = ['md', 'markdown']
  const existing = extensions.some(extension => hexo.extend.renderer.get(extension))
  if (mode === 'external' || (mode === 'auto' && existing)) return
  const render = createRenderer()
  for (const extension of extensions) hexo.extend.renderer.register(extension, 'html', render, true)
})
