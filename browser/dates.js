// Modified in Dragonfly.
const addRuntime = () => {
  const $runtimeCount = document.getElementById('runtimeshow')
  if ($runtimeCount) {
    const publishDate = $runtimeCount.getAttribute('data-publishDate')
    $runtimeCount.textContent = `${btf.diffDate(publishDate)} ${GLOBAL_CONFIG.runtime}`
  }
}

const addLastPushDate = () => {
  const $lastPushDateItem = document.getElementById('last-push-date')
  if ($lastPushDateItem) {
    const lastPushDate = $lastPushDateItem.getAttribute('data-lastPushDate')
    $lastPushDateItem.textContent = btf.diffDate(lastPushDate, true)
  }
}

const addPostOutdateNotice = () => {
  const ele = document.getElementById('post-outdate-notice')
  if (!ele) return

  const { limitDay, messagePrev, messageNext, postUpdate } = JSON.parse(ele.getAttribute('data'))
  const diffDay = btf.diffDate(postUpdate)
  if (diffDay >= limitDay) {
    ele.textContent = `${messagePrev} ${diffDay} ${messageNext}`
    ele.hidden = false
  }
}

const relativeDate = selector => {
  selector.forEach(item => {
    item.textContent = btf.diffDate(item.getAttribute('datetime'), true)
    item.style.display = 'inline'
  })
}

export { addRuntime, addLastPushDate, relativeDate, addPostOutdateNotice }
