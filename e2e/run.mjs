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

// --------------------------------------------------------------- chart and icons
group('instrument icons')
var firstRow = await p.locator('tbody tr').first().innerHTML()
ok('a currency pair shows two flags', (firstRow.match(/class="flag"/g) || []).length === 2)
await p.click('[role="tab"]:has-text("Commodities")'); await sleep(300)
var gold = p.locator('tbody tr', { hasText: 'Gold' }).locator('.asset-icon--coin')
ok('gold is a gold coin marked Au', /Au/.test(await gold.innerText()))
await p.click('[role="tab"]:has-text("Digital assets")'); await sleep(300)
var btc = p.locator('tbody tr', { hasText: 'Bitcoin' }).locator('.asset-icon--coin')
ok('Bitcoin is in its orange, with the bitcoin sign', (await btc.evaluate(function(el) { return getComputedStyle(el).backgroundColor })) === 'rgb(247, 147, 26)' && /\u20bf/.test(await btc.innerText()))
ok('icons are decorative, hidden from screen readers', (await p.locator('.asset-icon:not([aria-hidden="true"])').count()) === 0)
await p.click('[role="tab"]:has-text("Currencies")'); await sleep(200)

group('the TradingView chart')
var stub = "window.__tv = (window.__tv || []).concat([JSON.parse(document.currentScript.text)]); var h = document.querySelector('.chart-host'); if (h) h.appendChild(document.createElement('iframe'))"
async function chartPage(mode) {
  var pg = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  var errs = []
  pg.on('pageerror', function(e) { errs.push(e.message) })
  await pg.route('**/s3.tradingview.com/**', function(r) {
    if (mode === 'blocked') return r.abort()
    return r.fulfill({ status: 200, contentType: 'text/javascript', body: stub })
  })
  await pg.goto('http://127.0.0.1:4181/', { waitUntil: 'domcontentloaded' })
  await pg.evaluate(function() { localStorage.setItem('macro-sentinel-theme', 'light') })
  await pg.reload({ waitUntil: 'domcontentloaded' }); await sleep(1500)
  pg.errs = errs
  return pg
}
var cp2 = await chartPage('ok')
ok('the chart panel sits above the signal board', await cp2.evaluate(function() { var c = document.querySelector('#chart'), b = document.querySelector('#signal-board'); return !!(c && b && (c.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)) }))
await cp2.evaluate(function() { document.querySelector('#chart').scrollIntoView() }); await sleep(700)
var cfg = await cp2.evaluate(function() { return (window.__tv || []).slice(-1)[0] })
ok('it charts EUR/USD by default', cfg && cfg.symbol === 'OANDA:EURUSD', JSON.stringify(cfg))
ok('and follows the light theme', cfg && cfg.theme === 'light')
ok('the widget iframe is given an accessible name', (await cp2.locator('.chart-host iframe').first().getAttribute('title')) === 'TradingView chart for EUR/USD')
ok('the picker lists all 47 instruments', (await cp2.locator('.chart-picker option').count()) === 47)
await cp2.selectOption('.chart-picker select', 'XAU/USD'); await sleep(500)
cfg = await cp2.evaluate(function() { return (window.__tv || []).slice(-1)[0] })
ok('picking Gold charts OANDA:XAUUSD', cfg && cfg.symbol === 'OANDA:XAUUSD', JSON.stringify(cfg))
ok('the header names the instrument', /Gold/.test(await cp2.locator('.chart-head').innerText()))
await cp2.click('button:has(span:text-is("Dark"))'); await sleep(600)
cfg = await cp2.evaluate(function() { return (window.__tv || []).slice(-1)[0] })
ok('switching to dark mode reloads the chart in dark', cfg && cfg.theme === 'dark' && cfg.symbol === 'OANDA:XAUUSD', JSON.stringify(cfg))
await cp2.click('[role="tab"]:has-text("Currencies")')
await cp2.locator('.row-open', { hasText: 'GBP/USD' }).first().click(); await sleep(900)
cfg = await cp2.evaluate(function() { return (window.__tv || []).slice(-1)[0] })
ok('choosing a row on the board charts it too', cfg && cfg.symbol === 'OANDA:GBPUSD' && (await cp2.inputValue('.chart-picker select')) === 'GBP/USD', JSON.stringify(cfg))
ok('the signal is shown beside the chart', /BUY|SELL|NEUTRAL/.test(await cp2.locator('.chart-head__read').innerText()))
ok('TradingView is credited with a link', (await cp2.locator('.chart-foot a[href^="https://www.tradingview.com"]').count()) >= 2)
ok('no JavaScript errors', cp2.errs.length === 0, cp2.errs.join(' | '))
await cp2.close()

