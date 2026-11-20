// SPDX-License-Identifier: Apache-2.0
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
import { createPageScriptsPlugin } from './page-scripts.js'

(() => {
  const settings = JSON.parse(document.querySelector('script[data-navigation]').dataset.navigation)
  const emit = name => document.dispatchEvent(new Event(name, { bubbles: true }))
  const run = async (key, clear = false, visit) => {
    const functions = window.globalFn?.[key] || {}
    if (clear && window.globalFn) delete window.globalFn[key]
    for (const fn of Object.values(functions)) {
      if (visit?.done) break
      try { await fn() } catch (error) { console.error(`[${key}]`, error) }
    }
  }

  const init = async () => {
    let preloadPlugin
    try {
      await dragonfly.getScript(settings.assets.swup)
      const pending = ['head', 'a11y', 'scripts'].map(key => dragonfly.getScript(settings.assets[key]))
      if (settings.preload && settings.cache) {
        pending.push(dragonfly.getScript(settings.assets.preload)
          .then(() => { preloadPlugin = new SwupPreloadPlugin({ throttle: 2, preloadVisibleLinks: false }) })
          .catch(error => console.warn('[preload]', error)))
      }
      await Promise.all(pending)
    } catch (error) {
      console.warn('[navigation]', error)
      return
    }
    const plugins = [
      createPageScriptsPlugin(settings.timeout),
      new SwupHeadPlugin({ persistAssets: true, awaitAssets: true }),
      new SwupA11yPlugin({ announcements: { visit: '{title}', url: '{url}' } })
    ]
    if (preloadPlugin) plugins.push(preloadPlugin)
    const swup = window.swup = new Swup({
      plugins,
      containers: ['#config-diff', '#body-wrap', '#rightside-config-hide', '#rightside-config-show', '.page-scripts'],
      animationSelector: false,
      cache: settings.cache,
      timeout: settings.timeout,
      linkSelector: 'a[href]:not([data-fancybox])',
      ignoreVisit: (url, { el } = {}) => Boolean(el?.closest('[data-no-swup]')) || settings.exclude.includes(new URL(url, location.href).pathname)
    })

    swup.hooks.replace('fetch:request', async (visit, args, fetchPage) => {
      const response = await fetchPage(visit, args)
      if (!response.ok) visit.cache.write = false
      if (!response.ok && response.status !== 404) throw new Error(`Navigation request failed: ${response.status}`)
      const type = response.headers.get('content-type')
      if (type && !type.includes('text/html') && !type.includes('application/xhtml+xml')) throw new Error('Navigation response is not HTML')
      return response
    })
    swup.hooks.on('visit:start', visit => {
      if (visit.a11y) visit.a11y.focus = { selector: '#content-inner', wait: true }
      run('navigationStart')
    })
    swup.hooks.before('content:replace', async () => {
      // 清理回调仍需访问旧页面及其 signal；资源释放完成后再切换页面 scope。
      emit('theme:page-leave')
      await run('pageCleanup', true)
      dragonfly.resetPageScope()
      document.body.classList.remove('read-mode')
    })
    swup.hooks.on('content:replace', visit => {
      if (visit.done) return
      return run('pageLoad', false, visit)
    })
    swup.hooks.on('page:view', () => {
      emit('theme:page-load')
      // hexo-blog-encrypt 在页面替换完成后通过此事件重新挂载。
      emit('swup:contentReplaced')
    })
    for (const hook of ['visit:end', 'visit:abort', 'visit:fail']) swup.hooks.on(hook, () => run('navigationEnd'))
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true })
  else init()
})()
