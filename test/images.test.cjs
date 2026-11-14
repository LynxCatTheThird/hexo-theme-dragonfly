const { test } = require('node:test')
const assert = require('node:assert/strict')
const { rewriteImages } = require('../scripts/common/images')

test('native images preserve dimensions, author hints, srcset and subpath URLs', () => {
  const html = '<picture><source srcset="/a.svg 1x, /b.svg 2x"><img src="/a.svg" srcset="/a.svg 1x, /b.svg 2x" sizes="80px" width="80" height="40" alt="a > b"></picture><img src="relative.svg" loading="eager" decoding="sync"><img src="/blog/c.svg" fetchpriority="high">'
  const result = rewriteImages(html, { root: '/blog/' })
  assert.match(result, /src="\/blog\/a.svg"/)
  assert.match(result, /srcset="\/blog\/a.svg 1x, \/blog\/b.svg 2x"/)
  assert.ok(result.includes('sizes="80px" width="80" height="40" alt="a > b"'))
  assert.ok(result.includes('src="relative.svg" loading="eager" decoding="sync"'))
  assert.ok(!result.includes('/blog/blog/'))
  assert.ok(result.includes('loading="lazy"'))
  assert.ok(result.includes('fetchpriority="high" loading="eager"'))
  assert.equal(rewriteImages(result, { root: '/blog/' }), result)
})
test('script literals, code, templates, galleries and data URLs stay intact', () => {
  const literal = '<script>const images = "<img src=\'/a.svg\'><img src=\'/b.svg\'>"</script><pre><code><img src="/c.svg"></code></pre><template><img src="/d.svg"></template><div class="gallery-container"><img src="/e.svg"></div>'
  assert.equal(rewriteImages(literal, { root: '/blog/' }), literal)
  const data = 'data:image/png;base64,/abcdef'
  const result = rewriteImages(`<img src="${data}" srcset="${data} 1x, /a.svg 2x">`, { root: '/blog/' })
  assert.ok(result.includes(`src="${data}"`))
  assert.ok(result.includes(`srcset="${data} 1x, /blog/a.svg 2x"`))
})
test('legacy loading remains selectable and respects eager images', () => {
  const result = rewriteImages('<img src="/a.svg" width=80><img src="/b.svg" loading="eager">', { root: '/blog/', native: false, placeholder: '/blog/placeholder.gif' })
  assert.match(result, /src="\/blog\/placeholder.gif" width=80 data-lazy-src="\/blog\/a.svg"/)
  assert.ok(result.includes('src="/blog/b.svg" loading="eager"'))
})
