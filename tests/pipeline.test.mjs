import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { keywordsFor, keywordsForAll, matchesAny } from '../api/assetKeywords.js'
import { parseFeed, clusterArticles, rankForAssets } from '../api/feedPipeline.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')

const FOREX = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD',
  'EUR/GBP', 'EUR/JPY', 'EUR/CHF', 'EUR/AUD', 'EUR/CAD', 'EUR/NZD', 'GBP/JPY', 'GBP/CHF',
  'GBP/AUD', 'GBP/CAD', 'GBP/NZD', 'AUD/JPY', 'AUD/CHF', 'AUD/CAD', 'AUD/NZD', 'NZD/JPY',
  'NZD/CHF', 'NZD/CAD', 'CAD/JPY', 'CAD/CHF', 'CHF/JPY']
const METALS = ['XAU/USD', 'XAG/USD', 'XPT/USD', 'WTI Oil', 'Brent', 'Nat Gas', 'Copper']
const CRYPTO = ['BTC/USD', 'ETH/USD', 'BNB/USD', 'SOL/USD', 'XRP/USD', 'DOGE/USD', 'ADA/USD',
  'AVAX/USD', 'LINK/USD', 'DOT/USD', 'MATIC/USD', 'UNI/USD']
const ALL = FOREX.concat(METALS, CRYPTO)

test('every one of the 47 instruments has keyword coverage', function() {
  assert.equal(ALL.length, 47)
  const uncovered = ALL.filter((id) => keywordsFor(id).length === 0)
  assert.deepEqual(uncovered, [])
})

test('an FX pair inherits the keywords of both its legs', function() {
  const eurgbp = keywordsFor('EUR/GBP')
  assert.ok(eurgbp.includes('ecb'), 'expected the EUR leg')
  assert.ok(eurgbp.includes('boe'), 'expected the GBP leg')
})

test('keyword matching respects word boundaries', function() {
  const gold = keywordsFor('XAU/USD')
  // 'war' sits inside "warns" and "Toward"; substring matching used to tag gold.
  assert.equal(matchesAny('Powell warns markets on rate path', gold), false)
  assert.equal(matchesAny('Toward a new trade framework', gold), false)
  assert.equal(matchesAny('Gold rallies as haven demand builds', gold), true)
})

test('keywordsForAll deduplicates across a group', function() {
  const terms = keywordsForAll(['EUR/USD', 'EUR/GBP'])
  assert.equal(new Set(terms).size, terms.length)
  assert.ok(terms.includes('ecb'))
})

test('syndicated coverage of one event collapses to a single event', function() {
  const now = Date.now()
  const at = (min) => new Date(now - min * 60000).toISOString()
  // clusterArticles returns { events, articles } and counts independence by source_id.
  const { events } = clusterArticles([
    { title: 'Fed holds interest rates steady as inflation cools', source_id: 'reuters', source_weight: 1, publishedAt: at(30), description: '' },
    { title: 'Fed holds interest rates steady as inflation cools', source_id: 'google', source_weight: 0.7, publishedAt: at(28), description: '' },
    { title: 'OPEC agrees a surprise production cut', source_id: 'kitco', source_weight: 0.8, publishedAt: at(40), description: '' }
  ])
  assert.equal(events.length, 2, 'the two Fed reports should form one event')
  const fed = events.find((e) => /Fed holds/.test(e.primary_story.title))
  assert.equal(fed.independent_source_count, 2, 'two distinct outlets, so two independent sources')
})

test('a genuinely new development is not merged into the original story', function() {
  const now = Date.now()
  const at = (min) => new Date(now - min * 60000).toISOString()
  const { events } = clusterArticles([
    { title: 'Fed holds rates steady', source_id: 'reuters', source_weight: 1, publishedAt: at(60), description: '' },
    { title: 'Powell says inflation progress has stalled', source_id: 'reuters', source_weight: 1, publishedAt: at(30), description: '' }
  ])
  assert.equal(events.length, 2)
})

test('ranking surfaces asset-relevant news rather than whatever arrived first', function() {
  const now = Date.now()
  const at = (min) => new Date(now - min * 60000).toISOString()
  const articles = []
  for (let i = 0; i < 12; i += 1) {
    articles.push({ title: 'Generic business filler story ' + i, description: '', source: 'Reuters', source_weight: 1, publishedAt: at(10 + i), independent_source_count: 1 })
  }
  articles.push({ title: 'Bitcoin ETF sees record inflows', description: '', source: 'CoinDesk', source_weight: 0.7, publishedAt: at(20), independent_source_count: 1 })
  const ranked = rankForAssets(articles, ['BTC/USD'], now)
  assert.match(ranked[0].title, /Bitcoin/)
})

test('feed parser handles RSS 2.0, RSS 1.0, namespaced items and Atom entries', function() {
  const source = { id: 'test', name: 'Test', weight: 0.8, tier: 2 }
  const when = 'Wed, 27 Aug 2026 10:00:00 GMT'
  const shapes = {
    'RSS 2.0': '<rss><channel><item><title>Fed holds rates steady today</title><pubDate>' + when + '</pubDate></item></channel></rss>',
    'CDATA': '<item><title><![CDATA[Gold rallies on haven bid]]></title><pubDate>' + when + '</pubDate></item>',
    'RSS 1.0': '<item rdf:about="http://x"><title>ECB signals further tightening</title><dc:date>2026-08-27T10:00:00Z</dc:date></item>',
    'namespaced': '<rss:item><title>OPEC agrees a production cut</title><pubDate>' + when + '</pubDate></rss:item>',
    'Atom': '<entry><title>Bitcoin ETF sees record inflows</title><updated>2026-08-27T10:00:00Z</updated></entry>'
  }
  for (const [label, xml] of Object.entries(shapes)) {
    assert.ok(parseFeed(xml, source).length >= 1, label + ' produced no items')
  }
})

