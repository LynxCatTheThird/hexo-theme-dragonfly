<!-- SPDX-License-Identifier: Apache-2.0；Dragonfly 项目文件，来源与署名见 NOTICE。 -->
# 配置指南

本文说明配置位置、常用组合和生效条件。完整字段见 [_config.yml](../_config.yml)；文章格式与图表、标签示例见[文章写作](writing.md)。

## 配置放在哪里

| 位置 | 职责 | 示例 |
| --- | --- | --- |
| 站点 `_config.yml` | Hexo 地址、目录、生成器和插件 | `url`、`root`、`theme`、`search.path` |
| 站点 `_config.dragonfly.yml` | 日常主题设置 | 菜单、侧栏、公式、评论、CDN |
| 站点 `_config.yml` 的 `theme_config` | 对主题设置的进一步覆盖 | 临时验证或多环境配置 |
| 主题目录 `_config.yml` | 随版本维护的主题默认设置 | 新字段的默认值与说明 |
| 文章 front matter | 当前文章的局部设置 | `math`、`toc`、`aside`、`comments` |

在当前支持的 Hexo 加载流程中，优先级为：站点 `theme_config` → 站点 `_config.dragonfly.yml` → 主题配置与程序默认值。嵌套对象逐层合并；数组可能合并而非整体替换，因此菜单、评论服务和图片列表等设置宜集中写在同一处。

字段名区分大小写，例如 `CDN`、`Open_Graph_meta`、`noticeOutdate`。`false` 是布尔值，`'false'` 是字符串；`null` 与空值的具体作用取决于字段说明。包含 `#` 的颜色值使用引号。

修改配置后重新运行 `npx hexo generate`。调整主题目录、渲染器或构建路径时，先运行 `npx hexo clean` 清理旧输出与数据库缓存。

## 站点标识、菜单与外观

以下示例写入 `_config.dragonfly.yml`：

```yaml
nav:
  display_title: true
  fixed: true
menu:
  首页: / || fas fa-home
  内容 || fas fa-list:
    归档: /archives/ || fas fa-archive
    标签: /tags/ || fas fa-tags
social:
  fab fa-github: https://github.com/你的账号 || GitHub
  fas fa-envelope: mailto:hello@example.com || 联系邮箱
```

菜单项使用 `路径 || 图标`。子菜单由一层嵌套对象组成，分组名称也可附加图标；菜单只生成链接，目标页面由站点创建。社交项使用 `链接 || 描述 || 颜色`，颜色可省略。

`font` 设置字体名称和字号，`blog_title_font.font_link` 可加载标题字体的样式表。正文自定义字体可通过 `inject.head` 引入自己的 CSS，并在 `font.font_family` 中填写对应名称。

`display_mode` 指定初始配色。`darkmode.autoChangeMode: 1` 跟随系统，`2` 根据页面初始化时的浏览器本地时间判断日夜。`start`、`end` 表示日间起止小时，默认 6 与 18；当前实现中值为 `0` 时也回退到默认值。手动选择的配色会优先使用。

侧栏卡片通过各自的 `enable` 开关控制。`aside.card_categories.expand` 为 `none` 时显示完整层级，为 `true` 或 `false` 时提供默认展开或折叠的分组。当前 `sort_order` 是保留字段，卡片位置由模板决定。

页脚导航采用分组列表：

```yaml
footer:
  nav:
    - width: 1
      content:
        - title: 内容
          item:
            - title: 归档
              url: /archives/
            - title: 关于
              url: /about/
```

`width` 是该组的伸展权重；条目可使用 `title` 与 `url`，也可通过 `html` 提供自定义内容。

## 封面、正文图片与灯箱

| 位置 | 图片选择顺序 |
| --- | --- |
| 文章顶部 | 文章 `top_img` → 文章 `cover` → `default_top_img` |
| 独立页面顶部 | 页面 `top_img` → `default_top_img` |
| 首页、归档页 | `index_img` / `archive_img` → `default_top_img` |
| 标签、分类详情页 | `tag_per_img` / `category_per_img` 中的对应名称 → 通用详情页封面 → `default_top_img` |

`disable_top_img: true` 全局关闭顶部封面，文章或页面的 `top_img: false` 单独关闭当前页。`cover` 下的三个开关分别控制首页、侧栏和归档中的文章封面显示。

普通文章图默认保留真实 `src`、`srcset` 与尺寸，并补充浏览器原生懒加载属性。`lazyload.field: post` 处理正文，`site` 处理完整页面；专用图库保留自己的布局和加载流程。首屏关键图可写为：

```html
<img src="/img/cover.jpg" width="1200" height="675"
     loading="eager" fetchpriority="high" alt="文章封面">
```

