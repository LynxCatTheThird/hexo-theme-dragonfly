// Modified in Dragonfly. Native images keep their original source and author attributes.
const { rewriteImages } = require('../common/images')
const urlFor = require('hexo-util').url_for.bind(hexo)
const transform = content => {
  const options = hexo.theme.config.lazyload
  return rewriteImages(content, { ...options, root: hexo.config.root, placeholder: options.placeholder ? urlFor(options.placeholder) : '' })
}
hexo.extend.filter.register('after_render:html', html => {
  const { enable, field } = hexo.theme.config.lazyload
  return enable && field === 'site' ? transform(html) : html
})
hexo.extend.filter.register('after_post_render', data => {
  const { enable, field } = hexo.theme.config.lazyload
  if (enable && field === 'post') data.content = transform(data.content)
  return data
})