var cp3 = await chartPage('blocked')
await cp3.evaluate(function() { document.querySelector('#chart').scrollIntoView() }); await sleep(800)
var fb = await cp3.locator('.chart-fallback').innerText().catch(function() { return '' })
ok('if TradingView is blocked the page says so plainly', /could not be loaded/.test(fb))
ok('and offers the chart on TradingView instead', (await cp3.locator('.chart-fallback a').getAttribute('href')) === 'https://www.tradingview.com/chart/?symbol=OANDA%3AEURUSD')
ok('the rest of the dashboard is unaffected', (await cp3.locator('tbody tr').count()) === 28 && cp3.errs.length === 0)
await cp3.close()

// ------------------------------------------------------------------- releases
group('alerts and scenarios')
var t = await body(p)
ok('alert: a High-impact release just printed', /JUST RELEASED[\s\S]*PPI m\/m/.test(t))
ok('an upcoming release is listed under Coming up', /Coming up[\s\S]*Final GDP q\/q/.test(t))
ok('low-impact events are hidden', !/Bank Holiday/.test(t))
ok('a speech shows no fake verdict', /Waller Speaks/.test(t) && /no number to judge/.test(t))
ok('when the source has no number yet it says so instead of inventing one', /has not published the (number|result)/i.test(t))
ok('a scenario is shown before the release', /If it prints[\s\S]*above[\s\S]*1\.9%/.test(t))

group('results that arrive by themselves')
var retail = p.locator('article[aria-label="GBP Retail Sales m/m"]')
var rt = await retail.innerText()
ok('the result is already there, nothing typed', /0\.9%/.test(rt) && /STRONGER THAN EXPECTED/.test(rt))
ok('it is labelled as live data', /LIVE DATA/.test(rt))
ok('it says what it means and names the currency', /GBP BULLISH/i.test(rt) && /What it means/i.test(rt))
ok('an alert carries the interpretation, not a request', /RESULT IN[\s\S]*Retail Sales m\/m[\s\S]*STRONGER THAN EXPECTED/.test(await p.locator('.release-alerts').innerText()))
ok('the GBP/USD row already carries a DATA chip', /DATA/.test(await p.locator('tbody tr', { hasText: 'GBP/USD' }).first().innerText()))
ok('the bias strip counts it', /1 release/.test(await p.locator('.bias-strip').innerText()) || /GBP/.test(await p.locator('.bias-strip').innerText()))
await retail.locator('button:has-text("Enter my own")').click()
await retail.locator('input').fill('0.1%'); await retail.locator('input').press('Enter'); await sleep(400)
rt = await retail.innerText()
ok('you can override it, and it is labelled as yours', /YOUR ENTRY/.test(rt) && /0\.1%/.test(rt))
await retail.locator('button:has-text("Remove my entry")').click(); await sleep(300)
ok('removing it falls back to the live figure', /LIVE DATA/.test(await retail.innerText()) && /0\.9%/.test(await retail.innerText()))

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
var moreBtn = p.locator('.bias-strip button:has-text("Show all")')
if (await moreBtn.count()) await moreBtn.click()
await sleep(200)
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
await p.locator('article[aria-label="USD PPI m/m"] button:has-text("Remove my entry")').click(); await sleep(150)
ok('a result you entered can be removed and re-entered', (await p.locator('article[aria-label="USD PPI m/m"] input').count()) === 1)
await p.locator('summary:has-text("Interpret any release yourself")').click()
var manual = p.locator('.release-manual')
await manual.locator('select').first().selectOption('Unemployment Rate')
var inputs = manual.locator('input')
await inputs.nth(0).fill('4.1%'); await inputs.nth(1).fill('4.1%'); await inputs.nth(2).fill('4.5%'); await sleep(250)
ok('the calculator interprets any release', /WEAKER THAN EXPECTED/.test(await manual.innerText()))
ok('no JavaScript errors', p.errors.length === 0, p.errors.join(' | '))
await p.close()

