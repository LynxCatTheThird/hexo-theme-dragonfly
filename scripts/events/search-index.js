// SPDX-License-Identifier: Apache-2.0
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
'use strict'

const { stripHTML, unescapeHTML, escapeHTML } = require('hexo-util')

const searchablePost = post => {
  // 加密文章只保留索引元信息，正文在生成器读取前清空。
  const encrypted = post.encrypt || /\b(?:data-hbe-format|id=["']hbeData["'])/.test(post.content || '')
  const html = encrypted ? '' : (post.content || '')
  const text = unescapeHTML(stripHTML(html
    .replace(/<(script|style|textarea)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')))
    .replace(/\s+/g, ' ').trim()
  // 搜索摘要会作为 HTML 插入，先转义其中的代码字面量。
  // 转义也避免 CDATA 终止符破坏 XML 索引。
  const content = escapeHTML(text)
  return {
    title: post.title,
    path: post.path,
    content,
    _content: content,
    categories: post.categories,
    tags: post.tags
  }
}

hexo.extend.filter.register('after_init', () => {
  if (!hexo.config.search) return
  const key = hexo.config.search.path.endsWith('.json') ? 'json' : 'xml'
  const generate = hexo.extend.generator.get(key)
  if (!generate) return
  hexo.extend.generator.register(key, function (locals) {
    const safeLocals = Object.create(locals)
    // 使用独立记录传给索引插件，避免修改随后还要用于页面生成的文章对象。
    for (const field of ['posts', 'pages']) {
      if (locals[field]) safeLocals[field] = locals[field].map(searchablePost)
    }
    return generate.call(this, safeLocals)
  })
})
