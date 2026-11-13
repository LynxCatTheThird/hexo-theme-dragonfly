const { engineFor, renderMath } = require('../common/math')

hexo.extend.helper.register('math_engine', page => engineFor(page, hexo.theme.config.math))
hexo.extend.filter.register('after_post_render', data => renderMath(data, hexo.theme.config.math), 20)
