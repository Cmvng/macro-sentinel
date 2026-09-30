// Browser checks. Run with `npm run e2e` (builds first). Needs a Chromium that
// Playwright can find; it is not part of CI, which has no browser installed.
//
// A clean `vite build` says nothing about whether the app renders: a component
// that read an undeclared prop once shipped a blank page through a green build.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { start } from './server.mjs'

var here = path.dirname(fileURLToPath(import.meta.url))
var out = path.join(here, 'out')
fs.mkdirSync(out, { recursive: true })
var axeSource = fs.readFileSync(path.join(here, '..', 'node_modules', 'axe-core', 'axe.min.js'), 'utf8')
var sleep = function(ms) { return new Promise(function(r) { setTimeout(r, ms) }) }

var failures = 0
function ok(name, cond, extra) {
  if (!cond) failures += 1
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (!cond && extra ? '  -> ' + extra : ''))
}
function group(name) { console.log('\n' + name) }

var browser = await chromium.launch()
var main = await start(4181, 'ok')
var down = await start(4182, 'down')

async function open(port, viewport, theme) {
  var page = await browser.newPage({ viewport: viewport || { width: 1280, height: 900 } })
  var errors = []
  page.on('pageerror', function(e) { errors.push(e.message) })
  page.on('console', function(m) {
    // The font CDN is unreachable from a sandbox; that is not an app fault.
    if (m.type() === 'error' && !/fonts\.googleapis|ERR_CONNECTION|Failed to load resource/.test(m.text())) errors.push(m.text())
  })
  await page.goto('http://127.0.0.1:' + port + '/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(function(t) { localStorage.setItem('macro-sentinel-theme', t || 'light'); localStorage.removeItem('macrosentinel_release_actuals') }, theme)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await sleep(1300)
  page.errors = errors
  return page
}
var body = function(p) { return p.textContent('body') }

// ------------------------------------------------------------------ dashboard
group('dashboard renders and works')
var p = await open(4181)
ok('the board renders 28 forex instruments', (await p.locator('tbody tr').count()) === 28)
ok('skip link is the first tab stop', await p.evaluate(function() { document.body.focus(); return true }) && (await p.keyboard.press('Tab'), await p.evaluate(function() { return /skip-link/.test(String(document.activeElement.className)) })))
await p.locator('.row-open').first().focus(); await p.keyboard.press('Enter'); await sleep(600)
ok('the asset button opens the analysis with the keyboard', /remains under bearish macro pressure/.test(await body(p)))
ok('rows are not buttons (no nested interactive controls)', (await p.locator('tr[role="button"]').count()) === 0)
await p.click('th[aria-sort] button:has-text("SCORE")'); await sleep(250)
var scores = (await p.$$eval('tbody tr', function(rs) { return rs.map(function(r) { var s = r.querySelectorAll('td')[3]; return s ? s.textContent : '' }) })).map(function(t) { var m = t.match(/\d+/); return m ? Number(m[0]) : null }).filter(function(v) { return v !== null })
ok('score sorts descending', scores.length > 0 && scores.every(function(v, i) { return i === 0 || scores[i - 1] >= v }))
await p.fill('#asset-search', 'eur/usd'); await sleep(250)
ok('search narrows to one instrument', (await p.locator('tbody tr').count()) === 1)
await p.fill('#asset-search', ''); await sleep(150)
await p.click('tbody tr:first-child button[aria-label*="watchlist"]'); await sleep(200)
ok('watchlist persists', /EUR/.test(String(await p.evaluate(function() { return localStorage.getItem('macrosentinel_watchlist') }))))
await p.click('button:has(span:text-is("Dark"))'); await sleep(300)
ok('dark theme applies', (await p.getAttribute('.app-shell', 'data-theme')) === 'dark')
await p.click('button:has(span:text-is("Light"))')

group('layout: the tabs belong to the board, not the releases')
var order = await p.evaluate(function() {
  var q = function(s) { return document.querySelector(s) }
  var before = function(a, b) { return !!(a && b && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)) }
  var releases = q('#releases'), board = q('#signal-board'), tabs = q('[role="tablist"]')
  return { releasesAboveBoard: before(releases, board), tabsInsideBoard: !!(board && tabs && board.contains(tabs)) }
})
ok('releases sit above the signal board', order.releasesAboveBoard)
ok('the asset tabs are inside the signal board', order.tabsInsideBoard)

// ------------------------------------------------------------------- releases
group('alerts and scenarios')
var t = await body(p)
ok('alert: a High-impact release just printed', /JUST RELEASED[\s\S]*PPI m\/m/.test(t))
ok('alert: one is about to print', /COMING UP[\s\S]*Final GDP q\/q/.test(t))
ok('low-impact events are hidden', !/Bank Holiday/.test(t))
ok('a speech shows no fake verdict', /Waller Speaks/.test(t) && /no number to judge/.test(t))
ok('it asks for the actual result rather than pretending to know it', /enter the actual result/i.test(t))
ok('a scenario is shown before the release', /If it prints[\s\S]*above[\s\S]*1\.9%/.test(t))

