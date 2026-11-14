// SPDX-License-Identifier: Apache-2.0
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
'use strict'

const { stripHTML, truncate } = require('hexo-util')

// 移除 HTML 标签并截取指定长度的摘要。
const truncateContent = (content, length, encrypt = false) => {
  if (!content || encrypt) return ''
  return truncate(stripHTML(content).replace(/\n/g, ' '), { length })
}

// 按文章内容和主题配置生成摘要。
const postDesc = (data, hexo) => {
  const { description, content, postDesc, encrypt } = data

  if (postDesc) return postDesc

  const { length, method } = hexo.theme.config.index_post_content

  if (method === false) return

  let result
  switch (method) {
    case 1:
      result = description
      break
    case 2:
      result = description || truncateContent(content, length, encrypt)
      break
    default:
      result = truncateContent(content, length, encrypt)
  }

  data.postDesc = result
  return result
}

module.exports = { truncateContent, postDesc }
