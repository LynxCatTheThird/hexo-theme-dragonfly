// SPDX-License-Identifier: Apache-2.0
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
/**
 * inlineImg
 * @param {Array} args - 图片名称与高度。
 * @param {string} args[0] - 图片名称。
 * @param {number} args[1] - 图片高度。
 * @returns {string} - 图片标签。
 */

'use strict'

const urlFor = require('hexo-util').url_for.bind(hexo)

const inlineImg = ([img, height = '']) => {
  const heightStyle = height ? `style="height:${height}"` : ''
  const src = urlFor(img)
  return `<img class="inline-img" src="${src}" ${heightStyle} />`
}

hexo.extend.tag.register('inlineImg', inlineImg, { ends: false })
