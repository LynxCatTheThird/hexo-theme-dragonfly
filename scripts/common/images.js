const { Parser } = require('htmlparser2')
const { escapeHTML } = require('hexo-util')
const escapeAttribute = value => escapeHTML(value).replace(/&#x2F;/g, '/')
const setAttribute = (tag, name, value) => {
  const attribute = `${name}="${escapeAttribute(value)}"`
  const pattern = new RegExp(`\\s${name}\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]+)`, 'i')
  return pattern.test(tag) ? tag.replace(pattern, () => ' ' + attribute) : tag.replace(/\s*(\/?)>$/, (_, slash) => ` ${attribute}${slash}>`)
}
const rootURL = (url, root) => url.startsWith('/') && !url.startsWith('//') && root !== '/' && !url.startsWith(root) ? root + url.slice(1) : url
const srcsetURL = (source, root) => {
  const changes = []
  let pos = 0
  while (pos < source.length) {
    while (/[\s,]/.test(source[pos] || '') && pos < source.length) pos++
    const start = pos
    while (pos < source.length && !/\s/.test(source[pos])) pos++
    const token = source.slice(start, pos), url = token.replace(/,+$/, '')
    if (url) changes.push({ start, end: start + url.length, value: rootURL(url, root) })
    if (token.endsWith(',')) continue
    while (pos < source.length && source[pos] !== ',') pos++
  }
  for (const change of changes.reverse()) source = source.slice(0, change.start) + change.value + source.slice(change.end)
  return source
}
const rewriteImages = (html, { native = true, root = '/', placeholder = '' } = {}) => {
  const stack = [], changes = []
  const ignored = new Set(['script', 'style', 'textarea', 'pre', 'code', 'template'])
  const parser = new Parser({
    onopentag (name, attrs) {
      const parent = stack[stack.length - 1]
      const blocked = parent?.blocked || ignored.has(name) || (attrs.class || '').split(/\s+/).includes('gallery-container')
      stack.push({ name, blocked })
      if (blocked || (name !== 'img' && !(name === 'source' && parent?.name === 'picture'))) return
      let tag = html.slice(parser.startIndex, parser.endIndex + 1)
      for (const attr of ['src', 'srcset']) {
        if (!attrs[attr]) continue
        const value = attr === 'src' ? rootURL(attrs[attr], root) : srcsetURL(attrs[attr], root)
        if (value !== attrs[attr]) tag = setAttribute(tag, attr, value)
        attrs[attr] = value
      }
      if (name === 'img' && (attrs.src || attrs.srcset) && !('data-lazy-src' in attrs)) {
        const eager = attrs.loading === 'eager' || attrs.fetchpriority === 'high' || (attrs.class || '').split(/\s+/).includes('no-lazyload')
        if (native || eager) {
          if (!('loading' in attrs)) tag = setAttribute(tag, 'loading', eager ? 'eager' : 'lazy')
          if (!('decoding' in attrs)) tag = setAttribute(tag, 'decoding', 'async')
        } else if (attrs.src) {
          tag = setAttribute(tag, 'data-lazy-src', attrs.src)
          tag = setAttribute(tag, 'src', placeholder || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7')
        }
      }
      changes.push({ start: parser.startIndex, end: parser.endIndex + 1, value: tag })
    },
    onclosetag () { stack.pop() }
  }, { decodeEntities: true })
  parser.end(html)
  for (const change of changes.reverse()) html = html.slice(0, change.start) + change.value + html.slice(change.end)
  return html
}
module.exports = { rewriteImages }
