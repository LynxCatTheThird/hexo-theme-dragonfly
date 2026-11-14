// SPDX-License-Identifier: Apache-2.0 AND MIT
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
import { createSearchDialog } from './dialog.js'

/**
 * 参考 hexo-generator-searchdb。
 * https://github.com/next-theme/hexo-generator-searchdb/blob/main/dist/search.js
 * 上游修改：hexo-theme-butterfly。
 */

class LocalSearch {
  constructor ({
    path = '',
    top_n_per_article = 1
  }) {
    this.path = path
    this.top_n_per_article = top_n_per_article
    this.isfetched = false
    this.datas = null
    this.fetchPromise = null
  }

  getIndexByWord (words, text, caseSensitive = false) {
    const index = []
    const included = new Set()

    if (!caseSensitive) {
      text = text.toLowerCase()
    }
    words.forEach((word, i) => {
      const wordLen = word.length
      if (wordLen === 0) return
      let startPosition = 0
      let position = -1
      const searchWord = caseSensitive ? word : word.toLowerCase()
      while ((position = text.indexOf(searchWord, startPosition)) > -1) {
        index.push({ position, word })
        included.add(words[i])
        startPosition = position + wordLen
      }
    })
    // 按关键词在正文中的位置排序。
    index.sort((left, right) => {
      if (left.position !== right.position) {
        return left.position - right.position
      }
      return right.word.length - left.word.length
    })
    return [index, included]
  }

  // 合并相邻命中片段。
  mergeIntoSlice (start, end, index) {
    let item = index[0]
    let { position, word } = item
    const hits = []
    const count = new Set()
    while (position + word.length <= end && index.length !== 0) {
      count.add(word)
      hits.push({
        position,
        length: word.length
      })
      const wordEnd = position + word.length

      // 移到下一个命中位置。
      index.shift()
      while (index.length !== 0) {
        item = index[0]
        position = item.position
        word = item.word
        if (wordEnd > position) {
          index.shift()
        } else {
          break
        }
      }
    }
    return {
      hits,
      start,
      end,
      count: count.size
    }
  }

  // 高亮标题与正文。
  escapeHtml (text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }

  highlightKeyword (val, slice) {
    const format = text => this.escapeHtml(text)
    const parts = []
    let index = slice.start
    for (const { position, length } of slice.hits) {
      parts.push(format(val.substring(index, position)))
      index = position + length
      parts.push(`<mark class="search-keyword">${format(val.substring(position, position + length))}</mark>`)
    }
    parts.push(format(val.substring(index, slice.end)))
    return parts.join('')
  }

  getResultItems (keywords) {
    const resultItems = []
    // 整次查询复用同一组高亮参数。
    const highlightParam = keywords.join(' ')
    this.datas.forEach(({ title, content, url }) => {
      // 文章命中的不同关键词数量。
      const [indexOfTitle, keysOfTitle] = this.getIndexByWord(keywords, title)
      const [indexOfContent, keysOfContent] = this.getIndexByWord(keywords, content)
      const includedCount = new Set([...keysOfTitle, ...keysOfContent]).size

      // 显示搜索结果。
      const hitCount = indexOfTitle.length + indexOfContent.length
      if (hitCount === 0) return

      const slicesOfTitle = []
      if (indexOfTitle.length !== 0) {
        slicesOfTitle.push(this.mergeIntoSlice(0, title.length, indexOfTitle))
      }

      let slicesOfContent = []
      while (indexOfContent.length !== 0) {
        const item = indexOfContent[0]
        const { position } = item
        // 截取 120 个字符作为摘要，搜索输入上限为 80 个字符。
        const start = Math.max(0, position - 20)
        const end = Math.min(content.length, position + 100)
        slicesOfContent.push(this.mergeIntoSlice(start, end, indexOfContent))
      }

      // 按关键词覆盖数和命中次数排序摘要。
      slicesOfContent.sort((left, right) => {
        if (left.count !== right.count) {
          return right.count - left.count
        } else if (left.hits.length !== right.hits.length) {
          return right.hits.length - left.hits.length
        }
        return left.start - right.start
      })

      // 截取排名靠前的摘要。
      const upperBound = parseInt(this.top_n_per_article, 10)
      if (upperBound >= 0) {
        slicesOfContent = slicesOfContent.slice(0, upperBound)
      }

      let resultItem = ''

      url = new URL(url, location.origin)
      if (!['http:', 'https:'].includes(url.protocol)) return
      url.searchParams.append('highlight', highlightParam)

      if (slicesOfTitle.length !== 0) {
        resultItem += `<li class="local-search-hit-item"><a href="${this.escapeHtml(url.href)}"><span class="search-result-title">${this.highlightKeyword(title, slicesOfTitle[0])}</span>`
      } else {
        resultItem += `<li class="local-search-hit-item"><a href="${this.escapeHtml(url.href)}"><span class="search-result-title">${this.escapeHtml(title)}</span>`
      }

      slicesOfContent.forEach(slice => {
        resultItem += `<p class="search-result">${this.highlightKeyword(content, slice)}...</p>`
      })

      resultItem += '</a></li>'
      resultItems.push({
        item: resultItem,
        id: resultItems.length,
        hitCount,
        includedCount
      })
    })
    return resultItems
  }

