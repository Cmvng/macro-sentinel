import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import {
  matchIndicator, parseValue, formatValue, interpretRelease, scenarioFor,
  aggregateBias, indicatorTitles
} from '../src/lib/releaseModel.js'

const SIGNALS = ['strong_buy', 'buy', 'neutral', 'sell', 'strong_sell']
const rel = (title, currency, forecast, previous, actual, impact) =>
  ({ title, currency, forecast, previous, actual, impact: impact || 'High' })
const sig = (r, asset) => (r.instruments.find((i) => i.asset === asset) || {}).signal

test('numbers are parsed strictly and ambiguity is rejected, not guessed', function() {
  assert.equal(parseValue('0.3%').base, 0.3)
  assert.equal(parseValue('-0.1%').base, -0.1)
  assert.equal(parseValue('−0.1%').base, -0.1, 'unicode minus')
  assert.equal(parseValue('90K').base, 90000)
  assert.equal(parseValue('1.2M').base, 1200000)
  assert.equal(parseValue('1,234').base, 1234)
  for (const bad of ['', '  ', null, undefined, '1.5|2.1', '<0.1%', 'abc', '12%%', '1'.repeat(30)]) {
    assert.equal(parseValue(bad).ok, false, JSON.stringify(bad) + ' should be rejected')
  }
})

test('numbers are formatted back in the unit they came in', function() {
  assert.equal(formatValue(0.3, '%', 1), '0.3%')
  assert.equal(formatValue(90000, 'K', 0), '90K')
  assert.equal(formatValue(1200000, 'M', 1), '1.2M')
})

test('every sample title resolves to the indicator that owns it', function() {
  // Guards rule ordering: "Core CPI" must not fall into CPI, "ADP Non-Farm"
  // must not fall into NFP, "GDP Price Index" must not fall into GDP.
  const owner = { 'Core PCE Price Index m/m': 'core_pce', 'PCE Price Index m/m': 'pce', 'Core PPI m/m': 'core_ppi',
    'PPI m/m': 'ppi', 'Core CPI m/m': 'core_cpi', 'CPI m/m': 'cpi', 'ADP Non-Farm Employment Change': 'adp',
    'Non-Farm Employment Change': 'nfp', 'Unemployment Rate': 'unemployment', 'Unemployment Claims': 'claims',
    'GDP Price Index q/q': 'gdp_deflator', 'GDP q/q': 'gdp', 'Federal Funds Rate': 'rate' }
  for (const [title, id] of Object.entries(owner)) {
    assert.equal(matchIndicator(title).id, id, title + ' resolved to ' + (matchIndicator(title) || {}).id)
  }
  for (const t of indicatorTitles()) assert.ok(matchIndicator(t.title), t.title + ' resolves to nothing')
})

test('titles from the real calendar map to sensible indicators', function() {
  const map = {
    'Final GDP Price Index q/q': 'gdp_deflator', 'Trimmed Mean CPI m/m': 'core_cpi',
    'Core CPI Flash Estimate y/y': 'core_cpi', 'JOLTS Job Openings': 'jolts', 'Cash Rate': 'rate',
    'Tokyo Core CPI y/y': 'core_cpi', 'German Prelim CPI m/m': 'cpi'
  }
  for (const [title, id] of Object.entries(map)) assert.equal(matchIndicator(title).id, id, title)
})

test('speeches, statements and auctions are not given a fake numeric verdict', function() {
  for (const t of ['FOMC Member Waller Speaks', 'RBA Rate Statement', 'FOMC Meeting Minutes', '10-y Bond Auction', 'ECB Press Conference']) {
    assert.equal(matchIndicator(t), null, t)
    const r = interpretRelease(rel(t, 'USD', '1%', '1%', '2%'))
    assert.equal(r.ok, false)
    assert.equal(r.reason, 'not_modelled')
  }
})

