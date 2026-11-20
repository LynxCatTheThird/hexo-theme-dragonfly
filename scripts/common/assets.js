// SPDX-License-Identifier: Apache-2.0
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
const { Parser } = require('htmlparser2')
const { escapeHTML } = require('hexo-util')
const { version } = require('../../package.json')

const internalAssets = Object.fromEntries(Object.entries({
  main: 'js/main.js', utils: 'js/utils.js', navigation: 'js/navigation.js',
  echarts_runtime: 'js/echarts.js', local_search: 'js/search/local-search.js', algolia_js: 'js/search/algolia.js',
  main_css: 'css/index.css'
}).map(([key, file]) => [key, { name: 'hexo-theme-dragonfly', version, file, generated: key === 'main_css' }]))
const providers = ['local', 'jsdelivr', 'unpkg', 'cdnjs', 'npmmirror', 'zstatic', 'custom']
const minifyPath = file => file.replace(/(?<!\.min)\.(js|css)$/, '.min.$1')
const validURL = (value, key) => {
  if (typeof value !== 'string' || !value.trim() || /[<>\s]|\$\{/.test(value) || (/^[\w+.-]+:/.test(value) && !/^https?:\/\//.test(value))) {
    throw new Error(`CDN.${key}: invalid asset URL ${JSON.stringify(value)}`)
  }
  return value
}

const resolveAssets = (config, thirdParty, internal = internalAssets) => {
  const cdn = { internal_provider: 'local', third_party_provider: 'jsdelivr', version: true, ...config }
  for (const group of ['internal', 'third_party']) {
    const value = cdn[`${group}_provider`]
    if (!providers.includes(value)) throw new Error(`CDN.${group}_provider: unknown provider ${JSON.stringify(value)}`)
  }
  if (!['local', 'custom'].includes(cdn.internal_provider)) throw new Error('CDN.internal_provider: use local or custom for this fork; Dragonfly assets are not published on upstream CDNs')
  const entries = { ...internal, ...thirdParty }
  const overrides = cdn.option || {}
  for (const key of Object.keys(overrides)) {
    if (!(key in entries)) throw new Error(`CDN.option.${key}: unknown asset`)
  }
  const result = {}
  for (const [key, data] of Object.entries(entries)) {
    const own = key in internal
    const provider = own ? cdn.internal_provider : cdn.third_party_provider
    const override = overrides[key]
    // 生产环境允许逐项覆盖；开发环境的内部代码固定走本地，防止调试旧 CDN 产物。
    if (override != null && !(own && cdn.development)) {
      result[key] = validURL(override, `option.${key}`)
    } else if (own && (data.generated || cdn.development)) {
      // 未显式覆盖时，站点专属样式和开发代码使用本地地址。
      result[key] = data.file + (cdn.version ? `?v=${data.version}` : '')
    } else {
      const file = own ? (data.package_file || `source/${data.file}`) : data.file
      const cdnjsFile = data.cdnjs_file || data.file.replace(/^(?:lib|dist|browser)\//, '')
      const values = {
        name: data.name, version: data.version, file,
        min_file: minifyPath(file), cdnjs_name: data.other_name || data.name,
        cdnjs_file: cdnjsFile, min_cdnjs_file: minifyPath(cdnjsFile)
      }
      const version = cdn.version ? `@${data.version}` : ''
      const urls = {
        local: (own ? data.file : `/pluginsSrc/${data.name}/${data.file}`) + (cdn.version ? `?v=${data.version}` : ''),
        jsdelivr: `https://cdn.jsdelivr.net/npm/${data.name}${version}/${values.min_file}`,
        unpkg: `https://unpkg.com/${data.name}${version}/${file}`,
        cdnjs: `https://cdnjs.cloudflare.com/ajax/libs/${values.cdnjs_name}/${data.version}/${values.min_cdnjs_file}`,
        npmmirror: `https://registry.npmmirror.com/${data.name}/${data.version}/files/${file}`,
        zstatic: `https://s4.zstatic.net/ajax/libs/${values.cdnjs_name}/${data.version}/${values.min_cdnjs_file}`
      }
      if (provider === 'custom') {
        const format = own && cdn.internal_custom_format != null ? cdn.internal_custom_format : cdn.custom_format
        if (typeof format !== 'string' || !format) throw new Error(`CDN.${own ? 'internal_custom_format/custom_format' : 'custom_format'}: required for ${key}`)
        urls.custom = format.replace(/\$\{([^}]+)\}/g, (_, token) => {
          if (!(token in values)) throw new Error(`CDN.custom_format: unknown placeholder ${token} for ${key}`)
          return values[token]
        })
      }
      // zstatic 使用 cdnjs 目录，缺少对应库时与 cdnjs 一样转用 unpkg。
      result[key] = validURL(['cdnjs', 'zstatic'].includes(provider) && data.cdnjs === false ? urls.unpkg : urls[provider], key)
    }
    if (own && /hexo-theme-butterfly/.test(result[key])) throw new Error(`CDN.${key}: internal assets must belong to Dragonfly`)
  }
  return result
}

const preconnect = (html, urls, siteURL) => {
  const base = new URL(siteURL || 'https://theme.invalid')
  const origins = new Set()
  const existing = new Set()
  const add = (url, target = origins) => {
    if (typeof url !== 'string' || !/^(?:https?:)?\/\//i.test(url)) return
    try {
      const { origin } = new URL(url, base)
      if (origin !== base.origin) target.add(origin)
    } catch { /* 无效地址不生成连接提示。 */ }
  }
  // 延迟加载的组件把地址写入脚本或 data 属性；普通正文和外链不参与预连接。
  const configText = []
  let script = false
  new Parser({
    onopentag (tag, attrs) {
      script = tag === 'script'
      if (script) add(attrs.src)
      if (tag === 'link') {
        const rel = (attrs.rel || '').toLowerCase().split(/\s+/)
        if (rel.includes('preconnect')) add(attrs.href, existing)
        if (rel.some(value => ['stylesheet', 'preload', 'modulepreload'].includes(value))) add(attrs.href)
      }
      for (const [key, value] of Object.entries(attrs)) {
        if (key.startsWith('data-')) configText.push(value)
      }
    },
    ontext (text) { if (script) configText.push(text) },
    onclosetag (tag) { if (tag === 'script') script = false }
  }).end(html)
  const references = configText.join('\n')
  for (const url of urls) if (url && references.includes(url)) add(url)
  for (const origin of existing) origins.delete(origin)
  return [...origins].map(origin => `<link rel="preconnect" href="${escapeHTML(origin).replace(/&#x2F;/g, '/')}" crossorigin>`).join('')
}
module.exports = { internalAssets, providers, resolveAssets, preconnect }
