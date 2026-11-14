// SPDX-License-Identifier: Apache-2.0
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
// 共用原生搜索弹层，各搜索服务负责索引与排序。
export const createSearchDialog = (dialog, { onOpen, onClose } = {}) => {
  let opener, startedOutside = false
  const outside = event => {
    const rect = dialog.getBoundingClientRect()
    return event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)
  }
  const close = () => { if (dialog.open) dialog.close() }
  dragonfly.addAppEventListener(dialog, 'pointerdown', event => { startedOutside = outside(event) })
  dragonfly.addAppEventListener(dialog, 'click', event => { if (startedOutside && outside(event)) close() })
  dragonfly.addAppEventListener(dialog, 'close', () => {
    if (dialog.open) return
    onClose?.()
    if (opener?.isConnected && document.activeElement !== opener) opener.focus({ preventScroll: true })
    opener = null
  })
  dragonfly.addAppEventListener(document, 'theme:page-leave', close)
  return {
    open: () => {
      if (dialog.open) return
      opener = document.activeElement
      dialog.showModal()
      onOpen?.()
    },
    close
  }
}