test('the verdict comes from the surprise against the forecast, not from the level', function() {
  // 0.5% PPI is a hot number only because 0.3% was expected.
  const hot = interpretRelease(rel('PPI m/m', 'USD', '0.3%', '0.1%', '0.5%'))
  assert.equal(hot.verdict, 'HOTTER THAN EXPECTED')
  assert.equal(hot.currency.direction, 'bullish')
  // The same 0.5% against a 0.7% forecast is a cool print.
  const cool = interpretRelease(rel('PPI m/m', 'USD', '0.7%', '0.1%', '0.5%'))
  assert.equal(cool.verdict, 'COOLER THAN EXPECTED')
  assert.equal(cool.currency.direction, 'bearish')
})

test('hot U.S. inflation: dollar up, EUR/USD down, gold down, crypto down', function() {
  const r = interpretRelease(rel('CPI m/m', 'USD', '0.2%', '0.2%', '0.5%'))
  assert.equal(r.currency.direction, 'bullish')
  assert.ok(['sell', 'strong_sell'].includes(sig(r, 'EUR/USD')))
  assert.ok(['buy', 'strong_buy'].includes(sig(r, 'USD/JPY')))
  assert.ok(['sell', 'strong_sell'].includes(sig(r, 'XAU/USD')), 'gold')
  assert.ok(['sell', 'strong_sell'].includes(sig(r, 'BTC/USD')), 'bitcoin')
})

test('cool U.S. inflation reverses every one of those calls', function() {
  const r = interpretRelease(rel('CPI m/m', 'USD', '0.4%', '0.2%', '0.1%'))
  assert.equal(r.currency.direction, 'bearish')
  assert.ok(['buy', 'strong_buy'].includes(sig(r, 'EUR/USD')))
  assert.ok(['sell', 'strong_sell'].includes(sig(r, 'USD/JPY')))
  assert.ok(['buy', 'strong_buy'].includes(sig(r, 'XAU/USD')))
  assert.ok(['buy', 'strong_buy'].includes(sig(r, 'BTC/USD')))
})

test('indicators where LOWER is better are inverted', function() {
  const unemp = interpretRelease(rel('Unemployment Rate', 'USD', '4.1%', '4.1%', '4.4%'))
  assert.equal(unemp.currency.direction, 'bearish', 'higher unemployment is currency-negative')
  assert.equal(unemp.verdict, 'WEAKER THAN EXPECTED')
  const claims = interpretRelease(rel('Unemployment Claims', 'USD', '220K', '225K', '250K'))
  assert.equal(claims.currency.direction, 'bearish', 'more jobless claims is currency-negative')
  const fewer = interpretRelease(rel('Unemployment Claims', 'USD', '220K', '225K', '190K'))
  assert.equal(fewer.currency.direction, 'bullish')
})

test('an FX pair is antisymmetric in its legs', function() {
  const usd = interpretRelease(rel('CPI m/m', 'USD', '0.2%', '0.2%', '0.5%'))
  const eur = interpretRelease(rel('CPI m/m', 'EUR', '0.2%', '0.2%', '0.5%'))
  // Same surprise, opposite side of the pair.
  assert.ok(['sell', 'strong_sell'].includes(sig(usd, 'EUR/USD')))
  assert.ok(['buy', 'strong_buy'].includes(sig(eur, 'EUR/USD')))
})

test('a non-USD release touches only the pairs that contain that currency', function() {
  const r = interpretRelease(rel('CPI y/y', 'EUR', '2.1%', '2.2%', '1.8%'))
  assert.ok(r.instruments.length > 0)
  for (const i of r.instruments) assert.ok(i.asset.includes('EUR'), i.asset + ' should not react to a EUR release')
  assert.equal(sig(r, 'XAU/USD'), undefined)
  assert.equal(sig(r, 'BTC/USD'), undefined)
})

test('growth data reaches industrial commodities but does not pretend to call crypto', function() {
  const r = interpretRelease(rel('Retail Sales m/m', 'USD', '0.3%', '0.2%', '1.2%'))
  assert.equal(r.currency.direction, 'bullish')
  assert.ok(['buy', 'strong_buy'].includes(sig(r, 'Copper')), 'copper follows growth')
  assert.equal(sig(r, 'BTC/USD'), undefined, 'growth is ambiguous for crypto, so no call is made')
})

