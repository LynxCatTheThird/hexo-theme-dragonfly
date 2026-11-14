// SPDX-License-Identifier: Apache-2.0
// Dragonfly 项目修改；来源、原作者署名与第三方许可见 NOTICE。
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { createRequire } = require('node:module')
const { engineFor, renderMath } = require('../scripts/common/math')
const defaults = require('../scripts/common/default_config')
const file = path.resolve(__dirname, '../scripts/events/markdown.js')
let markdown
vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
  require: createRequire(file), hexo: { on: (_, fn) => fn(), config: {}, extend: { renderer: { get: () => null, register: (_, __, fn) => { markdown = fn } } } }
})
const render = (text, math, page = {}) => renderMath({ ...page, content: markdown({ text }) }, math)

test('renderer ownership is resolved after site plugins without silently replacing them', () => {
  for (const mode of ['auto', 'theme', 'external']) {
    for (const installed of [false, true]) {
      let ready
      const existing = () => '<p>site plugin output</p>'
      const renderers = installed ? { md: existing, markdown: existing } : {}
      vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
        require: createRequire(file),
        hexo: {
          on: (_, fn) => { ready = fn },
          config: { theme_config: { markdown: { renderer: mode } } },
          extend: { renderer: {
            get: extension => renderers[extension],
            register: (extension, _, fn) => { renderers[extension] = fn }
          } }
        }
      })
      assert.equal(renderers.md, installed ? existing : undefined)
      ready()
      if (mode === 'theme' || (mode === 'auto' && !installed)) {
        assert.match(renderers.md({ text: '$x$' }), /math-source/)
      } else {
        assert.equal(renderers.md, installed ? existing : undefined)
      }
    }
  }
})

test('engine selection is exclusive and respects article overrides', () => {
  const math = { use: 'katex', per_page: true }
  assert.equal(engineFor({}, math), 'katex')
  assert.equal(engineFor({ math: 'mathjax' }, math), 'mathjax')
  assert.equal(engineFor({ math: false, katex: true }, math), null)
  assert.equal(engineFor({ katex: false }, math), null)
  assert.equal(engineFor({}, { ...math, per_page: false }), null)
  assert.equal(engineFor({ mathjax: true }, math), 'mathjax')
})

test('theme renderer preserves Markdown plugins, literal code and static KaTeX chemistry', async () => {
  const math = structuredClone(defaults.math)
  math.use = 'katex'
  math.katex.options = { macros: { '\\Probe': '\\mathbf{X}' } }
  let result = await render('$\\ce{H2O}$', math)
  assert.match(result.content, /#cc0000|katex-error/)
  math.katex.mhchem = true
  result = await render('# Title\n\n$\\ce{H2O}$ and \\(\\Probe\\)\n\n`$literal$`\n\n```tex\n$x$\n```\n\n==mark== ~sub~ ^sup^', math)
  assert.ok(result.content.includes('class="katex"'))
  assert.ok(!result.content.includes('katex-error'))
  assert.ok(!result.content.includes('mjx-container'))
  assert.ok(!result.content.includes('math-source'))
  assert.ok(!result.content.includes('<script'))
  assert.ok(result.content.includes('<code>$literal$</code>'))
  assert.ok(result.content.includes('$x$'))
  for (const tag of ['mark','sub','sup']) assert.ok(result.content.includes(`<${tag}>`))
  assert.ok(result.content.includes('id="title"'))
  assert.equal((await render('$x$', math, { math: false })).content.trim(), '<p>$x$</p>')
})

test('MathJax builds SVG including chemistry and macros without KaTeX or runtime scripts', async t => {
  const warnings = t.mock.method(console, 'warn', () => {})
  const math = structuredClone(defaults.math)
  math.use = 'mathjax'
  math.mathjax.mhchem = true
  math.mathjax.tex = { macros: { Probe: '\\mathbb{R}' } }
  const { content } = await render('$\\Probe + \\ce{CO2 + H2O -> H2CO3}$\n\n$$\\frac{a}{b}$$', math)
  assert.equal((content.match(/<mjx-container/g) || []).length, 2)
  assert.ok(content.includes('<svg'))
  assert.ok(content.includes('<mjx-assistive-mml'))
  assert.ok(content.includes('<math xmlns='))
  assert.ok(!/katex|<script|data-mjx-error|math-source/.test(content))
  assert.equal(warnings.mock.calls.length, 0)
  assert.match(content, /data-c="E42[9D]"/)
  const client = structuredClone(math)
  client.mathjax.render = 'client'
  assert.ok((await render('$x$', client)).content.includes('type="math/tex"'))
})
