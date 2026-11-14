// SPDX-License-Identifier: Apache-2.0
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
/**
 * 文章系列标签。
 * 语法：
 * {% series [series name] %}
 * 用法：
 * {% series %}
 * {% series series1 %}
 */

'use strict'

const urlFor = require('hexo-util').url_for.bind(hexo)

// 遍历文章一次，按系列名称分组。
// 结果存入 hexo._seriesGroups，供标签和辅助函数共用。
function buildSeriesGroups () {
  const groups = {}
  const posts = hexo.model('Post').toArray()
  for (let i = 0, len = posts.length; i < len; i++) {
    const p = posts[i]
    if (p.series) {
      if (!groups[p.series]) groups[p.series] = []
      groups[p.series].push({
        title: p.title,
        path: p.path,
        date: p.date.valueOf()
      })
    }
  }
  return groups
}

// 首次渲染前生成系列分组。
// before_generate 晚于标签渲染，因此首次读取时也要建立分组。
hexo.extend.filter.register('before_post_render', data => {
  if (!hexo.theme.config.series.enable) return data
  if (!hexo._seriesGroups) {
    hexo._seriesGroups = buildSeriesGroups()
  }
  return data
})

// 每轮生成后重建分组，供预览服务读取最新文章。
hexo.extend.filter.register('before_generate', () => {
  if (!hexo.theme.config.series.enable) return
  hexo._seriesGroups = buildSeriesGroups()
})

function series (args) {
  const { series } = hexo.theme.config
  if (!series.enable) {
    hexo.log.warn('Series plugin is disabled in the theme config')
    return ''
  }

  const groupName = args.length ? args[0] : this.series

  if (!groupName) {
    hexo.log.warn('No series specified')
    return ''
  }

  const groups = hexo._seriesGroups || {}
  const source = groups[groupName]

  if (!source || !source.length) {
    hexo.log.warn(`There is no series named "${groupName}"`)
    return ''
  }

  const isAsc = (series.order || 1) === 1
  const isSortByTitle = series.orderBy === 'title'

  // 复制后再排序，保留共享分组的顺序。
  const seriesArr = source.slice().sort((a, b) => {
    const itemA = isSortByTitle ? a.title.toUpperCase() : a.date
    const itemB = isSortByTitle ? b.title.toUpperCase() : b.date
    return itemA < itemB ? (isAsc ? -1 : 1) : itemA > itemB ? (isAsc ? 1 : -1) : 0
  })

  const listItems = seriesArr.map(ele =>
    `<li><a href="${urlFor(ele.path)}" title="${ele.title}">${ele.title}</a></li>`
  ).join('')

  return series.number ? `<ol class="series-items">${listItems}</ol>` : `<ul class="series-items">${listItems}</ul>`
}

hexo.extend.tag.register('series', series, { ends: false })
