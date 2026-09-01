import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CURRENCIES, derivePair, derivePairs, normaliseCurrencyMap, signalForScore
} from '../api/currencyModel.js'

const cur = (score, confidence, extra) => Object.assign({
  score, confidence, primary_driver: 'driver', bullish_drivers: ['bull'], bearish_drivers: ['bear']
}, extra || {})

const map = (o) => normaliseCurrencyMap(o)

test('a pair is derived from the difference between its legs', function() {
  const c = map({ EUR: cur(70, 'high'), USD: cur(30, 'high') })
  const p = derivePair('EUR/USD', c)
  assert.equal(p.derivation.differential, 40)
  assert.equal(p.score, 70) // 50 + 40/2
  assert.equal(p.signal, 'buy')
})

test('the same differential the other way round is the mirror image', function() {
  const a = derivePair('EUR/USD', map({ EUR: cur(70, 'high'), USD: cur(30, 'high') }))
  const b = derivePair('EUR/USD', map({ EUR: cur(30, 'high'), USD: cur(70, 'high') }))
  assert.equal(a.score + b.score, 100)
  assert.equal(a.signal, 'buy')
  assert.equal(b.signal, 'sell')
})

test('two strong currencies produce relative uncertainty, not a confident call', function() {
  // The case the brief singles out: both legs well bid, so the pair is a small
  // difference between two large numbers.
  const p = derivePair('EUR/USD', map({ EUR: cur(78, 'high'), USD: cur(75, 'high') }))
  assert.equal(p.signal, 'neutral')
  assert.equal(p.confidence, 'low', 'two strong legs must not yield high confidence')
  assert.equal(p.conflicting, true)
  assert.match(p.primary_driver, /comparable macro pressure/)
})

test('two weak currencies are equally uncertain', function() {
  const p = derivePair('EUR/USD', map({ EUR: cur(25, 'high'), USD: cur(28, 'high') }))
  assert.equal(p.confidence, 'low')
  assert.equal(p.conflicting, true)
})

test('a wide, well-evidenced separation is allowed to be confident', function() {
  const p = derivePair('EUR/USD', map({ EUR: cur(85, 'high'), USD: cur(20, 'high') }))
  assert.equal(p.signal, 'strong_buy')
  assert.equal(p.confidence, 'high')
  assert.equal(p.conflicting, false)
})

test('a pair is never more confident than its weaker leg', function() {
  const p = derivePair('EUR/USD', map({ EUR: cur(85, 'high'), USD: cur(20, 'low') }))
  assert.equal(p.confidence, 'low')
})

test('derived pairs are internally consistent (differentials are transitive)', function() {
  // Scoring 28 pairs independently allowed EUR/USD, GBP/USD and EUR/GBP to
  // disagree. Deriving them cannot.
  const c = map({ EUR: cur(70, 'high'), USD: cur(40, 'high'), GBP: cur(55, 'high') })
  const eurusd = derivePair('EUR/USD', c).derivation.differential
  const gbpusd = derivePair('GBP/USD', c).derivation.differential
  const eurgbp = derivePair('EUR/GBP', c).derivation.differential
  assert.equal(eurusd, eurgbp + gbpusd)
})

test('every forex pair in the universe can be derived', function() {
  const c = map(CURRENCIES.reduce((acc, k, i) => { acc[k] = cur(30 + i * 6, 'medium'); return acc }, {}))
  const PAIRS = ['EUR/USD','GBP/USD','USD/JPY','USD/CHF','AUD/USD','USD/CAD','NZD/USD',
    'EUR/GBP','EUR/JPY','EUR/CHF','EUR/AUD','EUR/CAD','EUR/NZD','GBP/JPY','GBP/CHF',
    'GBP/AUD','GBP/CAD','GBP/NZD','AUD/JPY','AUD/CHF','AUD/CAD','AUD/NZD','NZD/JPY',
    'NZD/CHF','NZD/CAD','CAD/JPY','CAD/CHF','CHF/JPY']
  const derived = derivePairs(PAIRS, c)
  assert.equal(Object.keys(derived).length, 28)
  for (const id of PAIRS) {
    const p = derived[id]
    assert.ok(p.score >= 0 && p.score <= 100, id + ' score out of range')
    assert.ok(['strong_buy','buy','neutral','sell','strong_sell'].includes(p.signal), id + ' bad signal')
    assert.ok(['high','medium','low'].includes(p.confidence), id + ' bad confidence')
  }
})

test('an unknown leg yields nothing rather than a fabricated signal', function() {
  assert.equal(derivePair('EUR/XXX', map({ EUR: cur(70, 'high') })), null)
  assert.equal(derivePair('XXX/USD', map({ USD: cur(70, 'high') })), null)
})

