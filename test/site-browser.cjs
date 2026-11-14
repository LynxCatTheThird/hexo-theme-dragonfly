// A real site's routes and content need not match the isolated regression fixtures.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
const { chromium } = require('playwright')
const root = path.resolve(process.argv[2])
const mount = process.env.TEST_ROOT || '/'
const files = fs.readdirSync(root, { recursive: true }).filter(file => file.endsWith('.html'))
const fixture = name => {
  const file = files.find(file => file.includes(name))
  assert.ok(file, `Missing generated consumer fixture: ${name}`)
  return mount + file.split(path.sep).join('/')
}
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
  if (!pathname.startsWith(mount)) return res.writeHead(404).end()
  let file = path.resolve(root, pathname.slice(mount.length))
  if (file !== root && !file.startsWith(root + path.sep)) return res.writeHead(403).end()
  try {
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.xml': 'application/xml' })[path.extname(file)] || 'application/octet-stream')
    res.end(fs.readFileSync(file))
  } catch { res.writeHead(404).end() }
})
;(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${server.address().port}`
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
  try {
    for (const javaScriptEnabled of [false, true]) {
      const context = await browser.newContext({ javaScriptEnabled })
      await require('./vendors.cjs')(context, { allowCustom: true })
      await context.route('**/*', route => route.request().resourceType() === 'image' ? route.abort() : route.fallback())
      await context.route('https://events.vercount.one/**', route => route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"status":"success","data":{"site_uv":1,"site_pv":1,"page_pv":1}}' }))
      try {
        const page = await context.newPage()
        const errors = []
        page.on('pageerror', error => errors.push(error.message))
        for (const [name, selector] of [['component-test-public-', '.katex-html'], ['ssr-mathjax-public-', 'mjx-container svg']]) {
          await page.goto(origin + fixture(name), { waitUntil: 'networkidle' })
          assert.ok(await page.locator('#article-container ' + selector).first().isVisible())
        }
        if (javaScriptEnabled) {
          await page.goto(origin + fixture('component-test-private-'), { waitUntil: 'networkidle' })
          await page.locator('input[type=password]').fill('component-test-only')
          await page.locator('input[type=password]').press('Enter')
          await page.locator('#article-container .katex-html').first().waitFor()
          await page.waitForFunction(() => typeof window.echarts?.getInstanceByDom === 'function' && [...document.querySelectorAll('.echarts-container')].some(el => echarts.getInstanceByDom(el)))
          await page.evaluate(url => new Promise(resolve => { document.addEventListener('theme:page-load', resolve, { once: true }); swup.navigate(url) }), fixture('component-test-public-'))
          assert.ok(await page.locator('#article-container .katex-html').first().isVisible())
        }
        assert.deepEqual(errors, [])
      } finally { await context.close() }
    }
    console.log('PASS: actual consumer build, both math engines without JavaScript, decryption, charts and navigation')
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => server.close())
