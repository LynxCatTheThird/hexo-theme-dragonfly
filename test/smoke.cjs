// SPDX-License-Identifier: Apache-2.0
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
const { chromium } = require('playwright')
const root = path.resolve(process.argv[2])
const mount = process.env.TEST_ROOT || '/'
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname
  if (!pathname.startsWith(mount)) return res.writeHead(404).end()
  let file = path.join(root, decodeURIComponent(pathname.slice(mount.length)))
  if (file !== root && !file.startsWith(root + path.sep)) return res.writeHead(403).end()
  try {
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
    res.setHeader('Content-Type', ({ '.svg': 'image/svg+xml', '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.xml': 'application/xml' })[path.extname(file)] || 'application/octet-stream')
    res.end(fs.readFileSync(file))
  } catch { res.writeHead(404).end() }
})
;(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined })
  try {
    const context = await browser.newContext()
    await require('./vendors.cjs')(context)
    await context.route('https://events.vercount.one/**', route => route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"status":"success","data":{"site_uv":1,"site_pv":1,"page_pv":1}}' }))
    const origin = `http://127.0.0.1:${server.address().port}`
    if (process.env.TEST_VARIANT === 'legacy-images') {
      await require('./image-checks.cjs')(browser, origin, mount, { legacy: true })
      await context.close()
      return
    }
    if (process.env.TEST_VARIANT === 'algolia') {
      await require('./dialog-checks.cjs')(browser, origin, mount, 'algolia')
      await context.close()
      return
    }
    const page = await context.newPage()
    const requests = [], errors = []
    page.on('request', request => requests.push(request.url()))
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(origin + mount, { waitUntil: 'networkidle' })
    const connections = await page.locator('link[rel=preconnect]').evaluateAll(links => links.map(link => new URL(link.href).origin))
    assert.ok(connections.length > 0)
    assert.equal(new Set(connections).size, connections.length)
    assert.ok(!connections.includes('https://fonts.googleapis.com'))
    assert.equal(await page.evaluate(() => typeof window.swup), 'undefined')
    assert.ok(!requests.some(url => /\/(?:swup|echarts|chart\.js|mermaid|mathjax)\//.test(url)))
    if (['default', 'development'].includes(process.env.TEST_VARIANT)) {
      assert.ok(!requests.some(url => /\/js\/build\/.*(?:article-|media-|gallery-|local_search-|algolia_js-|echarts_runtime-|navigation-)/.test(url)), 'Default home must not download optional modules')
    }
    if (process.env.TEST_VARIANT === 'development') {
      assert.ok(requests.some(url => /\/js\/build\/development\/main-/.test(url)))
      assert.ok(!requests.some(url => url.includes('dragonfly-assets.test')))
    }
    await page.locator('#recent-posts a.article-title').first().click()
    await page.waitForURL('**/article/**')
    assert.ok(await page.locator('#article-container').isVisible())
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.locator('#toggle-menu').click()
    await page.locator('#sidebar-menus.open').waitFor()
    assert.ok(await page.locator('#menu-mask').isVisible())
    await page.locator('#menu-mask').click({ position: { x: 5, y: 5 } })
    assert.ok(!await page.locator('#menu-mask').isVisible(), 'Reduced motion must close the mask without waiting for animationend')
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).scrollBehavior), 'auto')
    await page.evaluate(() => dragonfly.scrollToDest(0))
    assert.equal(await page.evaluate(() => window.scrollY), 0)
    assert.deepEqual(errors, [])
    await context.close()
    console.log('PASS:', process.env.TEST_VARIANT, 'direct links, no navigation runtime, no unused components')
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => server.close())
