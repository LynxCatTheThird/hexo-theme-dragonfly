// SPDX-License-Identifier: Apache-2.0
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
hexo.extend.helper.register('getArchiveLength', function () {
  const archiveGenerator = hexo.config.archive_generator
  const posts = this.site.posts

  const { yearly, monthly, daily } = archiveGenerator
  const { year, month, day } = this.page

  // 归档页。
  if (!year) return posts.length

  const mapData = this.fragment_cache('createArchiveObj', () => {
    const map = new Map()
    posts.forEach(post => {
      const date = post.date
      const y = date.year()
      const m = date.month() + 1
      const d = date.date()

      // 同时记录年份，供年度归档页使用。
      const keyYear = `${y}`
      map.set(keyYear, (map.get(keyYear) || 0) + 1)

      if (monthly || daily) {
        const keyMonth = `${y}-${m}`
        map.set(keyMonth, (map.get(keyMonth) || 0) + 1)
      }

      if (daily) {
        const keyDay = `${y}-${m}-${d}`
        map.set(keyDay, (map.get(keyDay) || 0) + 1)
      }
    })
    return map
  })

  let key
  if (yearly || monthly || daily) key = `${year}`
  if ((monthly || daily) && month) key = `${year}-${month}`
  if (daily && day) key = `${year}-${month}-${day}`

  return mapData.get(key) || posts.length
})
