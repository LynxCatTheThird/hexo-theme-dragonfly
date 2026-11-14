// SPDX-License-Identifier: Apache-2.0
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
/**
 * 上游：Butterfly（Jerry 及贡献者）。
 * label
 * {% label text color %}
 */

'use strict'

const addLabel = args => {
  const [text, className = 'default'] = args
  return `<mark class="hl-label ${className}">${text}</mark>`
}

hexo.extend.tag.register('label', addLabel, { ends: false })
