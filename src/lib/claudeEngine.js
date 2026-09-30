var ANALYZE_CACHE_KEY = 'macrosentinel_analyze_cache'
var ANALYZE_TTL = 2 * 60 * 60 * 1000

function getAnalyzeCache() {
  try {
    var raw = localStorage.getItem(ANALYZE_CACHE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch(e) { return {} }
}

function setAnalyzeCache(cache) {
  try { localStorage.setItem(ANALYZE_CACHE_KEY, JSON.stringify(cache)) } catch(e) {}
}

async function request(action, payload) {
  var response = await fetch('/api/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign({ action: action }, payload || {}))
  })
  var data = await response.json().catch(function() { return {} })
  if (!response.ok) throw new Error(data.error || 'Request failed')
  return data
}

export async function scoreAssets() {
  var data = await request('get')
  return Object.assign({}, data.signals, {
    data_status: data.data_status,
    generated_at: data.generated_at || null,
    age_minutes: typeof data.age_minutes === 'number' ? data.age_minutes : null,
    feed_health: data.feed_health || [],
    healthy_source_count: data.healthy_source_count || 0,
    source_count: data.source_count || 0,
    event_count: data.event_count || 0
  })
}

export async function analyzeAsset(asset, recentNews, currentSignal) {
  var now = Date.now()
  var cache = getAnalyzeCache()
  var cacheKey = asset + '_' + currentSignal
  var cached = cache[cacheKey]
  if (cached && (now - cached.time) < ANALYZE_TTL) return cached.text

  var data = await request('analyze', { asset: asset, signal: currentSignal })
  // Only cache a real answer. Caching the failure string meant one transient
  // provider error blanked an instrument's analysis for two hours.
  if (!data.text) throw new Error('Analysis could not be generated')
  cache[cacheKey] = { text: data.text, time: now }
  setAnalyzeCache(cache)
  return data.text
}

// Scheduled releases. Needs no model call, so it works even if the provider
// key is missing. The feed carries forecasts and previous values but never the
// actual result, and `has_actuals` says so.
export async function fetchCalendar() {
  var data = await request('get_calendar')
  return {
    events: Array.isArray(data.events) ? data.events : [],
    fetchedAt: data.fetched_at || null,
    ageMinutes: typeof data.age_minutes === 'number' ? data.age_minutes : null,
    stale: data.stale === true,
    hasActuals: data.has_actuals === true,
    actualsStatus: typeof data.actuals_status === 'string' ? data.actuals_status : 'unavailable'
  }
}
