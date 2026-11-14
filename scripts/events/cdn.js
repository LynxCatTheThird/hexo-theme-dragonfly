// SPDX-License-Identifier: Apache-2.0
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
const path = require('node:path')
const { build } = require('../../tools/build.cjs')
const { resolveAssets, internalAssets } = require('../common/assets')

hexo.extend.filter.register('before_generate', () => {
  const plugins = hexo.render.renderSync({ path: path.join(hexo.theme_dir, 'plugins.yml'), engine: 'yaml' })
  const manifest = build({ development: hexo.theme.config.CDN.development })
  hexo.theme.config.browser_manifest = manifest
  const internal = { ...internalAssets }
  for (const [key, file] of Object.entries(manifest.entries)) internal[key] = { name: 'hexo-theme-dragonfly', version: manifest.sourceHash.slice(0, 12), file, package_file: `dist/source/${file}` }
  hexo.theme.config.asset = resolveAssets(hexo.theme.config.CDN, plugins, internal)
})
