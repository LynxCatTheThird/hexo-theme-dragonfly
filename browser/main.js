import { addRuntime, addLastPushDate, relativeDate, addPostOutdateNotice } from './dates.js'

// Modified in this fork.
document.addEventListener('DOMContentLoaded', () => {
  let headerContentWidth, $nav
  let mobileSidebarOpen = false

  // rightsideScrollPercent
  let goUpElement = null
  let scrollPercentElement = null

  const adjustMenu = init => {
    let hideMenuIndex = false

    if (init) {
      const blogInfoWidth = Array.from(document.querySelector('#blog-info > a').children).reduce((w, i) => w + i.offsetWidth, 0)
      const menusWidth = Array.from(document.getElementById('menus').children).reduce((w, i) => w + i.offsetWidth, 0)
      headerContentWidth = blogInfoWidth + menusWidth
      $nav = document.getElementById('nav')
    }

    hideMenuIndex = window.innerWidth <= 768 || headerContentWidth > $nav.offsetWidth - 120

    requestAnimationFrame(() => {
      $nav.classList.toggle('hide-menu', hideMenuIndex)
    })
  }

  // 初始化header
  const initAdjust = () => {
    adjustMenu(true)
    $nav.classList.add('show')
  }

  // sidebar menus
  const sidebarFn = {
    open: () => {
      btf.overflowPaddingR.add()
      btf.animateIn(document.getElementById('menu-mask'), 'to_show 0.5s')
      document.getElementById('sidebar-menus').classList.add('open')
      mobileSidebarOpen = true
    },
    close: () => {
      btf.overflowPaddingR.remove()
      btf.animateOut(document.getElementById('menu-mask'), 'to_hide 0.5s')
      document.getElementById('sidebar-menus').classList.remove('open')
      mobileSidebarOpen = false
    }
  }

  const rightsideScrollPercent = currentTop => {
    const scrollPercent = btf.getScrollPercent(currentTop, document.body)

    if (!goUpElement || !scrollPercentElement) return
    if (scrollPercent < 95) {
      goUpElement.classList.add('show-percent')
      scrollPercentElement.textContent = scrollPercent
    } else {
      goUpElement.classList.remove('show-percent')
    }
  }

  const scrollFn = () => {
    const $rightside = document.getElementById('rightside')
    let initTop = 0
    const $header = document.getElementById('page-header')
    const isShowPercent = GLOBAL_CONFIG.percent.rightside

    // 檢查文檔高度是否小於視窗高度
    const checkDocumentHeight = () => {
      if (document.body.scrollHeight <= window.innerHeight + 56) {
        $rightside.classList.add('rightside-show')
        return true
      }
      return false
    }

    // find the scroll direction
    const scrollDirection = currentTop => {
      const result = currentTop > initTop // true is down & false is up
      initTop = currentTop
      return result
    }

    let flag = ''
    const scrollTask = btf.rafThrottle(() => {
      if (checkDocumentHeight()) return

      const currentTop = window.scrollY || document.documentElement.scrollTop
      const isDown = scrollDirection(currentTop)
      if (currentTop > 56) {
        if (flag === '') {
          $header.classList.add('nav-fixed')
          $rightside.classList.add('rightside-show')
        }

        if (isDown) {
          if (flag !== 'down') {
            $header.classList.remove('nav-visible')
            flag = 'down'
          }
        } else {
          if (flag !== 'up') {
            $header.classList.add('nav-visible')
            flag = 'up'
          }
        }
      } else {
        flag = ''
        if (currentTop === 0) {
          $header.classList.remove('nav-fixed', 'nav-visible')
        }
        $rightside.classList.remove('rightside-show')
      }

      isShowPercent && rightsideScrollPercent(currentTop)
    })

    checkDocumentHeight()
    btf.addPageEventListener(window, 'scroll', scrollTask, { passive: true })
  }

  const handleThemeChange = mode => {
    const globalFn = window.globalFn || {}
    const themeChange = globalFn.themeChange
    if (!themeChange) return

    Object.keys(themeChange).forEach(key => {
      const fn = themeChange[key]
      if (typeof fn !== 'function') return

      fn(mode)
    })
  }

  const rightSideFn = {
    readmode: () => { // read mode
      if (document.querySelector('.exit-readmode')) return
      const $body = document.body
      const newEle = document.createElement('button')

      const exitReadMode = () => {
        $body.classList.remove('read-mode')
        newEle.remove()
        newEle.removeEventListener('click', exitReadMode)
      }

      $body.classList.add('read-mode')
      newEle.type = 'button'
      newEle.className = 'exit-readmode'
      newEle.innerHTML = '<i class="fas fa-sign-out-alt"></i>'
      newEle.addEventListener('click', exitReadMode)
      $body.appendChild(newEle)
      btf.addGlobalFn('pageCleanup', exitReadMode, 'exitReadMode')
    },
    darkmode: () => { // switch between light and dark mode
      const willChangeMode = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
      if (willChangeMode === 'dark') {
        btf.activateDarkMode()
      } else {
        btf.activateLightMode()
      }
      btf.saveToLocal.set('theme', willChangeMode, 2)
      handleThemeChange(willChangeMode)
    },
    'rightside-config': item => { // Show or hide rightside-hide-btn
      const hideLayout = item.firstElementChild
      if (hideLayout.classList.contains('show')) {
        hideLayout.classList.add('status')
        setTimeout(() => {
          hideLayout.classList.remove('status')
        }, 300)
      }

      hideLayout.classList.toggle('show')
    },
    'go-up': () => { // Back to top
      btf.scrollToDest(0, 500)
    },
    'hide-aside-btn': () => { // Hide aside
      const $htmlDom = document.documentElement.classList
      const saveStatus = $htmlDom.contains('hide-aside') ? 'show' : 'hide'
      btf.saveToLocal.set('aside-status', saveStatus, 2)
      $htmlDom.toggle('hide-aside')
    },
    'mobile-toc-button': (p, item) => { // Show mobile toc
      const tocEle = document.getElementById('card-toc')
      tocEle.style.transition = 'transform 0.3s ease-in-out'

      const tocEleHeight = tocEle.clientHeight
      const btData = item.getBoundingClientRect()

      const tocEleBottom = window.innerHeight - btData.bottom - 30
      if (tocEleHeight > tocEleBottom) {
        tocEle.style.transformOrigin = `right ${tocEleHeight - tocEleBottom - btData.height / 2}px`
      }

      tocEle.classList.toggle('open')
      tocEle.addEventListener('transitionend', () => {
        tocEle.style.cssText = ''
      }, { once: true })
    },
  }

  document.getElementById('rightside').addEventListener('click', e => {
    const $target = e.target.closest('[id]')
    if ($target && rightSideFn[$target.id]) {
      rightSideFn[$target.id](e.currentTarget, $target)
    }
  })

  const clickFnOfSubMenu = () => {
    const handleClickOfSubMenu = e => {
      const target = e.target.closest('.site-page.group')
      if (!target) return
      target.classList.toggle('hide')
    }

    const menusItems = document.querySelector('#sidebar-menus .menus_items')
    menusItems && menusItems.addEventListener('click', handleClickOfSubMenu)
  }

  const openMobileMenu = () => {
    const toggleMenu = document.getElementById('toggle-menu')
    if (!toggleMenu) return
    btf.addPageEventListener(toggleMenu, 'click', () => { sidebarFn.open() })
  }

  // One copy handler keeps TeX and copyright text consistent across navigation.

  const toggleCardCategory = () => {
    const cardCategory = document.querySelector('#aside-cat-list.expandBtn')
    if (!cardCategory) return

    const handleToggleBtn = e => {
      const target = e.target
      if (target.nodeName === 'I') {
        e.preventDefault()
        target.parentNode.classList.toggle('expand')
      }
    }
    btf.addPageEventListener(cardCategory, 'click', handleToggleBtn, true)
  }

  const lazyloadImg = () => {
    window.lazyLoadInstance = new LazyLoad({
      elements_selector: 'img',
      threshold: 0,
      data_src: 'lazy-src'
    })

    btf.addGlobalFn('pageLoad', () => {
      window.lazyLoadInstance.update()
    }, 'lazyload')
  }

  const unRefreshFn = () => {
    const resizeHandler = btf.rafThrottle(() => {
      adjustMenu(false)
      if (mobileSidebarOpen && btf.isHidden(document.getElementById('toggle-menu'))) {
        sidebarFn.close()
      }
    })
    window.addEventListener('resize', resizeHandler, { passive: true })

    const menuMask = document.getElementById('menu-mask')
    menuMask && menuMask.addEventListener('click', () => { sidebarFn.close() })

    clickFnOfSubMenu()
    GLOBAL_CONFIG.islazyloadPlugin && lazyloadImg()
    if (GLOBAL_CONFIG.copy.tex || GLOBAL_CONFIG.copyright) import('./modules/copy.js').then(({ addCopyHandler }) => addCopyHandler())

    if (GLOBAL_CONFIG.autoDarkmode) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (btf.saveToLocal.get('theme') !== undefined) return
        e.matches ? handleThemeChange('dark') : handleThemeChange('light')
      })
    }
  }

  const scrollDownInIndex = () => {
    const handleScrollToDest = () => {
      btf.scrollToDest(document.getElementById('content-inner').offsetTop, 300)
    }

    const $scrollDownEle = document.getElementById('scroll-down')
    $scrollDownEle && btf.addPageEventListener($scrollDownEle, 'click', handleScrollToDest)
  }

  const loadOptionalModules = () => {
    document.querySelectorAll('script[data-dragonfly-module]').forEach(script => {
      if (script.dataset.dragonflyModule === 'echarts_runtime' && !document.querySelector('#article-container .echarts-container')) return
      import(script.dataset.src).catch(error => console.error('[module]', error))
    })
  }

  const mountedArticles = new WeakSet()
  const forPostFn = () => {
    const article = document.getElementById('article-container')
    if (!article || article.querySelector('.hbe-container')) return
    loadOptionalModules()
    if (!mountedArticles.has(article)) {
      mountedArticles.add(article)
      import('./modules/article.js').then(({ mountArticle }) => {
        if (article.isConnected) mountArticle(article)
      }).catch(error => { mountedArticles.delete(article); console.error('[article]', error) })
    }
    if (article.querySelector('img') && (GLOBAL_CONFIG.isPhotoFigcaption || GLOBAL_CONFIG.lightbox !== 'null')) {
      import('./modules/media.js').then(({ mountMedia }) => { if (article.isConnected) mountMedia(article) })
    }
    const galleries = article.querySelectorAll('.gallery-container')
    if (galleries.length) import('./modules/gallery.js').then(({ addJustifiedGallery }) => { if (article.isConnected) addJustifiedGallery(galleries) })
  }

  const refreshFn = () => {
    initAdjust()
    goUpElement = document.getElementById('go-up')
    scrollPercentElement = goUpElement?.querySelector('.scroll-percent')

    if (document.querySelector('#recent-posts.masonry')) import('./modules/gallery.js').then(({ justifiedIndexPostUI }) => justifiedIndexPostUI())

    if (GLOBAL_CONFIG_SITE.pageType === 'post') {
      addPostOutdateNotice()
      GLOBAL_CONFIG.relativeDate.post && relativeDate(document.querySelectorAll('#post-meta time'))
    } else {
      GLOBAL_CONFIG.relativeDate.homepage && relativeDate(document.querySelectorAll('#recent-posts time'))
      GLOBAL_CONFIG.runtime && addRuntime()
      addLastPushDate()
      toggleCardCategory()
    }

    GLOBAL_CONFIG_SITE.pageType === 'home' && scrollDownInIndex()
    scrollFn()

    if (GLOBAL_CONFIG_SITE.pageType !== 'shuoshuo') {
      forPostFn()
      btf.switchComments(document)
    }

    openMobileMenu()
  }

  btf.addGlobalFn('pageLoad', refreshFn, 'refreshFn')
  refreshFn()
  unRefreshFn()
  loadOptionalModules()

  // 處理 hexo-blog-encrypt 事件
  window.addEventListener('hexo-blog-decrypt', e => {
    forPostFn()
    const encryptFn = window.globalFn && window.globalFn.encrypt ? window.globalFn.encrypt : {}
    Object.values(encryptFn).forEach(fn => {
      fn()
    })
  })

  document.addEventListener('shuoshuo:rendered', forPostFn)
})
