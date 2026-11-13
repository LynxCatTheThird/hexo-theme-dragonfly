const { escapeHTML } = require('hexo-util')

const engineFor = (page, math) => {
  if (page.math === false) return null
  if (['katex', 'mathjax'].includes(page.math)) return page.math
  if (page.katex) return 'katex'
  if (page.mathjax) return 'mathjax'
  return math.per_page && page[math.use] !== false ? math.use : null
}

const createMathjax = config => {
  const { mathjax } = require('@mathjax/src/js/mathjax.js')
  mathjax.asyncLoad = file => Promise.resolve(require(file))
  const { TeX } = require('@mathjax/src/js/input/tex.js')
  const { SVG } = require('@mathjax/src/js/output/svg.js')
  const { liteAdaptor } = require('@mathjax/src/js/adaptors/liteAdaptor.js')
  const { RegisterHTMLHandler } = require('@mathjax/src/js/handlers/html.js')
  require('@mathjax/src/js/input/tex/ams/AmsConfiguration.js')
  require('@mathjax/src/js/input/tex/newcommand/NewcommandConfiguration.js')
  require('@mathjax/src/js/input/tex/configmacros/ConfigMacrosConfiguration.js')
  const packages = ['base', 'ams', 'newcommand', 'configmacros']
  if (config.mhchem) {
    require('@mathjax/src/js/input/tex/mhchem/MhchemConfiguration.js')
    packages.push('mhchem')
  }
  const output = new SVG({ fontCache: 'none' })
  if (config.mhchem) {
    output.font.addExtension(require('@mathjax/mathjax-mhchem-font-extension/js/svg.js').MathJaxMhchemFontExtension)
  }
  const adaptor = liteAdaptor()
  const handler = RegisterHTMLHandler(adaptor)
  require('@mathjax/src/js/a11y/assistive-mml.js').AssistiveMmlHandler(handler)
  return async sources => {
    const html = sources.map(({ source, display }) => `<div>${display ? '\\[' : '\\('}${escapeHTML(source)}${display ? '\\]' : '\\)'}</div>`).join('')
    const document = mathjax.document(html, {
      InputJax: new TeX({ tags: config.tags, ...config.tex, packages }),
      OutputJax: output
    })
    mathjax.handlers.unregister(handler)
    await document.renderPromise()
    return adaptor.childNodes(adaptor.body(document.document)).map(node => adaptor.innerHTML(node))
  }
}

const renderMath = async (data, math) => {
  const pattern = /<span class="math-source" data-display="([01])" data-tex="([^"]*)">[\s\S]*?<\/span>/g
  const matches = [...data.content.matchAll(pattern)]
  if (!matches.length) return data
  const engine = engineFor(data, math)
  const sources = matches.map(match => ({ source: decodeURIComponent(match[2]), display: match[1] === '1' }))
  let render, rendered
  if (engine === 'katex') {
    const katex = require('katex')
    if (math.katex.mhchem) require('katex/contrib/mhchem')
    render = (source, displayMode) => katex.renderToString(source, { throwOnError: false, ...math.katex.options, displayMode })
  } else if (engine === 'mathjax' && math.mathjax.render !== 'client') {
    rendered = await createMathjax(math.mathjax)(sources)
  } else {
    render = (source, display) => engine === 'mathjax'
      ? `<script type="math/tex${display ? '; mode=display' : ''}">${source.replace(/<\/script/gi, '< /script')}</script>`
      : escapeHTML((display ? '$$' : '$') + source + (display ? '$$' : '$'))
  }
  const parts = []
  let offset = 0
  for (const [index, match] of matches.entries()) {
    parts.push(data.content.slice(offset, match.index), rendered ? rendered[index] : render(sources[index].source, sources[index].display))
    offset = match.index + match[0].length
  }
  data.content = parts.join('') + data.content.slice(offset)
  return data
}

module.exports = { engineFor, renderMath }
