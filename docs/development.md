<!-- SPDX-License-Identifier: Apache-2.0；Dragonfly 项目文件，来源与署名见 NOTICE。 -->
# 开发与分发

## 源码入口

| 目录或文件 | 职责 |
| --- | --- |
| `scripts/events/markdown.js` | 在插件注册完成后选择 Markdown 渲染器 |
| `scripts/common/math.js`、`scripts/filters/math.js` | 选择文章公式引擎，完成构建时渲染 |
| `scripts/common/assets.js`、`scripts/events/cdn.js` | 解析资源地址，将构建清单接入主题 |
| `layout/`、`source/css/` | Pug 页面结构与 Stylus 样式 |
| `browser/main.js`、`browser/modules/` | 页面挂载与按需文章、媒体、图库模块 |
| `browser/navigation.js`、`browser/page-scripts.js` | Swup 导航、页面清理与显式脚本执行 |
| `scripts/helpers/inject_head_js.js`、`browser/utils.js` | 初始全局状态与公共浏览器接口 |
| `tools/build.cjs`、`tools/release.cjs` | ESM 构建、完整资源清单和分发归档 |

构建流程为：Markdown 生成公式占位 → 文章过滤器渲染公式 → Pug/Stylus 生成页面 → 资源生成器输出 ESM、共享 chunk、source map 与许可文件。占位形式让同一 Markdown 渲染器能够按文章选择不同公式引擎。

## 本地验证

在主题目录安装开发依赖：

```sh
npm install --no-package-lock
npm test
npx playwright install chromium
npm run test:integration
```

| 命令 | 验证范围 |
| --- | --- |
| `npm test` | 配置、渲染、生命周期、构建清单和归档内容 |
| `npm run test:integration` | 独立站点的八组配置与浏览器交互 |
| `npm run test:package` | 打包后安装生产依赖，验证实际消费端构建 |
| `npm run test:site -- /path/to/site` | 在现有博客中添加临时组件文章，验证后清理 |
| `npm run test:browser -- /path/to/public` | 检查已生成的完整回归夹具站点 |

最后一个命令需要测试夹具中的固定页面，普通博客使用 `test:site`。`test:site` 会运行现有博客的构建插件；使用已有备份或测试副本更便于保留构建状态。

八组配置为 `default`、`components`、`subpath`、`navigation-off`、`cdn-modules`、`development`、`algolia`、`legacy-images`。测试默认将第三方 URL 映射到本地安装的实际发行文件。

```sh
# 单独检查子路径部署，并保留生成目录。
TEST_VARIANT=subpath TEST_KEEP_OUTPUT=1 npm run test:integration

# 使用已有 Chromium；路径按本机安装位置填写。
CHROMIUM_PATH=/usr/bin/google-chrome-stable npm run test:integration
```

`TEST_PROVIDER` 覆盖第三方 provider，`TEST_SCREENSHOTS` 指定截图目录。`TEST_REAL_CDN=1` 使用真实网络资源，结果也受网络状况影响。独立站点输出写入系统临时目录，保留时日志会打印位置。

## 页面与会话生命周期

公共对象为 `window.dragonfly`。`window.btf` 是迁移期同一对象的别名。主题在首次加载时创建 app scope 和 page scope；每次内容替换时保留 app scope，替换 page scope。

| 时机 | 调用与事件 |
| --- | --- |
| 首次文档加载 | 自定义代码通过 `DOMContentLoaded` 或 readyState 检查执行首次挂载 |
| 导航开始 | `navigationStart` 回调；此时旧页面可能仍可见 |
| 内容替换前 | `theme:page-leave` 事件，然后依次等待 `pageCleanup` 回调 |
| 清理完成 | 旧 `pageSignal` 被中止，随后创建新 signal |
| 新内容阶段 | 执行标记的页面脚本和 `pageLoad` 回调 |
| 页面就绪 | `theme:page-load` 事件；主题同时通知加密插件更新页面 |
| 导航结束、取消或失败 | `navigationEnd` 回调 |

`theme:page-load` 表示导航阶段完成；图表、图片和延迟组件可继续异步初始化。首次挂载由自定义代码主动执行。解密会触发 `encrypt` 回调；它可能发生在同一个页面中，组件挂载需要具备幂等性。

| 接口 | 使用约定 |
| --- | --- |
| `addGlobalFn(key, fn, name)` | 注册持续存在的命名回调；同一 key/name 的后续注册覆盖前者 |
| `addPageFn(key, fn, name)` | 注册随当前 page scope 释放的回调 |
| `addPageEventListener(el, type, fn, options)` | 页面事件自动随 scope 移除；支持额外的取消 signal |
| `addAppEventListener(el, type, fn, options)` | 使用 app signal，适合持续存在的 DOM 或全局事件 |
| `pageSignal` / `appSignal` | 页面与会话的取消信号；异步任务在开始时捕获 |
| `getScript(url)` / `getCSS(url, id)` | 按完整 URL 复用加载 Promise；失败后移除缓存，后续调用可以重试 |

