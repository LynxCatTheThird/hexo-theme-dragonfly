// Modified in Dragonfly.
const addHighlightTool = $article => {
  const highLight = GLOBAL_CONFIG.highlight
  if (!highLight) return

  const { highlightCopy, highlightLang, highlightHeightLimit, highlightFullpage, highlightMacStyle, plugin } = highLight
  const isHighlightShrink = GLOBAL_CONFIG_SITE.isHighlightShrink
  const isShowTool = highlightCopy || highlightLang || isHighlightShrink !== undefined || highlightFullpage || highlightMacStyle
  const isNotHighlightJs = plugin !== 'highlight.js'
  const isPrismjs = plugin === 'prismjs'
  const $figureHighlight = isNotHighlightJs
    ? Array.from($article.querySelectorAll('code[class*="language-"]')).map(code => code.parentElement)
    : $article.querySelectorAll('figure.highlight')

  if (!((isShowTool || highlightHeightLimit) && $figureHighlight.length)) return

  const highlightShrinkClass = isHighlightShrink === true ? 'closed' : ''
  const highlightShrinkEle = isHighlightShrink !== undefined ? '<i class="fas fa-angle-down expand"></i>' : ''
  const highlightCopyEle = highlightCopy ? '<i class="fas fa-paste copy-button"></i>' : ''
  const highlightMacStyleEle = '<div class="macStyle"><div class="mac-close"></div><div class="mac-minimize"></div><div class="mac-maximize"></div></div>'
  const highlightFullpageEle = highlightFullpage ? '<i class="fa-solid fa-up-right-and-down-left-from-center fullpage-button"></i>' : ''

  const alertInfo = (ele, text) => {
    if (!ele.isConnected) return
    const signal = btf.pageSignal
    let removeTimer
    const newEle = document.createElement('div')
    newEle.className = 'copy-notice'
    newEle.textContent = text
    document.body.appendChild(newEle)

    const buttonRect = ele.getBoundingClientRect()
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft

    // X-axis boundary check
    const halfWidth = newEle.offsetWidth / 2
    const centerLeft = buttonRect.left + scrollLeft + buttonRect.width / 2
    const finalLeft = Math.max(halfWidth + 10, Math.min(window.innerWidth - halfWidth - 10, centerLeft))

    // Show tooltip below button if too close to top
    const normalTop = buttonRect.top + scrollTop - 40
    const shouldShowBelow = buttonRect.top < 60 || normalTop < 10

    const topValue = shouldShowBelow ? buttonRect.top + scrollTop + buttonRect.height + 10 : normalTop

    newEle.style.cssText = `
  top: ${topValue + 10}px;
  left: ${finalLeft}px;
  transform: translateX(-50%);
  opacity: 0;
  transition: opacity 0.3s ease, top 0.3s ease;
`

    const frame = requestAnimationFrame(() => {
      if (signal.aborted) return
      newEle.style.opacity = '1'
      newEle.style.top = `${topValue}px`
    })

    const timer = setTimeout(() => {
      if (signal.aborted) return
      newEle.style.opacity = '0'
      newEle.style.top = `${topValue + 10}px`
      removeTimer = setTimeout(() => {
        newEle?.remove()
      }, 300)
    }, 800)
    signal.addEventListener('abort', () => { cancelAnimationFrame(frame); clearTimeout(timer); clearTimeout(removeTimer); newEle.remove() }, { once: true })
  }

  const copy = async (text, ctx) => {
    try {
      await navigator.clipboard.writeText(text)
      alertInfo(ctx, GLOBAL_CONFIG.copy.success)
    } catch (err) {
      console.error('Failed to copy: ', err)
      alertInfo(ctx, GLOBAL_CONFIG.copy.noSupport)
    }
  }

  // click events
  const highlightCopyFn = (ele, clickEle) => {
    const $buttonParent = ele.parentNode
    $buttonParent.classList.add('copy-true')
    const preCodeSelector = isNotHighlightJs ? 'pre code' : 'table .code pre'
    const codeElement = $buttonParent.querySelector(preCodeSelector)
    if (!codeElement) return
    copy(codeElement.innerText, clickEle)
    $buttonParent.classList.remove('copy-true')
  }

  const highlightShrinkFn = ele => ele.classList.toggle('closed')

  const codeFullpage = (item, clickEle) => {
    const wrapEle = item.closest('figure.highlight')
    const isFullpage = wrapEle.classList.toggle('code-fullpage')

    document.body.style.overflow = isFullpage ? 'hidden' : ''
    clickEle.classList.toggle('fa-down-left-and-up-right-to-center', isFullpage)
    clickEle.classList.toggle('fa-up-right-and-down-left-from-center', !isFullpage)
  }

  const highlightToolsFn = e => {
    const $target = e.target.classList
    const currentElement = e.currentTarget
    if ($target.contains('expand')) highlightShrinkFn(currentElement)
    else if ($target.contains('copy-button')) highlightCopyFn(currentElement, e.target)
    else if ($target.contains('fullpage-button')) codeFullpage(currentElement, e.target)
  }

  const expandCode = e => e.currentTarget.classList.toggle('expand-done')

  // 獲取隱藏狀態下元素的真實高度
  const getActualHeight = item => {
    if (item.offsetHeight > 0) return item.offsetHeight

    const clone = item.cloneNode(true)

    clone.style.cssText = `
      position: absolute !important;
      visibility: hidden !important;
      display: block !important;
      left: 0 !important;
      top: 0 !important;
      pointer-events: none !important;
      z-index: -1 !important;
      margin: 0 !important;
    `

    item.parentNode.insertBefore(clone, item)
    const height = clone.offsetHeight
    clone.remove()
    return height
  }

  const createEle = (lang, item) => {
    const fragment = document.createDocumentFragment()

    if (isShowTool) {
      const hlTools = document.createElement('div')
      hlTools.className = `highlight-tools ${highlightShrinkClass}`
      hlTools.innerHTML = highlightMacStyleEle + highlightShrinkEle + lang + highlightCopyEle + highlightFullpageEle
      btf.addPageEventListener(hlTools, 'click', highlightToolsFn)
      fragment.appendChild(hlTools)
    }

    if (highlightHeightLimit && getActualHeight(item) > highlightHeightLimit + 30) {
      const ele = document.createElement('div')
      ele.className = 'code-expand-btn'
      ele.innerHTML = '<i class="fas fa-angle-double-down"></i>'
      btf.addPageEventListener(ele, 'click', expandCode)
      fragment.appendChild(ele)
    }

    isNotHighlightJs ? item.parentNode.insertBefore(fragment, item) : item.insertBefore(fragment, item.firstChild)
  }

  $figureHighlight.forEach(item => {
    let langName = ''
    if (isNotHighlightJs) {
      const newClassName = isPrismjs ? 'prismjs' : 'default'
      btf.wrap(item, 'figure', { class: `highlight ${newClassName}` })
    }

    if (!highlightLang) {
      createEle('', item)
      return
    }

    if (isNotHighlightJs) {
      langName = isPrismjs ? item.getAttribute('data-language') || 'Code' : item.querySelector('code').getAttribute('class').replace('language-', '')
    } else {
      langName = item.getAttribute('class').split(' ')[1]
      if (langName === 'plain' || langName === undefined) langName = 'Code'
    }
    createEle(`<div class="code-lang">${langName}</div>`, item)
  })
}

