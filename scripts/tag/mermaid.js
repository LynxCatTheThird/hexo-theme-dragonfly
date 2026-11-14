// SPDX-License-Identifier: Apache-2.0
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
/**
 * 上游：Butterfly（Jerry 及贡献者）。
 * mermaid
 * https://github.com/mermaid-js/mermaid
 */

'use strict'

const { escapeHTML } = require('hexo-util')

const mermaid = (args, content) => {
  const config = args[0] || '{}'
  return `<div class="mermaid-wrap"><pre class="mermaid-src" data-config="${escapeHTML(config)}" hidden>
    ${escapeHTML(content)}
  </pre></div>`
}

hexo.extend.tag.register('mermaid', mermaid, { ends: true })
