const fs = require('node:fs')
const path = require('node:path')

hexo.extend.generator.register('dragonfly_browser_assets', () => {
  const manifest = hexo.theme.config.browser_manifest
  return manifest.files.map(file => ({ path: file.path, data: fs.readFileSync(path.join(__dirname, '../../dist/source', file.path)) }))
})
