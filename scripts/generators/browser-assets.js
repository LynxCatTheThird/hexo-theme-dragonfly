// SPDX-License-Identifier: Apache-2.0
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
const fs = require('node:fs')
const path = require('node:path')

hexo.extend.generator.register('dragonfly_browser_assets', () => {
  const manifest = hexo.theme.config.browser_manifest
  return manifest.files.map(file => ({ path: file.path, data: fs.readFileSync(path.join(__dirname, '../../dist/source', file.path)) }))
})
