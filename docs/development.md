<!-- SPDX-License-Identifier: Apache-2.0；Dragonfly 项目文件，来源与署名见 NOTICE。 -->
# 开发与分发

## 本地验证

在主题目录执行：

```sh
npm install --no-package-lock
npm test
npx playwright install chromium
npm run test:integration
npm run test:package
npm run test:site -- /path/to/site
```

单元测试覆盖配置、渲染与资源清单；浏览器矩阵覆盖默认配置、组件、子路径、无导航、跨域资源、开发模式、Algolia 和旧图片加载方式。测试站点和归档写入临时目录。`test:site` 验证现有博客的构建与交互。

## 浏览器接口

公共接口为 `window.dragonfly`。首次加载使用 `DOMContentLoaded`；导航完成触发 `theme:page-load`，离页前触发 `theme:page-leave`。

- `dragonfly.addPageFn` 和 `dragonfly.addPageEventListener` 随当前页面释放。
- `dragonfly.addAppEventListener` 注册会话内持续存在的监听器。
- 异步操作捕获 `dragonfly.pageSignal`，完成时检查页面是否仍有效。
- 图表、观察器等资源通过 `pageCleanup` 释放。

需要在切页后执行的页面脚本添加 `data-swup-reload-script`。同一 ESM 地址在会话内只执行一次顶层代码，后续挂载应注册 `pageLoad` 回调。

## 注释与版权头

业务注释使用简体中文，说明约束、边界或原因。标识符、第三方 API、许可证正文和既有权利人名称保留原文。

修改过的 JavaScript 文件使用以下短头；Pug、Stylus、YAML 使用各自的注释语法：

```js
// SPDX-License-Identifier: Apache-2.0
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
```

新增文件将第二行写为“Dragonfly 项目文件；来源与署名见 NOTICE。”。已有版权、来源和修改者声明继续保留。JSON 使用 `_comment` 元数据；图片的作者和许可写在对应 `.license` 文件中。混合许可文件在 SPDX 标记中列出适用许可证。

Apache 2.0 第 4 条规定了许可证副本、修改声明、原始署名与上游 NOTICE 的分发要求。ASF 官方 FAQ 接受 SPDX 短头；LLVM 也采用短头指向完整许可证，但其 LLVM exception 不适用于本项目。详细来源以 [NOTICE](../NOTICE) 和 [LICENSES](../LICENSES) 为准。

参考：[Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0)、[ASF 许可证 FAQ](https://www.apache.org/foundation/license-faq.html#LicenseHeader)、[LLVM 文件头实例](https://github.com/llvm/llvm-project/blob/main/llvm/lib/Support/SmallVector.cpp)。

## 打包与发布

`npm run release:prepare` 生成 `dist/release/`，包含 npm 归档、同一构建的浏览器资源、提交 SHA 和 SHA-256 校验和。许可证与来源说明随两种归档一并交付。

```sh
npm run release:prepare
npm run test:package -- /path/to/hexo-theme-dragonfly-X.Y.Z.tgz
```

发布工作流接受与包版本一致的 `vX.Y.Z` 标签，验证标签、干净工作区和测试结果。手动触发默认生成产物；选中发布选项或发布 GitHub release 后，发布任务使用已验证归档上传 npm。公开发布需配置 npm trusted publisher。

自定义 CDN 应先上传完整资源目录到不可变版本前缀，再切换入口模板。JavaScript 需提供正确 MIME 与跨域访问。版本化资源可长期缓存；HTML、可变清单和站点 CSS 重新验证。保留旧版本供缓存页面使用，回退时切换整套资源。