导航关闭时，`pageLoad`、`pageCleanup`、`navigationStart` 回调不注册，普通文档跳转由浏览器释放资源。`ResizeObserver`、图表实例、定时器等资源仍需在组件中明确指定清理方式；事件监听器的自动解绑只负责监听器本身。

### 一个可重复挂载的组件

将以下内容作为站点 `source/js/custom-widget.js`，页面中放置对应按钮：

```html
<button id="custom-widget" type="button">点击计数</button>
```

```js
(() => {
  const mounted = new WeakSet()
  const mount = () => {
    const button = document.getElementById('custom-widget')
    if (!button || mounted.has(button)) return
    mounted.add(button)
    let count = 0
    dragonfly.addPageEventListener(button, 'click', () => {
      button.textContent = `已点击 ${++count} 次`
    })
  }

  dragonfly.addGlobalFn('pageLoad', mount, 'custom-widget')
  dragonfly.addGlobalFn('encrypt', mount, 'custom-widget')
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true })
  } else {
    mount()
  }
})()
```

在主题 `inject.bottom` 中引入该脚本：

```yaml
inject:
  bottom:
    - '<script src="/js/custom-widget.js"></script>'
```

该脚本初始化一次，再由命名回调挂载后续页面。部署在子路径时，手写脚本地址加入对应 `root`。需要重跑的纯页面脚本使用 `data-swup-reload-script`；同一 ESM URL 会缓存模块顶层执行，后续页面仍要显式挂载。

### 异步任务与清理

`fetch` 可使用捕获的 `pageSignal` 取消请求，完成后检查 signal 和目标节点。全局脚本加载器共享下载，离页时不取消共享下载；使用者负责确认结果仍属于当前页。

```js
async function updateWidget(element, url) {
  const signal = dragonfly.pageSignal
  try {
    const response = await fetch(url, { signal })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    if (signal.aborted || !element.isConnected) return
    element.textContent = data.message
  } catch (error) {
    if (!signal.aborted) console.error('[custom-widget]', error)
  }
}
```

创建观察器或图表后，可通过 `addPageFn('pageCleanup', dispose, '组件名')` 释放实例。导航会先等待这些清理回调，再中止页面 signal；清理函数应释放自己的资源并及时完成。

## 构建与缓存

`npm run build` 生成生产 ESM，`npm run build:dev` 生成便于调试的版本；Hexo 生成时也会按 `CDN.development` 自动构建。直接修改 `browser/`，构建目录 `dist/` 由工具维护。

构建清单记录入口、完整 import 图、文件大小和 SHA-256。缓存命中同时要求输入摘要一致、输出文件存在且校验和匹配。输入包含浏览器源码、构建脚本、包元数据和许可文件，因此仅更新署名也会刷新构建清单。

`utils` 是同步可用的兼容入口，构建会检查它没有 ESM 导入依赖。其余入口和动态 chunk 使用带 hash 的文件名。调试站点 CSS 仍由该站点的主题配置生成。

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

在 Git 工作副本中执行：

```sh
npm run release:prepare
npm run test:package -- /path/to/hexo-theme-dragonfly-X.Y.Z.tgz
```

默认输出目录为 `dist/release/`；可通过 `npm run release:prepare -- /path/to/output` 指定其他目录。

| 文件 | 内容 |
| --- | --- |
| `hexo-theme-dragonfly-X.Y.Z.tgz` | 可安装的主题归档，含源码、生产构建和许可 |
| `hexo-theme-dragonfly-X.Y.Z-assets.tar.gz` | 同一构建的 JS、source map、清单和许可目录 |
| `release.json` | 包名、版本、Git 提交、源码摘要和逐文件校验信息 |
| `SHA256SUMS` | 两种归档及 release.json 的校验和 |

归档先构建，再以 `npm pack --ignore-scripts` 打包，避免打包时生成另一份资源。`release:prepare` 只准备文件；本地未设置 `RELEASE_TAG` 时允许工作区草稿，此时提交 SHA 不能单独代表草稿内容。

正式演练使用与版本一致的标签，并设置 `RELEASE_TAG`。工具会验证标签版本、标签对应的 HEAD 和干净工作区。GitHub 发布工作流执行测试、准备归档、用归档验证独立安装，然后将同一产物交给发布任务。

手动触发默认只生成产物；选中发布选项或发布 GitHub release 才会上传 npm。公开发布需配置 npm trusted publisher。发布任务校验 `SHA256SUMS`，直接使用测试过的 `.tgz`。

自定义 CDN 先上传整个资源包，保留 `dist/source/` 层级，再切换地址模板。内部 JS 模板中的 `${version}` 使用源码摘要前缀，可从清单的 `sourceHash` 取前 12 位。JavaScript 提供正确 MIME 与跨域访问；版本化资源可长期缓存，HTML、可变清单和站点 CSS 重新验证。保留旧版本供缓存页面继续读取，回退时切换整套资源。
