// Modified in this fork.
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
    window.btf = {
      saveToLocal,
      getScript: assetLoader('script', { async: true }, 'src'),
      getCSS: (url, id) => loadCSS(url, id ? { id } : {}),
      // Named callbacks are removed when the current page is replaced.
      addPageFn: (key, fn, name) => {
        btf.addGlobalFn(key, fn, name)
        btf.addGlobalFn('pageCleanup', () => {
          delete (window.globalFn[key] || {})[name]
        }, key + ':' + name)
      },
      addGlobalFn: (key, fn, name = false, parent = window) => {
        if (!${navigation.enable} && ['pageLoad', 'pageCleanup', 'navigationStart'].includes(key)) return
        const globalFn = parent.globalFn || {}
        globalFn[key] = globalFn[key] || {}
        globalFn[key][name || Object.keys(globalFn[key]).length] = fn
        parent.globalFn = globalFn
      }
    }
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
        }
      })
    ` : autoMode === 2 ? timeFallback : ''

    return `
      const metaThemeColor = document.querySelector('meta[name="theme-color"]')
      const setTheme = theme => {
        document.documentElement.dataset.theme = theme
        metaThemeColor?.setAttribute('content', theme === 'dark' ? '${themeColorDark}' : '${themeColorLight}')
      }
      const activateDarkMode = btf.activateDarkMode = () => setTheme('dark')
      const activateLightMode = btf.activateLightMode = () => setTheme('light')
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
