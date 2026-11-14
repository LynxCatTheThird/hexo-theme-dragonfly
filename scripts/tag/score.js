// SPDX-License-Identifier: Apache-2.0
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
/**
 * 乐谱。
 * {% score %}
 */

'use strict'

const { escapeHTML } = require('hexo-util')

const score = (args, content) => {
  const escapeHtmlTags = s => escapeHTML(s).replace(/[{}]/g, c => c === '{' ? '&#123;' : '&#125;')

  const trimmed = content.trim()
  // 以六个短横线分隔参数与乐谱。
  const parts = trimmed.split('------')

  if (parts.length < 2) {
    // 未设置分隔符时，将全部内容作为乐谱。
    return `<div class="abc-music-sheet">${escapeHtmlTags(trimmed)}</div>`
  }

  // 首段为 JSON 参数，剩余部分为乐谱。
  const paramPart = parts[0].trim()
  const scorePart = parts.slice(1).join('------').trim()

  let paramsObj = {}
  try {
    paramsObj = JSON.parse(paramPart)
  } catch (e) {
    console.error('Failed to parse JSON in score tag:', e)
  }

  // 使用带双引号的 data-params 属性，
  // 并转义 JSON 中的双引号。
  return `<div class="abc-music-sheet" data-params="${escapeHtmlTags(JSON.stringify(paramsObj))}">
    ${escapeHtmlTags(scorePart)}
  </div>`
}

hexo.extend.tag.register('score', score, { ends: true })
