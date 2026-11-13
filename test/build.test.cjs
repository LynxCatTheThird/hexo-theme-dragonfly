const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { spawnSync } = require('node:child_process')
const { build } = require('../tools/build.cjs')
const root = path.resolve(__dirname, '..')

test('production and development builds include every module dependency and source map', () => {
  for (const development of [false, true]) {
    const manifest = build({ development })
    const files = new Set(manifest.files.map(file => file.path))
    for (const entry of Object.values(manifest.entries)) assert.ok(files.has(entry), entry)
    for (const [entry, imports] of Object.entries(manifest.imports)) {
      for (const dependency of imports) assert.ok(files.has(dependency.path), `${entry} -> ${dependency.path}`)
    }
    for (const file of manifest.files) {
      assert.ok(fs.existsSync(path.join(root, 'dist/source', file.path)))
      if (file.path.endsWith('.js')) assert.ok(files.has(file.path + '.map'))
    }
    assert.ok([...files].some(file => /chunks\/article-/.test(file)))
    assert.ok([...files].some(file => /chunks\/gallery-/.test(file)))
    assert.deepEqual(manifest.imports[manifest.entries.utils], [])
  }
})

test('consumer package contains the complete production graph and no test output', () => {
  const manifest = build()
  const cache = fs.mkdtempSync(path.join(os.tmpdir(), 'dragonfly-pack-'))
  let files
  try {
    const result = spawnSync('npm', ['pack', '--ignore-scripts', '--pack-destination', cache], { cwd: root, env: { ...process.env, npm_config_cache: path.join(cache, 'cache') }, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 })
    assert.equal(result.status, 0, result.stderr + result.stdout)
    const archive = fs.readdirSync(cache).find(file => file.endsWith('.tgz'))
    assert.ok(archive, 'npm pack must produce a consumer archive')
    const listing = spawnSync('tar', ['-tzf', path.join(cache, archive)], { encoding: 'utf8' })
    assert.equal(listing.status, 0, listing.stderr)
    files = new Set(listing.stdout.trim().split('\n').map(file => file.replace(/^package\//, '')))
  } finally { fs.rmSync(cache, { recursive: true, force: true }) }
  for (const file of manifest.files) assert.ok(files.has('dist/source/' + file.path), file.path)
  assert.ok(files.has('tools/build.cjs'))
  assert.ok(files.has('browser/main.js'))
  assert.ok(![...files].some(file => /^(test\/|\.github\/)|package-lock\.json$|\.tgz$|\/development\//.test(file)))
})
