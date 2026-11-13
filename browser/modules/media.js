// Modified in Dragonfly.
const addPhotoFigcaption = $article => {
  if (!GLOBAL_CONFIG.isPhotoFigcaption) return
  $article.querySelectorAll('img').forEach(item => {
    if (item.nextElementSibling?.classList.contains('img-alt')) return
    const altValue = item.title || item.alt
    if (!altValue) return
    const ele = document.createElement('div')
    ele.className = 'img-alt text-center'
    ele.textContent = altValue
    item.insertAdjacentElement('afterend', ele)
  })
}

const runLightbox = $article => {
  btf.loadLightbox($article.querySelectorAll('img:not(.no-lightbox)'))
}

export const mountMedia = article => {
  addPhotoFigcaption(article)
  runLightbox(article)
}
