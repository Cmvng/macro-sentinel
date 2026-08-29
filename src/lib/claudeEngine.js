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
  var text = data.text || 'Analysis unavailable.'
  cache[cacheKey] = { text: text, time: now }
  setAnalyzeCache(cache)
  return text
}
