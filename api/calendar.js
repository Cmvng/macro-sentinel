// Economic calendar adapter.
//
// The schedule feed (Forex Factory's public weekly JSON, served by
// faireconomy.media) carries the SCHEDULE, the consensus FORECAST and the
// PREVIOUS value, but never the ACTUAL: verified against the live feed, 0 of 142
// events had one. The actual therefore comes from a second source,
// TradingView's public economic-calendar endpoint, and is merged in by
// `mergeActuals`. That endpoint is undocumented and unofficial, so it can change
// or disappear without notice; when it does the merge yields nothing and the
// user's own entry is the fallback. A merge is only made when the match is
// unambiguous, because a wrong actual would produce a wrong bias.
//
// Everything in the feed is untrusted text. It is length-capped, type-checked
// and only ever rendered as text.

export var CALENDAR_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json'

var CURRENCIES = { USD: 1, EUR: 1, GBP: 1, JPY: 1, CHF: 1, CAD: 1, AUD: 1, NZD: 1, CNY: 1 }
var IMPACTS = { high: 'high', medium: 'medium', low: 'low' }
var MAX_EVENTS = 400

function clean(value, max) {
  if (typeof value !== 'string') return ''
  // Stripping control characters from untrusted text is the point of this pattern.
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
}

export function parseCalendar(json) {
  if (!Array.isArray(json)) return []
  var out = []
  for (var i = 0; i < json.length && out.length < MAX_EVENTS; i++) {
    var e = json[i]
    if (!e || typeof e !== 'object') continue
    var title = clean(e.title, 120)
    var currency = clean(e.country, 3).toUpperCase()
    var impact = IMPACTS[clean(e.impact, 12).toLowerCase()]
    var when = new Date(typeof e.date === 'string' ? e.date : NaN)
    // Holidays are dropped (impact is not one of the three levels), as are
    // events with no usable time or an unknown currency.
    if (!title || !CURRENCIES[currency] || !impact || !isFinite(when.getTime())) continue
    var ts = when.getTime()
    out.push({
      id: currency + '|' + title + '|' + ts,
      title: title,
      currency: currency,
      impact: impact,
      time: when.toISOString(),
      timestamp: ts,
      forecast: clean(e.forecast, 24),
      previous: clean(e.previous, 24),
      actual: clean(e.actual, 24)
    })
  }
  out.sort(function(a, b) { return a.timestamp - b.timestamp })
  return out
}

export async function fetchCalendar(fetchImpl) {
  var doFetch = fetchImpl || fetch
  var controller = new AbortController()
  var timer = setTimeout(function() { controller.abort() }, 8000)
  try {
    var response = await doFetch(CALENDAR_URL, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MacroSentinel/1.0)', Accept: 'application/json' }
    })
    if (!response.ok) throw new Error('Calendar feed returned ' + response.status)
    var events = parseCalendar(await response.json())
    if (!events.length) throw new Error('Calendar feed contained no usable events')
    return events
  } finally {
    clearTimeout(timer)
  }
}

// ------------------------------------------------------------------ actuals

export var ACTUALS_URL = 'https://economic-calendar.tradingview.com/events'

var COUNTRY_CURRENCY = { US: 'USD', EU: 'EUR', DE: 'EUR', FR: 'EUR', GB: 'GBP', JP: 'JPY', AU: 'AUD', CA: 'CAD', CH: 'CHF', NZ: 'NZD', CN: 'CNY' }
var TIME_TOLERANCE_MS = 5 * 60 * 1000

function numberText(n) {
  return String(Math.round(n * 10000) / 10000)
}

// One release as the second source reports it: a plain number, a unit ('%'),
// and a scale ('K', 'M', 'B') that is written after the digits the way the
// schedule feed writes its forecasts.
export function parseActuals(json) {
  var list = json && Array.isArray(json.result) ? json.result : []
  var out = []
  for (var i = 0; i < list.length && out.length < 1200; i++) {
    var e = list[i]
    if (!e || typeof e !== 'object') continue
    var currency = COUNTRY_CURRENCY[clean(e.country, 3).toUpperCase()]
    var title = clean(e.title, 120)
    var when = new Date(typeof e.date === 'string' ? e.date : NaN)
    if (!currency || !title || !isFinite(when.getTime())) continue
    if (typeof e.actual !== 'number' || !isFinite(e.actual)) continue
    var scale = clean(e.scale, 2).toUpperCase()
    var suffix = clean(e.unit, 4) === '%' ? '%' : (/^[KMBT]$/.test(scale) ? scale : '')
    out.push({
      currency: currency,
      title: title,
      timestamp: when.getTime(),
      actual: numberText(e.actual) + suffix,
      forecast: typeof e.forecast === 'number' && isFinite(e.forecast) ? numberText(e.forecast) + suffix : ''
    })
  }
  return out
}

