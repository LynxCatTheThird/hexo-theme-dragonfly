// SPDX-License-Identifier: Apache-2.0
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
'use strict'

hexo.extend.helper.register('inject_head_js', function () {
  const { darkmode, aside, navigation } = this.theme
  const start = darkmode.start || 6
  const end = darkmode.end || 18
  const { theme_color: themeColor } = hexo.theme.config
  const themeColorLight = themeColor && themeColor.enable ? themeColor.meta_theme_color_light : '#ffffff'
  const themeColorDark = themeColor && themeColor.enable ? themeColor.meta_theme_color_dark : '#0d0d0d'

  const createCustomJs = () => `
    const saveToLocal = {
      set: (key, value, ttl) => {
        try {
          const data = { value }

          if (ttl != null) {
            data.expiry = Date.now() + ttl * 86400000
          }

          localStorage.setItem(key, JSON.stringify(data))
        } catch (e) {
          console.error(e)
        }
      },
      get: key => {
        const itemStr = localStorage.getItem(key)
        if (!itemStr) return

        try {
          const data = JSON.parse(itemStr)

          if (data.expiry && Date.now() > data.expiry) {
            localStorage.removeItem(key)
            return
          }

          return data.value
        } catch {
          localStorage.removeItem(key)
        }
      }
    }

    const assetLoader = (tag, defaults, source) => {
      const cache = new Map()
      return (url, attributes = {}) => {
        if (cache.has(url)) return cache.get(url)
        const promise = new Promise((resolve, reject) => {
          const element = Object.assign(document.createElement(tag), defaults, { [source]: url })
          for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value)
          element.onload = resolve
          element.onerror = () => {
            cache.delete(url)
            element.remove()
            reject(new Error('Failed to load ' + tag + ': ' + url))
          }
          document.head.appendChild(element)
        })
        cache.set(url, promise)
        return promise
      }
    }
    const loadCSS = assetLoader('link', { rel: 'stylesheet' }, 'href')
    const appController = new AbortController()
    let pageController = new AbortController()
    let callbackId = 0
    window.dragonfly = {
      get appSignal () { return appController.signal },
      get pageSignal () { return pageController.signal },
      resetPageScope: () => { pageController.abort(); pageController = new AbortController() },
      saveToLocal,
      getScript: assetLoader('script', { async: true }, 'src'),
      getCSS: (url, id) => loadCSS(url, id ? { id } : {}),
      // 页面回调随所属页面一同释放。
      addPageFn: (key, fn, name) => {
        const id = dragonfly.addGlobalFn(key, fn, name)
        if (id === undefined) return
        dragonfly.pageSignal.addEventListener('abort', () => {
          if (window.globalFn?.[key]?.[id] === fn) delete window.globalFn[key][id]
        }, { once: true })
      },
      addGlobalFn: (key, fn, name = false, parent = window) => {
        if (!${navigation.enable} && ['pageLoad', 'pageCleanup', 'navigationStart'].includes(key)) return
        const globalFn = parent.globalFn || {}
        globalFn[key] = globalFn[key] || {}
        const id = name || ('callback:' + ++callbackId)
        globalFn[key][id] = fn
        parent.globalFn = globalFn
        return id
      }
    }
    // 保留旧注入脚本的对象引用，主题内部统一使用 dragonfly。
    window.btf = window.dragonfly
  `

  const createDarkmodeJs = () => {
    if (!darkmode.enable) return ''

    const timeFallback = `
      const hour = new Date().getHours()
      const isNight = ${start} < ${end}
        ? hour < ${start} || hour >= ${end}
        : hour >= ${start} || hour < ${end}
      isNight ? activateDarkMode() : activateLightMode()
    `
    const autoMode = darkmode.autoChangeMode
    const automatic = autoMode === 1 ? `
      const dark = window.matchMedia('(prefers-color-scheme: dark)')
      const light = window.matchMedia('(prefers-color-scheme: light)')
      if (light.matches) activateLightMode()
      else if (dark.matches) activateDarkMode()
      else { ${timeFallback} }
      dark.addEventListener('change', e => {
        if (saveToLocal.get('theme') === undefined) {
          e.matches ? activateDarkMode() : activateLightMode()
          Object.values(window.globalFn?.themeChange || {}).forEach(fn => fn(e.matches ? 'dark' : 'light'))
        }
      }, { signal: dragonfly.appSignal })
    ` : autoMode === 2 ? timeFallback : ''

    return `
      const metaThemeColor = document.querySelector('meta[name="theme-color"]')
      const setTheme = theme => {
        document.documentElement.dataset.theme = theme
        metaThemeColor?.setAttribute('content', theme === 'dark' ? '${themeColorDark}' : '${themeColorLight}')
      }
      const activateDarkMode = dragonfly.activateDarkMode = () => setTheme('dark')
      const activateLightMode = dragonfly.activateLightMode = () => setTheme('light')
      const theme = saveToLocal.get('theme')
      if (theme === undefined) { ${automatic} }
      else {
        ${autoMode === 1 || autoMode === 2
          ? "theme === 'light' ? activateLightMode() : activateDarkMode()"
          : "if (theme === 'dark') activateDarkMode(); else if (theme === 'light') activateLightMode()"}
      }
    `
  }

  const createAsideStatusJs = () => {
    if (!aside.enable || !aside.button) return ''
    return `
      const asideStatus = saveToLocal.get('aside-status')
      if (asideStatus !== undefined) {
        document.documentElement.classList.toggle('hide-aside', asideStatus === 'hide')
      }
    `
  }

  const createDetectAppleJs = () => `
    if (/iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent)) {
      document.documentElement.classList.add('apple')
    }
  `

  return `<script data-swup-theme>
    (() => {
      ${createCustomJs()}
      ${createDarkmodeJs()}
      ${createAsideStatusJs()}
      ${createDetectAppleJs()}
    })()
  </script>`
})