const scrollFnToDo = $article => {
  const isToc = GLOBAL_CONFIG_SITE.isToc
  const isAnchor = GLOBAL_CONFIG.isAnchor

  if (!($article && (isToc || isAnchor))) return

  let $tocLink, $cardToc, autoScrollToc, $tocPercentage, isExpand

  if (isToc) {
    const $cardTocLayout = document.getElementById('card-toc')
    $cardToc = $cardTocLayout.querySelector('.toc-content')
    $tocLink = $cardToc.querySelectorAll('.toc-link')
    $tocPercentage = $cardTocLayout.querySelector('.toc-percentage')
    isExpand = $cardToc.classList.contains('is-expand')

    const tocItemClickFn = e => {
      const target = e.target.closest('.toc-link')
      if (!target) return

      e.preventDefault()
      btf.scrollToDest(btf.getEleTop(document.getElementById(decodeURI(target.getAttribute('href')).replace('#', ''))), 300)
      if (window.innerWidth < 900) {
        $cardTocLayout.classList.remove('open')
      }
    }

    btf.addPageEventListener($cardToc, 'click', tocItemClickFn)

    autoScrollToc = item => {
      const sidebarHeight = $cardToc.clientHeight
      const itemOffsetTop = item.offsetTop
      const itemHeight = item.clientHeight
      const scrollTop = $cardToc.scrollTop
      const offset = itemOffsetTop - scrollTop
      const middlePosition = (sidebarHeight - itemHeight) / 2

      if (offset !== middlePosition) {
        $cardToc.scrollTop = scrollTop + (offset - middlePosition)
      }
    }

    $cardToc.style.display = 'block'
  }

  const $articleList = $article.querySelectorAll('h1,h2,h3,h4,h5,h6')
  if (!$articleList.length) return

  let activeTocItem = null
  let activeParentItems = []

  const updateTocUI = currentId => {
    const encodedAnchor = currentId ? '#' + encodeURI(decodeURI(currentId)) : ''
    if (isAnchor) btf.updateAnchor(encodedAnchor)

    if (!isToc) return

    if (activeTocItem) activeTocItem.classList.remove('active')
    activeParentItems.forEach(i => i.classList.remove('active'))
    activeParentItems = []

    if (!currentId) {
      activeTocItem = null
      return
    }

    const targetLink = Array.from($tocLink).find(link => {
      const href = link.getAttribute('href')
      if (!href) return false
      return decodeURI(href).replace('#', '') === decodeURI(currentId)
    })

    if (!targetLink) return

    targetLink.classList.add('active')
    activeTocItem = targetLink
    setTimeout(() => autoScrollToc(targetLink), 0)

    if (!isExpand) {
      let parent = targetLink.parentNode
      while (!parent.matches('.toc')) {
        if (parent.matches('li')) {
          parent.classList.add('active')
          activeParentItems.push(parent)
        }
        parent = parent.parentNode
      }
    }
  }

  const observerOptions = {
    root: null,
    rootMargin: '-60px 0px -80% 0px',
    threshold: 0
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        updateTocUI(entry.target.id)
      }
    })
  }, observerOptions)

  $articleList.forEach(ele => observer.observe(ele))

  const scrollHandler = btf.rafThrottle(() => {
    const currentTop = window.scrollY || document.documentElement.scrollTop

    if (isToc && GLOBAL_CONFIG.percent.toc) {
      $tocPercentage.textContent = btf.getScrollPercent(currentTop, $article, false)
    }

    if (currentTop === 0) {
      updateTocUI('')
    } else if (currentTop + window.innerHeight >= document.documentElement.scrollHeight - 10) {
      const lastHeader = $articleList[$articleList.length - 1]
      updateTocUI(lastHeader.id)
    }
  })

  btf.addPageEventListener(window, 'scroll', scrollHandler, { passive: true })

  btf.addGlobalFn('pageCleanup', () => {
    observer.disconnect()
  })
}

