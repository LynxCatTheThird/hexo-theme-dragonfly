// SPDX-License-Identifier: Apache-2.0
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
// 使用独立测试站点，生成文件写入临时目录。
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
  for (const variant of ['default', 'components', 'subpath', 'navigation-off', 'cdn-modules', 'development', 'algolia', 'legacy-images', 'npmmirror', 'zstatic']) {
    if (process.env.TEST_VARIANT && process.env.TEST_VARIANT !== variant) continue
    const site = path.join(temp, variant)
    fs.mkdirSync(path.join(site, 'source/_posts'), { recursive: true })
    fs.mkdirSync(path.join(site, 'themes'), { recursive: true })
    fs.symlinkSync(theme, path.join(site, 'themes/dragonfly'), 'dir')
    fs.symlinkSync(path.join(theme, 'node_modules'), path.join(site, 'node_modules'), 'dir')
    fs.writeFileSync(path.join(site, 'package.json'), JSON.stringify(sitePackage))
    const config = structuredClone(base)
    const basic = ['default', 'development', 'algolia', 'legacy-images'].includes(variant)
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
    if (variant === 'algolia') {
      config.algolia = { appId: 'TESTAPP', apiKey: 'test-only-key', indexName: 'fixture' }
      config.theme_config.search = { use: 'algolia_search' }
      config.theme_config.navigation = { enable: true }
    }
    if (variant === 'legacy-images') config.theme_config.lazyload = { enable: true, native: false, field: 'post' }
    if (['npmmirror', 'zstatic'].includes(variant)) {
      config.root = '/blog/'
      config.url += '/blog'
      config.theme_config.CDN = { internal_provider: 'local', third_party_provider: variant }
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
dragonfly.addGlobalFn('pageLoad', mount, 'contractModule')
if (document.readyState !== 'complete') document.addEventListener('DOMContentLoaded', mount, { once: true })
`)
    fs.mkdirSync(path.join(site, 'source/gallery'), { recursive: true })
    fs.writeFileSync(path.join(site, 'source/gallery/index.md'), `---
title: Gallery
comments: false
---
{% gallery true,1,1 %}
![First](${config.root}img/favicon.ico)
![Second](${config.root}img/favicon.ico)
{% endgallery %}
{% gallery url,/gallery-data.json,true %}{% endgallery %}
`)
    fs.writeFileSync(path.join(site, 'source/gallery-data.json'), JSON.stringify([{ url: config.root + 'img/favicon.ico', alt: 'Remote gallery' }]))
    for (const [slug, type, setting, dataFile] of [['notes', 'shuoshuo', 'shuoshuo_url', 'notes-data.json'], ['links', 'link', 'flink_url', 'links-data.json']]) {
      fs.mkdirSync(path.join(site, 'source', slug), { recursive: true })
      fs.writeFileSync(path.join(site, 'source', slug, 'index.md'), `---\ntitle: ${slug}\ntype: ${type}\ncomments: false\n${setting}: /${dataFile}\n---\n`)
    }
    fs.writeFileSync(path.join(site, 'source/notes-data.json'), JSON.stringify(Array.from({ length: 10 }, (_, index) => ({ date: '2026-01-01T12:00:00Z', author: 'Test author', content: `<p>Note ${index}</p>`, tags: ['test'] }))))
    fs.writeFileSync(path.join(site, 'source/links-data.json'), JSON.stringify([{ class_name: 'Test links', class_desc: 'Fixture', link_list: [{ name: 'Example', link: 'https://example.test/', avatar: config.root + 'img/favicon.ico', descr: 'Test link' }] }]))
    fs.mkdirSync(path.join(site, 'source/img'), { recursive: true })
    for (const scale of [1, 2]) fs.writeFileSync(path.join(site, 'source/img', `fixture${scale === 2 ? '-2x' : ''}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" width="${80 * scale}" height="${40 * scale}"><rect width="100%" height="100%" fill="#368a67"/></svg>`)
    for (const encrypted of [false, true]) fs.writeFileSync(path.join(site, 'source/_posts', `image-test-${encrypted ? 'private' : 'public'}.md`), `---
title: Image test ${encrypted ? 'private' : 'public'}
date: 2024-01-01
slug: image-test-${encrypted ? 'private' : 'public'}
comments: false
${encrypted ? 'password: component-test-only\nautoSave: false\n' : ''}---
<img id="critical-image" src="/img/fixture.svg" width="80" height="40" fetchpriority="high" alt="Critical image">
<picture><source srcset="/img/fixture.svg 1x, /img/fixture-2x.svg 2x"><img id="responsive-image" src="/img/fixture.svg" srcset="/img/fixture.svg 1x, /img/fixture-2x.svg 2x" sizes="80px" width="80" height="40" alt="Responsive image"></picture>
<img id="ordinary-image" src="/img/fixture.svg" width="80" height="40" alt="Ordinary image">
`)
    // 通过固定夹具保持页面高度，验证滚动位置恢复。
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