test('an in-line result produces no directional call', function() {
  for (const actual of ['0.3%', '0.31%', '0.29%']) {
    const r = interpretRelease(rel('CPI m/m', 'USD', '0.3%', '0.2%', actual))
    assert.equal(r.magnitude, 'in_line', actual)
    assert.equal(r.currency.direction, 'neutral')
    assert.equal(r.instruments.length, 0)
  }
})

test('bigger surprises give stronger calls, monotonically', function() {
  const rank = { strong_sell: 0, sell: 1, neutral: 2, buy: 3, strong_buy: 4 }
  let last = 2
  for (const actual of ['0.3%', '0.4%', '0.5%', '0.6%', '0.9%']) {
    const r = interpretRelease(rel('CPI m/m', 'USD', '0.3%', '0.2%', actual))
    const now = rank[sig(r, 'USD/JPY') || 'neutral']
    assert.ok(now >= last, actual + ' weakened the call')
    last = now
  }
  assert.equal(sig(interpretRelease(rel('CPI m/m', 'USD', '0.3%', '0.2%', '0.9%')), 'USD/JPY'), 'strong_buy')
})

test('spillover assets are never more confident than their link allows', function() {
  const r = interpretRelease(rel('CPI m/m', 'USD', '0.2%', '0.2%', '1.0%'))
  const pair = r.instruments.find((i) => i.asset === 'USD/JPY')
  const gold = r.instruments.find((i) => i.asset === 'XAU/USD')
  const btc = r.instruments.find((i) => i.asset === 'BTC/USD')
  assert.equal(pair.confidence, 'high')
  assert.notEqual(gold.confidence, 'high', 'gold is an indirect link')
  assert.equal(btc.confidence, 'low', 'bitcoin is a loose link')
  assert.equal(gold.direct, false)
  assert.equal(pair.direct, true)
})

test('a revision (Final GDP) moves prices less than a first estimate', function() {
  const first = interpretRelease(rel('GDP q/q', 'USD', '1.5%', '1.5%', '2.3%'))
  const final = interpretRelease(rel('Final GDP q/q', 'USD', '1.5%', '1.5%', '2.3%'))
  assert.ok(final.currency.strength < first.currency.strength)
  assert.ok(final.caveats.some((c) => /revises figures/i.test(c)))
  assert.notEqual(final.confidence, 'high')
})

test('without a forecast it falls back to the previous value and says so', function() {
  const r = interpretRelease(rel('CPI m/m', 'USD', '', '0.2%', '0.5%'))
  assert.equal(r.ok, true)
  assert.equal(r.basis, 'previous')
  assert.equal(r.confidence, 'low')
  assert.ok(r.caveats.some((c) => /No consensus forecast/.test(c)))
  const none = interpretRelease(rel('CPI m/m', 'USD', '', '', '0.5%'))
  assert.equal(none.ok, false)
  assert.equal(none.reason, 'no_baseline')
})

test('a bare number takes the unit of the forecast', function() {
  const r = interpretRelease(rel('Non-Farm Employment Change', 'USD', '90K', '162K', '215'))
  assert.equal(r.actual, '215K')
  assert.equal(r.currency.direction, 'bullish')
})

test('bad input is refused with a reason, never guessed at', function() {
  assert.equal(interpretRelease(rel('CPI m/m', 'USD', '0.3%', '0.2%', '')).reason, 'awaiting_actual')
  assert.equal(interpretRelease(rel('CPI m/m', 'USD', '0.3%', '0.2%', 'hot')).reason, 'bad_actual')
  // 2M against a 90K forecast is a different unit, which is far more likely a typo than a result.
  assert.equal(interpretRelease(rel('Non-Farm Employment Change', 'USD', '90K', '1K', '2M')).reason, 'unit_mismatch')
  assert.equal(interpretRelease(rel('Non-Farm Employment Change', 'USD', '90K', '1K', '2B')).reason, 'unit_mismatch')
})

test('a likely typo is flagged rather than trusted', function() {
  const r = interpretRelease(rel('CPI m/m', 'USD', '0.3%', '0.2%', '30%'))
  assert.equal(r.ok, true)
  assert.ok(r.warnings.length > 0)
})

