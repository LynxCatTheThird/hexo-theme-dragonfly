// SPDX-License-Identifier: Apache-2.0
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
const loading = new WeakSet()
const indexGrids = new WeakMap()

const fetchUrl = async (url, signal) => {
  try {
    const response = await fetch(url, { signal })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.json()
  } catch (error) {
    if (!signal.aborted) console.error('Failed to fetch URL:', error)
    throw error
  }
}

const runJustifiedGallery = (container, data, config, signal) => {
  const { isButton, tabs } = config
  const limit = Math.max(1, Number(config.limit) || 20)
  const firstLimit = Math.max(1, Number(config.firstLimit) || limit)

  const dataLength = data.length
  const maxGroupKey = dataLength
    ? Math.ceil(Math.max(0, dataLength - firstLimit) / limit) + 1
    : 0

  // 图库布局参数。
  const igConfig = {
    gap: 5,
    isConstantSize: true,
    sizeRange: [150, 600],
    useTransform: true
  }

  const ig = new InfiniteGrid.JustifiedInfiniteGrid(container, igConfig)
  let isLayoutHidden = false

  // 图片节点工具。
  const sanitizeString = str => String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const createImageItem = item => {
    const alt = item.alt ? `alt="${sanitizeString(item.alt)}"` : ''
    const title = item.title ? `title="${sanitizeString(item.title)}"` : ''
    const url = item.url ? sanitizeString(item.url) : ''
    return `<div class="item">
      <img src="${url}" data-grid-maintained-target="true" ${alt} ${title} />
    </div>`
  }

  const getItems = (nextGroupKey, count, isFirst = false) => {
    const startIndex = isFirst ? (nextGroupKey - 1) * count : (nextGroupKey - 2) * count + firstLimit
    return data.slice(startIndex, startIndex + count).map(createImageItem)
  }

  // 加载更多按钮。
  const addLoadMoreButton = container => {
    const button = document.createElement('button')
    button.innerHTML = `${GLOBAL_CONFIG.infinitegrid.buttonText}<i class="fa-solid fa-arrow-down"></i>`

    dragonfly.addPageEventListener(button, 'click', () => {
      button.remove()
      dragonfly.setLoading.add(container)
      appendItems(ig.getGroups().length + 1, limit)
    }, { once: true })

    container.insertAdjacentElement('afterend', button)
  }

  const appendItems = (nextGroupKey, count, isFirst) => {
    if (signal.aborted || !container.isConnected) return
    ig.append(getItems(nextGroupKey, count, isFirst), nextGroupKey)
  }

  // 图片加载与布局事件。
  const handleRenderComplete = e => {
    if (signal.aborted || !container.isConnected) return
    if (tabs) {
      const parentNode = container.parentNode
      if (isLayoutHidden) {
        parentNode.style.visibility = 'visible'
      }
      if (container.offsetHeight === 0) {
        parentNode.style.visibility = 'hidden'
        isLayoutHidden = true
      }
    }

    const { updated, isResize, mounted } = e
    if (!updated.length || !mounted.length || isResize) return

    dragonfly.loadLightbox(container.querySelectorAll('img:not(.medium-zoom-image)'))

    if (ig.getGroups().length === maxGroupKey) {
      dragonfly.setLoading.remove(container)
      !tabs && ig.off('renderComplete', handleRenderComplete)
      return
    }

    if (isButton) {
      dragonfly.setLoading.remove(container)
      addLoadMoreButton(container)
    }
  }

  const handleRequestAppend = dragonfly.debounce(e => {
    const nextGroupKey = (+e.groupKey || 0) + 1

    if (nextGroupKey === 1) appendItems(nextGroupKey, firstLimit, true)
    else appendItems(nextGroupKey, limit)

    if (nextGroupKey === maxGroupKey) ig.off('requestAppend', handleRequestAppend)
  }, 300)

  dragonfly.setLoading.add(container)
  ig.on('renderComplete', handleRenderComplete)

  if (isButton && dataLength) {
    appendItems(1, firstLimit, true)
  } else if (dataLength) {
    ig.on('requestAppend', handleRequestAppend)
    ig.renderItems()
  } else {
    dragonfly.setLoading.remove(container)
  }

  signal.addEventListener('abort', () => { handleRequestAppend.cancel(); ig.destroy() }, { once: true })
}

const addJustifiedGallery = async (elements, tabs = false) => {
  if (!elements.length) return
  const signal = dragonfly.pageSignal

  const initGallery = async () => {
    for (const element of elements) {
      if (signal.aborted || !element.isConnected || loading.has(element) || dragonfly.isHidden(element) || element.classList.contains('loaded')) continue
      loading.add(element)

      const config = {
        isButton: element.getAttribute('data-button') === 'true',
        limit: parseInt(element.getAttribute('data-limit'), 10),
        firstLimit: parseInt(element.getAttribute('data-first'), 10),
        tabs
      }

      const container = element.firstElementChild
      const content = container.textContent
      container.textContent = ''
      try {
        const data = element.getAttribute('data-type') === 'url' ? await fetchUrl(content, signal) : JSON.parse(content)
        if (signal.aborted || !element.isConnected) return
        if (!Array.isArray(data)) throw new TypeError('Gallery data must be an array')
        runJustifiedGallery(container, data, config, signal)
        element.classList.add('loaded')
      } catch (error) {
        if (!signal.aborted && element.isConnected) {
          container.textContent = content
          console.error('Gallery data parsing failed:', error)
        }
      } finally { loading.delete(element) }
    }
  }

  if (typeof InfiniteGrid === 'function') {
    await initGallery()
  } else {
    await dragonfly.getScript(GLOBAL_CONFIG.infinitegrid.js)
    await initGallery()
  }
}

const justifiedIndexPostUI = () => {
  const recentPostsElement = document.getElementById('recent-posts')
  if (!(recentPostsElement && recentPostsElement.classList.contains('masonry'))) return
  const signal = dragonfly.pageSignal

  const init = () => {
    if (signal.aborted || !recentPostsElement.isConnected || indexGrids.has(recentPostsElement)) return
    const masonryItem = new InfiniteGrid.MasonryInfiniteGrid('.recent-post-items', {
      gap: { horizontal: 10, vertical: 20 },
      useTransform: true,
      useResizeObserver: true
    })
    indexGrids.set(recentPostsElement, masonryItem)
    masonryItem.renderItems()
    signal.addEventListener('abort', () => { masonryItem.destroy(); indexGrids.delete(recentPostsElement) }, { once: true })
  }

  return typeof InfiniteGrid === 'function' ? init() : dragonfly.getScript(`${GLOBAL_CONFIG.infinitegrid.js}`).then(init)
}

export { addJustifiedGallery, justifiedIndexPostUI }
