// Modified in Dragonfly.
const path = require('node:path')
const { resolveAssets } = require('../common/assets')

hexo.extend.filter.register('before_generate', () => {
  const plugins = hexo.render.renderSync({ path: path.join(hexo.theme_dir, 'plugins.yml'), engine: 'yaml' })
  hexo.theme.config.asset = resolveAssets(hexo.theme.config.CDN, plugins)
})