group('the results source is down but the schedule loads')
var na = await start(4183, 'noactuals')
var np = await open(4183)
ok('it says results will not fill in by themselves', /Live results cannot be loaded right now/.test(await body(np)))
await np.close(); na.close()

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

// --------------------------------------------------------------------- design
group('depth and motion')
var dp = await open(4181, { width: 1280, height: 900 }, 'dark')
var tiltOf = function(sel) { return dp.$eval(sel, function(el) { return getComputedStyle(el).transform }) }
var restT = await tiltOf('.pulse-card')
var pbox = await dp.locator('.pulse-card').boundingBox()
await dp.mouse.move(pbox.x + pbox.width * 0.9, pbox.y + pbox.height * 0.15, { steps: 6 }); await sleep(400)
var movedT = await tiltOf('.pulse-card')
ok('the pulse card tilts toward the pointer', movedT !== restT && movedT !== 'none', restT + ' -> ' + movedT)
ok('a glare layer follows the pointer', (await dp.$eval('.pulse-card', function(el) { return el.style.getPropertyValue('--mx') })) !== '')
await dp.mouse.move(2, 2, { steps: 4 }); await sleep(900)
ok('it settles back flat when the pointer leaves', (await tiltOf('.pulse-card')) === restT)
ok('the tab title carries the number of live release alerts', /^\(\d+\) MacroSentinel/.test(await dp.title()))
ok('the gauge needle points to the score', (await dp.$eval('.gauge-needle', function(el) { return el.style.transform })).indexOf('rotate(') === 0)
ok('the hero figure is at least 48px', (await dp.$eval('.gauge-number', function(el) { return parseFloat(getComputedStyle(el).fontSize) })) >= 48)
ok('the signal split reports its counts in text', /Bullish \d+/.test(await dp.textContent('.split-legend')))
ok('the decorative backdrop never intercepts the pointer', await dp.evaluate(function() { var st = getComputedStyle(document.querySelector('.app-shell'), '::before'); var af = getComputedStyle(document.querySelector('.app-shell'), '::after'); return st.pointerEvents === 'none' && af.pointerEvents === 'none' }))
await dp.close()

var rm = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
await rm.goto('http://127.0.0.1:4181/', { waitUntil: 'domcontentloaded' }); await sleep(1500)
var rmBox = await rm.locator('.pulse-card').boundingBox()
await rm.mouse.move(rmBox.x + rmBox.width * 0.9, rmBox.y + rmBox.height * 0.15, { steps: 6 }); await sleep(300)
ok('reduced motion: no tilt', (await rm.$eval('.pulse-card', function(el) { return getComputedStyle(el).transform })) === 'none')
ok('reduced motion: no entrance animation left running', (await rm.evaluate(function() { return document.getAnimations().filter(function(a) { return a.playState === 'running' && a.animationName && a.animationName !== 'ring' }).length })) === 0)
ok('reduced motion: content is still fully visible', (await rm.$eval('.pulse-card', function(el) { return getComputedStyle(el).opacity })) === '1')
await rm.close()

// Layout shift while the page settles: entrance motion must not move content.
var cp = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await cp.addInitScript(function() {
  window.__cls = 0
  new PerformanceObserver(function(l) { l.getEntries().forEach(function(e) { if (!e.hadRecentInput) window.__cls += e.value }) }).observe({ type: 'layout-shift', buffered: true })
})
await cp.goto('http://127.0.0.1:4181/', { waitUntil: 'load' }); await sleep(3000)
var cls = await cp.evaluate(function() { return window.__cls })
ok('cumulative layout shift under 0.1 (measured ' + cls.toFixed(3) + ')', cls < 0.1)
await cp.close()

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
