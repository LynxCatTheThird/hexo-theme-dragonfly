// SPDX-License-Identifier: Apache-2.0
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
'use strict'

// 读取 tag/series.js 预先生成的系列分组，
// 再按侧栏卡片配置排序。
hexo.extend.helper.register('groupPosts', function () {
  const groups = hexo._seriesGroups || {}
  const { orderBy = 'date', order = 1 } = this.theme.aside.card_post_series

  const result = {}
  Object.keys(groups).forEach(key => {
    const arr = groups[key].slice() // 复制后操作，保留共享分组的顺序。
    if (orderBy === 'title') {
      arr.sort((a, b) => {
        const cmp = a.title.toUpperCase().localeCompare(b.title.toUpperCase())
        return order === 1 ? cmp : -cmp
      })
    } else {
      arr.sort((a, b) => order === 1 ? a.date - b.date : b.date - a.date)
    }
    result[key] = arr
  })

  return result
})
