<!-- SPDX-License-Identifier: Apache-2.0；Dragonfly 项目文件，来源与署名见 NOTICE。 -->
# 文章写作

正文使用 Markdown，主题标签由 Hexo 在构建时展开。以下示例按内置 Markdown 渲染器编写，启用方式见[配置指南](configuration.md#markdown-与公式)。

## 文章头部

```yaml
---
title: 一篇示例文章
date: 2026-01-01
cover: /img/example.jpg
math: katex
toc: true
comments: true
---
```

| 字段 | 作用 |
| --- | --- |
| `cover` | 文章列表封面，也可作为文章顶部图片的回退值 |
| `top_img` | 当前页顶部图片；`false` 关闭顶部封面 |
| `description` | 摘要来源之一，是否使用由 `index_post_content.method` 决定 |
| `math` | `katex`、`mathjax` 或 `false`，覆盖默认公式引擎 |
| `toc` | 当前文章或独立页面的目录开关 |
| `toc_number`、`toc_expand` | 覆盖目录编号与默认展开行为 |
| `toc_style_simple` | 当前文章的简化目录布局 |
| `aside` | `false` 隐藏当前文章或独立页面的侧栏 |
| `comments` | `false` 隐藏当前页评论区 |
| `series` | 当前文章所属系列名称，用于系列标签与侧栏卡片 |
| `abcjs` | 在 `abcjs.enable: true`、`per_page: false` 时为当前页启用乐谱 |

目录根据正文标题生成。归档、标签和分类详情页的侧栏由主题 `aside.display` 控制。

## 数学公式

行内使用 `$x^2$`，独立公式使用双美元符号：

```markdown
行内公式：$E = mc^2$。

$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$
```

化学公式如 `$\ce{H2O}$` 需要所选引擎的 `mhchem: true`。宏写在对应引擎的参数中，例如 KaTeX 的 `math.katex.options.macros`、MathJax 的 `math.mathjax.tex.macros`。代码块和行内代码中的公式保持字面量。

## 图表与乐谱

### ECharts

开启 `echarts.enable` 后，使用语言标记为 `echarts` 的 JSON 围栏：

````markdown
```echarts
{
  "xAxis": { "type": "category", "data": ["A", "B"] },
  "yAxis": { "type": "value" },
  "series": [{ "type": "bar", "data": [3, 5] }]
}
```
````

内容必须是 JSON 对象。全局 `echarts.option` 与单图配置按顶层键合并；例如单图的 `series` 会替换同名默认值。解析失败会保留原代码块并输出构建警告。高度来自 `echarts.height`，渲染器由 `echarts.init_options.renderer` 选择。

### Mermaid

开启 `mermaid.enable` 后，可直接使用标签：

```markdown
{% mermaid %}
flowchart LR
  A[开始] --> B[完成]
{% endmermaid %}
```

`mermaid.code_write` 适配渲染后形如 `pre > code.mermaid` 的代码块。当前内置渲染器配合默认高亮时，普通围栏会成为代码展示，使用上述标签即可生成图表。单图参数可写在标签首个参数中，例如 `{% mermaid {"theme":"forest"} %}`；使用紧凑 JSON，避免空格拆分参数。

### Chart.js

开启 `chartjs.enable`，将配置放在 `chart` 标记之间：

```markdown
{% chartjs 90,,example-chart %}
<!-- chart -->
{"type":"bar","data":{"labels":["A","B"],"datasets":[{"label":"数量","data":[3,5]}]}}
<!-- endchart -->
<!-- desc -->
两组数据的数量比较。
<!-- enddesc -->
{% endchartjs %}
```

三个参数依次为宽度百分比、并排布局标记和图表 ID。第二项留空使用上下布局，填写 `true` 使用并排布局；当前实现按非空字符串判断，因此关闭时留空。ID 在同一页中保持唯一，`desc` 部分可省略。

### ABC 乐谱

开启 `abcjs.enable`，并设置 `per_page: true` 或当前文章 `abcjs: true`：

```markdown
{% score %}
X:1
T:示例旋律
M:4/4
L:1/4
K:C
C D E F | G A B c |
{% endscore %}
```

需要渲染参数时，在乐谱前放置 JSON 对象，再以独立一行 `------` 分隔。主题会将 `responsive` 设置为 `resize`。

## 常用标签

### 提示块与折叠内容

```markdown
{% note info flat %}
这是一条提示，支持 **Markdown**。
{% endnote %}

{% hideToggle 查看详情 %}
展开后显示的内容。
{% endhideToggle %}

{% btn /archives/,阅读归档,fas fa-archive,blue outline %}
```

`note` 末尾可选择 `simple`、`modern`、`flat`、`disabled`，省略时使用主题设置。`hideToggle` 使用原生折叠结构；内容仍在生成的页面中。需要文章加密时使用站点的加密插件。

按钮参数以逗号分隔，依次为链接、文字、图标和样式类。可选样式包括颜色、`outline`、`center`、`block`、`larger`。

### 标签页

```markdown
{% tabs example,1 %}
<!-- tab 第一项 -->
第一项的正文。
<!-- endtab -->
<!-- tab 第二项@fas fa-code -->
第二项的正文。
<!-- endtab -->
{% endtabs %}
```

标签参数依次为名称和默认选中序号；序号从 1 开始，省略或写 0 时选中第一项。小于 0 或超出范围时初始全部收起。分栏标记后换行再写正文。嵌套层使用 `subtabs`、`subsubtabs`，避免同名结束标签混淆层级。

### 图库

```markdown
{% gallery true,6,3 %}
![第一张](/img/one.jpg)
![第二张](/img/two.jpg "图片说明")
{% endgallery %}
```

参数依次为是否显示“加载更多”按钮、每批数量和首批数量；数量默认都是 10。使用 JSON 数据源时写 `{% gallery url,/gallery.json,true,6,3 %}{% endgallery %}`，数据结构如下：

```json
[
  { "url": "/img/one.jpg", "alt": "第一张", "title": "图片说明" },
  { "url": "/img/two.jpg", "alt": "第二张" }
]
```

图库内容中的图片地址按原值使用；子路径部署时，数据里的根路径地址应包含实际 `root`，例如 `/blog/img/one.jpg`。远程数据源需要允许浏览器访问。普通正文图片的路径改写规则见[图片配置](configuration.md#封面正文图片与灯箱)。

### 文章系列

启用 `series.enable`，并为相关文章设置相同的 `series` 名称。正文中的 `{% series %}` 使用当前文章的系列，`{% series 教程 %}` 指定系列。排序由 `series.orderBy` 和 `series.order` 决定，`series.number` 控制编号列表。
