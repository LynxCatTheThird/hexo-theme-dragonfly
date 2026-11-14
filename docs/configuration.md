<!-- SPDX-License-Identifier: Apache-2.0；Dragonfly 项目文件，来源与署名见 NOTICE。 -->
# 配置指南

站点 `_config.yml` 管理 Hexo 的内容、地址和构建；`_config.dragonfly.yml` 管理主题。主题目录中的 `_config.yml` 提供完整默认值，站点配置优先。

## 配置分组

| 分组 | 主要内容 |
| --- | --- |
| 站点标识与菜单 | 图标、头像、导航和社交链接 |
| 外观与布局 | 配色、字体、侧栏、页脚和工具栏 |
| 封面与图片 | 页面封面、替代图、懒加载和灯箱 |
| 首页与归档 | 文章卡片、摘要、副标题和分类页 |
| 文章阅读 | 元信息、目录、复制、文章许可和字数 |
| 内容渲染 | Markdown、代码、公式、图表和标签插件 |
| 搜索与评论 | 搜索服务和评论服务 |
| 统计与搜索引擎 | 访问统计、验证标签和结构化数据 |
| 动效与加载 | 加载提示和可选装饰效果 |
| 导航与资源 | Swup、CDN 和样式前缀 |
| 应用与扩展 | PWA 和脚本、样式注入 |

菜单项格式为 `名称: 路径 || 图标`；嵌套对象表示子菜单。图标使用 Font Awesome 类名。页面和文章可通过 front matter 指定 `cover`、`top_img`、`math` 等内容选项。

## Markdown 与公式

`markdown.renderer` 决定渲染职责：`auto` 在站点未安装 Markdown 渲染器时使用内置实现；`theme` 明确选用内置实现；`external` 保留站点渲染器。主题的公式解析及 Markdown 扩展作用于内置渲染器。

```yaml
markdown:
  renderer: theme
math:
  use: katex
  per_page: true
  katex:
    mhchem: true
    copy_tex: true
```

KaTeX 在构建时生成 HTML。MathJax 默认在构建时生成 SVG，`math.mathjax.render: client` 切换为浏览器渲染。两者的 `mhchem` 都控制化学公式扩展。文章中的 `math: katex`、`math: mathjax` 或 `math: false` 可以覆盖默认引擎。

## 导航、搜索与图片

`navigation.enable` 启用 Swup；`cache` 控制页面缓存，`preload` 控制鼠标、触摸和键盘触发的预加载，`exclude` 列出使用整页跳转的路径。

本地搜索需要站点安装 `hexo-generator-searchdb` 并配置 `search.path`。Algolia 使用站点的 `algolia` 凭据和索引设置；DocSearch 使用 `search.docsearch`。公开到浏览器的凭据应为搜索专用密钥。

普通文章图片默认使用真实 `src`、原生 `loading` 与 `decoding` 属性。首屏关键图片可设置 `loading="eager"` 或 `fetchpriority="high"`。`lazyload.native: false` 使用旧插件加载方式；`lightbox` 可选择 `fancybox` 或 `medium_zoom`。

## 资源地址

主题内部资源使用 `local` 或 `custom`；第三方资源支持 `local`、`jsdelivr`、`unpkg`、`cdnjs` 和 `custom`。本地第三方文件放在站点 `source/pluginsSrc/<包名>/<文件路径>`，路径和版本见 [plugins.yml](../plugins.yml)。

```yaml
CDN:
  internal_provider: local
  third_party_provider: custom
  version: true
  custom_format: https://registry.npmmirror.com/${name}/${version}/files/${file}
```

`CDN.internal_custom_format` 单独设置主题资源模板；`CDN.option` 按资源键覆盖地址。开发模式和站点生成的 CSS 使用本地资源。`butterfly-extsrc` 属于外部特效组件，其包名保留原样。

## 文章许可与主题署名

`post_copyright` 设置博客文章的作者、许可名称和许可地址；`copy.copyright` 控制复制时附加的来源。它们与主题源代码的 Apache-2.0 许可证相互独立。

`footer.owner` 显示站点署名，`footer.copyright` 显示 Hexo 与 Dragonfly 信息。上游作者和第三方代码的来源集中记录在 [NOTICE](../NOTICE)，随主题与构建资源一起分发。
