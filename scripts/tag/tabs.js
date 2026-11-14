// SPDX-License-Identifier: Apache-2.0 AND MIT
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
/**
 * 标签页。
 * 来源：hexo-theme-next。
 * 上游修改：Jerry。
 */

'use strict'

const { createHash } = require('node:crypto')
let sequence = 0

const postTabs = (args, content) => {
  const tabBlock = /<!--\s*tab (.*?)\s*-->\n([\w\W\s\S]*?)<!--\s*endtab\s*-->/g
  args = args.join(' ').split(',')
  const tabName = args[0] || 'tab'
  const tabActive = Number(args[1]) || 0
  const matches = []
  let match
  let tabId = 0
  let tabNav = ''
  let tabContent = ''
  let noDefault = true
  const group = `tabs-${createHash('sha256').update(content).digest('hex').slice(0, 10)}-${++sequence}`

  while ((match = tabBlock.exec(content)) !== null) {
    matches.push(match[1], match[2])
  }

  for (let i = 0; i < matches.length; i += 2) {
    const [tabCaption = '', tabIcon = ''] = matches[i].split('@')
    let postContent = matches[i + 1]

    postContent = hexo.render.renderSync({ text: postContent, engine: 'markdown' }).trim()
    tabId += 1

    const caption = (tabCaption || tabIcon) ? tabCaption : `${tabName} ${tabId}`
    const iconHtml = tabIcon ? `<i class="${tabIcon.trim()}"></i>` : ''
    const isActive = (tabActive > 0 && tabActive === tabId) || (tabActive === 0 && tabId === 1) ? ' active' : ''

    if (isActive) noDefault = false

    tabNav += `<button type="button" class="tab${isActive}" role="tab" id="${group}-tab-${tabId}" aria-controls="${group}-panel-${tabId}" aria-selected="${Boolean(isActive)}" tabindex="${isActive ? 0 : -1}">${iconHtml}${caption.trim()}</button>`
    tabContent += `<div class="tab-item-content${isActive}" role="tabpanel" id="${group}-panel-${tabId}" aria-labelledby="${group}-tab-${tabId}"${isActive ? '' : ' hidden'}>${postContent}</div>`
  }

  if (noDefault) tabNav = tabNav.replace('tabindex="-1"', 'tabindex="0"')

  const toTop = '<div class="tab-to-top"><button type="button" aria-label="scroll to top"><i class="fas fa-arrow-up"></i></button></div>'
  tabNav = `<div class="nav-tabs${noDefault ? ' no-default' : ''}" role="tablist">${tabNav}</div>`
  tabContent = `<div class="tab-contents">${tabContent}</div>`

  return `<div class="tabs">${tabNav}${tabContent}${toTop}</div>`
}

hexo.extend.tag.register('tabs', postTabs, { ends: true })
hexo.extend.tag.register('subtabs', postTabs, { ends: true })
hexo.extend.tag.register('subsubtabs', postTabs, { ends: true })