`lazyload.native: false` 使用旧插件加载方式，普通图片会使用占位图。`no-lazyload` 类保留立即加载，`no-lightbox` 类让图片使用普通点击行为。`photofigcaption` 开启后，图注优先使用图片的 `title`，其次使用 `alt`。

`lightbox` 选择 `fancybox` 或 `medium_zoom`；`lightbox_options` 传给所选查看器。已有图片链接保持原链接，主题会为未链接的图片添加查看器入口。

## Markdown 与公式

| `markdown.renderer` | 行为 |
| --- | --- |
| `auto` | 站点已注册 Markdown 渲染器时保留它，否则使用内置实现 |
| `theme` | 由主题处理 `.md` 和 `.markdown` |
| `external` | 使用站点渲染器，由站点负责 Markdown 扩展和公式解析 |

内置实现提供脚注、任务列表、上下标等扩展，并在文章渲染阶段处理公式。以下组合适合需要公式的站点：

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

`math.per_page: true` 将默认引擎用于文章和页面；为 `false` 时，由文章 front matter 的 `math: katex` 或 `math: mathjax` 选择。`math: false` 始终关闭该文章的公式处理。同一篇文章选择一个引擎。

KaTeX 在构建时生成 HTML；MathJax 的 `server` 模式在构建时生成 SVG。这两种方式的公开文章公式均可在关闭 JavaScript 后阅读。MathJax 的 `client` 模式在浏览器渲染，适合需要其客户端扩展的场景。

KaTeX 的 `options` 是构建参数。MathJax 的 `tex` 与 `tags` 用于 TeX 处理，`loader`、`output`、`chtml`、`options` 及菜单设置用于客户端模式。两种引擎的 `mhchem` 分别启用化学公式支持。TeX 复制功能还需要 `copy.enable: true`。

## 搜索与导航

本地搜索需要站点安装 `hexo-generator-searchdb`：

```sh
npm install hexo-generator-searchdb
```

站点 `_config.yml`：

```yaml
search:
  path: search.xml
  field: all
  content: true
```

站点 `_config.dragonfly.yml`：

```yaml
search:
  use: local_search
  local_search:
    preload: false
    top_n_per_article: 2
    pagination:
      enable: true
      hitsPerPage: 8
```

索引地址也可使用 `.json`。主题包装现有搜索生成器，移除已识别加密文章的正文和隐藏图表数据；标题、路径及分类标签仍可能进入索引。`search.local_search.preload` 控制提前下载索引，`CDN` 可覆盖索引地址。

Algolia 模式使用站点的 `algolia.appId`（或 `applicationID`）、`apiKey`、`indexName`；也可由 `ALGOLIA_APP_ID`、`ALGOLIA_API_KEY`、`ALGOLIA_INDEX_NAME` 环境变量提供。DocSearch 使用主题的 `search.docsearch`。两种服务都需要事先准备索引，浏览器配置使用搜索专用凭据。

```yaml
navigation:
  enable: true
  cache: true
  preload: true
  timeout: 10000
  exclude:
    - /policy/
```

预加载同时要求 `cache` 和 `preload` 为 `true`。`exclude` 精确比较 URL 的 `pathname`：部署在 `/blog/` 时写 `/blog/policy/`，查询参数和片段不参与匹配。单个链接或其父元素可添加 `data-no-swup`，让链接走普通整页导航。

## 评论、字数与访问统计

```yaml
comments:
  use:
    - Waline
  lazyload: true
waline:
  serverURL: https://comments.example.com
```

先部署对应评论服务，再填写 Artalk 的 `server`、Twikoo 的 `envId` 或 Waline 的 `serverURL`。`comments.use` 最多保留两个服务，第一个默认显示。各服务的 `option` 用于传递其组件参数。文章可通过 `comments: false` 隐藏评论区。

`comments.count` 与 `card_post_count` 分别控制文章页和首页的评论数。需要立即显示数量时使用 `lazyload: false`；懒加载会推迟评论服务初始化。访问量通常由 Vercount 提供，默认评论服务启用自己的 `visitor` 或 `pageview` 时，文章阅读量优先使用该服务。

`wordcount.enable` 需要站点安装 `hexo-wordcount`。Vercount 的 `api_url` 接受兼容接口：POST JSON `{"url":"https://example.com/post/","isNewUv":true}`，成功响应形如 `{"status":"success","data":{"site_uv":1,"site_pv":1,"page_pv":1}}`。请求失败时显示 `—`，`timeout` 单位为毫秒。

## CDN、子路径与开发模式

主题在构建时解析资源 URL：`plugins.yml` 提供第三方包名、版本与文件路径，构建清单提供主题入口和 chunk，`CDN` 配置决定最终地址。生成器仍会输出本地主题资源；远程资源的上传和 CDN 服务由部署端管理。

