var globalStore = global._appStore || {
  signals: null,
  signalsTime: 0,
  news: null,
  newsTime: 0,
  analyzeCache: {},
  lastBreakingCheck: 0,
  seenHeadlines: {}
}
global._appStore = globalStore

var SIGNAL_TTL = 24 * 60 * 60 * 1000
var NEWS_TTL = 60 * 60 * 1000
var ANALYZE_TTL = 2 * 60 * 60 * 1000
var BREAKING_CHECK_INTERVAL = 60 * 60 * 1000

var BREAKING_KEYWORDS = [
  'rate hike', 'rate cut', 'emergency meeting', 'fomc decision', 'fed decision',
  'cpi data', 'inflation data', 'nfp', 'non-farm payroll', 'jobs report',
  'rate decision', 'interest rate decision', 'ecb decision', 'boe decision',
  'boj decision', 'rba decision', 'rbnz decision',
  'war escalation', 'ceasefire', 'nuclear', 'missile strike', 'invasion',
  'trump tariff', 'sanctions imposed', 'trade war escalation',
  'opec cut', 'opec production', 'emergency opec',
  'market crash', 'circuit breaker', 'flash crash',
  'bitcoin etf approved', 'crypto ban', 'exchange collapse'
]

var ASSET_KEYWORDS = {
  'EUR/USD': ['ecb', 'euro', 'eurozone', 'lagarde'],
  'GBP/USD': ['boe', 'pound', 'uk', 'britain'],
  'USD/JPY': ['boj', 'yen', 'japan', 'intervention'],
  'USD/CHF': ['snb', 'franc', 'switzerland'],
  'AUD/USD': ['rba', 'australia'],
  'USD/CAD': ['boc', 'canada', 'loonie'],
  'NZD/USD': ['rbnz', 'new zealand'],
  'XAU/USD': ['gold', 'xau'],
  'XAG/USD': ['silver', 'xag'],
  'WTI Oil': ['oil', 'wti', 'crude', 'opec'],
  'Brent':   ['brent', 'crude', 'opec'],
  'BTC/USD': ['bitcoin', 'btc'],
  'ETH/USD': ['ethereum', 'eth'],
  'XRP/USD': ['xrp', 'ripple'],
  'SOL/USD': ['solana', 'sol'],
  'DOGE/USD': ['dogecoin', 'doge']
}

var FOREX_MAJORS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD']
var FOREX_MINORS = ['EUR/GBP', 'EUR/JPY', 'EUR/CHF', 'EUR/AUD', 'EUR/CAD', 'EUR/NZD', 'GBP/JPY', 'GBP/CHF', 'GBP/AUD', 'GBP/CAD', 'GBP/NZD']
var FOREX_CROSSES = ['AUD/JPY', 'AUD/CHF', 'AUD/CAD', 'AUD/NZD', 'NZD/JPY', 'NZD/CHF', 'NZD/CAD', 'CAD/JPY', 'CAD/CHF', 'CHF/JPY']
var FOREX_MINORS_AND_CROSSES = FOREX_MINORS.concat(FOREX_CROSSES)
var METALS = ['XAU/USD', 'XAG/USD', 'XPT/USD', 'WTI Oil', 'Brent', 'Nat Gas', 'Copper']
var CRYPTO = ['BTC/USD', 'ETH/USD', 'BNB/USD', 'SOL/USD', 'XRP/USD', 'DOGE/USD', 'ADA/USD', 'AVAX/USD', 'LINK/USD', 'DOT/USD', 'MATIC/USD', 'UNI/USD']

