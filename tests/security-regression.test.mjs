import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = function(file) { return fs.readFileSync(path.join(root, file), 'utf8') }

test('no browser source reads provider or admin secrets', function() {
  const app = read('src/App.jsx')
  const client = read('src')
  assert.doesNotMatch(app, /import\.meta\.env/)
  assert.equal(fs.existsSync(path.join(root, 'src/components/AdminPage.jsx')), false)
  assert.equal(fs.existsSync(path.join(root, 'src/components/ApiKeySetup.jsx')), false)
  assert.doesNotMatch(client, /VITE_(ANTHROPIC_KEY|ADMIN_PIN)/)
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
