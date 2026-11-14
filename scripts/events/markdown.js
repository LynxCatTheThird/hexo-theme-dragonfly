// SPDX-License-Identifier: Apache-2.0
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
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
    // Markdown 阶段尚未选择文章引擎，先保留 TeX 与行内/块级信息。
    delimiters: 'all',
    render: (source, display) => `<span class="math-source" data-display="${Number(display)}" data-tex="${encodeURIComponent(source)}">${escapeHTML(source)}</span>`
  })
  return data => md.render(data.text)
}

// 在站点插件和脚本注册完成后选择 Markdown 渲染器。
hexo.on('ready', () => {
  const mode = hexo.config.theme_config?.markdown?.renderer || 'auto'
  if (!['auto', 'theme', 'external'].includes(mode)) throw new Error('markdown.renderer must be auto, theme or external')
  const extensions = ['md', 'markdown']
  const existing = extensions.some(extension => hexo.extend.renderer.get(extension))
  if (mode === 'external' || (mode === 'auto' && existing)) return
  const render = createRenderer()
  for (const extension of extensions) hexo.extend.renderer.register(extension, 'html', render, true)
})