  fetchData () {
    if (this.fetchPromise) return this.fetchPromise
    const isXml = !this.path.endsWith('json')
    this.fetchPromise = fetch(this.path)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        return response.text()
      })
      .then(res => {
        // 读取索引中的正文。
        this.datas = isXml
          ? [...new DOMParser().parseFromString(res, 'text/xml').querySelectorAll('entry')].map(element => ({
              title: element.querySelector('title').textContent,
              content: element.querySelector('content').textContent,
              url: element.querySelector('url').textContent
            }))
          : JSON.parse(res)
        const decoder = document.createElement('textarea')
        // 只检索标题非空的文章。
        this.datas = this.datas.filter(data => data.title).map(data => {
          data.title = data.title.trim()
          decoder.innerHTML = data.content ? data.content.trim().replace(/<[^>]+>/g, '') : ''
          data.content = decoder.value
          data.url = decodeURIComponent(data.url).replace(/\/{2,}/g, '/')
          return data
        })
        this.isfetched = true
        // 结束加载提示。
        window.dispatchEvent(new Event('search:loaded'))
      })
      .catch(error => {
        console.error('Local search data fetch failed:', error)
        this.isfetched = false
        this.datas = []
        window.dispatchEvent(new Event('search:loaded'))
      })
      .finally(() => { this.fetchPromise = null })
    return this.fetchPromise
  }

  // 使用 mark 元素包裹匹配文本。
  highlightText (node, slice, className) {
    const val = node.nodeValue
    let index = slice.start
    const children = []
    for (const { position, length } of slice.hits) {
      const text = document.createTextNode(val.substring(index, position))
      index = position + length
      const mark = document.createElement('mark')
      mark.className = className
      mark.appendChild(document.createTextNode(val.substring(position, position + length)))
      children.push(text, mark)
    }
    node.nodeValue = val.substring(index, slice.end)
    children.forEach(element => {
      node.parentNode.insertBefore(element, node)
    })
  }

  // 高亮地址中指定的搜索词。
  highlightSearchWords (body) {
    const params = new URL(location.href).searchParams.get('highlight')
    const keywords = params ? params.split(' ') : []
    if (!keywords.length || !body) return
    const walk = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, null)
    const allNodes = []
    while (walk.nextNode()) {
      if (!walk.currentNode.parentElement.closest('button, select, textarea, script, style, [hidden], svg, math, .katex, mjx-container, .mermaid, .mermaid-wrap')) allNodes.push(walk.currentNode)
    }
    allNodes.forEach(node => {
      const [indexOfNode] = this.getIndexByWord(keywords, node.nodeValue)
      if (!indexOfNode.length) return
      const slice = this.mergeIntoSlice(0, node.nodeValue.length, indexOfNode)
      this.highlightText(node, slice, 'search-keyword')
    })
  }
}

