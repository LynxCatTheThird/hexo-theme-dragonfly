// SPDX-License-Identifier: Apache-2.0
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
const addRuntime = () => {
  const $runtimeCount = document.getElementById('runtimeshow')
  if ($runtimeCount) {
    const publishDate = $runtimeCount.getAttribute('data-publishDate')
    $runtimeCount.textContent = `${dragonfly.diffDate(publishDate)} ${GLOBAL_CONFIG.runtime}`
  }
}

const addLastPushDate = () => {
  const $lastPushDateItem = document.getElementById('last-push-date')
  if ($lastPushDateItem) {
    const lastPushDate = $lastPushDateItem.getAttribute('data-lastPushDate')
    $lastPushDateItem.textContent = dragonfly.diffDate(lastPushDate, true)
  }
}

const addPostOutdateNotice = () => {
  const ele = document.getElementById('post-outdate-notice')
  if (!ele) return

  const { limitDay, messagePrev, messageNext, postUpdate } = JSON.parse(ele.getAttribute('data'))
  const diffDay = dragonfly.diffDate(postUpdate)
  if (diffDay >= limitDay) {
    ele.textContent = `${messagePrev} ${diffDay} ${messageNext}`
    ele.hidden = false
  }
}

const relativeDate = selector => {
  selector.forEach(item => {
    item.textContent = dragonfly.diffDate(item.getAttribute('datetime'), true)
    item.style.display = 'inline'
  })
}

export { addRuntime, addLastPushDate, relativeDate, addPostOutdateNotice }
