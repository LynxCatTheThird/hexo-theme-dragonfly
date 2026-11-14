// SPDX-License-Identifier: Apache-2.0
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
const { engineFor, renderMath } = require('../common/math')

hexo.extend.helper.register('math_engine', page => engineFor(page, hexo.theme.config.math))
hexo.extend.filter.register('after_post_render', data => renderMath(data, hexo.theme.config.math), 20)
