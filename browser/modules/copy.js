// SPDX-License-Identifier: Apache-2.0
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
const addCopyHandler = () => {
  dragonfly.addAppEventListener(document, 'copy', event => {
    const selection = window.getSelection()
    if (event.defaultPrevented || !event.clipboardData || !selection?.rangeCount || selection.isCollapsed) return
    if (event.target.closest?.('input, textarea, [contenteditable]:not([contenteditable="false"])')) return
    let text = selection.toString()
    let html
    if (GLOBAL_CONFIG.copy.tex) {
      const range = selection.getRangeAt(0).cloneRange()
      const formulaAt = node => (node.nodeType === 1 ? node : node.parentElement)?.closest('.katex-display, .katex')
      const start = formulaAt(range.startContainer)
      const end = formulaAt(range.endContainer)
      if (start) range.setStartBefore(start.closest('.katex-display') || start)
      if (end) range.setEndAfter(end.closest('.katex-display') || end)
      const fragment = document.createElement('div')
      fragment.append(range.cloneContents())
      const formulas = [...fragment.querySelectorAll('.katex')].filter(el => el.querySelector('annotation[encoding="application/x-tex"]'))
      if (formulas.length) {
        html = fragment.innerHTML
        formulas.forEach(el => {
          const delimiter = el.closest('.katex-display') ? '$$' : '$'
          el.replaceWith(delimiter + el.querySelector('annotation[encoding="application/x-tex"]').textContent + delimiter)
        })
        text = fragment.textContent
      }
    }
    const copyright = GLOBAL_CONFIG.copyright
    if (!copyright && html === undefined) return
    if (copyright && text.length > copyright.limitCount) {
      const { author, link, source, info } = copyright.languages
      const suffix = `\n\n\n${author}\n${link}${location.href}\n${source}\n${info}`
      text += suffix
      if (html !== undefined) {
        const notice = document.createElement('div')
        notice.style.whiteSpace = 'pre-wrap'
        notice.textContent = suffix
        html += notice.outerHTML
      }
    }
    event.clipboardData.setData('text/plain', text)
    if (html !== undefined) event.clipboardData.setData('text/html', html)
    event.preventDefault()
  })
}

export { addCopyHandler }