var SYSTEM_PROMPT = 'You are a macro market analyst. Respond with ONLY raw JSON. No markdown. No backticks. Start with { end with }. Format: {"assets":{"EUR/USD":{"signal":"buy","score":65,"confidence":"medium","primary_driver":"reason here","supporting_factors":["factor1","factor2"],"risk_to_outlook":"risk here","conflicting":false}},"market_summary":"Two sentence summary.","dominant_theme":"Five word theme"}. Signal must be one of: strong_buy, buy, neutral, sell, strong_sell. Score 0-100. Confidence: high, medium, or low.'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  var key = process.env.VITE_ANTHROPIC_KEY
  if (!key) return res.status(500).json({ error: 'No API key' })

  var now = Date.now()
  var body = req.body || {}
  var action = body.action || 'get'

  if (action === 'get_news') {
    var news = await getNews(now)
    return res.status(200).json({ articles: news, cached: (now - globalStore.newsTime) < NEWS_TTL })
  }

  if (action === 'analyze') {
    return await handleAnalyze(req, res, key, now)
  }

  if (action === 'check_breaking') {
    return await handleBreakingCheck(req, res, key, now)
  }

  if (action === 'get' || req.method === 'GET') {
    var force = body.force === true || (req.query && req.query.force === 'true')
    if (!force && globalStore.signals && (now - globalStore.signalsTime) < SIGNAL_TTL) {
      return res.status(200).json({
        signals: globalStore.signals,
        cached: true,
        age_minutes: Math.round((now - globalStore.signalsTime) / 60000),
        next_refresh_hours: Math.round((SIGNAL_TTL - (now - globalStore.signalsTime)) / 3600000)
      })
    }
    var fresh = await buildAllSignals(key, now)
    globalStore.signals = fresh
    globalStore.signalsTime = now
    return res.status(200).json({ signals: fresh, cached: false, age_minutes: 0 })
  }

  return res.status(400).json({ error: 'Unknown action' })
}

async function handleAnalyze(req, res, key, now) {
  var asset = req.body.asset
  var signal = req.body.signal || 'neutral'
  var newsItems = req.body.news || []

  if (!asset) return res.status(400).json({ error: 'No asset specified' })

  var cacheKey = asset + '_' + signal
  var cached = globalStore.analyzeCache[cacheKey]
  if (cached && (now - cached.time) < ANALYZE_TTL) {
    return res.status(200).json({ text: cached.text, cached: true })
  }

  var newsLines = newsItems.length > 0
    ? newsItems.map(function(n) { return '- [' + n.source + '] ' + n.title }).join('\n')
    : '- No specific news, use general market knowledge'

  var prompt = 'Write exactly 4 sentences of professional fundamental trading analysis for ' + asset + ' only. Current signal: ' + signal + '.\n\nRecent news:\n' + newsLines + '\n\nSentence 1: Current bias for ' + asset + ' and why. Sentence 2: Most impactful recent driver for ' + asset + '. Sentence 3: Biggest risk to reverse this signal. Sentence 4: What trader should watch next for ' + asset + '. Only discuss ' + asset + '. Plain prose only.'

  try {
    var r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 400, messages: [{ role: 'user', content: prompt }] })
    })
    var d = await r.json()
    var text = ''
    if (d.content) {
      for (var i = 0; i < d.content.length; i++) {
        if (d.content[i].type === 'text') { text = d.content[i].text; break }
      }
    }
    globalStore.analyzeCache[cacheKey] = { text: text, time: now }
    return res.status(200).json({ text: text, cached: false })
  } catch(e) {
    return res.status(500).json({ error: e.message })
  }
}

async function handleBreakingCheck(req, res, key, now) {
  if ((now - globalStore.lastBreakingCheck) < BREAKING_CHECK_INTERVAL) {
    return res.status(200).json({ breaking: false, message: 'Too soon to check' })
  }
  globalStore.lastBreakingCheck = now

  var news = await getNews(now)
  var newHeadlines = []
  for (var i = 0; i < news.length; i++) {
    var id = news[i].title.toLowerCase().slice(0, 40)
    if (!globalStore.seenHeadlines[id]) {
      globalStore.seenHeadlines[id] = now
      newHeadlines.push(news[i])
    }
  }

  var breakingFound = []
  for (var j = 0; j < newHeadlines.length; j++) {
    var lower = newHeadlines[j].title.toLowerCase()
    for (var k = 0; k < BREAKING_KEYWORDS.length; k++) {
      if (lower.indexOf(BREAKING_KEYWORDS[k]) !== -1) {
        breakingFound.push(newHeadlines[j])
        break
      }
    }
  }

  if (breakingFound.length === 0) {
    return res.status(200).json({ breaking: false })
  }

  var affectedAssets = []
  for (var m = 0; m < breakingFound.length; m++) {
    var lower2 = breakingFound[m].title.toLowerCase()
    var akeys = Object.keys(ASSET_KEYWORDS)
    for (var n = 0; n < akeys.length; n++) {
      var kws = ASSET_KEYWORDS[akeys[n]]
      for (var p = 0; p < kws.length; p++) {
        if (lower2.indexOf(kws[p]) !== -1) {
          if (affectedAssets.indexOf(akeys[n]) === -1) affectedAssets.push(akeys[n])
          break
        }
      }
    }
  }

  if (affectedAssets.length === 0) affectedAssets = FOREX_MAJORS

  var partial = await scoreGroup(key, news, affectedAssets, now)

  if (globalStore.signals && globalStore.signals.assets) {
    var keys = Object.keys(partial.assets)
    for (var q = 0; q < keys.length; q++) {
      globalStore.signals.assets[keys[q]] = partial.assets[keys[q]]
      globalStore.signals.assets[keys[q]].breaking = true
    }
    if (partial.market_summary) globalStore.signals.market_summary = partial.market_summary
    if (partial.dominant_theme) globalStore.signals.dominant_theme = partial.dominant_theme
    globalStore.signalsTime = now
  }

  return res.status(200).json({
    breaking: true,
    headlines: breakingFound.map(function(h) { return h.title }),
    affected: affectedAssets,
    signals: globalStore.signals
  })
}

