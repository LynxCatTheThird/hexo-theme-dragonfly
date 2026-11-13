// Independent theme consumer; all generated files stay outside the checkout.
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const theme = path.resolve(__dirname, '..')
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'dragonfly-test-'))
const base = require('./site/config.cjs')
const sitePackage = require('./site/package.json')
const components = {
  navigation: { enable: true, cache: true, preload: true, exclude: ['/policy/'] },
  visitor_counter: { site_uv: true, site_pv: true, page_pv: true, element_id: { site_uv: 'custom-uv', site_pv: 'custom-site-pv', page_pv: 'custom-page-pv' }, element_class: { site_uv: 'custom-count', site_pv: 'custom-count', page_pv: 'custom-count' } },
  darkmode: { enable: true, button: true },
  structured_data: { enable: true },
  search: { use: 'local_search' },
  lightbox: 'fancybox', lightbox_options: { dragToClose: false },
  echarts: { enable: true, height: 320, init_options: { renderer: 'svg' } },
  chartjs: { enable: true, options: { animation: false } },
  mermaid: { enable: true, options: { fontFamily: 'monospace' } },
  math: { use: 'katex', per_page: true, mathjax: { mhchem: true, tex: { macros: { AuditSymbol: '\\mathbf{X}' } } }, katex: { copy_tex: true, mhchem: true, options: { macros: { '\\AuditSymbol': '\\mathbf{X}' } } } }
}
const run = (args, site, env = {}) => {
  const result = spawnSync(process.execPath, args, { cwd: site, env: { ...process.env, ...env }, encoding: 'utf8', timeout: 180000 })
  process.stdout.write(result.stdout || '')
  process.stderr.write(result.stderr || '')
  if (result.status !== 0 || /^ERROR\b/m.test((result.stdout || '') + (result.stderr || ''))) throw result.error || new Error(`Test failed in ${site}: ${result.status}`)
}
try {
  for (const variant of ['default', 'components', 'subpath', 'navigation-off', 'cdn-modules', 'development']) {
    if (process.env.TEST_VARIANT && process.env.TEST_VARIANT !== variant) continue
    const site = path.join(temp, variant)
    fs.mkdirSync(path.join(site, 'source/_posts'), { recursive: true })
    fs.mkdirSync(path.join(site, 'themes'), { recursive: true })
    fs.symlinkSync(theme, path.join(site, 'themes/butterfly'), 'dir')
    fs.symlinkSync(path.join(theme, 'node_modules'), path.join(site, 'node_modules'), 'dir')
    fs.writeFileSync(path.join(site, 'package.json'), JSON.stringify(sitePackage))
    const config = structuredClone(base)
    const basic = ['default', 'development'].includes(variant)
    if (!basic) Object.assign(config.theme_config, structuredClone(components))
    if (variant === 'subpath') {
      config.root = '/blog/'
      config.url += '/blog'
      config.theme_config.CDN = { internal_provider: 'local', third_party_provider: 'custom', custom_format: 'https://registry.npmmirror.com/${name}/${version}/files/${file}' }
    }
    if (variant === 'navigation-off') {
      config.theme_config.navigation.enable = false
      config.theme_config.CDN = { internal_provider: 'local', third_party_provider: 'local' }
    }
    if (variant === 'cdn-modules' || variant === 'development') {
      config.theme_config.CDN.internal_provider = 'custom'
      config.theme_config.CDN.internal_custom_format = 'https://dragonfly-assets.test/${file}'
      config.theme_config.CDN.development = variant === 'development'
    }
    if (process.env.TEST_PROVIDER) config.theme_config.CDN.third_party_provider = process.env.TEST_PROVIDER
    fs.writeFileSync(path.join(site, '_config.yml'), JSON.stringify(config))
    for (const slug of ['tags', 'about', 'policy']) {
      fs.mkdirSync(path.join(site, 'source', slug), { recursive: true })
      fs.writeFileSync(path.join(site, 'source', slug, 'index.md'), `---\ntitle: ${slug}\n---\nTest ${slug} page.`)
    }
    fs.mkdirSync(path.join(site, 'source/script-contract'), { recursive: true })
    fs.writeFileSync(path.join(site, 'source/script-contract/index.md'), `---
title: Script contract
comments: false
---
<div id="script-contract">Script fixture</div>
<script>window.__unmarkedRuns = (window.__unmarkedRuns || 0) + 1</script>
<script data-swup-reload-script>window.__markedRuns = (window.__markedRuns || 0) + 1; window.__scriptOrder = []</script>
<script data-swup-reload-script src="${config.root}contract-classic.js"></script>
<script data-swup-reload-script>window.__scriptOrder.push('inline')</script>
<script data-swup-reload-script async src="${config.root}contract-async.js"></script>
<script data-swup-reload-script type="module" src="${config.root}contract-module.js"></script>
<script type="application/json" id="contract-data">{"value":1}</script>
`)
    fs.writeFileSync(path.join(site, 'source/contract-classic.js'), "window.__classicRuns = (window.__classicRuns || 0) + 1; window.__scriptOrder.push('classic')")
    fs.writeFileSync(path.join(site, 'source/contract-async.js'), 'window.__asyncRuns = (window.__asyncRuns || 0) + 1')
    fs.writeFileSync(path.join(site, 'source/contract-module.js'), `window.__moduleRuns = (window.__moduleRuns || 0) + 1
const mount = () => { if (document.getElementById('script-contract')) window.__moduleMounts = (window.__moduleMounts || 0) + 1 }
btf.addGlobalFn('pageLoad', mount, 'contractModule')
if (document.readyState !== 'complete') document.addEventListener('DOMContentLoaded', mount, { once: true })
`)
    // Home stays tall enough to exercise scroll restoration without personal posts.
    for (let i = 0; i < 8; i++) fs.writeFileSync(path.join(site, 'source/_posts', `post-${i}.md`), `---\ntitle: Post ${i}\ndate: 2025-01-01\n---\nTest post ${i}.`)
    const fixture = fs.readFileSync(path.join(__dirname, 'fixtures/components.md'), 'utf8')
    for (const engine of basic ? [] : ['katex', 'mathjax']) for (const encrypted of [false, true]) {
      const slug = `${engine === 'katex' ? 'component-test' : 'ssr-mathjax'}-${encrypted ? 'private' : 'public'}`
      let content = fixture.replace(/^abbrlink:.*$/m, `slug: ${slug}\nmath: ${engine}`)
        .replace(/^title:.*$/m, `title: ${engine === 'mathjax' ? 'Server MathJax ' + (encrypted ? 'private' : 'public') : encrypted ? 'Component integration test' : 'Public Component integration test <T>'}`)
      if (!encrypted) content = content.replace(/^password:.*\n/m, '')
      if (engine === 'mathjax') content += fs.readFileSync(path.join(__dirname, 'fixtures/math-layout.md'), 'utf8')
      fs.writeFileSync(path.join(site, 'source/_posts', slug + '.md'), content)
    }
    console.log('Testing:', variant)
    run([require.resolve('hexo/bin/hexo'), 'generate'], site)
    run([path.join(__dirname, basic || variant === 'navigation-off' ? 'smoke.cjs' : 'browser.cjs'), path.join(site, 'public')], site, {
      TEST_ROOT: config.root, TEST_VARIANT: variant, MOCK_VISITOR_COUNTER: '1', TEST_MATHJAX: '1'
    })
  }
} finally {
  if (process.env.TEST_KEEP_OUTPUT) console.log('Test output:', temp)
  else fs.rmSync(temp, { recursive: true, force: true })
}
