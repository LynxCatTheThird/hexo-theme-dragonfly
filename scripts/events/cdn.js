// Modified in this fork.
/**
 * Butterfly
 * Merge CDN
 */

'use strict'

const { version } = require('../../package.json')
const path = require('path')

// Cache plugins.yml to avoid re-rendering on every generate
let cachedPlugins = null
const loadPlugins = hexo => {
  if (cachedPlugins) return cachedPlugins
  cachedPlugins = hexo.render.renderSync({ path: path.join(hexo.theme_dir, '/plugins.yml'), engine: 'yaml' })
  return cachedPlugins
}

hexo.extend.filter.register('before_generate', () => {
  const themeConfig = hexo.theme.config
  const { CDN } = themeConfig
  if (!['local', 'custom'].includes(CDN.internal_provider)) {
    throw new Error('Use local or a custom CDN for this fork’s internal scripts.')
  }

  const thirdPartySrc = loadPlugins(hexo)
  const internalSrc = Object.fromEntries(Object.entries({
    main: 'js/main.js',
    utils: 'js/utils.js',
    navigation: 'js/navigation.js',
    echarts_runtime: 'js/echarts.js',
    local_search: 'js/search/local-search.js',
    algolia_js: 'js/search/algolia.js'
  }).map(([key, file]) => [key, { name: 'hexo-theme-butterfly', file, version }]))

  const minFile = file => {
    return file.replace(/(?<!\.min)\.(js|css)$/g, ext => '.min' + ext)
  }

  const createCDNLink = (data, type, cond = '') => {
    return Object.keys(data).reduce((result, key) => {
      let { name, version, file, other_name: otherName } = data[key]
      const cdnjsName = otherName || name
      const cdnjsFile = file.replace(/^(?:lib|dist)\/|^browser\//, '')
      const minCdnjsFile = minFile(cdnjsFile)
      if (cond === 'internal') file = `source/${file}`
      const minFilePath = minFile(file)
      const verType = CDN.version ? (type === 'local' ? `?v=${version}` : `@${version}`) : ''

      const value = {
        version,
        name,
        file,
        cdnjs_file: cdnjsFile,
        min_file: minFilePath,
        min_cdnjs_file: minCdnjsFile,
        cdnjs_name: cdnjsName
      }

      const cdnSource = {
        local: cond === 'internal' ? `${cdnjsFile + verType}` : `/pluginsSrc/${name}/${file + verType}`,
        jsdelivr: `https://cdn.jsdelivr.net/npm/${name}${verType}/${minFilePath}`,
        unpkg: `https://unpkg.com/${name}${verType}/${file}`,
        cdnjs: `https://cdnjs.cloudflare.com/ajax/libs/${cdnjsName}/${version}/${minCdnjsFile}`,
        custom: (CDN.custom_format || '').replace(/\$\{(.+?)\}/g, (match, $1) => value[$1])
      }

      result[key] = cdnSource[type]
      return result
    }, cond === 'internal' ? { main_css: 'css/index.css' + (CDN.version ? `?v=${version}` : '') } : {})
  }

  themeConfig.asset = Object.assign(
    createCDNLink(internalSrc, CDN.internal_provider, 'internal'),
    createCDNLink(thirdPartySrc, CDN.third_party_provider),
    Object.fromEntries(Object.entries(CDN.option || {}).filter(([, value]) => value !== null))
  )
})
