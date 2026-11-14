// SPDX-License-Identifier: Apache-2.0
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
/**
 * Stylus 样式渲染器。
 */

'use strict'

hexo.extend.filter.register('stylus:renderer', style => {
  const { syntax_highlighter: syntaxHighlighter, highlight = {}, prismjs = {} } = hexo.config
  let { enable: highlightEnable, line_number: highlightLineNumber } = highlight
  let { enable: prismjsEnable, line_number: prismjsLineNumber } = prismjs

  // 兼容 Hexo 7 及更高版本。
  if (syntaxHighlighter) {
    highlightEnable = syntaxHighlighter === 'highlight.js'
    prismjsEnable = syntaxHighlighter === 'prismjs'
  }

  style.define('$highlight_enable', highlightEnable)
    .define('$highlight_line_number', highlightLineNumber)
    .define('$prismjs_enable', prismjsEnable)
    .define('$prismjs_line_number', prismjsLineNumber)
    .define('$language', hexo.config.language)
})