自定义 URL 有三种入口，都位于主题配置的 `CDN` 段：

| 配置 | 用途 | 生效条件 |
| --- | --- | --- |
| `custom_format` | 批量生成第三方资源的完整 URL | `third_party_provider: custom` |
| `internal_custom_format` | 为主题内部 JS 使用独立 URL 模板 | `internal_provider: custom` |
| `option.<资源键>` | 直接指定单个文件的完整 URL | 对应项填写非空地址；开发模式忽略内部项 |

内部 provider 为 `custom` 且独立模板为空时，会回退到 `custom_format`。主题代码通常与 npm 镜像采用不同的目录布局，自建 CDN 时宜明确填写独立模板。完整逐项覆盖清单已列在 [_config.yml](../_config.yml) 的 `CDN.option` 下，取消所需行的注释即可填写。

内部资源支持 `local`、`custom`；第三方支持 `local`、`jsdelivr`、`unpkg`、`cdnjs`、`custom`。本地第三方文件放在站点 `source/pluginsSrc/<包名>/<文件路径>`，版本和路径见 [plugins.yml](../plugins.yml)。仅选择 `local` 不会下载这些组件。

```yaml
CDN:
  internal_provider: local
  third_party_provider: custom
  version: true
  custom_format: https://registry.npmmirror.com/${name}/${version}/files/${file}
```

下面是自建主题 CDN、并为一个第三方组件单独指定地址的片段。示例域名需替换为实际托管地址：

```yaml
CDN:
  internal_provider: custom
  internal_custom_format: https://cdn.example.com/dragonfly/${version}/${file}
  third_party_provider: jsdelivr
  option:
    fontawesome: https://cdn.example.com/fontawesome/css/all.min.css
```

主题内部脚本需要连同其引用的全部 chunk 一起上传；字体样式表还需要能访问相对路径下的字体文件。页面、文章图片及 `inject` 中手写的 URL 不经过这套资源映射，按各自配置设置地址。

单项 `CDN.option` 优先于 provider；开发模式强制内部资源使用本地构建，并忽略其单项覆盖。生产模式下，站点生成的 CSS 默认使用本地地址，显式的 `CDN.option.main_css` 可指定其他地址。`cdnjs` 对 `plugins.yml` 中标记 `cdnjs: false` 的资源回退到 unpkg。

| 占位符 | 内容 |
| --- | --- |
| `${name}` | 包名，包含作用域 |
| `${version}` | 第三方声明版本；内部 JS 使用源码摘要前缀 |
| `${file}` / `${min_file}` | 包内原始路径 / 对应的压缩文件路径 |
| `${cdnjs_name}` | cdnjs 上的名称或别名 |
| `${cdnjs_file}` / `${min_cdnjs_file}` | cdnjs 文件路径 / 对应的压缩路径 |

`CDN.internal_custom_format` 为内部资源单独设置模板。内部 JS 的 `${file}` 形如 `dist/source/js/build/production/main-….js`；上传时保留资源包的目录层级。`${version}` 对内部 JS 是源码摘要，不等同于 npm 版本号。`version` 开关控制内置 provider 的版本标记，自定义模板按自身内容展开。

子路径部署要同时设置站点 `url` 与 `root`，例如 `https://example.com/blog` 与 `/blog/`。导航排除路径、手写脚本地址和自定义注入资源都要按实际部署路径填写。外部包 `butterfly-extsrc` 保留其真实名称。

## 扩展与常见排查

`pwa` 提供 manifest 与图标入口，Service Worker 和离线缓存由站点插件生成。`inject.head`、`inject.bottom` 接受 HTML 字符串列表；跨页面脚本的挂载方式见[开发文档](development.md)。

| 现象 | 先检查 |
| --- | --- |
| 配置修改后无变化 | 是否写在主题配置中；站点 `theme_config` 是否覆盖了同名项；是否重新生成 |
| 公式仍显示源码 | Markdown 渲染职责、`math.use`、文章的 `math` 与 `per_page` |
| 搜索索引返回 404 | 搜索生成器是否安装、`search.path` 是否生成、子路径与 CDN 地址 |
| 图表显示为普通代码 | 对应组件是否开启；ECharts JSON 是否有效；Mermaid 是否使用标签写法 |
| 切页后自定义按钮失效 | 初始化是否只在首次加载运行；是否注册页面挂载与清理 |
| 本地组件返回 404 | `source/pluginsSrc` 下是否具有实际文件及其关联字体、样式 |

文章许可由 `post_copyright` 设置，复制附注由 `copy.copyright` 设置。站点署名使用 `footer.owner`，框架与主题信息使用 `footer.copyright`；主题代码许可及第三方来源见 [NOTICE](../NOTICE)。
