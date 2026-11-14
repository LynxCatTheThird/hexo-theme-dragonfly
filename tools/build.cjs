// SPDX-License-Identifier: Apache-2.0
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const esbuild = require('esbuild')
const root = path.resolve(__dirname, '..')
const digest = data => crypto.createHash('sha256').update(data).digest('hex')
const entries = { main: 'main.js', utils: 'utils.js', navigation: 'navigation.js', echarts_runtime: 'echarts.js', local_search: 'search/local-search.js', algolia_js: 'search/algolia.js' }

function build ({ development = false } = {}) {
  const mode = development ? 'development' : 'production'
  const target = path.join(root, 'dist/source/js/build', mode)
  const manifestPath = path.join(root, 'dist', `manifest-${mode}.json`)
  const sources = fs.readdirSync(path.join(root, 'browser'), { recursive: true }).filter(file => file.endsWith('.js')).sort()
  const notices = ['LICENSE', 'NOTICE', ...fs.readdirSync(path.join(root, 'LICENSES')).sort().map(file => `LICENSES/${file}`)]
  const sourceHash = digest([mode, fs.readFileSync(__filename), fs.readFileSync(path.join(root, 'package.json')), ...notices.flatMap(file => [file, fs.readFileSync(path.join(root, file))]), ...sources.flatMap(file => [file, fs.readFileSync(path.join(root, 'browser', file))])].join('\0'))
  try {
    // 输入未变仍需校验每个输出，修复被删除或被外部修改的构建文件。
    const previous = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    if (previous.sourceHash === sourceHash && previous.files.every(file => digest(fs.readFileSync(path.join(root, 'dist/source', file.path))) === file.sha256)) return previous
  } catch {}
  const result = esbuild.buildSync({
    absWorkingDir: root,
    entryPoints: Object.fromEntries(Object.entries(entries).map(([name, file]) => [name, `browser/${file}`])),
    outdir: target, entryNames: '[name]-[hash]', chunkNames: 'chunks/[name]-[hash]',
    bundle: true, splitting: true, format: 'esm', platform: 'browser', target: 'es2020',
    minify: !development, sourcemap: true, metafile: true, write: false, legalComments: 'eof',
    banner: { js: '/*! Dragonfly | Apache-2.0；原作者与第三方许可见随附 licenses/dragonfly/NOTICE。 */' }
  })
  const route = file => path.relative(path.join(root, 'dist/source'), path.resolve(root, file)).split(path.sep).join('/')
  const manifest = { package: 'hexo-theme-dragonfly', version: require('../package.json').version, mode, sourceHash, entries: {}, files: [], imports: {} }
  for (const [file, info] of Object.entries(result.metafile.outputs)) {
    if (info.entryPoint && !file.endsWith('.map')) {
      const name = Object.keys(entries).find(key => info.entryPoint === `browser/${entries[key]}`)
      if (name) manifest.entries[name] = route(file)
    }
    manifest.imports[route(file)] = info.imports.filter(item => !item.external).map(item => ({ path: route(item.path), kind: item.kind }))
  }
  if (manifest.imports[manifest.entries.utils].length) throw new Error('The synchronous dragonfly compatibility bundle must not import ESM dependencies')
  // 清理只影响本地构建目录；部署端仍需保留供旧页面读取的历史版本。
  fs.rmSync(target, { recursive: true, force: true })
  for (const file of notices) result.outputFiles.push({ path: path.join(root, 'dist/source/licenses/dragonfly', file), contents: fs.readFileSync(path.join(root, file)) })
  for (const file of result.outputFiles) {
    fs.mkdirSync(path.dirname(file.path), { recursive: true })
    fs.writeFileSync(file.path, file.contents)
    manifest.files.push({ path: route(file.path), bytes: file.contents.length, sha256: digest(file.contents) })
  }
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true })
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  return manifest
}
module.exports = { build }
if (require.main === module) {
  const manifest = build({ development: process.argv.includes('--development') })
  console.log(`Built ${manifest.mode}: ${manifest.files.length} files, ${manifest.files.reduce((sum, file) => sum + file.bytes, 0)} bytes including source maps`)
}
