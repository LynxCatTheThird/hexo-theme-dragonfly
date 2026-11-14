<!-- SPDX-License-Identifier: Apache-2.0；Dragonfly 项目修改，来源与署名见 NOTICE。 -->
<p align="center"><img src="source/img/dragonfly.svg" width="128" height="128" alt="Dragonfly 蜻蜓标志"></p>

# Dragonfly

基于 Hexo 的静态博客主题，提供卡片布局、深色模式、搜索、数学公式与图表，并通过按需加载和页面生命周期管理控制浏览器资源。

[![版本](https://img.shields.io/github/package-json/v/LynxCatTheThird/hexo-theme-dragonfly/dev)](package.json)
[![测试](https://github.com/LynxCatTheThird/hexo-theme-dragonfly/actions/workflows/test.yml/badge.svg?branch=dev)](https://github.com/LynxCatTheThird/hexo-theme-dragonfly/actions/workflows/test.yml)
[![许可证](https://img.shields.io/github/license/LynxCatTheThird/hexo-theme-dragonfly)](LICENSE)
[![星标](https://img.shields.io/github/stars/LynxCatTheThird/hexo-theme-dragonfly?style=social)](https://github.com/LynxCatTheThird/hexo-theme-dragonfly)

[配置指南](docs/configuration.md) · [开发与分发](docs/development.md) · [迁移说明](docs/migration.md) · [报告问题](https://github.com/LynxCatTheThird/hexo-theme-dragonfly/issues)

## 安装

使用 Node.js 22.14 或更高版本、Hexo 8；测试覆盖 Node.js 22、24。主题的兼容检查最低接受 Hexo 5.3，旧版本需自行验证所用组件。

在站点根目录执行：

```sh
git clone -b dev --depth 1 https://github.com/LynxCatTheThird/hexo-theme-dragonfly.git themes/dragonfly
npm install --prefix themes/dragonfly --omit=dev --no-package-lock
cp themes/dragonfly/_config.yml _config.dragonfly.yml
```

在站点 `_config.yml` 中设置 `theme: dragonfly`，随后运行 `npx hexo generate` 或 `npx hexo server`。日常设置写入根目录的 `_config.dragonfly.yml`，站点内容和自定义资源放在站点的 `source/` 中。

分发包名为 `hexo-theme-dragonfly`。公开 npm 发布完成前，使用上述 Git 安装方式；归档安装与发布步骤见[开发文档](docs/development.md)。

## 常用功能

- 布局：响应式页面、侧栏、文章目录、阅读模式与深色模式。
- 内容：代码工具栏、标签插件、KaTeX 与 MathJax 预渲染、ECharts、Chart.js、Mermaid 和 ABCJS。
- 交互：Swup 导航、本地搜索、Algolia、DocSearch、原生图片懒加载与图片灯箱。
- 站点：Artalk、Twikoo、Waline 评论，访问统计、结构化数据与 CDN 配置。

具体开关、默认值和第三方服务参数以 [_config.yml](_config.yml) 为准。更新前保存站点配置，更新后按[迁移说明](docs/migration.md)核对公开接口。

## 贡献与来源

欢迎通过 [Issue](https://github.com/LynxCatTheThird/hexo-theme-dragonfly/issues) 或 Pull Request 提交问题、改进和测试结果。

Dragonfly 基于 Jerry（CrazyWong）及贡献者维护的 [Butterfly](https://github.com/jerryc127/hexo-theme-butterfly)，其历史基础是 Molunerfinn 的 [Melody](https://github.com/Molunerfinn/hexo-theme-melody)。感谢原作者与各项目贡献者提供的基础。Dragonfly 独立维护，问题反馈请使用本仓库的入口。

主题采用 [Apache License 2.0](LICENSE)，原始来源、保留署名和第三方许可见 [NOTICE](NOTICE) 与 [LICENSES](LICENSES)。站点文章的版权设置独立于主题代码许可。

蜻蜓标志采用 Lorc 的 [Dragonfly](https://game-icons.net/1x1/lorc/dragonfly.html)，按 [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) 使用，调整了配色和显示尺寸。

## 星标历史

[![Dragonfly 星标历史](https://api.star-history.com/svg?repos=LynxCatTheThird/hexo-theme-dragonfly&type=Date)](https://star-history.com/#LynxCatTheThird/hexo-theme-dragonfly&Date)
