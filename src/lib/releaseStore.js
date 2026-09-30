// The actual results a user has entered, kept in the browser only. There are no
// accounts, so nothing here leaves the device.
var KEY = 'macrosentinel_release_actuals'
var MAX_AGE_MS = 7 * 24 * 3600 * 1000
var MAX_ENTRIES = 80

export function loadActuals(now) {
  try {
    var raw = window.localStorage.getItem(KEY)
    var parsed = raw ? JSON.parse(raw) : {}
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    var out = {}
    var keys = Object.keys(parsed)
    for (var i = 0; i < keys.length && Object.keys(out).length < MAX_ENTRIES; i++) {
      var v = parsed[keys[i]]
      // Anything malformed or older than a week is dropped rather than trusted.
      if (keys[i].length > 200 || !v || typeof v.actual !== 'string' || v.actual.length > 24) continue
      if (typeof v.at !== 'number' || (now - v.at) > MAX_AGE_MS) continue
      out[keys[i]] = { actual: v.actual, at: v.at }
    }
    return out
  } catch (_) { return {} }
}

export function saveActuals(actuals) {
  try { window.localStorage.setItem(KEY, JSON.stringify(actuals)) } catch (_) {}
}
