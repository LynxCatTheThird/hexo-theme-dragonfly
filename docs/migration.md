<!-- SPDX-License-Identifier: Apache-2.0；Dragonfly 项目文件，来源与署名见 NOTICE。 -->

# 迁移到 Dragonfly

先保存现有配置和自定义改动，再更新主题代码。本文用于已有站点；新站点直接按 [README](../README.md#安装) 安装。

## 名称对应

| 旧名称                    | 新名称                  |
| ------------------------- | ----------------------- |
| `themes/butterfly`        | `themes/dragonfly`      |
| `_config.butterfly.yml`   | `_config.dragonfly.yml` |
| `theme: butterfly`        | `theme: dragonfly`      |
| 浏览器接口 `btf`          | `dragonfly`             |
| `/img/butterfly-icon.png` | `/img/dragonfly.svg`    |

主题目录、站点的 `theme` 与根目录配置文件名要对应。保留已有 `_config.butterfly.yml` 的内容并重命名，可以沿用头像、封面、评论和文章许可设置；主题默认配置用于逐项核对新增字段。

## 普通目录安装

以下命令在站点根目录执行，目标名称应尚未使用：

```sh
mv themes/butterfly themes/dragonfly
mv _config.butterfly.yml _config.dragonfly.yml
```

在站点 `_config.yml` 中改为 `theme: dragonfly`。同步更新 `package.json` 脚本和自定义工具中的主题路径。若主题目录本身是 Git 仓库，核对其远端后获取 Dragonfly 代码，并保留本地自定义改动。

## Git 子模块安装

本项目站点已经包含迁移提交，更新站点仓库后执行：

```sh
git submodule sync --recursive
git submodule update --init --recursive
```

自行迁移、且原子模块注册名为 `themes/butterfly` 时，在工作区清理完待提交改动后执行：

```sh
git submodule update --init themes/butterfly
git mv themes/butterfly themes/dragonfly
git config -f .gitmodules --rename-section submodule.themes/butterfly submodule.themes/dragonfly
git config --rename-section submodule.themes/butterfly submodule.themes/dragonfly
git submodule set-url themes/dragonfly https://github.com/LynxCatTheThird/hexo-theme-dragonfly.git
git -C themes/dragonfly fetch origin dev
git -C themes/dragonfly checkout --detach origin/dev
git mv _config.butterfly.yml _config.dragonfly.yml
```

`git mv` 会处理工作目录和子模块路径；内部 `.git/modules/` 存储名可能保留旧名称，由 Git 管理。核对 `.gitmodules`、`git submodule status`、站点 `theme` 与脚本路径后再提交。主题提交应先能从 Dragonfly 远端获取，站点再提交对应 gitlink。

## 渲染器与依赖

Git 安装的主题具有自己的依赖目录：

```sh
npm install --prefix themes/dragonfly --omit=dev --no-package-lock
npx hexo clean
npx hexo generate
```

本项目站点的 `postinstall` 会安装上述生产依赖；修改主题并运行测试时，在主题目录执行 `npm install --no-package-lock` 安装开发依赖。

从站点私有渲染器迁移时，先选择 `markdown.renderer`。`theme` 使用内置 Markdown 与公式处理，`external` 保留站点渲染器。确认自定义 Markdown 扩展与文章输出后，再清理重复的私有 renderer 和依赖。数学引擎及组件组合见[配置指南](configuration.md)。

## 自定义脚本

主题内部调用使用 `dragonfly`，旧的 `window.btf` 仍指向同一对象。已有脚本可逐步改名；新增代码使用新接口。

旧脚本若只监听首次加载，需要补充页面挂载逻辑。页面初始化通过 `pageLoad` 注册，监听器用 `addPageEventListener`，异步任务捕获 `pageSignal`，图表和观察器在 `pageCleanup` 中释放。完整示例见[开发文档](development.md#一个可重复挂载的组件)。

逐页脚本添加 `data-swup-reload-script`；注册全局挂载回调的脚本保持一次初始化。同一模块 URL 的顶层代码会被浏览器缓存，重复插入模块脚本应配合显式挂载。

## 迁移后的检查

1. 运行 `npx hexo clean` 和 `npx hexo generate`，确认构建成功。
2. 分别直达和切页打开文章，检查公式、目录、搜索、图片与评论。
3. 有加密文章时，检查解密后的图表和图片；有子路径时，检查脚本、图片和搜索索引地址。
4. 在浏览器网络面板确认内部 JS 来自当前构建，包含所引用的共享 chunk。
5. 核对主题目录与根配置的新名称，保留文章许可及上游、第三方来源说明。

本次品牌迁移保持公开配置键的原义；配置主要按使用场景重新分组。外部包名、版权出处和用于识别旧配置的名称保留真实标识。
