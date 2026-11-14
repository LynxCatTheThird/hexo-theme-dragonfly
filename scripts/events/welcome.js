// SPDX-License-Identifier: Apache-2.0
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
hexo.on('ready', () => {
  const { version } = require('../../package.json')
  hexo.log.info(`Dragonfly ${version} · https://github.com/LynxCatTheThird/hexo-theme-dragonfly`)
})
