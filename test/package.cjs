// Exercise the actual tarball in a consumer with its own production dependencies.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const crypto = require('node:crypto')
const { execFileSync } = require('node:child_process')
const root = path.resolve(__dirname, '..')
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'dragonfly-consumer-'))
const run = (command, args, cwd = temp) => execFileSync(command, args, { cwd, encoding: 'utf8', timeout: 300000, stdio: ['ignore', 'pipe', 'pipe'] })
try {
  let archive = process.argv[2] && path.resolve(process.argv[2])
  if (!archive) {
    require('../tools/build.cjs').build()
    archive = path.join(temp, Object.values(JSON.parse(run('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', temp], root)))[0].filename)
  }
  const listing = run('tar', ['-tzf', archive]).trim().split('\n')
  assert.ok(!listing.some(file => /^package\/(?:test|\.github)\/|package-lock\.json$|\/development\/|dist\/release\//.test(file)))
  fs.writeFileSync(path.join(temp, 'package.json'), JSON.stringify({ name: 'dragonfly-package-test', version: '1.0.0', private: true, hexo: { version: '8.1.2' }, dependencies: { hexo: require('../package.json').devDependencies.hexo, 'hexo-generator-index': '^4.0.0', 'hexo-theme-dragonfly': `file:${archive}` } }))
  run('npm', ['install', '--omit=dev', '--no-package-lock', '--ignore-scripts', '--no-audit', '--no-fund'])
  const theme = path.join(temp, 'node_modules/hexo-theme-dragonfly')
  assert.equal(require(path.join(theme, 'package.json')).name, 'hexo-theme-dragonfly')
  const manifest = JSON.parse(fs.readFileSync(path.join(theme, 'dist/manifest-production.json')))
  for (const file of manifest.files) {
    const bytes = fs.readFileSync(path.join(theme, 'dist/source', file.path))
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), file.sha256, file.path)
  }
  for (const imports of Object.values(manifest.imports)) for (const item of imports) assert.ok(manifest.files.some(file => file.path === item.path))
  fs.mkdirSync(path.join(temp, 'source/_posts'), { recursive: true })
  fs.writeFileSync(path.join(temp, 'source/_posts/consumer.md'), '---\ntitle: Consumer\ndate: 2024-01-01\nmath: katex\n---\nFormula $x^2$\n\n<img src="/img/example.png" width="80" height="40">\n')
  fs.writeFileSync(path.join(temp, '_config.yml'), JSON.stringify({ title: 'Consumer', url: 'https://example.test/blog', root: '/blog/', theme: 'dragonfly', permalink: ':title/', theme_config: { math: { use: 'katex' }, CDN: { internal_provider: 'local' } } }))
  const output = run(process.execPath, [path.join(temp, 'node_modules/hexo/bin/hexo'), 'generate'])
  assert.ok(!/^ERROR\b/m.test(output), output)
  const html = fs.readFileSync(path.join(temp, 'public/consumer/index.html'), 'utf8')
  assert.match(html, /katex-html/)
  assert.match(html, /src="\/blog\/img\/example.png"/)
  assert.match(html, /loading="lazy"/)
  const after = JSON.parse(fs.readFileSync(path.join(theme, 'dist/manifest-production.json')))
  assert.equal(after.sourceHash, manifest.sourceHash, 'Installed consumer must reuse the packed build')
  for (const file of manifest.files) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(temp, 'public', file.path))).digest('hex'), file.sha256)
  console.log('PASS: clean production-only tarball consumer, subpath, KaTeX, native images and identical complete assets')
} catch (error) {
  console.error(error.stdout?.toString() || '', error.stderr?.toString() || '')
  throw error
} finally { fs.rmSync(temp, { recursive: true, force: true }) }
