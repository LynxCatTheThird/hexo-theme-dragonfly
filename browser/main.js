// SPDX-License-Identifier: Apache-2.0
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
import { addRuntime, addLastPushDate, relativeDate, addPostOutdateNotice } from './dates.js'

document.addEventListener('DOMContentLoaded', () => {
  let headerContentWidth, $nav
  let mobileSidebarOpen = false

  // 右侧阅读进度。
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

  // 初始化页头。
  const initAdjust = () => {
    adjustMenu(true)
    $nav.classList.add('show')
  }

  // 移动端侧栏菜单。
  const sidebarFn = {
    open: () => {
      dragonfly.overflowPaddingR.add()
      dragonfly.animateIn(document.getElementById('menu-mask'), 'to_show 0.5s')
      document.getElementById('sidebar-menus').classList.add('open')
      mobileSidebarOpen = true
    },
    close: () => {
      dragonfly.overflowPaddingR.remove()
      dragonfly.animateOut(document.getElementById('menu-mask'), 'to_hide 0.5s')
      document.getElementById('sidebar-menus').classList.remove('open')
      mobileSidebarOpen = false
    }
  }

  const rightsideScrollPercent = currentTop => {
    const scrollPercent = dragonfly.getScrollPercent(currentTop, document.body)

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

    // 检查文档高度是否小于视窗高度
    const checkDocumentHeight = () => {
      if (document.body.scrollHeight <= window.innerHeight + 56) {
        $rightside.classList.add('rightside-show')
        return true
      }
      return false
    }

    // 判断滚动方向。
    const scrollDirection = currentTop => {
      const result = currentTop > initTop // true 向下，false 向上。
      initTop = currentTop
      return result
    }

    let flag = ''
    const scrollTask = dragonfly.rafThrottle(() => {
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
    dragonfly.addPageEventListener(window, 'scroll', scrollTask, { passive: true })
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
    readmode: () => { // 阅读模式。
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
      dragonfly.addGlobalFn('pageCleanup', exitReadMode, 'exitReadMode')
    },
    darkmode: () => { // 切换浅色与深色模式。
      const willChangeMode = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
      if (willChangeMode === 'dark') {
        dragonfly.activateDarkMode()
      } else {
        dragonfly.activateLightMode()
      }
      dragonfly.saveToLocal.set('theme', willChangeMode, 2)
      handleThemeChange(willChangeMode)
    },
    'rightside-config': item => { // 展开或收起工具栏按钮。
      const hideLayout = item.firstElementChild
      if (hideLayout.classList.contains('show')) {
        hideLayout.classList.add('status')
        setTimeout(() => {
          hideLayout.classList.remove('status')
        }, 300)
      }

      hideLayout.classList.toggle('show')
    },
    'go-up': () => { // 返回顶部。
      dragonfly.scrollToDest(0, 500)
    },
    'hide-aside-btn': () => { // 切换侧栏可见性。
      const $htmlDom = document.documentElement.classList
      const saveStatus = $htmlDom.contains('hide-aside') ? 'show' : 'hide'
      dragonfly.saveToLocal.set('aside-status', saveStatus, 2)
      $htmlDom.toggle('hide-aside')
    },
    'mobile-toc-button': (p, item) => { // 显示移动端目录。
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

  dragonfly.addAppEventListener(document.getElementById('rightside'), 'click', e => {
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
    dragonfly.addPageEventListener(toggleMenu, 'click', () => { sidebarFn.open() })
  }

  // 统一处理公式复制和文章署名，切页后继续生效。

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
    dragonfly.addPageEventListener(cardCategory, 'click', handleToggleBtn, true)
  }

  const lazyloadImg = () => {
    window.lazyLoadInstance = new LazyLoad({
      elements_selector: 'img',
      threshold: 0,
      data_src: 'lazy-src'
    })

    dragonfly.addGlobalFn('pageLoad', () => {
      window.lazyLoadInstance.update()
    }, 'lazyload')
  }

  const unRefreshFn = () => {
    const resizeHandler = dragonfly.rafThrottle(() => {
      adjustMenu(false)
      if (mobileSidebarOpen && dragonfly.isHidden(document.getElementById('toggle-menu'))) {
        sidebarFn.close()
      }
    })
    dragonfly.addAppEventListener(window, 'resize', resizeHandler, { passive: true })

    const menuMask = document.getElementById('menu-mask')
    menuMask && dragonfly.addAppEventListener(menuMask, 'click', () => { sidebarFn.close() })

    clickFnOfSubMenu()
    GLOBAL_CONFIG.islazyloadPlugin && lazyloadImg()
    if (GLOBAL_CONFIG.copy.tex || GLOBAL_CONFIG.copyright) import('./modules/copy.js').then(({ addCopyHandler }) => addCopyHandler())


  }

  const scrollDownInIndex = () => {
    const handleScrollToDest = () => {
      dragonfly.scrollToDest(document.getElementById('content-inner').offsetTop, 300)
    }

    const $scrollDownEle = document.getElementById('scroll-down')
    $scrollDownEle && dragonfly.addPageEventListener($scrollDownEle, 'click', handleScrollToDest)
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
    window.lazyLoadInstance?.update()
    loadOptionalModules()
    const signal = dragonfly.pageSignal
    let ready
    if (!mountedArticles.has(article)) {
      mountedArticles.add(article)
      ready = import('./modules/article.js').then(({ mountArticle }) => {
        if (!signal.aborted && article.isConnected) mountArticle(article)
      }).catch(error => { mountedArticles.delete(article); console.error('[article]', error) })
    }
    if (article.querySelector('img') && (GLOBAL_CONFIG.isPhotoFigcaption || GLOBAL_CONFIG.lightbox !== 'null')) {
      import('./modules/media.js').then(({ mountMedia }) => { if (!signal.aborted && article.isConnected) mountMedia(article) })
    }
    const galleries = article.querySelectorAll('.gallery-container')
    if (galleries.length) import('./modules/gallery.js').then(({ addJustifiedGallery }) => { if (!signal.aborted && article.isConnected) addJustifiedGallery(galleries) })
    return ready
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

    let articleReady
    if (GLOBAL_CONFIG_SITE.pageType !== 'shuoshuo') {
      articleReady = forPostFn()
      dragonfly.switchComments(document)
    }

    openMobileMenu()
    return articleReady
  }

  dragonfly.addGlobalFn('pageLoad', refreshFn, 'refreshFn')
  refreshFn()
  unRefreshFn()
  loadOptionalModules()

  // 处理 hexo-blog-encrypt 事件
  dragonfly.addAppEventListener(window, 'hexo-blog-decrypt', e => {
    forPostFn()
    const encryptFn = window.globalFn && window.globalFn.encrypt ? window.globalFn.encrypt : {}
    Object.values(encryptFn).forEach(fn => {
      fn()
    })
  })

  dragonfly.addAppEventListener(document, 'shuoshuo:rendered', forPostFn)
})