test('the scenario before a release is the mirror image either side', function() {
  const s = scenarioFor(rel('CPI m/m', 'USD', '0.3%', '0.2%'))
  assert.equal(s.above.currency.direction, 'bullish')
  assert.equal(s.below.currency.direction, 'bearish')
  const a = s.above.instruments.find((i) => i.asset === 'EUR/USD').signal
  const b = s.below.instruments.find((i) => i.asset === 'EUR/USD').signal
  assert.ok(['sell', 'strong_sell'].includes(a) && ['buy', 'strong_buy'].includes(b))
  assert.equal(scenarioFor(rel('CPI m/m', 'USD', '', '0.2%')), null, 'no forecast, no scenario')
  assert.equal(scenarioFor(rel('FOMC Member Waller Speaks', 'USD', '1%', '1%')), null)
})

test('a lower-is-better indicator flips its scenario branches', function() {
  const s = scenarioFor(rel('Unemployment Rate', 'USD', '4.1%', '4.1%'))
  assert.equal(s.above.currency.direction, 'bearish', 'higher unemployment weakens the dollar')
  assert.equal(s.below.currency.direction, 'bullish')
})

test('every output is well-formed across a sweep of inputs', function() {
  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD', 'CNY']
  const actuals = ['-5', '0', '0.1', '0.5', '1.5', '4', '20', '150K', '-40K', '52.3', '3.2%']
  let n = 0
  for (const t of indicatorTitles()) {
    for (const c of currencies) {
      for (const a of actuals) {
        const r = interpretRelease(rel(t.title, c, '0.3%', '0.2%', a))
        if (!r.ok) continue
        n += 1
        assert.ok(['bullish', 'bearish', 'neutral'].includes(r.currency.direction))
        assert.ok(r.currency.strength >= 0 && r.currency.strength <= 1)
        for (const i of r.instruments) {
          assert.ok(SIGNALS.includes(i.signal), i.signal)
          assert.ok(Math.abs(i.effect) <= 1, 'effect out of range')
          assert.ok(['high', 'medium', 'low'].includes(i.confidence))
        }
      }
    }
  }
  assert.ok(n > 500, 'sweep ran ' + n + ' cases')
})

test('release bias fades with age and drops out after a day', function() {
  const now = Date.now()
  const hot = interpretRelease(rel('CPI m/m', 'USD', '0.2%', '0.2%', '0.5%'))
  const fresh = aggregateBias([{ result: hot, time: now - 10 * 60000 }], now)
  const older = aggregateBias([{ result: hot, time: now - 12 * 3600000 }], now)
  const gone = aggregateBias([{ result: hot, time: now - 30 * 3600000 }], now)
  const get = (list) => Math.abs((list.find((x) => x.asset === 'USD/JPY') || { net: 0 }).net)
  assert.ok(get(fresh) > get(older) && get(older) > 0)
  assert.equal(gone.length, 0)
})

test('opposing releases are reported as a conflict, not averaged into calm', function() {
  const now = Date.now()
  const hotCpi = interpretRelease(rel('CPI m/m', 'USD', '0.2%', '0.2%', '0.6%'))
  const weakJobs = interpretRelease(rel('Non-Farm Employment Change', 'USD', '90K', '162K', '-40K'))
  const out = aggregateBias([{ result: hotCpi, time: now - 600000 }, { result: weakJobs, time: now - 600000 }], now)
  const jpy = out.find((x) => x.asset === 'USD/JPY')
  assert.equal(jpy.conflicting, true)
  assert.equal(jpy.sources.length, 2)
})

test('failed interpretations are ignored by the aggregate', function() {
  const now = Date.now()
  assert.deepEqual(aggregateBias([{ result: { ok: false }, time: now }, null, { time: now }], now), [])
})

test('real calendar data: modelled titles interpret cleanly', function() {
  const path = new URL('./fixtures/ff_calendar_sample.json', import.meta.url)
  const events = JSON.parse(fs.readFileSync(path, 'utf8'))
  let modelled = 0
  for (const e of events) {
    if (!matchIndicator(e.title) || !e.forecast) continue
    const s = scenarioFor({ title: e.title, currency: e.country, forecast: e.forecast, previous: e.previous, impact: e.impact })
    if (s) modelled += 1
  }
  assert.ok(modelled >= 5, 'expected several real events to yield scenarios, got ' + modelled)
})
