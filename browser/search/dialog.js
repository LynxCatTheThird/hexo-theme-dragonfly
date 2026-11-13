// Shared native search shell; search data and ranking stay with each provider.
export const createSearchDialog = (dialog, { onOpen, onClose } = {}) => {
  let opener, startedOutside = false
  const outside = event => {
    const rect = dialog.getBoundingClientRect()
    return event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)
  }
  const close = () => { if (dialog.open) dialog.close() }
  btf.addAppEventListener(dialog, 'pointerdown', event => { startedOutside = outside(event) })
  btf.addAppEventListener(dialog, 'click', event => { if (startedOutside && outside(event)) close() })
  btf.addAppEventListener(dialog, 'close', () => {
    if (dialog.open) return
    onClose?.()
    if (opener?.isConnected && document.activeElement !== opener) opener.focus({ preventScroll: true })
    opener = null
  })
  btf.addAppEventListener(document, 'theme:page-leave', close)
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