group('entering a result')
var ppi = p.locator('article[aria-label="USD PPI m/m"] input')
await ppi.fill('abc'); await ppi.press('Enter'); await sleep(150)
ok('garbage is refused with a reason', /Could not read that number/.test(await body(p)))
ok('and is not stored', !/abc/.test(String(await p.evaluate(function() { return localStorage.getItem('macrosentinel_release_actuals') }))))
await ppi.fill('0.5%'); await ppi.press('Enter'); await sleep(450)
t = await body(p)
ok('verdict: HOTTER THAN EXPECTED', /HOTTER THAN EXPECTED/.test(t))
ok('USD BULLISH', /USD BULLISH/.test(t))
ok('plain-English meaning names the Fed', /Prices are rising faster than economists expected/.test(t) && /Federal Reserve/.test(t))
var strip = await p.locator('.bias-strip').innerText()
ok('bias strip: Gold SELL and Bitcoin SELL', /Gold[\s\S]*SELL/.test(strip) && /Bitcoin[\s\S]*SELL/.test(strip))
ok('the EUR/USD row carries a DATA chip', /DATA/.test(await p.locator('tbody tr').first().innerText()))
ok('a release that has been entered stops alerting', !/JUST RELEASED[\s\S]{0,40}PPI/.test(await p.locator('.release-alerts').innerText().catch(function() { return '' })))
ok('caveat: not a price prediction', /not a price prediction/.test(t))
await p.reload({ waitUntil: 'domcontentloaded' }); await sleep(1300)
ok('the result survives a reload', /HOTTER THAN EXPECTED/.test(await body(p)))

group('judgement calls')
var claims = p.locator('article[aria-label="USD Unemployment Claims"] input')
await claims.fill('250'); await claims.press('Enter'); await sleep(350)
t = await body(p)
ok('more jobless claims is read as WEAKER (lower is better)', /WEAKER THAN EXPECTED/.test(t))
ok('a bare "250" is read as 250K', /250K against 220K/.test(t))
var jpy = await p.locator('.bias-strip li:has-text("USD/JPY")').first().innerText()
ok('a hot PPI against bad claims shows USD/JPY as MIXED, not calm', /MIXED/.test(jpy), jpy.replace(/\n/g, ' '))
await p.locator('article[aria-label="USD PPI m/m"] button:has-text("Change result")').click(); await sleep(150)
ok('a result can be changed', (await p.locator('article[aria-label="USD PPI m/m"] input').count()) === 1)
await p.locator('summary:has-text("Interpret any release yourself")').click()
var manual = p.locator('.release-manual')
await manual.locator('select').first().selectOption('Unemployment Rate')
var inputs = manual.locator('input')
await inputs.nth(0).fill('4.1%'); await inputs.nth(1).fill('4.1%'); await inputs.nth(2).fill('4.5%'); await sleep(250)
ok('the calculator interprets any release', /WEAKER THAN EXPECTED/.test(await manual.innerText()))
ok('no JavaScript errors', p.errors.length === 0, p.errors.join(' | '))
await p.close()

group('the calendar is down')
var d = await open(4182)
t = await body(d)
ok('the panel says so plainly', /economic calendar is temporarily unavailable/i.test(t))
ok('the dashboard still works', (await d.locator('tbody tr').count()) === 28)
await d.locator('summary:has-text("Interpret any release yourself")').click()
var dm = d.locator('.release-manual')
var di = dm.locator('input')
await di.nth(0).fill('0.3%'); await di.nth(1).fill('0.2%'); await di.nth(2).fill('0.6%'); await sleep(250)
ok('the manual calculator still works', /HOTTER THAN EXPECTED/.test(await dm.innerText()))
ok('no JavaScript errors', d.errors.length === 0, d.errors.join(' | '))
await d.close()

group('responsive')
for (var w of [320, 380, 414, 768]) {
  var r = await open(4181, { width: w, height: 800 })
  ok('no horizontal overflow at ' + w + 'px', await r.evaluate(function() { return document.documentElement.scrollWidth <= window.innerWidth + 1 }))
  await r.close()
}

group('accessibility (axe, WCAG 2.1 A/AA), with a verdict on screen')
for (var theme of ['light', 'dark']) {
  var a = await open(4181, { width: 1280, height: 900 }, theme)
  var box = a.locator('article[aria-label="USD PPI m/m"] input'); await box.fill('0.5%'); await box.press('Enter'); await sleep(350)
  await a.addScriptTag({ content: axeSource })
  var res = await a.evaluate(function() { return window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }) })
  res.violations.forEach(function(v) { console.log('     [' + v.impact + '] ' + v.id + ' x' + v.nodes.length + ': ' + v.help) })
  ok(theme + ' theme: zero WCAG A/AA violations (' + res.passes.length + ' rules passed)', res.violations.length === 0)
  await a.screenshot({ path: path.join(out, 'dashboard-' + theme + '.png') })
  await a.close()
}

await browser.close(); main.close(); down.close()
console.log('\n' + (failures ? failures + ' FAILED' : 'all browser checks passed'))
process.exit(failures ? 1 : 0)
