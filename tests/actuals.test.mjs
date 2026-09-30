import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { parseCalendar, parseActuals, mergeActuals, sameRelease, fetchActuals } from '../api/calendar.js'
import handler from '../api/refresh.js'

const read = (f) => JSON.parse(fs.readFileSync(new URL('./fixtures/' + f, import.meta.url), 'utf8'))
const ffWeek = parseCalendar(read('ff_calendar_week.json'))
const tvWeek = parseActuals(read('tv_calendar_sample.json'))
const byTitle = (events, currency, title) => events.find((e) => e.currency === currency && e.title === title)

// Real data from one week: the schedule feed has no actuals; a second source does.
test('the real second-source sample parses into formatted actuals', function() {
  assert.ok(tvWeek.length > 30)
  const gdp = tvWeek.find((a) => a.currency === 'USD' && a.title === 'GDP Growth Rate QoQ Final')
  assert.equal(gdp.actual, '2.2%')
  assert.equal(gdp.currency, 'USD')
  assert.equal(tvWeek.find((a) => a.title === 'ADP Employment Change').actual, '90K')
  assert.equal(tvWeek.find((a) => a.title === 'JOLTs Job Openings').actual, '7.079M')
})

test('rows without a numeric actual, or with junk, are dropped', function() {
  const out = parseActuals({ result: [
    { country: 'US', title: 'Not yet', date: '2026-09-30T12:30:00Z', actual: null },
    { country: 'US', title: 'String', date: '2026-09-30T12:30:00Z', actual: '1.0' },
    { country: 'US', title: 'Bad date', date: 'nope', actual: 1 },
    { country: 'ZZ', title: 'Unknown country', date: '2026-09-30T12:30:00Z', actual: 1 },
    null, 5, 'x',
    { country: 'US', title: 'Good', date: '2026-09-30T12:30:00Z', actual: 0.3, unit: '%', forecast: 0.4 }
  ] })
  assert.equal(out.length, 1)
  assert.equal(out[0].actual, '0.3%')
  assert.equal(out[0].forecast, '0.4%')
  for (const bad of [null, undefined, {}, [], 'x', { result: 'x' }]) assert.deepEqual(parseActuals(bad), [])
})

test('the same release under two different names is recognised', function() {
  assert.ok(sameRelease('Final GDP q/q', 'GDP Growth Rate QoQ Final'))
  assert.ok(sameRelease('CPI m/m', 'Inflation Rate MoM'))
  assert.ok(sameRelease('Core PCE Price Index m/m', 'Core PCE Price Index MoM'))
  assert.ok(sameRelease('ADP Non-Farm Employment Change', 'ADP Employment Change'))
  assert.ok(sameRelease('Unemployment Claims', 'Initial Jobless Claims'))
  assert.ok(sameRelease('Trimmed Mean CPI m/m', 'RBA Trimmed Mean CPI MoM'))
})

test('releases that merely share words are NOT the same release', function() {
  // The dangerous one: 3 of 5 words shared, and both print at the same minute.
  assert.equal(sameRelease('Final GDP q/q', 'GDP Price Index QoQ Final'), false)
  assert.equal(sameRelease('Core PCE Price Index m/m', 'PCE Price Index MoM'), false)
  assert.equal(sameRelease('JOLTS Job Openings', 'JOLTs Job Quits'), false)
  assert.equal(sameRelease('CPI m/m', 'CPI y/y'), false)
  assert.equal(sameRelease('CPI m/m', 'RBA Trimmed Mean CPI MoM'), false)
  assert.equal(sameRelease('GDP m/m', 'GDP MoM Prel'), false, 'a preliminary print is not the final one')
  assert.equal(sameRelease('Non-Farm Employment Change', 'ADP Employment Change'), false, 'NFP is not ADP')
  assert.equal(sameRelease('', 'CPI'), false)
})

test('this week: each release gets ITS OWN result, checked against the raw values', function() {
  const { events, matched } = mergeActuals(ffWeek, tvWeek)
  assert.ok(matched >= 10)
  const expect = [
    ['USD', 'Final GDP q/q', '2.2%'],
    ['USD', 'Final GDP Price Index q/q', '6.1%'],
    ['USD', 'Core PCE Price Index m/m', '0.2%'],
    ['USD', 'ADP Non-Farm Employment Change', '90K'],
    ['USD', 'JOLTS Job Openings', '7.079M'],
    ['USD', 'CB Consumer Confidence', '81.9'],
    ['AUD', 'CPI m/m', '0.4%'],
    ['AUD', 'CPI y/y', '4%'],
    ['AUD', 'Trimmed Mean CPI m/m', '0.2%']
  ]
  for (const [ccy, title, actual] of expect) assert.equal(byTitle(events, ccy, title).actual, actual, ccy + ' ' + title)
})

test('a release the two sources cannot be safely paired on gets NO result', function() {
  const { events } = mergeActuals(ffWeek, tvWeek)
  // Speeches carry no number, and these two did not match unambiguously.
  assert.equal(byTitle(events, 'EUR', 'ECB President Lagarde Speaks').actual, '')
  assert.equal(byTitle(events, 'USD', 'FOMC Member Kashkari Speaks').actual, '')
  assert.equal(byTitle(events, 'EUR', 'German Prelim CPI m/m').actual, '')
})

