const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const services = async (context, provider) => {
  await require('./vendors.cjs')(context)
  await context.route('https://events.vercount.one/**', route => route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type' }, body: '{"status":"success","data":{"site_uv":1,"site_pv":1,"page_pv":1}}' }))
  if (provider === 'algolia') await context.route(/https:\/\/[^/]+\.algolia(?:net\.com|\.net)\//, route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } })
    const body = route.request().postDataJSON()
    const request = body.requests?.[0] || body
    const query = request.query || new URLSearchParams(request.params).get('query') || ''
    const hits = query.includes('unlikely') || query.includes('<img') ? [] : [{ title: 'Post 0', path: 'article/post-0/', content: 'Fixture search result' }]
    return route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ results: [{ hits, nbHits: hits.length, nbPages: hits.length, page: 0, processingTimeMS: 1 }] }) })
  })
}

module.exports = async (browser, origin, mount = '/', provider = 'local') => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await services(context, provider)
  try {
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/*', route => route.request().resourceType() === 'image' ? route.abort() : route.fallback())
    await page.goto(origin + mount, { waitUntil: 'networkidle' })
    const opener = page.getByRole('button', { name: 'Search', exact: true })
    const dialog = page.getByRole('dialog', { name: 'Search', exact: true })
    const input = page.locator('dialog.search-dialog input[type=search]')
    const focusInput = () => page.waitForFunction(() => document.activeElement?.matches('dialog[open] input'))
    const unlocked = async () => assert.notEqual(await page.evaluate(() => getComputedStyle(document.documentElement).overflowY), 'hidden')
    await opener.focus()
    await page.keyboard.press('Enter')
    await focusInput()
    assert.ok(await dialog.evaluate(el => el.matches(':modal')))
    for (const key of ['Shift+Tab', 'Tab', 'Tab', 'Shift+Tab']) {
      await page.keyboard.press(key)
      const focus = await dialog.evaluate(el => ({ inside: el.contains(document.activeElement), tag: document.activeElement.tagName, id: document.activeElement.id, documentFocused: document.hasFocus() }))
      assert.ok(focus.inside || (!focus.documentFocused && focus.tag === 'BODY'), `Modal focus after ${key}: ${JSON.stringify(focus)}`)
    }
    await opener.evaluate(el => el.focus())
    assert.ok(await dialog.evaluate(el => el.contains(document.activeElement)), 'Background controls must remain inert')
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'hidden' })
    assert.ok(await opener.evaluate(el => el === document.activeElement))
    await unlocked()
    await opener.click()
    await focusInput()
    await page.mouse.click(5, 5)
    await dialog.waitFor({ state: 'hidden' })
    await unlocked()
    await opener.click()
    await focusInput()
    const query = 'unlikely-zzzz"><img src=x onerror=alert(1)>'
    await input.fill(query)
    const empty = page.locator(provider === 'local' ? '#local-search-stats' : '#algolia-hits-empty')
    await empty.filter({ hasText: query }).waitFor()
    assert.equal(await dialog.locator('img').count(), 0)
    await input.fill('Post 0')
    const hit = page.locator(provider === 'local' ? '.local-search-hit-item a[href*="/article/post-0/"]' : '.algolia-hit-item-link').first()
    await hit.waitFor()
    if (process.env.TEST_SCREENSHOTS) {
      fs.mkdirSync(process.env.TEST_SCREENSHOTS, { recursive: true })
      await page.screenshot({ path: path.join(process.env.TEST_SCREENSHOTS, `${provider}-dialog-light.png`), animations: 'disabled' })
    }
    await hit.click()
    await page.waitForURL(url => url.pathname === mount + 'article/post-0/')
    await dialog.waitFor({ state: 'hidden' })
    await unlocked()
    await page.evaluate(() => btf.activateDarkMode())
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await opener.click()
    await focusInput()
    assert.equal(await dialog.evaluate(el => getComputedStyle(el).animationName), 'none')
    if (process.env.TEST_SCREENSHOTS) await page.screenshot({ path: path.join(process.env.TEST_SCREENSHOTS, `${provider}-dialog-dark.png`) })
    await dialog.evaluate(el => el.remove())
    await unlocked()
    assert.deepEqual(errors, [])
  } finally { await context.close() }

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' })
  await services(mobile, provider)
  try {
    const page = await mobile.newPage()
    await page.goto(origin + mount, { waitUntil: 'networkidle' })
    const opener = page.getByRole('button', { name: 'Search', exact: true })
    await opener.tap()
    const dialog = page.getByRole('dialog', { name: 'Search', exact: true })
    await dialog.waitFor()
    await dialog.locator('input[type=search]').waitFor()
    await page.setViewportSize({ width: 390, height: 500 })
    const box = await dialog.boundingBox()
    assert.ok(box.width <= 390 && box.height <= 500)
    assert.ok(await dialog.locator('input[type=search]').isVisible())
    if (process.env.TEST_SCREENSHOTS) await page.screenshot({ path: path.join(process.env.TEST_SCREENSHOTS, `${provider}-dialog-touch.png`) })
    await dialog.getByRole('button', { name: 'Close search', exact: true }).tap()
    await dialog.waitFor({ state: 'hidden' })
    assert.notEqual(await page.evaluate(() => getComputedStyle(document.documentElement).overflowY), 'hidden')
    assert.ok(await opener.evaluate(el => el === document.activeElement))
  } finally { await mobile.close() }
  console.log(`PASS: ${provider} dialog keyboard focus, Escape, backdrop, return focus, escaped empty results, navigation, touch, dark mode and reduced motion`)
}
