import assert from 'node:assert/strict'
import test from 'node:test'
import { parseHash, hrefFor, pageOf, PAGES } from '../src/lib/router.js'
import { nextRelease, latestResult } from '../src/lib/releaseView.js'

test('every page round-trips through its hash', function() {
  for (const p of PAGES) assert.equal(parseHash(hrefFor(p.id)), p.id)
})

test('unknown, empty and in-page hashes fall back to home instead of breaking', function() {
  for (const h of ['', '#', '#/', '#main', '#/nope', '#/markets/extra', undefined, null, 42]) {
    const id = parseHash(h)
    assert.ok(PAGES.some((p) => p.id === id), String(h))
  }
  assert.equal(parseHash('#main'), 'home')
  assert.equal(parseHash('#/markets/'), 'markets', 'a trailing slash is tolerated')
  assert.equal(parseHash('#/releases?x=1'), 'releases', 'a query string is ignored')
})

test('every page has a label and a distinct path and title', function() {
  assert.equal(new Set(PAGES.map((p) => p.path)).size, PAGES.length)
  assert.equal(new Set(PAGES.map((p) => p.title)).size, PAGES.length)
  assert.equal(pageOf('nope').id, 'home')
})

const NOW = Date.parse('2026-09-30T14:00:00Z')
const ev = (o) => Object.assign({ id: 'x', title: 'CPI m/m', currency: 'USD', impact: 'high', timestamp: NOW + 3600000, forecast: '0.3%', previous: '0.2%', actual: '' }, o)

test('the next release is the soonest High-impact one still to come', function() {
  const events = [
    ev({ id: 'a', timestamp: NOW - 60000 }),
    ev({ id: 'b', timestamp: NOW + 7200000 }),
    ev({ id: 'c', timestamp: NOW + 1800000 }),
    ev({ id: 'd', timestamp: NOW + 600000, impact: 'medium' }),
    ev({ id: 'e', timestamp: NOW + 300000, title: 'FOMC Member Waller Speaks' })
  ]
  assert.equal(nextRelease(events, NOW).id, 'c')
  assert.equal(nextRelease([], NOW), null)
})

test('the latest result is the newest interpreted release from the last day', function() {
  const events = [
    ev({ id: 'old', timestamp: NOW - 26 * 3600000 }),
    ev({ id: 'mid', timestamp: NOW - 5 * 3600000 }),
    ev({ id: 'new', timestamp: NOW - 1800000 }),
    ev({ id: 'future', timestamp: NOW + 60000 })
  ]
  const results = { old: { actual: '0.9%' }, mid: { actual: '0.5%', source: 'you' }, new: { actual: '0.6%', source: 'live' }, future: { actual: '0.1%' } }
  const got = latestResult(events, results, NOW)
  assert.equal(got.event.id, 'new')
  assert.equal(got.source, 'live')
  assert.match(got.result.verdict, /HOTTER/)
  assert.equal(latestResult(events, {}, NOW), null)
  assert.equal(latestResult(events, { new: { actual: 'garbage' } }, NOW), null, 'an unreadable value is not a result')
})

import { topSignals } from '../src/lib/homeView.js'

test('the landing page highlights the most decisive signals on each side', function() {
  const signals = {
    'EUR/USD': { signal: 'strong_buy', score: 82 }, 'GBP/USD': { signal: 'buy', score: 60 }, 'USD/JPY': { signal: 'neutral', score: 51 },
    'AUD/USD': { signal: 'strong_sell', score: 12 }, 'NZD/USD': { signal: 'sell', score: 40 }, 'Gold': { signal: 'buy', score: 68 }, 'Junk': { signal: 'buy', score: 'x' }, 'Nil': null
  }
  const top = topSignals(signals, 2)
  assert.deepEqual(top.bullish.map((s) => s.id), ['EUR/USD', 'Gold'])
  assert.deepEqual(top.bearish.map((s) => s.id), ['AUD/USD', 'NZD/USD'])
  assert.deepEqual(topSignals({}, 3), { bullish: [], bearish: [] })
  assert.deepEqual(topSignals(null), { bullish: [], bearish: [] })
})
