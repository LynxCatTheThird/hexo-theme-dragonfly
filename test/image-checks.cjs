const assert = require('node:assert/strict')
module.exports = async (browser, origin, mount, { legacy = false, lightbox = false, navigation = false } = {}) => {
  for (const javaScriptEnabled of legacy ? [true] : [false, true]) {
    const context = await browser.newContext({ javaScriptEnabled })
    await require('./vendors.cjs')(context)
    await context.route('https://events.vercount.one/**', route => route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type' }, body: '{"status":"success","data":{"site_uv":1,"site_pv":1,"page_pv":1}}' }))
    try {
      const page = await context.newPage()
      const errors = [], requests = []
      page.on('pageerror', error => errors.push(error.message))
      page.on('request', request => requests.push(request.url()))
      const check = async () => {
        for (const id of ['critical-image', 'responsive-image', 'ordinary-image']) {
          const img = page.locator('#' + id)
          await img.evaluate(el => el.scrollIntoView())
          await page.waitForFunction(id => { const img = document.getElementById(id); return img?.complete && img.naturalWidth > 0 && img.src.includes('/img/fixture.svg') }, id)
          assert.ok(await img.isVisible(), `${id} must be visible`)
          assert.equal(await img.getAttribute('width'), '80')
          assert.equal(await img.getAttribute('height'), '40')
          assert.ok((await img.getAttribute('src')).startsWith(mount))
        }
        assert.equal(await page.locator('#critical-image').getAttribute('loading'), 'eager')
        const responsive = page.locator('#responsive-image')
        assert.equal(await responsive.getAttribute('srcset'), `${mount}img/fixture.svg 1x, ${mount}img/fixture-2x.svg 2x`)
        if (!legacy) {
          assert.equal(await responsive.getAttribute('loading'), 'lazy')
          assert.equal(await responsive.getAttribute('decoding'), 'async')
          assert.equal(await page.locator('#ordinary-image').getAttribute('data-lazy-src'), null)
          assert.ok(!requests.some(url => url.includes('vanilla-lazyload')))
        }
      }
      await page.goto(origin + mount + 'article/image-test-public/', { waitUntil: 'networkidle' })
      await check()
      if (javaScriptEnabled) {
        if (lightbox) {
          await page.locator('a[data-fancybox]:has(#ordinary-image)').waitFor()
          assert.equal(await page.locator('#responsive-image').evaluate(el => el.parentElement.tagName), 'PICTURE')
          assert.ok((await page.locator('a[data-fancybox]:has(#ordinary-image)').getAttribute('href')).endsWith(mount + 'img/fixture.svg'))
        }
        await page.goto(origin + mount + 'article/image-test-private/', { waitUntil: 'networkidle' })
        await page.locator('input[type=password]').fill('component-test-only')
        await page.locator('input[type=password]').press('Enter')
        await page.locator('#ordinary-image').waitFor()
        await check()
        if (navigation) {
          for (const pathname of [mount, mount + 'article/image-test-public/']) {
            await page.evaluate(path => new Promise(resolve => { document.addEventListener('theme:page-load', resolve, { once: true }); swup.navigate(path) }), pathname)
          }
          await check()
        }
      }
      assert.deepEqual(errors, [])
    } finally { await context.close() }
  }
  console.log(`PASS: ${legacy ? 'legacy' : 'native'} real image sources, responsive candidates, dimensions, critical images, decryption and navigation${legacy ? '' : ', including no JavaScript'}`)
}
