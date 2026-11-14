// SPDX-License-Identifier: Apache-2.0 AND MIT
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
/**
 * note.js
 * 来源：hexo-theme-next。
 * 上游修改：Jerry。
 */

'use strict'

const postNote = (args, content) => {
  const styleConfig = hexo.theme.config.note.style
  const noteTag = ['flat', 'modern', 'simple', 'disabled']
  if (!noteTag.includes(args[args.length - 1])) {
    args.push(styleConfig)
  }

  let icon = ''
  const iconArray = args[args.length - 2]
  if (iconArray && iconArray.startsWith('fa')) {
    icon = `<i class="note-icon ${iconArray}"></i>`
    args[args.length - 2] = 'icon-padding'
  }

  return `<div class="note ${args.join(' ')}">${icon + hexo.render.renderSync({ text: content, engine: 'markdown' })}</div>`
}

hexo.extend.tag.register('note', postNote, { ends: true })
hexo.extend.tag.register('subnote', postNote, { ends: true })
