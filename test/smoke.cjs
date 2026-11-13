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
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.xml': 'application/xml' })[path.extname(file)] || 'application/octet-stream')
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
    const page = await context.newPage()
    const requests = [], errors = []
    page.on('request', request => requests.push(request.url()))
    page.on('pageerror', error => errors.push(error.message))
    const origin = `http://127.0.0.1:${server.address().port}`
    await page.goto(origin + mount, { waitUntil: 'networkidle' })
    assert.equal(await page.evaluate(() => typeof window.swup), 'undefined')
    assert.ok(!requests.some(url => /\/(?:swup|echarts|chart\.js|mermaid|mathjax)\//.test(url)))
    await page.locator('#recent-posts a.article-title').first().click()
    await page.waitForURL('**/article/**')
    assert.ok(await page.locator('#article-container').isVisible())
    assert.deepEqual(errors, [])
    await context.close()
    console.log('PASS:', process.env.TEST_VARIANT, 'direct links, no navigation runtime, no unused components')
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => server.close())
