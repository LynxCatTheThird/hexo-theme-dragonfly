// SPDX-License-Identifier: Apache-2.0
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
const { preconnect } = require('../common/assets')

hexo.extend.filter.register('after_render:html', html => {
  if (!html.includes('</head>')) return html
  const theme = hexo.theme.config
  const urls = [
    ...Object.values(theme.asset || {}), theme.blog_title_font?.font_link,
    theme.visitor_counter?.api_url, hexo.config.echarts?.cdn, theme.preloader?.pace_css_url
  ]
  return html.replace('</head>', preconnect(html, urls, hexo.config.url) + '</head>')
}, 1)
