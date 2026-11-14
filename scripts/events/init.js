// SPDX-License-Identifier: Apache-2.0
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
const { deepMerge } = require('hexo-util')
const defaultConfig = require('../common/default_config')

/**
 * 检查 Hexo 版本与配置。
 */
function checkHexoEnvironment (hexo) {
  const { version, log, locals } = hexo

  const [major, minor] = version.split('.').map(Number)
  const requiredMajor = 5
  const requiredMinor = 3

  if (major < requiredMajor || (major === requiredMajor && minor < requiredMinor)) {
    log.error('Please update Hexo to V5.3.0 or higher!')
    log.error('請把 Hexo 升級到 V5.3.0 或更高的版本！')
    throw new Error('Hexo version too old')
  }

  // 检查旧式配置文件。
  if (locals.get) {
    const data = locals.get('data')
    if (data && (data.dragonfly || data.butterfly)) {
      log.error('主题配置已移到站点根目录，请使用 _config.dragonfly.yml')
      throw new Error('Deprecated configuration file')
    }
  }
}

/**
 * 归一化评论服务配置。
 */
function processCommentConfig (themeConfig) {
  const { comments } = themeConfig
  if (!comments || !comments.use) {
    return
  }

  let { use } = comments

  if (!Array.isArray(use)) {
    use = typeof use === 'string' ? use.split(',') : [use]
  }

  use = use
    .map(item => {
      if (typeof item !== 'string') return item
      return item.trim().toLowerCase().replace(/\b[a-z]/g, s => s.toUpperCase())
    })
    .filter(Boolean)

  const supported = ['Artalk', 'Twikoo', 'Waline']
  const removed = use.filter(name => !supported.includes(name))
  if (removed.length) hexo.log.warn(`Unsupported comment systems: ${removed.join(', ')}. Choose Artalk, Twikoo or Waline.`)
  use = [...new Set(use.filter(name => supported.includes(name)))].slice(0, 2)
  themeConfig.comments.use = use.length ? use : null
}

hexo.extend.filter.register('before_generate', () => {
  checkHexoEnvironment(hexo)

  hexo.theme.config = deepMerge(defaultConfig, hexo.theme.config)

  processCommentConfig(hexo.theme.config)
}, 1)
