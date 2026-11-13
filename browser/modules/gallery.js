// Modified in Dragonfly.
const fetchUrl = async url => {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error('Failed to fetch URL:', error)
    throw error
  }
}

const runJustifiedGallery = (container, data, config) => {
  const { isButton, tabs } = config
  const limit = Math.max(1, Number(config.limit) || 20)
  const firstLimit = Math.max(1, Number(config.firstLimit) || limit)

  const dataLength = data.length
  const maxGroupKey = dataLength
    ? Math.ceil(Math.max(0, dataLength - firstLimit) / limit) + 1
    : 0

  // Gallery configuration
  const igConfig = {
    gap: 5,
    isConstantSize: true,
    sizeRange: [150, 600],
    // useResizeObserver: true,
    // observeChildren: true,
    useTransform: true
    // useRecycle: false
  }

  const ig = new InfiniteGrid.JustifiedInfiniteGrid(container, igConfig)
  let isLayoutHidden = false

  // Utility functions
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

  // Load more button
  const addLoadMoreButton = container => {
    const button = document.createElement('button')
    button.innerHTML = `${GLOBAL_CONFIG.infinitegrid.buttonText}<i class="fa-solid fa-arrow-down"></i>`

    button.addEventListener('click', () => {
      button.remove()
      btf.setLoading.add(container)
      appendItems(ig.getGroups().length + 1, limit)
    }, { once: true })

    container.insertAdjacentElement('afterend', button)
  }

  const appendItems = (nextGroupKey, count, isFirst) => {
    ig.append(getItems(nextGroupKey, count, isFirst), nextGroupKey)
  }

  // Event handlers
  const handleRenderComplete = e => {
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

    btf.loadLightbox(container.querySelectorAll('img:not(.medium-zoom-image)'))

    if (ig.getGroups().length === maxGroupKey) {
      btf.setLoading.remove(container)
      !tabs && ig.off('renderComplete', handleRenderComplete)
      return
    }

    if (isButton) {
      btf.setLoading.remove(container)
      addLoadMoreButton(container)
    }
  }

  const handleRequestAppend = btf.debounce(e => {
    const nextGroupKey = (+e.groupKey || 0) + 1

    if (nextGroupKey === 1) appendItems(nextGroupKey, firstLimit, true)
    else appendItems(nextGroupKey, limit)

    if (nextGroupKey === maxGroupKey) ig.off('requestAppend', handleRequestAppend)
  }, 300)

  btf.setLoading.add(container)
  ig.on('renderComplete', handleRenderComplete)

  if (isButton && dataLength) {
    appendItems(1, firstLimit, true)
  } else if (dataLength) {
    ig.on('requestAppend', handleRequestAppend)
    ig.renderItems()
  } else {
    btf.setLoading.remove(container)
  }

  btf.addGlobalFn('pageCleanup', () => ig.destroy())
}

const addJustifiedGallery = async (elements, tabs = false) => {
  if (!elements.length) return

  const initGallery = async () => {
    for (const element of elements) {
      if (btf.isHidden(element) || element.classList.contains('loaded')) continue

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
        const data = element.getAttribute('data-type') === 'url' ? await fetchUrl(content) : JSON.parse(content)
        if (!Array.isArray(data)) throw new TypeError('Gallery data must be an array')
        runJustifiedGallery(container, data, config)
        element.classList.add('loaded')
      } catch (error) {
        console.error('Gallery data parsing failed:', error)
      }
    }
  }

  if (typeof InfiniteGrid === 'function') {
    await initGallery()
  } else {
    await btf.getScript(GLOBAL_CONFIG.infinitegrid.js)
    await initGallery()
  }
}

const justifiedIndexPostUI = () => {
  const recentPostsElement = document.getElementById('recent-posts')
  if (!(recentPostsElement && recentPostsElement.classList.contains('masonry'))) return

  const init = () => {
    const masonryItem = new InfiniteGrid.MasonryInfiniteGrid('.recent-post-items', {
      gap: { horizontal: 10, vertical: 20 },
      useTransform: true,
      useResizeObserver: true
    })
    masonryItem.renderItems()
    btf.addGlobalFn('pageCleanup', () => { masonryItem.destroy() }, 'removeJustifiedIndexPostUI')
  }

  typeof InfiniteGrid === 'function' ? init() : btf.getScript(`${GLOBAL_CONFIG.infinitegrid.js}`).then(init)
}

export { addJustifiedGallery, justifiedIndexPostUI }