test('malformed model output degrades to neutral rather than throwing', function() {
  const c = normaliseCurrencyMap({ EUR: { score: 'banana', confidence: 'vibes' }, USD: null })
  assert.equal(c.EUR.score, 50)
  assert.equal(c.EUR.confidence, 'low')
  assert.equal(c.EUR.available, false)
  assert.equal(c.USD.score, 50)
  assert.equal(c.USD.available, false)
  const p = derivePair('EUR/USD', c)
  assert.equal(p.signal, 'neutral')
  assert.equal(p.confidence, 'low')
})

test('a missing currency never manufactures a signal', function() {
  // Number(null) is 0, so an absent leg used to read as maximally bearish and
  // produced a confident strong_buy for the other side.
  const c = normaliseCurrencyMap({ EUR: { score: 70, confidence: 'high' } })
  assert.equal(c.USD.available, false)
  const p = derivePair('EUR/USD', c)
  assert.equal(p.signal, 'neutral')
  assert.equal(p.score, 50)
  assert.equal(p.unavailable, true)
  assert.match(p.primary_driver, /No macro reading for USD/)
})

test('a numeric string score is still usable', function() {
  const c = normaliseCurrencyMap({ EUR: { score: '70', confidence: 'high' }, USD: { score: 40, confidence: 'high' } })
  assert.equal(c.EUR.available, true)
  assert.equal(c.EUR.score, 70)
  assert.equal(derivePair('EUR/USD', c).score, 65)
})

test('scores are clamped into range', function() {
  const c = normaliseCurrencyMap({ EUR: { score: 9999, confidence: 'high' }, USD: { score: -400, confidence: 'high' } })
  assert.equal(c.EUR.score, 100)
  assert.equal(c.USD.score, 0)
  assert.equal(derivePair('EUR/USD', c).score, 100)
})

test('normalisation always returns all eight currencies', function() {
  const c = normaliseCurrencyMap({ USD: cur(60, 'high') })
  assert.deepEqual(Object.keys(c).sort(), CURRENCIES.slice().sort())
})

test('signal bands are monotonic in score', function() {
  const order = ['strong_sell','sell','neutral','buy','strong_buy']
  let last = -1
  for (let s = 0; s <= 100; s += 1) {
    const idx = order.indexOf(signalForScore(s))
    assert.ok(idx >= last, 'signal went backwards at score ' + s)
    last = Math.max(last, idx)
  }
  assert.equal(signalForScore(50), 'neutral')
  assert.equal(signalForScore(100), 'strong_buy')
  assert.equal(signalForScore(0), 'strong_sell')
})

test('the derivation is exposed so the UI can show its working', function() {
  const p = derivePair('EUR/USD', map({ EUR: cur(70, 'high'), USD: cur(40, 'medium') }))
  assert.deepEqual(p.derivation, {
    base: 'EUR', quote: 'USD', base_score: 70, quote_score: 40, differential: 30, separation: 30
  })
})

test('relative FX is behind a flag and the legacy path is preserved', async function() {
  const fs = await import('node:fs')
  const refresh = fs.readFileSync(new URL('../api/refresh.js', import.meta.url), 'utf8')

  // Off by default, so current production behaviour is unchanged.
  assert.match(refresh, /MACROSENTINEL_RELATIVE_FX === '1'/)
  // Both paths still exist: four pair groups when off, currencies + 2 when on.
  assert.match(refresh, /FOREX_MAJORS, FOREX_MINORS_AND_CROSSES, METALS, CRYPTO/)
  assert.match(refresh, /\[METALS, CRYPTO\]/)
  assert.match(refresh, /scoreCurrencies/)
  // The derived currency map reaches the client so the UI can show its working.
  assert.match(refresh, /if \(result\.currencies\) combined\.currencies = result\.currencies/)
})

test('a conflicted pair is never presented as a confident call', function() {
  // Sweep the whole score space: whenever conflict is flagged, confidence is low.
  for (let a = 0; a <= 100; a += 5) {
    for (let b = 0; b <= 100; b += 5) {
      const c = normaliseCurrencyMap({
        EUR: { score: a, confidence: 'high', bullish_drivers: [], bearish_drivers: [] },
        USD: { score: b, confidence: 'high', bullish_drivers: [], bearish_drivers: [] }
      })
      const p = derivePair('EUR/USD', c)
      if (p.conflicting) {
        assert.equal(p.confidence, 'low', 'conflict at ' + a + '/' + b + ' but confidence ' + p.confidence)
      }
      // and a near-identical pair of legs is never a strong call
      if (Math.abs(a - b) < 10) {
        assert.ok(['neutral'].includes(p.signal), 'legs ' + a + '/' + b + ' gave ' + p.signal)
      }
    }
  }
})