async function buildAllSignals(key, now) {
  var news = await getNews(now)
  var results = await Promise.allSettled([
    scoreGroup(key, news, FOREX_MAJORS, now),
    scoreGroup(key, news, FOREX_MINORS_AND_CROSSES, now),
    scoreGroup(key, news, METALS, now),
    scoreGroup(key, news, CRYPTO, now)
  ])
  return mergeResults(results)
}

async function scoreGroup(key, news, assets, now) {
  try {
    var brief = buildBrief(news, assets, now)
    var r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 3000, system: SYSTEM_PROMPT, messages: [{ role: 'user', content: brief }] })
    })
    var d = await r.json()
    var text = ''
    if (d.content) {
      for (var i = 0; i < d.content.length; i++) {
        if (d.content[i].type === 'text') { text = d.content[i].text; break }
      }
    }
    var parsed = parseJSON(text)
    return parsed && parsed.assets ? parsed : fallback(assets)
  } catch(e) {
    return fallback(assets)
  }
}

function buildBrief(news, assets, now) {
  var hi = []
  var lo = []
  for (var i = 0; i < news.length; i++) {
    var n = news[i]
    var age = Math.round((now - new Date(n.publishedAt).getTime()) / 60000)
    var line = '[' + n.source + '|' + age + 'min] ' + n.title
    if (n.trustScore >= 80) hi.push(line)
    else lo.push(line)
  }
  return 'Score: ' + assets.join(', ') + '\n\nTop news:\n' + hi.slice(0, 6).join('\n') + '\n\nOther:\n' + lo.slice(0, 4).join('\n') + '\n\nTime: ' + new Date(now).toUTCString() + '\n\nReturn raw JSON only.'
}

function parseJSON(text) {
  if (!text) return null
  var t = text.trim().replace(/```json/gi, '').replace(/```/g, '').trim()
  try { return JSON.parse(t) } catch(e) {}
  var s = t.indexOf('{')
  var e = t.lastIndexOf('}')
  if (s !== -1 && e > s) {
    try { return JSON.parse(t.slice(s, e + 1)) } catch(e2) {}
  }
  return null
}

function fallback(assets) {
  var r = { assets: {}, market_summary: 'Analysis pending.', dominant_theme: 'Markets await direction' }
  for (var i = 0; i < assets.length; i++) {
    r.assets[assets[i]] = {
      signal: 'neutral', score: 50, confidence: 'low',
      primary_driver: 'Awaiting scheduled analysis',
      supporting_factors: ['Next refresh at 9pm WAT'],
      risk_to_outlook: 'Unknown', conflicting: false
    }
  }
  return r
}

function mergeResults(results) {
  var combined = { assets: {}, market_summary: '', dominant_theme: '' }
  for (var i = 0; i < results.length; i++) {
    if (results[i].status === 'fulfilled' && results[i].value && results[i].value.assets) {
      var keys = Object.keys(results[i].value.assets)
      for (var j = 0; j < keys.length; j++) {
        combined.assets[keys[j]] = results[i].value.assets[keys[j]]
      }
      if (!combined.market_summary && results[i].value.market_summary) combined.market_summary = results[i].value.market_summary
      if (!combined.dominant_theme && results[i].value.dominant_theme) combined.dominant_theme = results[i].value.dominant_theme
    }
  }
  return combined
}