var SYNONYMS = { 'm/m': 'mom', 'q/q': 'qoq', 'y/y': 'yoy', prelim: 'prel', preliminary: 'prel', advance: 'adv', inflation: 'cpi', jobless: 'unemployment', speaks: 'speech' }
var NOISE = { the: 1, rate: 1, growth: 1, of: 1, and: 1, s: 1 }
// Words the two sources add or drop without changing which release it is. Every
// other difference ("core", "price", "index", "sales", a period, a revision
// stage) makes it a different release. This is deliberately strict: a release
// with no safe pairing is left for the user, but a wrong pairing would put the
// wrong number under a real release.
var HARMLESS = { rba: 1, boe: 1, boc: 1, rbnz: 1, snb: 1, boj: 1, ecb: 1, fed: 1, us: 1, uk: 1, german: 1, germany: 1, non: 1, farm: 1, initial: 1 }

// The two sources name the same release differently ("Final GDP q/q" against
// "GDP Growth Rate QoQ Final"), so compare bags of normalised words.
export function titleTokens(title) {
  var t = String(title || '').toLowerCase().replace(/(m\/m|q\/q|y\/y)/g, function(m) { return ' ' + SYNONYMS[m] + ' ' })
  var words = t.split(/[^a-z0-9]+/)
  var set = {}
  for (var i = 0; i < words.length; i++) {
    var w = words[i]
    if (!w || NOISE[w]) continue
    set[SYNONYMS[w] || w] = 1
  }
  return Object.keys(set)
}

// True when the two titles name the same release: every word that differs is a
// harmless one.
export function sameRelease(a, b) {
  var ta = titleTokens(a)
  var tb = titleTokens(b)
  if (!ta.length || !tb.length) return false
  var core = 0
  for (var i = 0; i < ta.length; i++) {
    if (tb.indexOf(ta[i]) !== -1) core += 1
    else if (!HARMLESS[ta[i]]) return false
  }
  for (var j = 0; j < tb.length; j++) {
    if (ta.indexOf(tb[j]) === -1 && !HARMLESS[tb[j]]) return false
  }
  return core > 0
}

function suffixOf(text) {
  var m = String(text || '').trim().match(/(%|[KMBT])$/i)
  return m ? m[1].toUpperCase() : ''
}

function numberOf(text) {
  var n = parseFloat(String(text || '').replace(/[^0-9.-]/g, ''))
  return isFinite(n) ? n : null
}

// Sanity checks that catch a wrong match even when the titles look alike: the
// units must agree, and where both sources give a forecast they must be in the
// same ballpark.
function compatible(event, source) {
  var fu = suffixOf(event.forecast || event.previous)
  var au = suffixOf(source.actual)
  if (fu !== au && (fu === '%' || au === '%')) return false
  var a = numberOf(event.forecast)
  var b = numberOf(source.forecast)
  if (a !== null && b !== null) {
    var gap = Math.abs(a - b)
    if (gap > Math.max(0.6 * Math.max(Math.abs(a), Math.abs(b)), 0.1)) return false
  }
  return true
}

// Attach each release's actual to the matching scheduled event. A candidate
// needs the same currency, a start time within five minutes, the same release
// by name and compatible numbers, and there must be exactly one such candidate.
// Anything less is left without an actual, which sends the user to manual entry.
export function mergeActuals(events, actuals) {
  var matched = 0
  var merged = events.map(function(event) {
    if (event.actual) return event
    var found = []
    for (var i = 0; i < actuals.length; i++) {
      var c = actuals[i]
      if (c.currency !== event.currency) continue
      if (Math.abs(c.timestamp - event.timestamp) > TIME_TOLERANCE_MS) continue
      if (sameRelease(event.title, c.title) && compatible(event, c)) found.push(c)
    }
    if (found.length !== 1) return event
    matched += 1
    return Object.assign({}, event, { actual: found[0].actual, actual_source: 'live' })
  })
  return { events: merged, matched: matched }
}

export async function fetchActuals(fetchImpl, now) {
  var doFetch = fetchImpl || fetch
  var t = typeof now === 'number' ? now : Date.now()
  var from = new Date(t - 2 * 24 * 3600 * 1000).toISOString()
  var to = new Date(t + 24 * 3600 * 1000).toISOString()
  var url = ACTUALS_URL + '?from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to) +
    '&countries=' + Object.keys(COUNTRY_CURRENCY).join(',')
  var controller = new AbortController()
  var timer = setTimeout(function() { controller.abort() }, 8000)
  try {
    var response = await doFetch(url, {
      signal: controller.signal,
      headers: { Origin: 'https://www.tradingview.com', Referer: 'https://www.tradingview.com/', 'User-Agent': 'Mozilla/5.0 (compatible; MacroSentinel/1.0)', Accept: 'application/json' }
    })
    if (!response.ok) throw new Error('Actuals source returned ' + response.status)
    return parseActuals(await response.json())
  } finally {
    clearTimeout(timer)
  }
}
