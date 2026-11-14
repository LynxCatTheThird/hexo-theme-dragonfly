// SPDX-License-Identifier: Apache-2.0
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
/**
 * 时间线标签。
 * 语法：
 * {% timeline [headline],[color] %}
 * <!-- timeline [title] -->
 * [content]
 * <!-- endtimeline -->
 * <!-- timeline [title] -->
 * [content]
 * <!-- endtimeline -->
 * {% endtimeline %}
 */

'use strict'

const timeLineFn = (args, content) => {
  const tlBlock = /<!--\s*timeline\s*(?<title>.*?)\s*-->\n(?<content>[\s\S]*?)<!--\s*endtimeline\s*-->/g

  const renderMd = text => hexo.render.renderSync({ text, engine: 'markdown' })

  const [text, color = ''] = args.length ? args.join(' ').split(',') : []

  const headline = text
    ? `<div class='timeline-item headline'>
        <div class='timeline-item-title'>
          <div class='item-circle'>${renderMd(text)}</div>
        </div>
      </div>`
    : ''

  const items = Array.from(content.matchAll(tlBlock))
    .map(({ groups: { title, content } }) =>
      `<div class='timeline-item'>
        <div class='timeline-item-title'>
          <div class='item-circle'>${renderMd(title)}</div>
        </div>
        <div class='timeline-item-content'>${renderMd(content)}</div>
      </div>`
    )
    .join('')

  return `<div class="timeline ${color}">${headline}${items}</div>`
}

hexo.extend.tag.register('timeline', timeLineFn, { ends: true })
