// Run against a generated Hexo site: npm run test:browser -- /path/to/public
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
const { chromium } = require('playwright')

if (!process.argv[2]) throw new Error('Pass the generated site directory')
const root = path.resolve(process.argv[2])
const mount = process.env.TEST_ROOT || '/'
const withRoot = value => mount === '/' || value.startsWith(mount) ? value : mount + value.replace(/^\//, '')
const htmlFiles = fs.readdirSync(root, { recursive: true }).filter(f => f.endsWith('.html'))
const chartFile = htmlFiles.find(f => /class=["']echarts-container/.test(fs.readFileSync(path.join(root, f), 'utf8')))
assert.ok(chartFile, 'Include at least one article with an ECharts block')
const chartPath = withRoot('/' + chartFile.replace(/index\.html$/, '').split(path.sep).join('/'))
const forbidden = /copy-tex|\/pjax\/|instant\.page|busuanzi|googletagmanager|google-analytics|cloudflareinsights|hm\.baidu\.com|clarity\.ms|pagead2\.googlesyndication|addtoany|social-share|chatra\.io|tidio\.co|client\.crisp\.chat|trtc\.io\/knocket/
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.xml': 'application/xml', '.json': 'application/json', '.woff2': 'font/woff2' }
const mathTheme = structuredClone(require('../scripts/common/default_config'))
mathTheme.navigation.enable = true
mathTheme.asset = { mathjax: 'https://registry.npmmirror.com/mathjax/4.1.3/files/tex-mml-chtml.js' }
mathTheme.math.mathjax.mhchem = true
mathTheme.math.mathjax.tex = { macros: { Probe: '\\mathbb{R}' } }
let headHelper
require('node:vm').runInNewContext(fs.readFileSync(path.join(__dirname, '../scripts/helpers/inject_head_js.js'), 'utf8'), {
  hexo: { theme: { config: mathTheme }, extend: { helper: { register: (_, fn) => { headHelper = fn } } } }
})
const longClientMath = '<script type="math/tex">' + Array.from({ length: 35 }, (_, i) => `x_{${i}}`).join(' + ') + '</script>'
const clientBlocks = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map(tag => `<${tag}>Formula ${longClientMath}</${tag}>`).join('') + `<ul><li>${longClientMath}</li></ul><div class="note"><p>${longClientMath}</p></div><div class="table-wrap"><table><tr><td>${longClientMath}</td></tr></table></div>`
const mathFixture = '<html><head><meta name="theme-color" content="#fff"><link rel="stylesheet" href="' + withRoot('/css/index.css') + '">' + headHelper.call({ theme: mathTheme }) + '</head><body><div id="article-container"><script type="math/tex; mode=display">\\Probe + x^2 + \\ce{H2O}</script>' + clientBlocks + '</div>' + require('pug').renderFile(path.join(__dirname, '../layout/includes/third-party/math/mathjax.pug'), { theme: mathTheme, url_for: v => v }) + '</body></html>'
const server = http.createServer((req, res) => {
  if (req.url === withRoot('/__mathjax_test__/')) { res.setHeader('Content-Type', 'text/html'); res.end(mathFixture); return }
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
  if (!pathname.startsWith(mount)) { res.writeHead(404).end(); return }
  let file = path.join(root, pathname.slice(mount.length))
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return }
  try {
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream')
    res.end(fs.readFileSync(file))
  } catch { res.writeHead(404).end(fs.readFileSync(path.join(root, '404.html'))) }
})

;(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${server.address().port}`
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined })
  try {
    const nojs = await browser.newContext({ javaScriptEnabled: false })
    await require('./vendors.cjs')(nojs)
    for (const engine of ['katex', 'mathjax']) {
      const file = engine === 'katex' ? chartFile : htmlFiles.find(file => file.startsWith('article/ssr-mathjax-public'))
      assert.ok(file, `Missing public ${engine} fixture`)
      const staticPage = await nojs.newPage()
      await staticPage.route('**/*', route => route.request().resourceType() === 'image' ? route.abort() : route.fallback())
      const requests = []
      staticPage.on('request', request => requests.push(request.url()))
      await staticPage.goto(origin + withRoot('/' + file), { waitUntil: 'networkidle' })
      for (const width of [1280, 390]) {
        await staticPage.setViewportSize({ width, height: 900 })
        const formula = staticPage.locator(engine === 'katex' ? '#article-container .katex-html' : '#article-container mjx-container svg').first()
        assert.ok(await formula.isVisible(), `${engine} must be visible without JavaScript`)
        if (engine === 'katex') {
          assert.match(await formula.evaluate(el => getComputedStyle(el.parentElement).fontFamily), /KaTeX/)
        } else {
          const overflow = await staticPage.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, blocks: [...document.querySelectorAll('#article-container, #article-container > *')].map(el => ({ tag: el.tagName, cls: el.className, width: el.clientWidth, scroll: el.scrollWidth, overflow: getComputedStyle(el).overflowX })) }))
          assert.ok(overflow.scroll <= width + 1, 'Long formulas must not widen the page: ' + JSON.stringify(overflow))
          for (const tag of ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', '.note p', 'td']) {
            const math = staticPage.locator(`#article-container ${tag} mjx-container:not([display])`).last()
            assert.equal(await math.evaluate(el => getComputedStyle(el).display), 'inline')
            assert.equal(await math.evaluate(el => getComputedStyle(el).whiteSpace), 'nowrap')
            assert.ok((await math.boundingBox()).height < 100, `${tag} formula must stay on one line`)
          }
          assert.equal(await staticPage.locator('#article-container li:has(mjx-container)').last().evaluate(el => getComputedStyle(el).listStylePosition), 'inside')
          assert.ok(await staticPage.locator('#article-container code').filter({ hasText: '$literal$' }).count())
        }
        if (process.env.TEST_SCREENSHOTS) {
          fs.mkdirSync(process.env.TEST_SCREENSHOTS, { recursive: true })
          await staticPage.screenshot({ fullPage: true, path: path.join(process.env.TEST_SCREENSHOTS, `${engine}-nojs-${width}.png`) })
        }
      }
      assert.ok(!requests.some(url => /\/(mathjax|katex)\/.*\.js/.test(url)), 'SSR must not download a math runtime')
      await staticPage.close()
    }
    await nojs.close()
    console.log('PASS: KaTeX and MathJax visible without JavaScript at desktop and mobile widths')
    const context = await browser.newContext()
    await context.addInitScript(root => { window.__testRoot = root }, mount)
    await require('./vendors.cjs')(context)
    let counterCalls = 0
    if (process.env.MOCK_VISITOR_COUNTER) {
      await context.route('https://events.vercount.one/**', route => {
        const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'POST, OPTIONS' }
        if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
        counterCalls++
        return route.fulfill({ headers, contentType: 'application/json', body: JSON.stringify({ status: 'success', data: { site_uv: 77, site_pv: 100, page_pv: 19 } }) })
      })
    }
    const page = await context.newPage()
    const errors = [], forbiddenRequests = []
    let chartRequests = 0
    const moduleRequests = new Map()
    page.on('pageerror', e => errors.push(e.message))
    page.on('request', r => {
      if (forbidden.test(r.url())) forbiddenRequests.push(r.url())
      if (/\/echarts(?:\/|@)/.test(r.url())) chartRequests++
      if (/\/js\/build\/.*\.js(?:\?|$)/.test(r.url())) moduleRequests.set(r.url(), (moduleRequests.get(r.url()) || 0) + 1)
    })
    await page.route('**/*', r => r.request().resourceType() === 'image' ? r.abort() : r.fallback())
    await page.addInitScript(() => {
      window.__resizeListeners = new Set()
      const listeners = new Set(), observers = new Set()
      const add = EventTarget.prototype.addEventListener, remove = EventTarget.prototype.removeEventListener
      const capture = options => typeof options === 'boolean' ? options : !!options?.capture
      const forget = (target, type, fn, options) => {
        for (const record of listeners) if (record.target === target && record.type === type && record.fn === fn && record.capture === capture(options)) listeners.delete(record)
        if (target === window && type === 'resize') window.__resizeListeners.delete(fn)
      }
      EventTarget.prototype.addEventListener = function (type, fn, options) {
        if ((this === window || this === document) && !options?.once && !options?.signal?.aborted) {
          if (![...listeners].some(record => record.target === this && record.type === type && record.fn === fn && record.capture === capture(options))) listeners.add({ target: this, type, fn, capture: capture(options) })
          if (this === window && type === 'resize') window.__resizeListeners.add(fn)
          if (options?.signal) add.call(options.signal, 'abort', () => forget(this, type, fn, options), { once: true })
        }
        return add.call(this, type, fn, options)
      }
      EventTarget.prototype.removeEventListener = function (type, fn, options) {
        forget(this, type, fn, options)
        return remove.call(this, type, fn, options)
      }
      for (const name of ['ResizeObserver', 'IntersectionObserver', 'MutationObserver']) {
        const Native = window[name]
        if (!Native) continue
        window[name] = class extends Native {
          constructor (...args) { super(...args); this.targets = new Set() }
          observe (target, ...args) { this.targets.add(target); observers.add(this); return super.observe(target, ...args) }
          unobserve (target) { this.targets.delete(target); if (!this.targets.size) observers.delete(this); return super.unobserve(target) }
          disconnect () { this.targets.clear(); observers.delete(this); return super.disconnect() }
        }
      }
      window.__lifecycleStats = () => ({ listeners: listeners.size, observers: observers.size, charts: Object.keys(window.Chart?.instances || {}).length })
    })
    const go = async pathname => {
      await page.evaluate(p => new Promise(resolve => {
        document.addEventListener('theme:page-load', resolve, { once: true })
        swup.navigate(p)
      }), withRoot(pathname))
    }
    const ready = () => page.waitForFunction(() => {
      const els = [...document.querySelectorAll('.echarts-container')]
      return els.length > 0 && typeof window.echarts?.getInstanceByDom === 'function' && els.every(el => echarts.getInstanceByDom(el))
    })
    const checkCopy = async target => {
      const result = await target.evaluate(() => {
        const selection = getSelection()
        const formula = document.querySelector('#article-container .katex')
        const leaf = formula.querySelector('.katex-html .mord')?.firstChild
        const range = document.createRange()
        range.selectNodeContents(leaf || formula)
        selection.removeAllRanges()
        selection.addRange(range)
        const before = selection.toString()
        const copy = () => {
          const data = new DataTransfer()
          const event = new ClipboardEvent('copy', { clipboardData: data, bubbles: true, cancelable: true })
          document.body.dispatchEvent(event)
          return { text: data.getData('text/plain'), html: data.getData('text/html'), handled: event.defaultPrevented }
        }
        const original = { copyright: GLOBAL_CONFIG.copyright, tex: GLOBAL_CONFIG.copy.tex }
        GLOBAL_CONFIG.copyright = undefined
        const partial = copy()
        const unchangedSelection = selection.toString() === before
        range.selectNodeContents(document.getElementById('article-container'))
        selection.removeAllRanges()
        selection.addRange(range)
        const mixed = copy()
        GLOBAL_CONFIG.copyright = { limitCount: 0, languages: { author: 'COPY_AUTHOR', link: 'COPY_LINK ', source: 'COPY_SOURCE', info: 'COPY_INFO' } }
        const attributed = copy()
        GLOBAL_CONFIG.copyright = undefined
        GLOBAL_CONFIG.copy.tex = false
        const disabled = copy()
        GLOBAL_CONFIG.copy.tex = true
        selection.collapseToStart()
        const collapsed = copy()
        const input = document.createElement('textarea')
        input.value = 'editable text'
        document.body.append(input)
        input.select()
        const inputEvent = new ClipboardEvent('copy', { clipboardData: new DataTransfer(), bubbles: true, cancelable: true })
        input.dispatchEvent(inputEvent)
        input.remove()
        GLOBAL_CONFIG.copy.tex = original.tex
        GLOBAL_CONFIG.copyright = original.copyright
        selection.removeAllRanges()
        return { partial, unchangedSelection, mixed, attributed, disabled, collapsed, inputHandled: inputEvent.defaultPrevented }
      })
      assert.match(result.partial.text, /^\$\$.*\$\$$/s)
      assert.ok(result.partial.html.includes('katex'))
      assert.ok(result.unchangedSelection)
      assert.ok(result.mixed.text.includes('$x^2$'))
      assert.ok(result.mixed.text.includes('$\\ce{H2O}$'))
      assert.equal(result.attributed.text.split('COPY_AUTHOR').length - 1, 1)
      assert.ok(result.attributed.html.includes('COPY_AUTHOR'))
      assert.equal(result.disabled.handled, false)
      assert.equal(result.collapsed.handled, false)
      assert.equal(result.inputHandled, false)
    }
    const meta = () => page.evaluate(() => ({
      canonical: document.querySelector('link[rel=canonical]').href,
      description: document.querySelector('meta[name=description]')?.content,
      og: document.querySelector('meta[property="og:url"]')?.content,
      json: [...document.querySelectorAll('script[type="application/ld+json"]')].map(e => JSON.parse(e.textContent))
    }))
    await page.goto(origin + mount, { waitUntil: 'networkidle' })
    const connections = await page.locator('link[rel=preconnect]').evaluateAll(links => links.map(link => new URL(link.href).origin))
    assert.ok(connections.length > 0)
    assert.equal(new Set(connections).size, connections.length)
    assert.ok(await page.evaluate(origins => {
      const clone = document.documentElement.cloneNode(true)
      clone.querySelectorAll('link[rel=preconnect]').forEach(link => link.remove())
      return origins.every(origin => clone.outerHTML.includes(origin))
    }, connections), 'Preconnect origins must come from actual page references')
    await page.waitForFunction(() => typeof window.swup?.navigate === 'function')
    if (process.env.MOCK_VISITOR_COUNTER) {
      await page.waitForFunction(() => document.getElementById('custom-uv')?.textContent === '77' && document.getElementById('custom-site-pv')?.textContent === '100')
      assert.ok(await page.locator('#custom-uv').evaluate(el => el.classList.contains('custom-count')))
      assert.equal(counterCalls, 1)
    }
    const homeMeta = await meta()
    const baseline = await page.evaluate(() => window.__resizeListeners.size)
    assert.equal(chartRequests, 0, 'Home must not load the chart library')
    assert.ok(![...moduleRequests.keys()].some(url => /(?:article-|media-|gallery-|echarts_runtime-)/.test(url)), 'Home must not load article, media, gallery or chart modules')
    await go(chartPath)
    await ready()
    if (process.env.MOCK_VISITOR_COUNTER) {
      await page.waitForFunction(() => document.getElementById('custom-page-pv')?.textContent === '19')
      assert.equal(counterCalls, 2, 'One counter request per successful page navigation')
      console.log('PASS: Vercount API, custom IDs/classes and Swup counters (mocked API)')
    }
    if (process.env.MOCK_VISITOR_COUNTER) {
      const beforeMissing = counterCalls
      const countedMissing = page.waitForResponse(r => r.url().includes('/api/v2/log') && r.request().method() === 'POST')
      await go(withRoot('/__missing_audit_page__/'))
      await countedMissing
      await page.waitForTimeout(200)
      assert.equal(new URL(page.url()).pathname, withRoot('/__missing_audit_page__/'))
      assert.equal(counterCalls - beforeMissing, 1, `Failed navigation counter update; page errors: ${errors.join('; ')}`)
      await go(chartPath)
      await ready()
    }
    assert.deepEqual(errors, [])
    await checkCopy(page)
    console.log('PASS: built-in TeX copying, rich HTML, partial selection, chemistry, copyright and disabled states')
    const outerTabs = page.locator('#article-container > .tabs > .nav-tabs > button')
    await outerTabs.first().focus()
    await page.keyboard.press('ArrowRight')
    assert.equal(await outerTabs.nth(1).getAttribute('aria-selected'), 'true')
    assert.equal(await outerTabs.first().getAttribute('tabindex'), '-1')
    const nested = page.locator('.tab-item-content .tabs .nav-tabs > button')
    await nested.first().focus()
    await page.keyboard.press('End')
    assert.equal(await nested.nth(1).getAttribute('aria-selected'), 'true')
    assert.equal(await outerTabs.nth(1).getAttribute('aria-selected'), 'true')
    await outerTabs.nth(1).focus()
    await page.keyboard.press('Home')
    assert.equal(await outerTabs.first().getAttribute('aria-selected'), 'true')
    console.log('PASS: keyboard tabs, roving focus, ARIA state and nested isolation')
    const chartMeta = await meta()
    assert.ok(chartMeta.canonical.includes(chartPath))
    assert.equal(chartMeta.json[0]['@type'], 'BlogPosting')
    assert.notEqual(chartMeta.canonical, homeMeta.canonical)
    await page.evaluate(() => { window.__oldCharts = [...document.querySelectorAll('.echarts-container')].map(el => echarts.getInstanceByDom(el)) })
    await page.evaluate(() => window.scrollTo(0, 600))
    await page.locator('#rightside-config').click()
    await page.locator('#darkmode').click()
    await page.waitForFunction(() => window.__oldCharts.every(chart => chart.isDisposed()))
    await ready()
    await page.evaluate(() => { window.__oldCharts = [...document.querySelectorAll('.echarts-container')].map(el => echarts.getInstanceByDom(el)) })
    await go('/')
    assert.deepEqual(await meta(), homeMeta)
    assert.ok(await page.evaluate(() => window.__oldCharts.every(chart => chart.isDisposed())))
    await page.waitForLoadState('networkidle')
    const lifecycleBaseline = await page.evaluate(() => window.__lifecycleStats())
    for (let i = 0; i < 20; i++) { await go(chartPath); await ready(); await go('/') }
    assert.deepEqual(await page.evaluate(() => window.__lifecycleStats()), lifecycleBaseline, '20 round trips must not accumulate global listeners, observers or chart instances')
    console.log('PASS: 20 round trips return listeners, observers and charts to baseline')
    await go(chartPath); await ready(); await checkCopy(page); await go('/')
    assert.equal(await page.evaluate(() => window.__resizeListeners.size), baseline, 'Navigation must not accumulate resize listeners')
    assert.equal(chartRequests, 1, 'Only one download across page visits')
    assert.ok([...moduleRequests.values()].every(count => count === 1), 'Repeated navigation must reuse ESM modules')
    console.log(`PASS: ${moduleRequests.size} internal modules reused across navigation`)
    await page.evaluate(() => window.scrollTo(0, 500))
    const savedScroll = await page.evaluate(() => window.scrollY)
    await go('/tags/')
    await page.evaluate(() => new Promise(resolve => { document.addEventListener('theme:page-load', resolve, { once: true }); history.back() }))
    await page.waitForFunction(y => Math.abs(window.scrollY - y) < 3, savedScroll)
    assert.deepEqual(await meta(), homeMeta)
    await page.evaluate(() => new Promise(resolve => { document.addEventListener('theme:page-load', resolve, { once: true }); history.forward() }))
    assert.deepEqual((await meta()).json, [], 'Non-article pages must not retain old JSON-LD')
    await go(chartPath)
    await ready()
    await page.reload({ waitUntil: 'networkidle' })
    await ready()
    assert.deepEqual(await meta(), chartMeta, 'Swup metadata must match a direct page load')
    await page.evaluate(() => { window.__oldCharts = [...document.querySelectorAll('.echarts-container')].map(el => echarts.getInstanceByDom(el)) })
    await page.evaluate(() => window.dispatchEvent(new Event('hexo-blog-decrypt')))
    await ready()
    assert.ok(await page.evaluate(() => [...document.querySelectorAll('.echarts-container')].every((el, i) => echarts.getInstanceByDom(el) === window.__oldCharts[i])), 'Repeated init after decryption must reuse instances')
    assert.deepEqual(errors, [])
    assert.deepEqual(forbiddenRequests, [])
    console.log('PASS: first navigation, metadata, dark mode, disposal, repeated navigation, direct load, decryption init, removed integrations')

    // Pending and failed downloads must not render into a page that has been left.
    const race = await context.newPage()
    await race.route('**/*', r => r.request().resourceType() === 'image' ? r.abort() : r.fallback())
    let release
    const gate = new Promise(resolve => { release = resolve })
    await race.route(/\/echarts(?:\/|@)/, async r => { await gate; await r.fallback() })
    await race.goto(origin + mount, { waitUntil: 'networkidle' })
    const requested = race.waitForRequest(r => /\/echarts(?:\/|@)/.test(r.url()))
    await race.evaluate(p => swup.navigate(p), chartPath)
    await requested
    await race.evaluate(() => { window.__departedChart = document.querySelector('.echarts-container') })
    await race.evaluate(() => swup.navigate(window.__testRoot))
    await race.waitForURL(origin + mount)
    release()
    await race.waitForFunction(() => typeof window.echarts?.init === 'function')
    assert.ok(await race.evaluate(() => !echarts.getInstanceByDom(window.__departedChart)))
    assert.equal(await race.locator('canvas').count(), 0)
    await race.close()
    console.log('PASS: navigation cancels pending chart initialization')

    const retryPage = await context.newPage()
    await retryPage.route('**/*', r => r.request().resourceType() === 'image' ? r.abort() : r.fallback())
    let attempts = 0
    await retryPage.route(/\/echarts(?:\/|@)/, r => ++attempts === 1 ? r.abort() : r.fallback())
    await retryPage.goto(origin + chartPath, { waitUntil: 'networkidle' })
    await retryPage.locator('.echarts-error').first().click()
    await retryPage.waitForFunction(() => [...document.querySelectorAll('.echarts-container')].every(el => typeof window.echarts?.getInstanceByDom === 'function' && echarts.getInstanceByDom(el)))
    assert.equal(attempts, 2)
    await retryPage.close()
    console.log('PASS: chart library loads after a failed request and retry')
    await page.setViewportSize({ width: 390, height: 844 })
    await go('/tags/')
    await go(chartPath)
    await ready()
    assert.ok(await page.evaluate(() => [...document.querySelectorAll('.echarts-container')].every(el => echarts.getInstanceByDom(el).getWidth() <= innerWidth)))
    assert.deepEqual(errors, [])
    console.log('PASS: chart navigation at mobile viewport width')
    const fallback = await context.newPage()
    const fallbackErrors = []
    fallback.on('pageerror', error => fallbackErrors.push(error.message))
    await fallback.route(/\/swup(?:\/|@)/, route => route.abort())
    await fallback.route('**/*', route => route.request().resourceType() === 'image' ? route.abort() : route.fallback())
    await fallback.goto(origin + chartPath, { waitUntil: 'networkidle' })
    await fallback.waitForFunction(() => typeof window.echarts?.getInstanceByDom === 'function' && [...document.querySelectorAll('.echarts-container')].every(el => echarts.getInstanceByDom(el)))
    assert.equal(await fallback.evaluate(() => typeof window.swup), 'undefined')
    assert.deepEqual(fallbackErrors, [])
    await fallback.close()
    console.log('PASS: a failed Swup CDN request preserves direct page rendering')

    await page.setViewportSize({ width: 1280, height: 900 })
    const beforePreload = counterCalls
    await page.evaluate(() => swup.preload(window.__testRoot + 'about/'))
    assert.equal(counterCalls, beforePreload, 'Prefetch must not execute the counter')
    assert.ok(await page.evaluate(() => swup.cache.has(window.__testRoot + 'about/')))
    await go('/about/')
    await page.waitForFunction(() => document.activeElement?.id === 'content-inner')
    assert.ok(await page.evaluate(() => {
      const external = document.createElement('a'); external.href = 'https://example.org/'
      const download = document.createElement('a'); download.href = '/file.zip'; download.download = ''
      const blank = document.createElement('a'); blank.href = '/'; blank.target = '_blank'
      return [external, download, blank].every(el => swup.shouldIgnoreVisit(el.href, { el }))
    }))
    const beforeAnchor = counterCalls
    await page.evaluate(() => {
      const target = document.createElement('div'); target.id = 'audit-anchor'; target.style.marginTop = '1000px'; target.textContent = 'Anchor'
      document.getElementById('content-inner').appendChild(target)
      const link = document.createElement('a'); link.id = 'audit-anchor-link'; link.href = '#audit-anchor'; link.textContent = 'Go to anchor'
      document.body.appendChild(link)
    })
    await page.locator('#audit-anchor-link').click()
    await page.waitForURL('**/#audit-anchor')
    assert.equal(counterCalls, beforeAnchor, 'Same-page anchors must not count a new page')
    await go('/')
    await page.locator('#search-button .search').click()
    await page.locator('.local-search-input input').fill(chartMeta.json[0].headline)
    const searchLink = page.locator(`.local-search-hit-item a[href*="${chartPath}"]`).first()
    await searchLink.click()
    await ready()
    assert.equal(new URL(page.url()).pathname, chartPath)
    assert.deepEqual(errors, [])
    await page.evaluate(() => {
      btf.addGlobalFn('encrypt', () => { window.__persistentCalls = (window.__persistentCalls || 0) + 1 }, 'testPersistent')
      btf.addPageFn('encrypt', () => { window.__pageCalls = (window.__pageCalls || 0) + 1 }, 'testScoped')
    })
    await go('/about/')
    await page.evaluate(() => window.dispatchEvent(new Event('hexo-blog-decrypt')))
    assert.equal(await page.evaluate(() => window.__persistentCalls), 1)
    assert.equal(await page.evaluate(() => window.__pageCalls || 0), 0)
    await page.evaluate(() => { delete window.globalFn.encrypt.testPersistent })
    console.log('PASS: prefetch, focus, native links, anchors, search and callback scopes')

    for (const variant of ['public', 'private']) {
      const file = htmlFiles.find(file => file.startsWith('article/ssr-mathjax-' + variant))
      if (!file) continue
      const mathPage = await context.newPage()
      const mathRequests = []
      mathPage.on('request', request => { if (/\/mathjax\//.test(request.url())) mathRequests.push(request.url()) })
      await mathPage.goto(origin + withRoot('/' + file).replace(/index\.html$/, ''), { waitUntil: 'networkidle' })
      if (variant === 'private') {
        assert.equal(await mathPage.locator('mjx-container').count(), 0)
        await mathPage.locator('input[type=password]').fill('component-test-only')
        await mathPage.locator('input[type=password]').press('Enter')
      }
      await mathPage.locator('mjx-container svg').first().waitFor()
      assert.equal(await mathPage.locator('.katex, [data-mjx-error], .math-source').count(), 0)
      assert.deepEqual(mathRequests, [])
      const assistive = mathPage.locator('mjx-assistive-mml').first()
      assert.ok(await assistive.locator('math').count())
      assert.ok(await assistive.evaluate(el => el.getBoundingClientRect().width <= 1))
      assert.equal(await mathPage.evaluate(() => typeof window.MathJax), 'undefined')
      await mathPage.close()
    }
    console.log('PASS: per-article MathJax SVG, encrypted SSR, and zero browser math runtime')

    if (process.env.TEST_MATHJAX) {
      const math = await context.newPage()
      const mathErrors = []
      math.on('pageerror', error => mathErrors.push(error.message))
      await math.goto(origin + withRoot('/__mathjax_test__/'), { waitUntil: 'domcontentloaded' })
      await math.waitForSelector('#article-container mjx-container', { timeout: 45000 })
      assert.ok(await math.locator('mjx-container mjx-mi').count() > 0)
      assert.equal(await math.locator('mjx-merror').count(), 0)
      for (const width of [1280, 390]) {
        await math.setViewportSize({ width, height: 900 })
        assert.ok(await math.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Client MathJax must not widen the page')
        assert.ok(await math.locator('mjx-container:not([display])').evaluateAll(els => els.length >= 10 && els.every(el => getComputedStyle(el).display === 'inline' && getComputedStyle(el).whiteSpace === 'nowrap' && el.getBoundingClientRect().height < 100)))
        if (process.env.TEST_SCREENSHOTS) await math.screenshot({ fullPage: true, path: path.join(process.env.TEST_SCREENSHOTS, `mathjax-client-${width}.png`) })
      }
      assert.deepEqual(mathErrors, [])
      await math.close()
      console.log('PASS: MathJax client options and real CHTML rendering')
    }

    if (process.env.MOCK_VISITOR_COUNTER) {
      const slowCounter = await context.newPage()
      await slowCounter.route('**/*', route => route.request().resourceType() === 'image' ? route.abort() : route.fallback())
      let releaseCounter
      const gate = new Promise(resolve => { releaseCounter = resolve })
      const urls = []
      await slowCounter.route('https://events.vercount.one/api/v2/log', async route => {
        if (route.request().method() === 'POST') urls.push(route.request().postDataJSON().url)
        await gate
        await route.fallback()
      })
      await slowCounter.goto(origin + mount, { waitUntil: 'domcontentloaded' })
      await slowCounter.waitForFunction(() => typeof window.swup?.navigate === 'function')
      await slowCounter.evaluate(() => swup.navigate(window.__testRoot + 'tags/'))
      await slowCounter.waitForFunction(() => location.pathname === window.__testRoot + 'tags/' && !swup.navigating)
      assert.ok(urls.some(url => new URL(url).pathname === mount))
      releaseCounter()
      await slowCounter.waitForFunction(() => document.getElementById('custom-uv')?.textContent === '77')
      assert.ok(urls.some(url => new URL(url).pathname === withRoot('/tags/')))
      await slowCounter.close()
      console.log('PASS: slow counters preserve page URLs and do not block navigation')
    }

    const delayedNavigation = await context.newPage()
    await delayedNavigation.route('**/*', route => route.request().resourceType() === 'image' ? route.abort() : route.fallback())
    let releaseNavigation
    const navigationGate = new Promise(resolve => { releaseNavigation = resolve })
    await delayedNavigation.route(/\/swup(?:\/|@)/, async route => { await navigationGate; await route.fallback() })
    await delayedNavigation.goto(origin + mount, { waitUntil: 'domcontentloaded' })
    assert.ok(await delayedNavigation.evaluate(() => typeof window.globalFn.pageLoad.refreshFn === 'function'))
    assert.equal(await delayedNavigation.evaluate(() => typeof window.swup?.navigate), 'undefined')
    releaseNavigation()
    await delayedNavigation.waitForFunction(() => typeof window.swup?.navigate === 'function')
    await delayedNavigation.close()
    console.log('PASS: navigation dependencies do not block initial page setup')

    const searchRetry = await context.newPage()
    await searchRetry.route('**/*', route => route.request().resourceType() === 'image' ? route.abort() : route.fallback())
    let searchAttempts = 0
    await searchRetry.route('**/search.xml', route => ++searchAttempts === 1 ? route.abort() : route.fallback())
    await searchRetry.goto(origin + mount, { waitUntil: 'networkidle' })
    await searchRetry.locator('#search-button .search').click()
    await searchRetry.locator('.search-retry').click()
    await searchRetry.locator('.local-search-input input').fill(chartMeta.json[0].headline.includes('<T>') ? '<T>' : chartMeta.json[0].headline)
    await searchRetry.locator(`.local-search-hit-item a[href*="${chartPath}"]`).first().waitFor()
    assert.equal(searchAttempts, 2)
    await searchRetry.close()
    console.log('PASS: search data can be retried after a failed download')

    const encryptedFile = htmlFiles.find(file => file.startsWith('article/') && /<title>Component integration test/.test(fs.readFileSync(path.join(root, file), 'utf8')))
    if (encryptedFile) {
      const encryptedPath = withRoot('/' + encryptedFile.replace(/index\.html$/, ''))
      const encrypted = await context.newPage()
      const componentErrors = []
      encrypted.on('pageerror', error => componentErrors.push(error.message))
      await encrypted.route('**/*', route => route.request().resourceType() === 'image' ? route.abort() : route.fallback())
      await encrypted.goto(origin + encryptedPath + '?highlight=1', { waitUntil: 'networkidle' })
      assert.equal(await encrypted.locator('script#hbeData mark').count(), 0)
      assert.equal(await encrypted.locator('.echarts-container').count(), 0)
      assert.equal(await encrypted.evaluate(() => typeof window.echarts), 'undefined')
      await encrypted.locator('input[type=password]').fill('component-test-only')
      await encrypted.locator('input[type=password]').press('Enter')
      await encrypted.waitForFunction(() => {
        const chart = document.querySelector('.echarts-container')
        return chart && typeof window.echarts?.getInstanceByDom === 'function' && window.echarts.getInstanceByDom(chart) && document.querySelector('.chartjs-wrap canvas') && typeof window.Chart?.getChart === 'function' && window.Chart.getChart(document.querySelector('.chartjs-wrap canvas')) && document.querySelector('.mermaid-wrap svg') && document.querySelector('.katex')
      })
      assert.equal(await encrypted.locator('.katex-error').count(), 0)
      assert.ok(await encrypted.locator('.katex-html').first().isVisible())
      await checkCopy(encrypted)
      assert.equal(await encrypted.locator('.katex mark, .mermaid-wrap mark, .echarts-container mark, .chartjs-src mark').count(), 0)
      assert.ok((await encrypted.locator('.katex').first().textContent()).includes('X'), 'KaTeX macro from site config must render')
      assert.ok(await encrypted.evaluate(() => {
        const el = document.querySelector('.echarts-container')
        return !!el.querySelector('svg') && echarts.getInstanceByDom(el).getHeight() === 320 && Chart.getChart(document.querySelector('.chartjs-wrap canvas')).options.animation === false
      }))
      await encrypted.locator('#article-container a[data-fancybox]').click()
      await encrypted.waitForFunction(() => !!Fancybox.getInstance())
      assert.equal(await encrypted.evaluate(() => Fancybox.getInstance().getOptions().dragToClose), false)
      assert.equal(new URL(encrypted.url()).pathname, encryptedPath)
      await encrypted.evaluate(() => {
        window.__componentState = {
          echarts: echarts.getInstanceByDom(document.querySelector('.echarts-container')),
          chart: Chart.getChart(document.querySelector('.chartjs-wrap canvas')),
          mermaid: document.querySelector('.mermaid-wrap').__mermaidAbortController
        }
      })
      await encrypted.evaluate(() => new Promise(resolve => { document.addEventListener('theme:page-load', resolve, { once: true }); swup.navigate(window.__testRoot) }))
      assert.equal(await encrypted.evaluate(() => !!Fancybox.getInstance()), false)
      assert.ok(await encrypted.evaluate(() => __componentState.echarts.isDisposed() && __componentState.chart.ctx === null && __componentState.mermaid.signal.aborted))
      await encrypted.evaluate(path => new Promise(resolve => { document.addEventListener('theme:page-load', resolve, { once: true }); swup.navigate(path) }), encryptedPath)
      assert.equal(await encrypted.locator('input[type=password]').count(), 1, 'Cached navigation must not restore decrypted HTML')
      assert.equal(await encrypted.locator('.echarts-container').count(), 0)
      assert.deepEqual(componentErrors, [])
      await encrypted.close()
      console.log('PASS: encrypted ECharts, Chart.js, Mermaid, KaTeX, lightbox options and cleanup')
    }


    for (let visit = 1; visit <= 2; visit++) {
      await go('/script-contract/')
      await page.waitForFunction(count => window.__asyncRuns === count && window.__moduleMounts === count, visit)
      assert.equal(await page.evaluate(() => window.__unmarkedRuns), undefined)
      assert.equal(await page.evaluate(() => window.__markedRuns), visit)
      assert.equal(await page.evaluate(() => window.__classicRuns), visit)
      assert.equal(await page.evaluate(() => window.__moduleRuns), 1)
      assert.deepEqual(await page.evaluate(() => window.__scriptOrder), ['classic', 'inline'])
      assert.equal(await page.locator('#contract-data').textContent(), '{"value":1}')
      await go('/')
    }
    const directScripts = await context.newPage()
    await directScripts.goto(origin + withRoot('/script-contract/'), { waitUntil: 'networkidle' })
    assert.equal(await directScripts.evaluate(() => window.__unmarkedRuns), 1)
    assert.equal(await directScripts.evaluate(() => window.__moduleRuns), 1)
    assert.equal(await directScripts.evaluate(() => window.__moduleMounts), 1)
    await directScripts.close()
    assert.deepEqual(errors, [])
    console.log('PASS: explicit script opt-in, classic ordering, async execution, data blocks and cached module mounts')
    const cancelled = await context.newPage()
    await cancelled.goto(origin + mount, { waitUntil: 'networkidle' })
    let releasePage
    const pageGate = new Promise(resolve => { releasePage = resolve })
    await cancelled.route('**/about/', async route => { await pageGate; await route.fallback().catch(() => {}) })
    const beforeCancel = counterCalls
    const slowPageRequest = cancelled.waitForRequest(request => new URL(request.url()).pathname === withRoot('/about/'))
    await cancelled.evaluate(path => { swup.navigate(path) }, withRoot('/about/'))
    await slowPageRequest
    await cancelled.evaluate(path => { swup.navigate(path) }, withRoot('/tags/'))
    await cancelled.waitForFunction(path => location.pathname === path && !swup.navigating, withRoot('/tags/'))
    releasePage()
    await cancelled.waitForLoadState('networkidle')
    assert.equal(new URL(cancelled.url()).pathname, withRoot('/tags/'))
    if (process.env.MOCK_VISITOR_COUNTER) assert.equal(counterCalls - beforeCancel, 1, 'A cancelled page must not initialize its counter')
    await cancelled.close()
    for (const failure of ['non-html', 'network']) {
      const failed = await context.newPage()
      const target = withRoot(`/__${failure}__/`)
      await failed.goto(origin + mount, { waitUntil: 'networkidle' })
      let native = 0
      await failed.route('**' + target, route => {
        if (route.request().isNavigationRequest()) {
          native++
          return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Native fallback</title><p id="native-fallback">Fallback</p>' })
        }
        return failure === 'network' ? route.abort() : route.fulfill({ contentType: 'application/json', body: '{"not":"html"}' })
      })
      await Promise.all([
        failed.waitForNavigation({ waitUntil: 'load' }),
        failed.evaluate(path => { swup.navigate(path) }, target)
      ])
      await failed.locator('#native-fallback').waitFor()
      assert.equal(native, 1)
      await failed.close()
    }
    console.log('PASS: cancelled responses do not initialize pages; non-HTML and network failures fall back to native navigation')
  } finally { await browser.close() }
})().catch(e => { console.error(e); process.exitCode = 1 }).finally(() => server.close())
