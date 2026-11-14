// Prepare one package and its identical browser assets; never publish here.
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { execFileSync } = require('node:child_process')
const { build } = require('./build.cjs')
const root = path.resolve(__dirname, '..')
const pkg = require('../package.json')
const output = path.resolve(process.argv[2] || path.join(root, 'dist/release'))
const run = (command, args, cwd = root) => execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim()
if (pkg.name !== 'hexo-theme-dragonfly') throw new Error('Refusing to prepare an upstream package')
if (process.env.RELEASE_TAG && process.env.RELEASE_TAG !== `v${pkg.version}`) throw new Error('Release tag must match package version')
const commit = run('git', ['rev-parse', 'HEAD'])
if (process.env.RELEASE_TAG && run('git', ['rev-parse', `${process.env.RELEASE_TAG}^{commit}`]) !== commit) throw new Error('Release tag does not point at HEAD')
if (process.env.RELEASE_TAG && run('git', ['status', '--porcelain'])) throw new Error('Release requires a clean checkout')
const manifest = build()
fs.mkdirSync(output, { recursive: true })
const archive = Object.values(JSON.parse(run('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', output])))[0].filename
const assets = `${pkg.name}-${pkg.version}-assets.tar.gz`
run('tar', ['-czf', path.join(output, assets), 'dist/manifest-production.json', 'dist/source/js/build/production'])
const release = { package: pkg.name, version: pkg.version, commit, archive, assets, sourceHash: manifest.sourceHash, files: manifest.files }
fs.writeFileSync(path.join(output, 'release.json'), JSON.stringify(release, null, 2) + '\n')
fs.writeFileSync(path.join(output, 'SHA256SUMS'), [archive, assets, 'release.json'].map(file => `${crypto.createHash('sha256').update(fs.readFileSync(path.join(output, file))).digest('hex')}  ${file}`).join('\n') + '\n')
console.log(path.join(output, archive))
