const fs = require('node:fs')
const path = require('node:path')
const types = { '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.svg': 'image/svg+xml' }

// Serve the real installed distributions while retaining their public URL shapes.
module.exports = async context => {
  if (process.env.TEST_REAL_CDN) return
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    let match
    if (url.hostname === 'registry.npmmirror.com') match = url.pathname.match(/^\/(@[^/]+\/[^/]+|[^/]+)\/[^/]+\/files\/(.+)$/)
    else if (['cdn.jsdelivr.net', 'unpkg.com'].includes(url.hostname)) match = url.pathname.match(/^\/(?:npm\/)?(@[^/]+\/[^/@]+|[^/@]+)@[^/]+\/(.+)$/)
    else match = url.pathname.match(/\/pluginsSrc\/(@[^/]+\/[^/]+|[^/]+)\/(.+)$/)
    if (!match) return route.fallback()
    const [, name, asset] = match
    let file = path.resolve(__dirname, '../node_modules', name, asset)
    // jsDelivr synthesizes .min JS/CSS URLs when the package ships only source.
    if (url.hostname === 'cdn.jsdelivr.net' && !fs.existsSync(file)) file = file.replace(/\.min\.(js|css)$/, '.$1')
    const base = path.resolve(__dirname, '../node_modules', name) + path.sep
    if (!file.startsWith(base) || !fs.existsSync(file)) throw new Error(`Missing test vendor: ${name}/${asset}`)
    await route.fulfill({ contentType: types[path.extname(file)] || 'application/octet-stream', headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(file) })
  })
}