async function getNews(now) {
  if (globalStore.news && (now - globalStore.newsTime) < NEWS_TTL) return globalStore.news

  var sources = [
    'https://feeds.reuters.com/reuters/businessNews',
    'https://feeds.reuters.com/reuters/topNews',
    'https://www.forexlive.com/feed/news',
    'https://www.fxstreet.com/rss/news',
    'https://www.kitco.com/rss/kitco-news.rss',
    'https://www.coindesk.com/arc/outboundfeeds/rss/',
    'https://cointelegraph.com/rss',
    'https://feeds.marketwatch.com/marketwatch/topstories/',
    'https://news.google.com/rss/search?q=federal+reserve+interest+rates&hl=en-US&gl=US&ceid=US:en',
    'https://news.google.com/rss/search?q=geopolitical+war+sanctions+market&hl=en-US&gl=US&ceid=US:en',
    'https://news.google.com/rss/search?q=Trump+tariff+dollar+economy&hl=en-US&gl=US&ceid=US:en',
    'https://news.google.com/rss/search?q=OPEC+oil+crude+production&hl=en-US&gl=US&ceid=US:en',
    'https://news.google.com/rss/search?q=bitcoin+ethereum+crypto+market&hl=en-US&gl=US&ceid=US:en',
    'https://news.google.com/rss/search?q=gold+silver+commodities+market&hl=en-US&gl=US&ceid=US:en',
    'https://news.google.com/rss/search?q=ECB+BOJ+RBA+RBNZ+central+bank&hl=en-US&gl=US&ceid=US:en'
  ]

  function getTrust(url) {
    if (url.indexOf('reuters') !== -1) return 95
    if (url.indexOf('forexlive') !== -1) return 80
    if (url.indexOf('fxstreet') !== -1) return 78
    if (url.indexOf('kitco') !== -1) return 78
    if (url.indexOf('coindesk') !== -1) return 75
    if (url.indexOf('cointelegraph') !== -1) return 72
    if (url.indexOf('marketwatch') !== -1) return 70
    return 75
  }

  function getSourceName(url) {
    if (url.indexOf('reuters') !== -1) return 'Reuters'
    if (url.indexOf('forexlive') !== -1) return 'ForexLive'
    if (url.indexOf('fxstreet') !== -1) return 'FXStreet'
    if (url.indexOf('kitco') !== -1) return 'Kitco'
    if (url.indexOf('coindesk') !== -1) return 'CoinDesk'
    if (url.indexOf('cointelegraph') !== -1) return 'CoinTelegraph'
    if (url.indexOf('marketwatch') !== -1) return 'MarketWatch'
    if (url.indexOf('google') !== -1) {
      var q = url.match(/q=([^&]+)/)
      return 'Google:' + (q ? decodeURIComponent(q[1]).slice(0, 15) : 'News')
    }
    return 'News'
  }

  function parseItems(xml, sourceName, trust) {
    var items = []
    var reg = /<item>([\s\S]*?)<\/item>/g
    var match
    while ((match = reg.exec(xml)) !== null) {
      var block = match[1]
      var title = ''
      var link = ''
      var pubDate = ''
      var tm = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/)
      if (tm) title = (tm[1] || tm[2] || '').trim()
      var lm = block.match(/<link>(.*?)<\/link>/)
      if (lm) link = lm[1].trim()
      var dm = block.match(/<pubDate>(.*?)<\/pubDate>/)
      if (dm) pubDate = dm[1].trim()
      if (title && title.length > 5) {
        items.push({
          title: title, link: link,
          publishedAt: pubDate || new Date().toISOString(),
          source: sourceName, trustScore: trust
        })
      }
    }
    return items.slice(0, 15)
  }

  async function fetchOne(url) {
    try {
      var ctrl = new AbortController()
      var t = setTimeout(function() { ctrl.abort() }, 6000)
      var r = await fetch(url, {
        signal: ctrl.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)' }
      })
      clearTimeout(t)
      if (!r.ok) return []
      var text = await r.text()
      return parseItems(text, getSourceName(url), getTrust(url))
    } catch(e) { return [] }
  }

  var results = await Promise.allSettled(sources.map(function(s) { return fetchOne(s) }))
  var all = []
  for (var i = 0; i < results.length; i++) {
    if (results[i].status === 'fulfilled') all = all.concat(results[i].value)
  }

  var seen = {}
  var unique = []
  for (var j = 0; j < all.length; j++) {
    var k = all[j].title.toLowerCase().slice(0, 50)
    if (!seen[k]) { seen[k] = true; unique.push(all[j]) }
  }

  globalStore.news = unique
  globalStore.newsTime = now
  return unique
}