test('every merged result came from a candidate of the same currency, time and release', function() {
  const { events } = mergeActuals(ffWeek, tvWeek)
  for (const e of events.filter((x) => x.actual_source === 'live')) {
    const ok = tvWeek.some((a) => a.currency === e.currency && Math.abs(a.timestamp - e.timestamp) <= 5 * 60000 && a.actual === e.actual && sameRelease(a.title, e.title))
    assert.ok(ok, e.currency + ' ' + e.title)
  }
})

const ev = (o) => Object.assign({ id: 'x', title: 'CPI m/m', currency: 'USD', impact: 'high', timestamp: 1000000, forecast: '0.3%', previous: '0.2%', actual: '' }, o)
const cand = (o) => Object.assign({ currency: 'USD', title: 'Inflation Rate MoM', timestamp: 1000000, actual: '0.5%', forecast: '0.3%' }, o)

test('the basic match, and each guard that must stop a wrong one', function() {
  assert.equal(mergeActuals([ev()], [cand()]).events[0].actual, '0.5%')
  assert.equal(mergeActuals([ev()], [cand({ timestamp: 1000000 + 10 * 60000 })]).events[0].actual, '', 'ten minutes apart')
  assert.equal(mergeActuals([ev()], [cand({ currency: 'EUR' })]).events[0].actual, '', 'wrong currency')
  assert.equal(mergeActuals([ev()], [cand({ title: 'Retail Sales MoM' })]).events[0].actual, '', 'different indicator')
  assert.equal(mergeActuals([ev()], [cand({ actual: '90K', forecast: '' })]).events[0].actual, '', 'percent against thousands')
  assert.equal(mergeActuals([ev()], [cand({ forecast: '2.9%' })]).events[0].actual, '', 'forecasts far apart')
})

test('two equally good candidates mean no result, not a coin flip', function() {
  const twins = [cand({ actual: '0.5%' }), cand({ actual: '0.9%', title: 'CPI MoM' })]
  assert.equal(mergeActuals([ev()], twins).events[0].actual, '')
})

test('a result already on the event is never overwritten', function() {
  assert.equal(mergeActuals([ev({ actual: '0.1%' })], [cand()]).events[0].actual, '0.1%')
})

test('the source is fetched with a bounded window and a fetch failure throws', async function() {
  let seen = null
  const list = await fetchActuals(async (url) => { seen = String(url); return { ok: true, status: 200, json: async () => ({ result: [] }) } }, Date.parse('2026-09-30T13:00:00Z'))
  assert.deepEqual(list, [])
  assert.match(seen, /from=2026-09-28/)
  assert.match(seen, /to=2026-10-01/)
  await assert.rejects(fetchActuals(async () => ({ ok: false, status: 403 }), 0), /403/)
  await assert.rejects(fetchActuals(async () => { throw new Error('down') }, 0), /down/)
})

// --------------------------------------------------------------- the endpoint

function call(body) {
  const res = { code: 0, body: null, status(c) { this.code = c; return this }, json(b) { this.body = b; return this }, setHeader() {}, end() { return this } }
  return handler({ method: 'POST', body: body, headers: {} }, res).then(() => res)
}
async function withFetch(impl, fn) {
  const real = globalThis.fetch
  globalThis.fetch = impl
  try { return await fn() } finally { globalThis.fetch = real }
}
const reset = () => { const g = global._macroSentinelStore; if (g) { g.calendar = null; g.actuals = null } }
const router = (tv) => async (url) => {
  if (/tradingview/.test(String(url))) return tv(url)
  return { ok: true, status: 200, json: async () => read('ff_calendar_week.json') }
}

test('the endpoint returns events with their results filled in', async function() {
  reset()
  await withFetch(router(async () => ({ ok: true, status: 200, json: async () => read('tv_calendar_sample.json') })), async () => {
    const r = await call({ action: 'get_calendar' })
    assert.equal(r.code, 200)
    assert.equal(r.body.actuals_status, 'live')
    assert.equal(r.body.has_actuals, true)
    assert.equal(byTitle(r.body.events, 'USD', 'Final GDP q/q').actual, '2.2%')
  })
})

test('if the results source is down the schedule still loads and says so', async function() {
  reset()
  await withFetch(router(async () => { throw new Error('blocked') }), async () => {
    const r = await call({ action: 'get_calendar' })
    assert.equal(r.code, 200)
    assert.equal(r.body.actuals_status, 'unavailable')
    assert.equal(r.body.has_actuals, false)
    assert.ok(r.body.events.length > 20)
    assert.equal(byTitle(r.body.events, 'USD', 'Final GDP q/q').actual, '', 'nothing invented')
  })
})

test('results are cached for a minute, then served stale if the source breaks', async function() {
  reset()
  let hits = 0
  const good = async () => { hits += 1; return { ok: true, status: 200, json: async () => read('tv_calendar_sample.json') } }
  await withFetch(router(good), async () => { await call({ action: 'get_calendar' }); await call({ action: 'get_calendar' }) })
  assert.equal(hits, 1)
  global._macroSentinelStore.actuals.time -= 2 * 60000
  await withFetch(router(async () => { throw new Error('down') }), async () => {
    const r = await call({ action: 'get_calendar' })
    assert.equal(r.body.actuals_status, 'stale')
    assert.equal(byTitle(r.body.events, 'USD', 'Final GDP q/q').actual, '2.2%')
  })
})
