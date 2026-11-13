const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

test('page replacement aborts page listeners and callbacks while app listeners survive', () => {
  const theme = structuredClone(require('../scripts/common/default_config'))
  theme.navigation.enable = true
  theme.darkmode.enable = false
  theme.aside.enable = false
  let render
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../scripts/helpers/inject_head_js.js'), 'utf8'), {
    hexo: { theme: { config: theme }, extend: { helper: { register: (_, fn) => { render = fn } } } }
  })
  const context = { addEventListener () {}, AbortController, AbortSignal, console, navigator: { userAgent: 'Linux' }, document: {}, localStorage: { getItem: () => null, setItem () {} } }
  context.window = context
  vm.runInNewContext(render.call({ theme }).replace(/^<script[^>]*>/, '').replace(/<\/script>$/, ''), context)
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../browser/utils.js'), 'utf8'), context)
  const { btf } = context
  const target = new EventTarget()
  let calls = 0
  btf.addAppEventListener(target, 'probe', () => { calls++ })
  btf.addPageEventListener(target, 'probe', () => { calls += 10 })
  btf.addGlobalFn('encrypt', () => {}, 'app')
  btf.addPageFn('encrypt', () => {}, 'page')
  btf.addPageFn('encrypt', () => {})
  const old = btf.pageSignal
  target.dispatchEvent(new Event('probe'))
  assert.equal(calls, 11)
  btf.resetPageScope()
  assert.ok(old.aborted)
  assert.ok(!btf.pageSignal.aborted)
  assert.notEqual(old, btf.pageSignal)
  assert.deepEqual(Object.keys(context.globalFn.encrypt), ['app'])
  target.dispatchEvent(new Event('probe'))
  assert.equal(calls, 12)
  const local = new AbortController()
  btf.addPageEventListener(target, 'probe', () => { calls += 100 }, { signal: local.signal })
  local.abort()
  target.dispatchEvent(new Event('probe'))
  assert.equal(calls, 13)
})
