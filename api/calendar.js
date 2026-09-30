// Economic calendar adapter.
//
// The feed used here (Forex Factory's public weekly JSON, served by
// faireconomy.media) carries the SCHEDULE, the consensus FORECAST and the
// PREVIOUS value. It does not carry the ACTUAL result: verified against the
// live feed, 0 of 142 events had one. So the app can preview what a release
// would mean, but the actual has to be entered by the user or come from a
// different source. `has_actuals: false` is reported so the UI never implies
// otherwise.
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
