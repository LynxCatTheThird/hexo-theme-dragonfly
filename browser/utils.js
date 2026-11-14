// SPDX-License-Identifier: Apache-2.0
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
(() => {
  const dragonflyMethods = {
    debounce: (func, wait = 0, immediate = false) => {
      let timeout
      const debounced = (...args) => {
        const later = () => {
          timeout = null
          if (!immediate) func(...args)
        }
        const callNow = immediate && !timeout
        clearTimeout(timeout)
        timeout = setTimeout(later, wait)
        if (callNow) func(...args)
      }
      debounced.cancel = () => { clearTimeout(timeout); timeout = null }
      return debounced
    },

    throttle: (func, wait, options = {}) => {
      let timeout, args
      let previous = 0

      const later = () => {
        previous = options.leading === false ? 0 : new Date().getTime()
        timeout = null
        func(...args)
        if (!timeout) args = null
      }

      return (...params) => {
        const now = new Date().getTime()
        if (!previous && options.leading === false) previous = now
        const remaining = wait - (now - previous)
        args = params

        if (remaining <= 0 || remaining > wait) {
          if (timeout) {
            clearTimeout(timeout)
            timeout = null
          }
          previous = now
          func(...args)
          if (!timeout) args = null
        } else if (!timeout && options.trailing !== false) {
          timeout = setTimeout(later, remaining)
        }
      }
    },

    rafThrottle: fn => {
      let rafId = null
      const throttled = (...args) => {
        if (rafId) return
        rafId = requestAnimationFrame(() => {
          fn(...args)
          rafId = null
        })
      }
      throttled.cancel = () => { cancelAnimationFrame(rafId); rafId = null }
      return throttled
    },

    overflowPaddingR: {
      add: () => {
        const paddingRight = window.innerWidth - document.body.clientWidth

        if (paddingRight > 0) {
          document.body.style.paddingRight = `${paddingRight}px`
          document.body.style.overflow = 'hidden'
          const header = document.getElementById('page-header')
          const menu = document.getElementById('menus')
          if (header && menu && header.classList.contains('nav-fixed')) {
            menu.style.paddingRight = `${paddingRight}px`
          }
        }
      },
      remove: () => {
        document.body.style.paddingRight = ''
        document.body.style.overflow = ''
        const header = document.getElementById('page-header')
        const menu = document.getElementById('menus')
        if (header && menu && header.classList.contains('nav-fixed')) {
          menu.style.paddingRight = ''
        }
      }
    },

    diffDate: (inputDate, more = false) => {
      const dateNow = new Date()
      const datePost = new Date(inputDate)
      const diffMs = dateNow - datePost
      const diffSec = diffMs / 1000
      const diffMin = diffSec / 60
      const diffHour = diffMin / 60
      const diffDay = diffHour / 24
      const diffMonth = diffDay / 30
      const { dateSuffix } = GLOBAL_CONFIG

      if (!more) return Math.floor(diffDay)

      if (diffMonth > 12) return datePost.toISOString().slice(0, 10)
      if (diffMonth >= 1) return `${Math.floor(diffMonth)} ${dateSuffix.month}`
      if (diffDay >= 1) return `${Math.floor(diffDay)} ${dateSuffix.day}`
      if (diffHour >= 1) return `${Math.floor(diffHour)} ${dateSuffix.hour}`
      if (diffMin >= 1) return `${Math.floor(diffMin)} ${dateSuffix.min}`
      return dateSuffix.just
    },

    loadComment: (dom, callback) => {
      const signal = dragonfly.pageSignal
      if (!dom || signal.aborted) return
      if ('IntersectionObserver' in window) {
        const observerItem = new IntersectionObserver(entries => {
          if (!signal.aborted && dom.isConnected && entries[0].isIntersecting) {
            callback()
            observerItem.disconnect()
          }
        }, { threshold: [0] })
        observerItem.observe(dom)
        signal.addEventListener('abort', () => observerItem.disconnect(), { once: true })
      } else {
        callback()
      }
    },

    scrollToDest: (pos, time = 500) => {
      const currentPos = window.scrollY
      const isNavFixed = document.getElementById('page-header').classList.contains('fixed')
      if (currentPos > pos || isNavFixed) pos = pos - 70

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        window.scrollTo({ top: pos, behavior: 'instant' })
        return
      }

      if ('scrollBehavior' in document.documentElement.style) {
        window.scrollTo({
          top: pos,
          behavior: 'smooth'
        })
        return
      }

      const startTime = performance.now()
      const animate = currentTime => {
        const timeElapsed = currentTime - startTime
        const progress = Math.min(timeElapsed / time, 1)
        const easedProgress = 1 - Math.pow(1 - progress, 4) // 四次方缓出曲线。
        window.scrollTo(0, currentPos + (pos - currentPos) * easedProgress)
        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }
      requestAnimationFrame(animate)
    },

    animateIn: (ele, animation) => {
      ele.style.display = 'block'
      ele.style.animation = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? '' : animation
    },

    animateOut: (ele, animation) => {
      const handleAnimationEnd = () => {
        ele.style.display = ''
        ele.style.animation = ''
        ele.removeEventListener('animationend', handleAnimationEnd)
      }
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return handleAnimationEnd()
      ele.addEventListener('animationend', handleAnimationEnd)
      ele.style.animation = animation
    },

    wrap: (selector, eleType, options) => {
      const createEle = document.createElement(eleType)
      for (const [key, value] of Object.entries(options)) {
        createEle.setAttribute(key, value)
      }
      selector.parentNode.insertBefore(createEle, selector)
      createEle.appendChild(selector)
    },

    isHidden: ele => ele.offsetHeight === 0 && ele.offsetWidth === 0,

    getEleTop: ele => ele.getBoundingClientRect().top + window.scrollY,

    loadLightbox: async ele => {
      const signal = dragonfly.pageSignal
      const service = GLOBAL_CONFIG.lightbox
      if (!ele.length || !['medium_zoom', 'fancybox'].includes(service)) return
      try {
        await dragonfly.getScript(GLOBAL_CONFIG.lightboxSrc)
      } catch (error) { console.error('[lightbox]', error); return }
      if (signal.aborted) return
      ele = [...ele].filter(element => element.isConnected)
      if (!ele.length) return

      if (service === 'medium_zoom') {
        if (typeof window.mediumZoom !== 'function') return
        const zoom = window.mediumZoomInstance || (window.mediumZoomInstance = mediumZoom({ background: 'var(--zoom-bg)', ...GLOBAL_CONFIG.lightboxOptions }))
        zoom.attach(ele)

        dragonfly.addGlobalFn('pageCleanup', () => {
          window.mediumZoomInstance && window.mediumZoomInstance.detach()
        }, 'mediumZoom')
        return
      }

      if (service === 'fancybox') {
        if (typeof window.Fancybox?.bind !== 'function') return
        dragonfly.addGlobalFn('pageCleanup', () => {
          Fancybox.destroy()
          window.fancyboxRun = false
        }, 'fancybox')
        ele.forEach(i => {
          const target = i.parentNode.tagName === 'PICTURE' ? i.parentNode : i
          if (target.parentNode.tagName !== 'A') {
            const dataSrc = i.dataset.lazySrc || i.src
            const dataCaption = i.title || i.alt || ''
            dragonfly.wrap(target, 'a', { href: dataSrc, 'data-fancybox': 'gallery', 'data-caption': dataCaption, 'data-thumb': dataSrc })
          }
        })

        if (!window.fancyboxRun) {
          const options = {
            Hash: false,
            Carousel: {
              transition: 'slide',
              Thumbs: {
                showOnStart: false
              },
              Toolbar: {
                display: {
                  left: ['counter'],
                  middle: [
                    'zoomIn',
                    'zoomOut',
                    'toggle1to1',
                    'rotateCCW',
                    'rotateCW',
                    'flipX',
                    'flipY',
                    'reset'
                  ],
                  right: ['autoplay', 'thumbs', 'close']
                }
              },
              Zoomable: {
                Panzoom: {
                  maxScale: 4
                }
              }
            },
            hideScrollbar: false
          }

          Fancybox.bind('[data-fancybox]', { ...options, ...GLOBAL_CONFIG.lightboxOptions })
          window.fancyboxRun = true
        }
      }
    },

    setLoading: {
      add: ele => {
        const html = `
        <div class="loading-container">
          <div class="loading-item">
            <div></div><div></div><div></div><div></div><div></div>
          </div>
        </div>
      `
        ele.insertAdjacentHTML('afterend', html)
      },
      remove: ele => {
        ele.nextElementSibling.remove()
      }
    },

    updateAnchor: anchor => {
      if (anchor !== window.location.hash) {
        if (!anchor) anchor = location.pathname + location.search
        const title = GLOBAL_CONFIG_SITE.title
        window.history.replaceState({
          ...window.history.state,
          url: new URL(anchor, location.href).href,
          title
        }, title, anchor)
      }
    },

    getScrollPercent: (() => {
      let cache = new WeakMap()

      window.addEventListener('resize', () => {
        cache = new WeakMap()
      }, { signal: window.dragonfly?.appSignal })

      return (currentTop, ele, useDocHeight = ele === document.body) => {
        const eleHeight = ele.clientHeight
        const winHeight = window.innerHeight
        const cacheData = cache.get(ele)
        let data = cacheData

        if (
          !cacheData ||
          cacheData.docHeight !== eleHeight ||
          cacheData.winHeight !== winHeight ||
          cacheData.useDocHeight !== useDocHeight
        ) {
          const headerHeight = ele.offsetTop
          const contentMath = useDocHeight
            ? Math.max(eleHeight - winHeight, document.documentElement.scrollHeight - winHeight)
            : Math.max(eleHeight - winHeight, 1)

          data = {
            docHeight: eleHeight,
            winHeight,
            useDocHeight,
            headerHeight,
            contentMath
          }

          cache.set(ele, data)
        }

        const scrollPercent = (currentTop - data.headerHeight) / data.contentMath
        return Math.max(0, Math.min(100, Math.round(scrollPercent * 100)))
      }
    })(),

    addPageEventListener: (ele, event, fn, option = false) => {
      // 调用方取消与离页取消均能解绑；节流回调还需清理自身排队的任务。
      const options = typeof option === 'boolean' ? { capture: option } : option
      const signal = options.signal && AbortSignal.any ? AbortSignal.any([options.signal, dragonfly.pageSignal]) : dragonfly.pageSignal
      if (options.signal?.aborted) return
      ele.addEventListener(event, fn, { ...options, signal })
      if (fn.cancel) signal.addEventListener('abort', fn.cancel, { once: true })
      if (options.signal && !AbortSignal.any) options.signal.addEventListener('abort', () => ele.removeEventListener(event, fn, options), { once: true, signal: dragonfly.pageSignal })
    },

    addAppEventListener: (ele, event, fn, option = false) => {
      const options = typeof option === 'boolean' ? { capture: option } : option
      ele.addEventListener(event, fn, { ...options, signal: dragonfly.appSignal })
    },

    switchComments: (el = document, path) => {
      const switchBtn = el.querySelector('#switch-btn')
      if (!switchBtn) return

      let switchDone = false
      const postComment = el.querySelector('#post-comment')
      const handleSwitchBtn = () => {
        postComment.classList.toggle('move')
        switchBtn.setAttribute('aria-checked', postComment.classList.contains('move'))
        if (!switchDone && typeof loadOtherComment === 'function') {
          switchDone = true
          loadOtherComment(el, path)
        }
      }
      dragonfly.addPageEventListener(switchBtn, 'click', handleSwitchBtn)
    }
  }

  Object.assign(window.dragonfly || (window.dragonfly = {}), dragonflyMethods)
})()
