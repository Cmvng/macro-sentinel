// Pure view logic for the releases panel: which events to show, in which
// group, and which deserve an alert. No React and no network, so it is testable.
import { matchIndicator } from './releaseModel.js'

var HOUR = 3600 * 1000
var LOOKBACK_MS = 12 * HOUR
var LOOKAHEAD_MS = 48 * HOUR
var UPCOMING_ALERT_MS = 60 * 60 * 1000
var AWAITING_ALERT_MS = 3 * HOUR

// Modelled indicators are shown at High and Medium impact. Things that have no
// number to judge (speeches, statements) are shown only when High, because a
// central-bank speech is worth knowing about even though it has no verdict.
export function isRelevant(event) {
  if (event.impact === 'low') return false
  if (matchIndicator(event.title)) return true
  return event.impact === 'high'
}

export function isModelled(event) {
  return !!matchIndicator(event.title)
}

export function groupEvents(events, actuals, now, filter) {
  var f = filter || {}
  var awaiting = []
  var done = []
  var upcoming = []
  for (var i = 0; i < events.length; i++) {
    var e = events[i]
    if (!isRelevant(e)) continue
    if (f.currency && f.currency !== 'all' && e.currency !== f.currency) continue
    if (f.highOnly && e.impact !== 'high') continue
    var delta = e.timestamp - now
    if (delta < -LOOKBACK_MS || delta > LOOKAHEAD_MS) continue
    var hasActual = !!actuals[e.id]
    if (hasActual) done.push(e)
    else if (delta <= 0) { if (isModelled(e)) awaiting.push(e); else upcoming.push(e) }
    else upcoming.push(e)
  }
  // Most recent release first for what has happened; soonest first for what is coming.
  awaiting.sort(function(a, b) { return b.timestamp - a.timestamp })
  done.sort(function(a, b) { return b.timestamp - a.timestamp })
  upcoming.sort(function(a, b) { return a.timestamp - b.timestamp })
  return { awaiting: awaiting, done: done, upcoming: upcoming }
}

// The banner. Only High-impact events: an alert that fires for everything is
// an alert nobody reads. "Awaiting" is honest about the limits of the data
// source: it asks the user for the result rather than pretending to know it.
export function releaseAlerts(events, actuals, now) {
  var out = []
  for (var i = 0; i < events.length; i++) {
    var e = events[i]
    if (e.impact !== 'high' || !isModelled(e)) continue
    var delta = e.timestamp - now
    if (delta >= 0 && delta <= UPCOMING_ALERT_MS) {
      out.push({ kind: 'upcoming', event: e, minutes: Math.max(0, Math.round(delta / 60000)) })
    } else if (delta < 0 && -delta <= AWAITING_ALERT_MS && !actuals[e.id]) {
      out.push({ kind: 'awaiting', event: e, minutes: Math.round(-delta / 60000) })
    }
  }
  out.sort(function(a, b) { return a.minutes - b.minutes })
  return out.slice(0, 2)
}

export function relativeTime(timestamp, now) {
  var mins = Math.round((timestamp - now) / 60000)
  var abs = Math.abs(mins)
  var span = abs < 1 ? 'now' : abs < 60 ? abs + ' min' : abs < 48 * 60 ? Math.floor(abs / 60) + 'h' + (abs % 60 ? ' ' + (abs % 60) + 'm' : '') : Math.round(abs / 1440) + 'd'
  if (span === 'now') return 'now'
  return mins > 0 ? 'in ' + span : span + ' ago'
}

export function dayLabel(timestamp, now) {
  var a = new Date(timestamp)
  var b = new Date(now)
  var startOf = function(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() }
  var diff = Math.round((startOf(a) - startOf(b)) / (24 * HOUR))
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  return a.toLocaleDateString([], { weekday: 'short' })
}

// A short, readable subset of a release's affected instruments: the two
// strongest direct ones, plus the two strongest spillovers. Enough to act on
// without a wall of chips; the full list sits behind the verdict.
export function keyInstruments(instruments) {
  var direct = []
  var indirect = []
  for (var i = 0; i < instruments.length; i++) {
    if (instruments[i].signal === 'neutral') continue
    if (instruments[i].direct) direct.push(instruments[i])
    else indirect.push(instruments[i])
  }
  return direct.slice(0, 2).concat(indirect.slice(0, 2))
}

// Element ids are built from event ids, which contain spaces and pipes.
export function releaseDomId(id) {
  return 'release-' + String(id).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')
}
