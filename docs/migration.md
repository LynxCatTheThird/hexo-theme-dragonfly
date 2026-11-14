<!-- SPDX-License-Identifier: Apache-2.0；Dragonfly 项目文件，来源与署名见 NOTICE。 -->
# 迁移到 Dragonfly

| 旧名称 | 新名称 |
| --- | --- |
| `themes/butterfly` | `themes/dragonfly` |
| `_config.butterfly.yml` | `_config.dragonfly.yml` |
| `theme: butterfly` | `theme: dragonfly` |
| 浏览器接口 `btf` | `dragonfly` |
| `/img/butterfly-icon.png` | `/img/dragonfly.svg` |

Git 子模块安装需同时更新 `.gitmodules` 的路径和子模块记录；本项目站点已完成这一步。修改目录和配置文件后，执行 `npx hexo clean`，再重新生成站点。

主题内部调用和文档使用 `dragonfly`。旧的 `window.btf` 仅作为同一对象的兼容别名，方便已有注入脚本迁移；新增代码请使用新名称。

公开配置键保持原义，本次仅调整分组、说明和品牌默认资源。原站点自定义头像、封面、评论配置和文章许可继续沿用。外部包名、上游署名和用于检测旧配置的名称保留真实标识。

站点可移除私有 Markdown 渲染器，改用 `markdown.renderer: theme`。Git 安装需安装主题自身依赖；此站点的 `postinstall` 已自动完成该步骤。