test('an article with an unparseable date is dropped rather than back-dated', function() {
  // Deliberate: better to lose the item than to stamp it with the current time
  // and have it rank as maximally fresh.
  const source = { id: 'test', name: 'Test', weight: 0.8, tier: 2 }
  assert.equal(parseFeed('<item><title>A headline with no date at all</title></item>', source).length, 0)
  assert.equal(parseFeed('<item><title>A headline with a bad date</title><pubDate>not-a-date</pubDate></item>', source).length, 0)
})

test('analysis failures are never written to the browser cache', function() {
  const engine = read('src/lib/claudeEngine.js')
  assert.doesNotMatch(engine, /cache\[cacheKey\] = \{ text: text/)
  assert.match(engine, /if \(!data\.text\) throw/)
})

test('signal rows are operable by keyboard, not mouse only', function() {
  const table = read('src/components/SignalTable.jsx')
  assert.match(table, /tabIndex=\{0\}/)
  assert.match(table, /role="button"/)
  assert.match(table, /onKeyDown/)
  assert.match(table, /aria-label=/)
})

test('news items are real links with a safe scheme and rel', function() {
  const feed = read('src/components/NewsFeed.jsx')
  assert.doesNotMatch(feed, /window\.open/)
  assert.match(feed, /rel="noopener noreferrer"/)
  assert.match(feed, /\^https\?:/)
})

test('reduced motion is honoured and focus is visible beyond buttons', function() {
  const css = read('src/index.css')
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(css, /\[tabindex\]:focus-visible/)
  assert.match(css, /\.skip-link/)
})

test('a render failure is contained by an error boundary', function() {
  assert.ok(fs.existsSync(path.join(root, 'src/components/ErrorBoundary.jsx')))
  assert.match(read('src/App.jsx'), /ErrorBoundary/)
})

test('the board offers sorting, filtering, search and a watchlist', function() {
  const dashboard = read('src/components/Dashboard.jsx')
  assert.match(dashboard, /macrosentinel_watchlist/)
  assert.match(dashboard, /signalFilter/)
  assert.match(dashboard, /asset-search/)
  assert.match(dashboard, /scrollIntoView/)
  assert.match(read('src/components/SignalTable.jsx'), /aria-sort/)
})

test('the light theme meets WCAG AA on the backgrounds it uses', function() {
  const css = read('src/index.css')
  const light = css.slice(css.indexOf('.app-shell {'), css.indexOf(".app-shell[data-theme='dark']"))
  const token = (name) => (light.match(new RegExp('--' + name + ': (#[0-9a-f]{6})')) || [])[1]
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  const lum = (c) => {
    const s = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) })
    return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2]
  }
  const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05) }
  const backgrounds = ['#ffffff', '#f8fbff', '#f3f9ff', '#e7f3ff'].map(hex)
  for (const name of ['text-muted', 'accent-cyan', 'green', 'red', 'amber']) {
    const value = token(name)
    assert.ok(value, 'missing token --' + name)
    const worst = Math.min(...backgrounds.map((bg) => ratio(hex(value), bg)))
    assert.ok(worst >= 4.5, '--' + name + ' is ' + worst.toFixed(2) + ':1, below AA')
  }
})

test('every prop passed by Dashboard is actually destructured by the child', function() {
  // MarketHeader read `sourceCoverage` without destructuring it, so every render
  // threw and the dashboard never mounted. This catches that class of bug.
  const dashboard = read('src/components/Dashboard.jsx')
  const children = ['MarketHeader', 'SignalTable', 'NewsFeed', 'AnalysisPanel', 'Ticker']

  for (const name of children) {
    const open = dashboard.indexOf('<' + name)
    if (open === -1) continue
    // the JSX element text, up to its self-closing or opening tag end
    const chunk = dashboard.slice(open, dashboard.indexOf('>', open))
    const passed = Array.from(chunk.matchAll(/(\w+)=\{/g)).map((m) => m[1])

    const source = read('src/components/' + name + '.jsx')
    const sig = source.match(new RegExp('function ' + name + '\\(\\{([\\s\\S]*?)\\}\\)\\s*\\{'))
    if (!sig) continue
    if (/\.\.\./.test(sig[1])) continue // rest element captures anything
    const destructured = sig[1]
      .replace(/\/\/[^\n]*/g, '')
      .replace(/=\s*\{[^}]*\}/g, '')
      .split(',')
      .map((part) => part.split('=')[0].trim())
      .filter(Boolean)

    for (const prop of passed) {
      assert.ok(
        destructured.includes(prop),
        name + ' is passed `' + prop + '` but does not destructure it'
      )
    }
  }
})

test('components do not reference props they never received', function() {
  const source = read('src/components/MarketHeader.jsx')
  const sig = source.match(/function MarketHeader\(\{([\s\S]*?)\}\)\s*\{/)[1]
  assert.match(sig, /sourceCoverage/)
})
