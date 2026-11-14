// SPDX-License-Identifier: Apache-2.0
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
(() => {
  const src = document.querySelector('script[data-echarts-src]').dataset.echartsSrc
  const config = JSON.parse(document.querySelector('script[data-echarts-src]').dataset.echartsConfig)
  const charts = new Map()
  let generation = 0
  // generation 同时使离页前尚未完成的异步初始化失效。
  const dispose = () => {
    generation++
    charts.forEach(({ chart, observer }) => {
      observer.disconnect()
      chart.dispose()
    })
    charts.clear()
  }

  const init = async () => {
    const elements = [...document.querySelectorAll('#article-container .echarts-container')]
    if (!elements.length) return
    const signal = dragonfly.pageSignal
    const current = generation
    try {
      if (typeof window.echarts?.init !== 'function') await dragonfly.getScript(src)
      if (signal.aborted || current !== generation) return
      elements.forEach(el => {
        if (!el.isConnected) return
        const theme = config.theme[document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light']
        const existing = charts.get(el)
        if (existing && existing.theme === theme) {
          existing.chart.resize()
          return
        }
        const optionEl = document.getElementById(`${el.id}-option`)
        if (!optionEl) return
        const option = JSON.parse(optionEl.textContent)
        if (existing) {
          existing.observer.disconnect()
          existing.chart.dispose()
          charts.delete(el)
        }
        el.querySelector('.echarts-error')?.remove()
        const chart = echarts.init(el, theme, config.init_options)
        const resize = () => { if (el.isConnected && !chart.isDisposed()) chart.resize() }
        const observer = new ResizeObserver(resize)
        try { chart.setOption(option) } catch (error) { chart.dispose(); throw error }
        charts.set(el, { chart, observer, theme })
        observer.observe(el)
      })
    } catch (error) {
      if (signal.aborted || current !== generation) return
      console.error('[echarts] Failed to render charts:', error)
      elements.filter(el => el.isConnected && !charts.has(el)).forEach(el => {
        if (el.querySelector('.echarts-error')) return
        const retry = document.createElement('button')
        retry.type = 'button'
        retry.className = 'echarts-error'
        retry.textContent = config.retryText
        retry.addEventListener('click', init)
        el.appendChild(retry)
      })
    }
  }

  const refresh = () => {
    dragonfly.addPageFn('themeChange', init, 'echarts')
    dragonfly.addPageFn('encrypt', init, 'echarts')
    return init()
  }
  // 统一注册清理函数，切页时也能取消尚未完成的下载。
  dragonfly.addAppEventListener(document, 'theme:page-leave', dispose)
  dragonfly.addAppEventListener(document, 'theme:page-load', refresh)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh, { once: true })
  else refresh()
})()
