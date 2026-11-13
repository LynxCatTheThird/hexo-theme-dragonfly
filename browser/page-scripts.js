// Modified in Dragonfly. Keep native script insertion, with ordered page initialization.
export const createPageScriptsPlugin = timeout => new class extends SwupScriptsPlugin {
  async runScripts (visit) {
    const scope = this.getScope(this.options)
    for (const old of scope.querySelectorAll('script[data-swup-reload-script]')) {
      if (visit.done) break
      if (!old.isConnected) continue
      const type = (old.type || '').toLowerCase()
      if (type && !['module', 'text/javascript', 'application/javascript'].includes(type)) continue
      const script = super.runScript(old)
      if ((script.src || type === 'module') && !script.hasAttribute('async')) {
        await new Promise(resolve => {
          const finish = () => { clearTimeout(timer); script.onload = script.onerror = null; resolve() }
          const timer = timeout ? setTimeout(() => {
            console.warn('Page script timed out:', script.src)
            finish()
          }, timeout) : undefined
          script.onload = script.onerror = finish
        })
      }
    }
  }
}({ head: true, body: true, optin: true })
