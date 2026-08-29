import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = function(file) { return fs.readFileSync(path.join(root, file), 'utf8') }

test('no browser source reads provider or admin secrets', function() {
  const app = read('src/App.jsx')
  const dashboard = read('src/components/Dashboard.jsx')
  const engine = read('src/lib/claudeEngine.js')
  assert.doesNotMatch(app, /import\.meta\.env/)
  assert.doesNotMatch(dashboard, /VITE_(ANTHROPIC_KEY|ADMIN_PIN)/)
  assert.doesNotMatch(engine, /VITE_(ANTHROPIC_KEY|ADMIN_PIN)/)
  assert.equal(fs.existsSync(path.join(root, 'src/components/AdminPage.jsx')), false)
  assert.equal(fs.existsSync(path.join(root, 'src/components/ApiKeySetup.jsx')), false)
})

test('public Anthropic proxy is removed and refresh endpoint has secure controls', function() {
  const refresh = read('api/refresh.js')
  assert.equal(fs.existsSync(path.join(root, 'api/chat.js')), false)
  assert.match(refresh, /ANTHROPIC_API_KEY/)
  assert.match(refresh, /CRON_SECRET/)
  assert.match(refresh, /Force refresh is reserved/)
  assert.match(refresh, /Analysis rate limit reached/)
  assert.doesNotMatch(refresh, /Access-Control-Allow-Origin/)
})

test('repository ignores every environment file except the safe template', function() {
  const ignore = read('.gitignore')
  assert.match(ignore, /^\.env\*$/m)
  assert.match(ignore, /^!\.env\.example$/m)
})

test('dashboard provides a persistent, accessible light and dark theme', function() {
  const dashboard = read('src/components/Dashboard.jsx')
  const header = read('src/components/MarketHeader.jsx')
  const css = read('src/index.css')
  assert.match(dashboard, /macro-sentinel-theme/)
  assert.match(dashboard, /data-theme=\{theme\}/)
  assert.match(header, /aria-pressed/)
  assert.match(header, /setTheme\('light'\)/)
  assert.match(header, /setTheme\('dark'\)/)
  assert.match(css, /\.app-shell\[data-theme='dark'\]/)
  assert.match(css, /@media \(max-width: 640px\)/)
})


test('data pipeline has a registry, parses RSS and Atom, and clusters independent evidence', function() {
  const pipeline = read('api/feedPipeline.js')
  const refresh = read('api/refresh.js')
  assert.match(pipeline, /SOURCE_REGISTRY/)
  assert.match(pipeline, /collectBlocks\(xml, 'item'\)/)
  assert.match(pipeline, /collectBlocks\(xml, 'entry'\)/)
  assert.match(pipeline, /clusterArticles/)
  assert.match(pipeline, /independent_source_count/)
  assert.match(pipeline, /rankForAssets/)
  assert.match(refresh, /collectNews/)
  assert.match(refresh, /rankForAssets/)
  assert.match(refresh, /feed_health/)
})

test('dashboard exposes source coverage without weakening the secure request boundary', function() {
  const engine = read('src/lib/claudeEngine.js')
  const dashboard = read('src/components/Dashboard.jsx')
  const header = read('src/components/MarketHeader.jsx')
  assert.match(engine, /healthy_source_count/)
  assert.match(dashboard, /sourceCoverage/)
  assert.match(header, /Evidence coverage/)
  assert.doesNotMatch(engine, /import\.meta\.env/)
})
