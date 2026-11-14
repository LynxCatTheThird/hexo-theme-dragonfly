// SPDX-License-Identifier: Apache-2.0
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
/**
 * 上游：Butterfly（Jerry 及贡献者）。
 * 404 error page
 */

'use strict'

hexo.extend.generator.register('404', function (locals) {
  const error404 = hexo.theme.config.error_404 || {}
  if (!error404.enable) return
  return {
    path: '404.html',
    layout: ['page'],
    data: {
      type: '404',
      top_img: false,
      comments: false,
      aside: false
    }
  }
})
