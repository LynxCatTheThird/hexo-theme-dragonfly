// SPDX-License-Identifier: Apache-2.0
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
'use strict'

hexo.extend.helper.register('aside_archives', function (options = {}) {
  const { config, page, site, url_for: urlFor, _p } = this
  const { archive_dir: archiveDir, timezone, language } = config

  const {
    type = 'monthly',
    format = type === 'monthly' ? 'MMMM YYYY' : 'YYYY',
    show_count: showCount = true,
    order = -1,
    limit,
    transform
  } = options

  const lang = toMomentLocale(page.lang || page.language || language)

  if (!site.posts.length) return ''

  const archives = new Map()
  site.posts.forEach(post => {
    const date = post.date
    const year = date.year()
    const month = date.month() + 1
    const key = type === 'yearly' ? year : `${year}-${month}`

    if (archives.has(key)) {
      archives.get(key).count++
    } else {
      archives.set(key, {
        year,
        month,
        count: 1,
        date // 保留日期对象供最后格式化。
      })
    }
  })

  const data = Array.from(archives.values()).sort((a, b) => {
    if (order === -1) {
      return b.year - a.year || b.month - a.month
    }
    return a.year - b.year || a.month - b.month
  })

  // 聚合完成后再格式化归档名称。
  data.forEach(item => {
    let date = item.date.clone()
    if (timezone) date = date.tz(timezone)
    if (lang) date = date.locale(lang)
    item.name = date.format(format)
    delete item.date // 清理临时字段。
  })

  const createArchiveLink = item => {
    let url = `${archiveDir}/${item.year}/`
    if (type === 'monthly') {
      url += item.month < 10 ? `0${item.month}/` : `${item.month}/`
    }
    return urlFor(url)
  }

  const limitedData = limit > 0 ? data.slice(0, Math.min(data.length, limit)) : data

  const archiveHeader = `
    <div class="item-headline"><i class="fas fa-archive"></i><span>${_p('aside.card_archives')}</span>${
      data.length > limitedData.length
        ? `<a class="card-more-btn" href="${urlFor(archiveDir)}/"
            title="${_p('aside.more_button')}">
            <i class="fas fa-angle-right"></i>
          </a>`
        : ''
    }</div>
  `

  const archiveList = `
    <ul class="card-archive-list">
      ${limitedData
        .map(
          item => `
        <li class="card-archive-list-item">
          <a class="card-archive-list-link" href="${createArchiveLink(item)}">
            <span class="card-archive-list-date">
              ${transform ? transform(item.name) : item.name}
            </span>
            ${showCount ? `<span class="card-archive-list-count">${item.count}</span>` : ''}
          </a>
        </li>
      `
        )
        .join('')}
    </ul>
  `

  return archiveHeader + archiveList
})

const toMomentLocale = lang => {
  if (!lang || ['en', 'default'].includes(lang)) return 'en'
  return lang.toLowerCase().replace('_', '-')
}
