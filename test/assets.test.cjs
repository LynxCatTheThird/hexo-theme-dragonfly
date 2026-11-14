// SPDX-License-Identifier: Apache-2.0
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { url_for } = require('hexo-util')
const { resolveAssets, internalAssets, preconnect, providers } = require('../scripts/common/assets')
const thirdParty = { demo: { name: '@scope/demo', version: '2.3.4', file: 'dist/main.js', other_name: 'demo' } }
const custom = 'https://registry.npmmirror.com/${name}/${version}/files/${file}'

test('provider URLs preserve root, version and per-asset overrides', () => {
  for (const root of ['/', '/blog/']) for (const version of [false, true]) {
    for (const provider of providers) {
      const assets = resolveAssets({ third_party_provider: provider, version, custom_format: custom }, thirdParty)
      const url = value => url_for.call({ config: { url: 'https://site.test', root } }, value)
      assert.equal(url(assets.main), `${root}js/main.js${version ? '?v=' + internalAssets.main.version : ''}`)
      const expected = {
        local: `${root}pluginsSrc/@scope/demo/dist/main.js${version ? '?v=2.3.4' : ''}`,
        jsdelivr: `https://cdn.jsdelivr.net/npm/@scope/demo${version ? '@2.3.4' : ''}/dist/main.min.js`,
        unpkg: `https://unpkg.com/@scope/demo${version ? '@2.3.4' : ''}/dist/main.js`,
        cdnjs: 'https://cdnjs.cloudflare.com/ajax/libs/demo/2.3.4/main.min.js',
        npmmirror: 'https://registry.npmmirror.com/@scope/demo/2.3.4/files/dist/main.js',
        zstatic: 'https://s4.zstatic.net/ajax/libs/demo/2.3.4/main.min.js',
        custom: 'https://registry.npmmirror.com/@scope/demo/2.3.4/files/dist/main.js'
      }
      assert.equal(url(assets.demo), expected[provider])
      assert.equal(resolveAssets({ third_party_provider: provider, custom_format: custom, option: { demo: '/own/demo.js' } }, thirdParty).demo, '/own/demo.js')
    }
  }
})

