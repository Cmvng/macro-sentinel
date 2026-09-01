var ANALYZE_CACHE_KEY = 'macrosentinel_analyze_cache'
var ANALYZE_TTL = 2 * 60 * 60 * 1000

function getAnalyzeCache() {
  try {
    var raw = localStorage.getItem(ANALYZE_CACHE_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch(e) { return {} }
}

function setAnalyzeCache(cache) {
  try {
    localStorage.setItem(ANALYZE_CACHE_KEY, JSON.stringify(cache))
  } catch(e) {}
}

async function post(body) {
  var response = await fetch('/api/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  var data = null
  try { data = await response.json() } catch(e) { data = null }
  if (!response.ok) {
    var err = new Error((data && data.error) || ('Request failed (' + response.status + ')'))
    err.status = response.status
    throw err
  }
  return data || {}
}

// Returns the whole payload, not just `signals`. The freshness fields the API
// already sends were previously discarded, which is why the header could show
// the current time next to day-old data.
export async function fetchSignals() {
  var data = await post({ action: 'get' })
  return {
    assets: (data.signals && data.signals.assets) || {},
    marketSummary: (data.signals && data.signals.market_summary) || '',
    dominantTheme: (data.signals && data.signals.dominant_theme) || '',
    degradedGroups: (data.signals && data.signals.degraded_groups) || 0,
    totalGroups: (data.signals && data.signals.total_groups) || 4,
    cached: data.cached === true,
    ageMinutes: typeof data.age_minutes === 'number' ? data.age_minutes : null,
    partialAgeMinutes: typeof data.partial_age_minutes === 'number' ? data.partial_age_minutes : null,
    newsHealth: data.news_health || null
  }
}

export async function analyzeAsset(asset, currentSignal) {
  var now = Date.now()
  var cache = getAnalyzeCache()
  var cacheKey = asset + '_' + currentSignal
  var cached = cache[cacheKey]

  if (cached && (now - cached.time) < ANALYZE_TTL) {
    return { text: cached.text, cached: true }
  }

  var data = await post({ action: 'analyze', asset: asset, signal: currentSignal })
  if (!data.text) throw new Error('No analysis returned')

  // Only successful responses are cached. A failure used to be stored as
  // "Analysis unavailable." and served for two hours.
  cache[cacheKey] = { text: data.text, time: now }
  setAnalyzeCache(cache)

  return { text: data.text, cached: false }
}

export async function fetchNews() {
  var data = await post({ action: 'get_news' })
  return {
    articles: data.articles || [],
    ageMinutes: typeof data.age_minutes === 'number' ? data.age_minutes : null,
    health: data.health || null
  }
}