const initLocalSearch = () => {
  // 执行搜索。
  const { path, top_n_per_article, languages, pagination } = GLOBAL_CONFIG.localSearch
  const enablePagination = pagination && pagination.enable
  const localSearch = new LocalSearch({
    path,
    top_n_per_article
  })

  const $input = document.querySelector('.local-search-input input')
  const $statsItem = document.getElementById('local-search-stats')
  const $loadingStatus = document.getElementById('loading-status')
  const $searchDialog = document.querySelector('#local-search .search-dialog')
  const $results = document.getElementById('local-search-results')
  const $pagination = document.getElementById('local-search-pagination')
  const $paginationList = document.querySelector('#local-search-pagination .ais-Pagination-list')

  // 分页状态，仅在启用分页时初始化。
  let currentPage = 0
  const hitsPerPage = pagination.hitsPerPage || 10

  let currentResultItems = []

  if (!enablePagination) {
    currentPage = undefined
    currentResultItems = undefined
  }

  // 切换结果区域的可见性。
  const toggleResultsVisibility = hasResults => {
    $pagination.style.display = (hasResults && enablePagination) ? '' : 'none'
  }

  // 渲染当前页的搜索结果。
  const renderResults = (searchText, resultItems) => {
    // 按分页设置选择结果。
    const itemsToDisplay = enablePagination
      ? currentResultItems.slice(currentPage * hitsPerPage, (currentPage + 1) * hitsPerPage)
      : resultItems

    // 处理分页后的空结果。
    if (enablePagination && itemsToDisplay.length === 0 && currentResultItems.length > 0) {
      currentPage = 0
      renderResults(searchText, resultItems)
      return
    }

    // 为结果添加序号。
    const numberedItems = itemsToDisplay.map((result, index) => {
      const itemNumber = enablePagination
        ? currentPage * hitsPerPage + index + 1
        : index + 1
      return result.item.replace(
        '<li class="local-search-hit-item">',
        `<li class="local-search-hit-item" value="${itemNumber}">`
      )
    })

    $results.innerHTML = `<ol class="search-result-list">${numberedItems.join('')}</ol>`

    // 更新结果计数。
    const displayCount = enablePagination ? currentResultItems.length : resultItems.length
    const stats = languages.hits_stats.replace(/\$\{hits}/, displayCount)
    $statsItem.innerHTML = `<hr><div class="search-result-stats">${stats}</div>`

    // 更新分页状态。
    if (enablePagination) {
      const nbPages = Math.ceil(currentResultItems.length / hitsPerPage)
      renderPagination(currentPage, nbPages, searchText)
    }

    const hasResults = resultItems.length > 0
    toggleResultsVisibility(hasResults)

  }

  // 渲染分页按钮。
  const renderPagination = (page, nbPages) => {
    if (nbPages <= 1) {
      $pagination.style.display = 'none'
      $paginationList.innerHTML = ''
      return
    }

    const isFirstPage = page === 0
    const isLastPage = page === nbPages - 1

    // 按屏幕宽度控制页码数量。
    const isMobile = window.innerWidth < 768
    const maxVisiblePages = isMobile ? 3 : 5
    let startPage = Math.max(0, page - Math.floor(maxVisiblePages / 2))
    const endPage = Math.min(nbPages - 1, startPage + maxVisiblePages - 1)

    // 调整起始页码，保持可见页数稳定。
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(0, endPage - maxVisiblePages + 1)
    }

    const parts = []

    // 省略前段页码时保留首页入口。
    if (nbPages > maxVisiblePages && startPage > 0) {
      parts.push('<li class="ais-Pagination-item ais-Pagination-item--page"><a class="ais-Pagination-link" aria-label="Page 1" href="#" data-page="0">1</a></li>')
      if (startPage > 1) {
        parts.push('<li class="ais-Pagination-item ais-Pagination-item--ellipsis"><span class="ais-Pagination-link">...</span></li>')
      }
    }

    // 生成当前页附近的页码。
    for (let i = startPage; i <= endPage; i++) {
      if (i === page) {
        parts.push(`<li class="ais-Pagination-item ais-Pagination-item--page ais-Pagination-item--selected"><span class="ais-Pagination-link" aria-label="Page ${i + 1}">${i + 1}</span></li>`)
      } else {
        parts.push(`<li class="ais-Pagination-item ais-Pagination-item--page"><a class="ais-Pagination-link" aria-label="Page ${i + 1}" href="#" data-page="${i}">${i + 1}</a></li>`)
      }
    }

    // 省略后段页码时保留末页入口。
    if (nbPages > maxVisiblePages && endPage < nbPages - 1) {
      if (endPage < nbPages - 2) {
        parts.push('<li class="ais-Pagination-item ais-Pagination-item--ellipsis"><span class="ais-Pagination-link">...</span></li>')
      }
      parts.push(`<li class="ais-Pagination-item ais-Pagination-item--page"><a class="ais-Pagination-link" aria-label="Page ${nbPages}" href="#" data-page="${nbPages - 1}">${nbPages}</a></li>`)
    }

    // 生成上一页和下一页入口。
    const prevLink = isFirstPage
      ? '<span class="ais-Pagination-link ais-Pagination-link--disabled" aria-label="Previous Page"><i class="fas fa-angle-left"></i></span>'
      : `<a class="ais-Pagination-link" aria-label="Previous Page" href="#" data-page="${page - 1}"><i class="fas fa-angle-left"></i></a>`
    const nextLink = isLastPage
      ? '<span class="ais-Pagination-link ais-Pagination-link--disabled" aria-label="Next Page"><i class="fas fa-angle-right"></i></span>'
      : `<a class="ais-Pagination-link" aria-label="Next Page" href="#" data-page="${page + 1}"><i class="fas fa-angle-right"></i></a>`

    $paginationList.innerHTML = `<li class="ais-Pagination-item ais-Pagination-item--previousPage ${isFirstPage ? 'ais-Pagination-item--disabled' : ''}">${prevLink}</li>${parts.join('')}<li class="ais-Pagination-item ais-Pagination-item--nextPage ${isLastPage ? 'ais-Pagination-item--disabled' : ''}">${nextLink}</li>`
    $pagination.style.display = ''
  }

  // 清空结果与计数。
  const clearSearchResults = () => {
    $results.textContent = ''
    $statsItem.textContent = ''
    toggleResultsVisibility(false)
    if (enablePagination) {
      currentResultItems = []
      currentPage = 0
    }
  }

  // 显示空结果提示。
  const showNoResults = searchText => {
    $results.textContent = ''
    const statsDiv = document.createElement('div')
    statsDiv.className = 'search-result-stats'
    statsDiv.textContent = languages.hits_empty.replace(/\$\{query}/, searchText)
    $statsItem.innerHTML = statsDiv.outerHTML
    toggleResultsVisibility(false)
    if (enablePagination) {
      currentResultItems = []
      currentPage = 0
    }
  }

  const inputEventFunction = () => {
    if (!localSearch.isfetched) return
    let searchText = $input.value.trim().toLowerCase()

    if (searchText !== '') $loadingStatus.hidden = false

    const keywords = searchText.split(/[-\s]+/)
    let resultItems = []

    if (searchText.length > 0) {
      resultItems = localSearch.getResultItems(keywords)
    }

    if (keywords.length === 1 && keywords[0] === '') {
      clearSearchResults()
    } else if (resultItems.length === 0) {
      showNoResults(searchText)
    } else {
      // 按相关度排序结果。
      resultItems.sort((left, right) => {
        if (left.includedCount !== right.includedCount) {
          return right.includedCount - left.includedCount
        } else if (left.hitCount !== right.hitCount) {
          return right.hitCount - left.hitCount
        }
        return right.id - left.id
      })

      if (enablePagination) {
        currentResultItems = resultItems
        currentPage = 0
      }
      renderResults(searchText, resultItems)
    }

    $loadingStatus.hidden = true
  }

  // 合并连续输入触发的查询。
  let searchTimeout
  const debouncedInputEvent = () => {
    clearTimeout(searchTimeout)
    // 输入为空时立即清空结果。
    if (!$input.value.trim()) {
      inputEventFunction()
      return
    }
    searchTimeout = setTimeout(inputEventFunction, 200)
  }

  const { open: openSearch, close: closeSearch } = createSearchDialog($searchDialog, {
    onOpen: () => { if (!localSearch.isfetched) localSearch.fetchData() },
    onClose: () => clearTimeout(searchTimeout)
  })

  const searchClickFn = () => {
    dragonfly.addPageEventListener(document.querySelector('#search-button > .search'), 'click', openSearch)
  }

  const searchFnOnce = () => {
    dragonfly.addAppEventListener($input, 'input', debouncedInputEvent)
    dragonfly.addAppEventListener(document.querySelector('#local-search .search-close-button'), 'click', closeSearch)
    if (GLOBAL_CONFIG.localSearch.preload) {
      localSearch.fetchData()
    }
    localSearch.highlightSearchWords(document.getElementById('article-container'))

    // 启用分页时注册页码事件。
    if (enablePagination) {
      dragonfly.addAppEventListener($pagination, 'click', e => {
        e.preventDefault()
        const link = e.target.closest('a[data-page]')
        if (link) {
          const page = parseInt(link.dataset.page, 10)
          if (!isNaN(page) && currentResultItems.length > 0) {
            currentPage = page
            renderResults($input.value.trim().toLowerCase(), currentResultItems)
          }
        }
      })
    }

    // 初始化搜索状态。
    toggleResultsVisibility(false)
  }

  dragonfly.addAppEventListener(window, 'search:loaded', () => {
    const $loadDataItem = document.getElementById('loading-database')
    if (!$loadDataItem) return
    if (!localSearch.isfetched) {
      const retry = document.createElement('button')
      retry.type = 'button'
      retry.className = 'search-retry'
      retry.textContent = languages.retry
      retry.addEventListener('click', () => localSearch.fetchData())
      $loadDataItem.replaceChildren(retry)
      if ($searchDialog.open) retry.focus({ preventScroll: true })
      return
    }
    $loadDataItem.nextElementSibling.style.visibility = 'visible'
    $loadDataItem.remove()
    if ($searchDialog.open) $input.focus({ preventScroll: true })
    inputEventFunction()
  })

  searchClickFn()
  searchFnOnce()
  dragonfly.addGlobalFn('encrypt', () => localSearch.highlightSearchWords(document.getElementById('article-container')), 'search')

  dragonfly.addAppEventListener(window, 'theme:page-load', () => {
    closeSearch()
    localSearch.highlightSearchWords(document.getElementById('article-container'))
    searchClickFn()
  })
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initLocalSearch, { once: true })
else initLocalSearch()
