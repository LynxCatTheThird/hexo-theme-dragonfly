// SPDX-License-Identifier: Apache-2.0
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
// 保留原生脚本插入行为，按顺序完成页面初始化。
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
        // 只等待顺序脚本；结束等待或离页不会取消已经插入的全局脚本下载。
        await new Promise(resolve => {
          const signal = dragonfly.pageSignal
          const finish = () => { clearTimeout(timer); signal.removeEventListener('abort', finish); script.onload = script.onerror = null; resolve() }
          const timer = timeout ? setTimeout(() => {
            console.warn('Page script timed out:', script.src)
            finish()
          }, timeout) : undefined
          script.onload = script.onerror = finish
          signal.addEventListener('abort', finish, { once: true })
          if (signal.aborted) finish()
        })
      }
    }
  }
}({ head: true, body: true, optin: true })
