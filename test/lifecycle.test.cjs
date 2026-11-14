// SPDX-License-Identifier: Apache-2.0
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
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
  const { dragonfly } = context
  assert.equal(context.btf, dragonfly, '旧注入接口与新接口共享同一个对象')
  const target = new EventTarget()
  let calls = 0
  dragonfly.addAppEventListener(target, 'probe', () => { calls++ })
  dragonfly.addPageEventListener(target, 'probe', () => { calls += 10 })
  dragonfly.addGlobalFn('encrypt', () => {}, 'app')
  dragonfly.addPageFn('encrypt', () => {}, 'page')
  dragonfly.addPageFn('encrypt', () => {})
  const old = dragonfly.pageSignal
  target.dispatchEvent(new Event('probe'))
  assert.equal(calls, 11)
  dragonfly.resetPageScope()
  assert.ok(old.aborted)
  assert.ok(!dragonfly.pageSignal.aborted)
  assert.notEqual(old, dragonfly.pageSignal)
  assert.deepEqual(Object.keys(context.globalFn.encrypt), ['app'])
  target.dispatchEvent(new Event('probe'))
  assert.equal(calls, 12)
  const local = new AbortController()
  dragonfly.addPageEventListener(target, 'probe', () => { calls += 100 }, { signal: local.signal })
  local.abort()
  target.dispatchEvent(new Event('probe'))
  assert.equal(calls, 13)
  const active = new Set()
  let lastObserver, comments = 0
  context.IntersectionObserver = class {
    constructor (callback) { this.callback = callback; lastObserver = this }
    observe () { active.add(this) }
    disconnect () { active.delete(this) }
  }
  dragonfly.loadComment({ isConnected: true }, () => { comments++ })
  assert.equal(active.size, 1)
  dragonfly.resetPageScope()
  assert.equal(active.size, 0)
  lastObserver.callback([{ isIntersecting: true }])
  assert.equal(comments, 0, 'A queued observer callback must not initialize a departed comment widget')
})

test('a late subtitle response cannot overwrite a newly mounted page', async () => {
  const theme = structuredClone(require('../scripts/common/default_config'))
  Object.assign(theme.subtitle, { effect: false, source: 1, sub: ['Fallback'] })
  theme.asset = { typed: '/typed.js' }
  const html = require('pug').renderFile(path.join(__dirname, '../layout/includes/third-party/subtitle.pug'), { theme, url_for: value => value })
  const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1])
  const target = { textContent: '' }, replies = []
  let controller = new AbortController()
  const context = { console, document: { getElementById: () => target }, dragonfly: { pageSignal: controller.signal, addGlobalFn () {} }, fetch: () => new Promise(resolve => replies.push(resolve)) }
  context.window = context
  for (const script of scripts) vm.runInNewContext(script, context)
  await new Promise(resolve => setImmediate(resolve))
  controller.abort()
  controller = new AbortController()
  context.dragonfly.pageSignal = controller.signal
  for (const script of scripts) vm.runInNewContext(script, context)
  await new Promise(resolve => setImmediate(resolve))
  replies[1]({ json: async () => ({ hitokoto: 'Fresh' }) })
  await new Promise(resolve => setImmediate(resolve))
  replies[0]({ json: async () => ({ hitokoto: 'Stale' }) })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(target.textContent, 'Fresh')
})

test('a delayed Twikoo download does not initialize a departed page', async () => {
  const theme = structuredClone(require('../scripts/common/default_config'))
  theme.comments = { use: ['Twikoo'], lazyload: false, count: false }
  theme.asset = { twikoo: '/twikoo.js' }
  const html = require('pug').renderFile(path.join(__dirname, '../layout/includes/third-party/comments/twikoo.pug'), { theme, url_for: value => value })
  const script = html.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1]
  const controller = new AbortController()
  let release, initialized = 0
  const context = { document: { querySelector: () => ({ isConnected: true }) }, location: { pathname: '/post/' }, GLOBAL_CONFIG_SITE: { pageType: 'post' }, dragonfly: { pageSignal: controller.signal, getScript: () => new Promise(resolve => { release = resolve }) }, setTimeout: fn => fn() }
  context.window = context
  vm.runInNewContext(script, context)
  controller.abort()
  context.twikoo = { init: () => { initialized++ } }
  release()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(initialized, 0)
  context.dragonfly.pageSignal = new AbortController().signal
  vm.runInNewContext(script, context)
  assert.equal(initialized, 1)
})