const addTableWrap = $article => {
  const $table = $article.querySelectorAll('table')
  if (!$table.length) return

  $table.forEach(item => {
    if (!item.closest('.highlight')) {
      btf.wrap(item, 'div', { class: 'table-wrap' })
    }
  })
}

const clickFnOfTagHide = $article => {
  const hideButtons = $article.querySelectorAll('.hide-button')
  if (!hideButtons.length) return

  const handleClickOfTagHide = e => {
    const button = e.target.closest('.hide-button')
    if (!button) return
    button.classList.add('open')
    addJustifiedGallery(button.nextElementSibling.querySelectorAll('.gallery-container'))
  }

  btf.addPageEventListener($article, 'click', handleClickOfTagHide)
}

const tabsFn = $article => {
  if (!$article.querySelector('.tabs')) return

  const setActiveClass = (elements, activeIndex) => {
    elements.forEach((el, index) => {
      const active = index === activeIndex
      el.classList.toggle('active', active)
      if (el.getAttribute('role') === 'tab') {
        el.setAttribute('aria-selected', active)
        el.tabIndex = active ? 0 : -1
      } else el.hidden = !active
    })
  }

  const handleClick = e => {
    const tabsRoot = e.target.closest('.tabs')
    if (!tabsRoot) return

    const navContainer = tabsRoot.firstElementChild
    const toTopContainer = tabsRoot.lastElementChild

    if (navContainer.contains(e.target)) {
      const target = e.target.closest('button')
      if (!target || target.classList.contains('active')) return

      const navItems = [...navContainer.children]
      const tabContents = [...navContainer.nextElementSibling.children]
      const indexOfButton = navItems.indexOf(target)
      setActiveClass(navItems, indexOfButton)
      navContainer.classList.remove('no-default')
      setActiveClass(tabContents, indexOfButton)
      const galleries = tabContents[indexOfButton].querySelectorAll('.gallery-container')
      if (galleries.length) import('./gallery.js').then(({ addJustifiedGallery }) => {
        if (tabsRoot.isConnected) addJustifiedGallery(galleries, true)
      })
      return
    }

    if (toTopContainer.contains(e.target) && e.target.closest('button')) {
      btf.scrollToDest(btf.getEleTop(tabsRoot), 300)
    }
  }

  btf.addPageEventListener($article, 'click', handleClick)
  btf.addPageEventListener($article, 'keydown', event => {
    const tab = event.target.closest('.nav-tabs > button')
    if (!tab) return
    const tabs = [...tab.parentElement.children]
    const index = tabs.indexOf(tab)
    const offsets = { ArrowLeft: -1, ArrowRight: 1, Home: -index, End: tabs.length - 1 - index }
    if (!(event.key in offsets)) return
    event.preventDefault()
    const next = tabs[(index + offsets[event.key] + tabs.length) % tabs.length]
    next.focus()
    next.click()
  })
}

export const mountArticle = article => {
  addHighlightTool(article)
  scrollFnToDo(article)
  addTableWrap(article)
  clickFnOfTagHide(article)
  tabsFn(article)
}
