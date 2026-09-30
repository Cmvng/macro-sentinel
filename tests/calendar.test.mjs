import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { parseCalendar } from '../api/calendar.js'
import handler from '../api/refresh.js'

const sample = JSON.parse(fs.readFileSync(new URL('./fixtures/ff_calendar_sample.json', import.meta.url), 'utf8'))

function call(body, opts) {
  const res = { code: 0, body: null, status(c) { this.code = c; return this }, json(b) { this.body = b; return this }, setHeader() {}, end() { return this } }
  const req = { method: (opts && opts.method) || 'POST', body: body, headers: (opts && opts.headers) || {} }
  return handler(req, res).then(() => res)
}
function withFeed(impl, fn) {
  const real = globalThis.fetch
  globalThis.fetch = impl
  return Promise.resolve(fn()).finally(() => { globalThis.fetch = real })
}
const okFeed = (json) => async () => ({ ok: true, status: 200, json: async () => json })
const reset = () => { const g = global._macroSentinelStore; if (g) g.calendar = null }

test('the real feed sample parses into clean events', function() {
  const events = parseCalendar(sample)
  assert.ok(events.length >= 25)
  for (const e of events) {
    assert.ok(['high', 'medium', 'low'].includes(e.impact))
    assert.match(e.currency, /^[A-Z]{3}$/)
    assert.ok(isFinite(e.timestamp))
    assert.equal(e.actual, '', 'this feed never carries an actual')
  }
  const times = events.map((e) => e.timestamp)
  assert.deepEqual(times, times.slice().sort((a, b) => a - b), 'sorted by time')
})

test('holidays, unknown currencies, bad dates and junk rows are dropped', function() {
  const events = parseCalendar([
    { title: 'Bank Holiday', country: 'GBP', date: '2026-09-30T00:00:00-04:00', impact: 'Holiday' },
    { title: 'Mystery', country: 'XXX', date: '2026-09-30T08:30:00-04:00', impact: 'High' },
    { title: 'No date', country: 'USD', impact: 'High' },
    { title: 'Bad date', country: 'USD', date: 'not a date', impact: 'High' },
    null, 42, 'text', [],
    { title: 'CPI m/m', country: 'USD', date: '2026-09-30T08:30:00-04:00', impact: 'High', forecast: '0.3%', previous: '0.2%' }
  ])
  assert.equal(events.length, 1)
  assert.equal(events[0].title, 'CPI m/m')
})

test('a non-array feed yields nothing rather than throwing', function() {
  for (const bad of [null, undefined, {}, 'x', 7]) assert.deepEqual(parseCalendar(bad), [])
})

test('feed text is length-capped and stripped of control characters', function() {
  const [e] = parseCalendar([{
    title: 'CPI m/m\u0000\u0007 ' + 'A'.repeat(500), country: 'usd', date: '2026-09-30T08:30:00-04:00',
    impact: 'HIGH', forecast: '0.3%' + 'x'.repeat(100), previous: '<script>alert(1)</script>'
  }])
  assert.ok(e.title.length <= 120)
  // eslint-disable-next-line no-control-regex
  assert.doesNotMatch(e.title, /[\u0000-\u001f]/)
  assert.equal(e.currency, 'USD')
  assert.equal(e.impact, 'high')
  assert.ok(e.forecast.length <= 24)
  // Kept as inert text; the UI renders it through React, never as HTML.
  assert.ok(e.previous.length <= 24)
})

test('the event list is capped', function() {
  const many = Array.from({ length: 1000 }, (_, i) => ({ title: 'Event ' + i, country: 'USD', date: '2026-09-30T08:30:00-04:00', impact: 'High' }))
  assert.ok(parseCalendar(many).length <= 400)
})

test('the calendar works with NO Anthropic key configured', async function() {
  const keys = ['ANTHROPIC_API_KEY', 'VITE_ANTHROPIC_KEY']
  const saved = keys.map((k) => process.env[k]); keys.forEach((k) => delete process.env[k])
  reset()
  try {
    await withFeed(okFeed(sample), async () => {
      const cal = await call({ action: 'get_calendar' })
      assert.equal(cal.code, 200)
      assert.ok(cal.body.events.length > 20)
      assert.equal(cal.body.has_actuals, false)
      assert.equal(cal.body.stale, false)
      // Everything that needs the model still refuses without a key.
      assert.equal((await call({ action: 'get_news' })).code, 503)
      assert.equal((await call({ action: 'get' })).code, 503)
    })
  } finally { keys.forEach((k, i) => { if (saved[i] !== undefined) process.env[k] = saved[i] }) }
})

test('the calendar is cached, so the upstream feed is not hammered', async function() {
  reset()
  let hits = 0
  await withFeed(async () => { hits += 1; return { ok: true, status: 200, json: async () => sample } }, async () => {
    await call({ action: 'get_calendar' }); await call({ action: 'get_calendar' }); await call({ action: 'get_calendar' })
  })
  assert.equal(hits, 1)
})

test('an upstream failure serves the previous copy, marked stale', async function() {
  reset()
  await withFeed(okFeed(sample), () => call({ action: 'get_calendar' }))
  global._macroSentinelStore.calendar.time -= 40 * 60 * 1000 // expire the cache
  await withFeed(async () => { throw new Error('network down') }, async () => {
    const r = await call({ action: 'get_calendar' })
    assert.equal(r.code, 200)
    assert.equal(r.body.stale, true)
    assert.ok(r.body.events.length > 20)
  })
})

test('an upstream failure with nothing cached is an honest 503, not fabricated events', async function() {
  reset()
  for (const impl of [async () => { throw new Error('down') }, async () => ({ ok: false, status: 429, json: async () => ({}) }), okFeed([]), okFeed('garbage')]) {
    reset()
    await withFeed(impl, async () => {
      const r = await call({ action: 'get_calendar' })
      assert.equal(r.code, 503)
      assert.equal(r.body.events, undefined)
    })
  }
})

test('the request-size guard still applies to the calendar action', async function() {
  const r = await call({ action: 'get_calendar', junk: 'x'.repeat(20000) })
  assert.equal(r.code, 413)
})