test('internal assets have a separate identity and development always uses local files', () => {
  const config = { internal_provider: 'custom', custom_format: custom, internal_custom_format: 'https://assets.test/${name}/${version}/${file}' }
  const assets = resolveAssets(config, thirdParty)
  assert.match(assets.main, /^https:\/\/assets.test\/hexo-theme-dragonfly\//)
  assert.match(assets.main_css, /^css\/index.css/)
  assert.match(assets.demo, /^https:\/\/cdn.jsdelivr.net\//)
  const dev = resolveAssets({ ...config, development: true, option: { main: 'https://override.test/main.js' } }, thirdParty)
  assert.match(dev.main, /^js\/main.js/)
  assert.match(resolveAssets({ ...config, option: { main_css: 'https://assets.test/site.css' } }, thirdParty).main_css, /^https:/)
  for (const provider of ['npmmirror', 'zstatic']) {
    assert.throws(() => resolveAssets({ internal_provider: provider }, thirdParty), /CDN.internal_provider/)
  }
})

test('内置 npmmirror 和 zstatic 保留版本路径并遵循资源别名与覆盖', () => {
  const components = {
    css: { name: '@scope/css', other_name: 'css-alias', version: '1.2.3', file: 'dist/style.min.css' },
    special: { name: 'special', version: '3.2.1', file: 'dist/bundle.js', cdnjs_file: 'runtime/bundle.js' },
    unavailable: { name: '@scope/private', version: '2.0.0', file: 'dist/index.umd.js', cdnjs: false }
  }
  for (const version of [true, false]) {
    const mirror = resolveAssets({ third_party_provider: 'npmmirror', version }, components)
    assert.equal(mirror.css, 'https://registry.npmmirror.com/@scope/css/1.2.3/files/dist/style.min.css')
    assert.equal(mirror.unavailable, 'https://registry.npmmirror.com/@scope/private/2.0.0/files/dist/index.umd.js')
    const zstatic = resolveAssets({ third_party_provider: 'zstatic', version }, components)
    assert.equal(zstatic.css, 'https://s4.zstatic.net/ajax/libs/css-alias/1.2.3/style.min.css')
    assert.equal(zstatic.special, 'https://s4.zstatic.net/ajax/libs/special/3.2.1/runtime/bundle.min.js')
    assert.equal(zstatic.unavailable, `https://unpkg.com/@scope/private${version ? '@2.0.0' : ''}/dist/index.umd.js`)
    assert.equal(resolveAssets({ third_party_provider: 'zstatic', version, option: { unavailable: '/own/index.js' } }, components).unavailable, '/own/index.js')
  }
})

test('invalid providers, URLs, placeholders and overrides fail with the configuration key', () => {
  for (const [config, message] of [
    [{ third_party_provider: 'typo' }, /third_party_provider/],
    [{ internal_provider: 'jsdelivr' }, /this fork/],
    [{ third_party_provider: 'custom' }, /custom_format/],
    [{ third_party_provider: 'custom', custom_format: 'https://assets.test/${path}' }, /placeholder path/],
    [{ option: { absent: '/bad' } }, /option.absent/],
    [{ option: { demo: '' } }, /option.demo/],
    [{ option: { demo: 'javascript:alert(1)' } }, /option.demo/],
    [{ option: { main: 'https://unpkg.com/hexo-theme-butterfly/source/js/main.js' } }, /Dragonfly/]
  ]) assert.throws(() => resolveAssets(config, thirdParty), message)
})

test('cdnjs metadata preserves package aliases and explicitly falls back for unsupported packages', () => {
  const fs = require('node:fs')
  const path = require('node:path')
  const { load: loadYAML } = require('js-yaml')
  const plugins = loadYAML(fs.readFileSync(path.join(__dirname, '../plugins.yml'), 'utf8'))
  const assets = resolveAssets({ third_party_provider: 'cdnjs' }, plugins)
  assert.equal(assets.chartjs, `https://cdnjs.cloudflare.com/ajax/libs/Chart.js/${plugins.chartjs.version}/chart.umd.min.js`)
  assert.equal(assets.swup_head, `https://unpkg.com/@swup/head-plugin@${plugins.swup_head.version}/dist/index.umd.js`)
  const mirror = resolveAssets({ third_party_provider: 'npmmirror' }, plugins)
  assert.equal(mirror.swup, `https://registry.npmmirror.com/swup/${plugins.swup.version}/files/dist/Swup.umd.js`)
  const zstatic = resolveAssets({ third_party_provider: 'zstatic' }, plugins)
  assert.equal(zstatic.swup, `https://s4.zstatic.net/ajax/libs/swup/${plugins.swup.version}/Swup.umd.min.js`)
  assert.equal(zstatic.fontawesome, `https://s4.zstatic.net/ajax/libs/font-awesome/${plugins.fontawesome.version}/css/all.min.css`)
  assert.equal(zstatic.swup_head, assets.swup_head)
  const example = fs.readFileSync(path.join(__dirname, '../_config.yml'), 'utf8').match(/# 示例：(https:\/\/registry\.npmmirror[^\r\n]+)/)[1]
  assert.equal(resolveAssets({ third_party_provider: 'custom', custom_format: example }, plugins).katex, `https://registry.npmmirror.com/katex/${plugins.katex.version}/files/dist/katex.min.css`)
})

test('preconnect follows used resolved URLs and deduplicates origins', () => {
  const html = '<script src="https://override.test/main.js"></script><link href="https://override.test/a.css"><link href="https://font.test/font.css">'
  assert.equal(preconnect(html, ['https://unused.test/a.js', 'https://override.test/main.js', 'https://override.test/a.css', 'https://font.test/font.css', '/local.css']), '<link rel="preconnect" href="https://override.test" crossorigin><link rel="preconnect" href="https://font.test" crossorigin>')
  assert.equal(preconnect(html, ['https://override.test/main.js'], 'https://override.test/blog'), '')
  assert.equal(preconnect('<script src="https://query.test/a.js?a=1&amp;b=2"></script>', ['https://query.test/a.js?a=1&b=2']), '<link rel="preconnect" href="https://query.test" crossorigin>')
})
