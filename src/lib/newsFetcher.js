export var SOURCE_TRUST = {
  'Reuters': 95, 'ForexLive': 80, 'FXStreet': 78,
  'Kitco': 78, 'CoinDesk': 75, 'CoinTelegraph': 72,
  'MarketWatch': 70, 'default': 65
}

export var RELEVANCE_KEYWORDS = {
  critical: [
    'fed', 'federal reserve', 'fomc', 'powell', 'interest rate', 'rate hike', 'rate cut',
    'cpi', 'inflation', 'ppi', 'nfp', 'non-farm', 'payroll', 'gdp', 'unemployment',
    'ecb', 'lagarde', 'boe', 'bank of england', 'boj', 'bank of japan', 'rba', 'rbnz',
    'snb', 'boc', 'swiss national bank', 'bank of canada',
    'tariff', 'sanction', 'trade war', 'embargo',
    'opec', 'oil production', 'oil supply',
    'war', 'strike', 'invasion', 'ceasefire', 'nuclear', 'missile',
    'trump', 'potus', 'white house', 'treasury', 'bessent',
    'bitcoin', 'ethereum', 'crypto', 'etf', 'halving',
    'gold', 'silver', 'xau', 'xag',
    'usd', 'dollar', 'euro', 'yen', 'pound', 'franc', 'currency'
  ],
  high: [
    'recession', 'slowdown', 'growth', 'pmi', 'manufacturing', 'services',
    'debt ceiling', 'budget', 'deficit', 'surplus',
    'election', 'coup', 'protest', 'geopolitical',
    'elon musk', 'sec', 'regulation', 'ban', 'doge', 'dogecoin',
    'iran', 'russia', 'china', 'ukraine', 'israel', 'saudi',
    'crude', 'brent', 'wti', 'natural gas', 'copper',
    'yield', 'bonds', 'bnb', 'solana', 'cardano', 'ripple', 'xrp',
    'avalanche', 'polygon', 'chainlink', 'polkadot', 'uniswap',
    'australia', 'canada', 'new zealand', 'japan', 'switzerland',
    'commodity', 'dairy', 'iron ore'
  ],
  medium: [
    'economic', 'market', 'stocks', 'equities', 'forex', 'currency',
    'central bank', 'monetary policy', 'fiscal', 'stimulus',
    'supply chain', 'energy', 'commodity', 'defi', 'blockchain', 'web3'
  ]
}

export var ASSET_IMPACT_MAP = {
  'EUR/USD': ['ecb', 'lagarde', 'euro', 'eurozone', 'fed', 'dollar', 'cpi', 'usd'],
  'GBP/USD': ['boe', 'bank of england', 'pound', 'uk', 'britain', 'fed', 'dollar'],
  'USD/JPY': ['boj', 'bank of japan', 'yen', 'japan', 'intervention', 'fed', 'dollar'],
  'USD/CHF': ['snb', 'switzerland', 'franc', 'safe haven', 'fed', 'dollar'],
  'AUD/USD': ['rba', 'australia', 'china', 'commodity', 'fed', 'dollar'],
  'USD/CAD': ['boc', 'canada', 'oil', 'crude', 'fed', 'dollar'],
  'NZD/USD': ['rbnz', 'new zealand', 'dairy', 'fed', 'dollar'],
  'EUR/GBP': ['ecb', 'euro', 'boe', 'pound', 'uk', 'europe'],
  'EUR/JPY': ['ecb', 'euro', 'boj', 'yen', 'japan', 'risk'],
  'EUR/CHF': ['ecb', 'euro', 'snb', 'switzerland', 'franc'],
  'EUR/AUD': ['ecb', 'euro', 'rba', 'australia', 'commodity'],
  'EUR/CAD': ['ecb', 'euro', 'boc', 'canada', 'oil'],
  'EUR/NZD': ['ecb', 'euro', 'rbnz', 'new zealand', 'dairy'],
  'GBP/JPY': ['boe', 'pound', 'uk', 'boj', 'yen', 'japan', 'risk'],
  'GBP/CHF': ['boe', 'pound', 'snb', 'switzerland', 'franc'],
  'GBP/AUD': ['boe', 'pound', 'uk', 'rba', 'australia', 'commodity'],
  'GBP/CAD': ['boe', 'pound', 'uk', 'boc', 'canada', 'oil'],
  'GBP/NZD': ['boe', 'pound', 'uk', 'rbnz', 'new zealand'],
  'AUD/JPY': ['rba', 'australia', 'boj', 'yen', 'japan', 'risk', 'china'],
  'AUD/CHF': ['rba', 'australia', 'snb', 'switzerland', 'franc', 'risk'],
  'AUD/CAD': ['rba', 'australia', 'boc', 'canada', 'oil', 'commodity'],
  'AUD/NZD': ['rba', 'australia', 'rbnz', 'new zealand', 'commodity'],
  'NZD/JPY': ['rbnz', 'new zealand', 'boj', 'yen', 'japan', 'risk'],
  'NZD/CHF': ['rbnz', 'new zealand', 'snb', 'switzerland', 'franc'],
  'NZD/CAD': ['rbnz', 'new zealand', 'boc', 'canada', 'oil'],
  'CAD/JPY': ['boc', 'canada', 'oil', 'boj', 'yen', 'japan', 'risk'],
  'CAD/CHF': ['boc', 'canada', 'oil', 'snb', 'switzerland', 'franc'],
  'CHF/JPY': ['snb', 'switzerland', 'franc', 'boj', 'yen', 'japan', 'safe haven'],
  'XAU/USD': ['gold', 'safe haven', 'inflation', 'fed', 'dollar', 'war', 'geopolitical'],
  'XAG/USD': ['silver', 'gold', 'industrial', 'solar', 'inflation', 'fed'],
  'XPT/USD': ['platinum', 'auto', 'electric vehicle', 'south africa'],
  'WTI Oil': ['oil', 'crude', 'opec', 'wti', 'energy', 'iran', 'saudi', 'russia'],
  'Brent':   ['oil', 'crude', 'opec', 'brent', 'energy', 'iran', 'saudi', 'russia'],
  'Nat Gas': ['natural gas', 'gas', 'energy', 'russia', 'lng', 'winter'],
  'Copper':  ['copper', 'china', 'manufacturing', 'industrial', 'demand'],
  'BTC/USD': ['bitcoin', 'btc', 'crypto', 'etf', 'halving', 'regulation', 'sec'],
  'ETH/USD': ['ethereum', 'eth', 'defi', 'staking', 'crypto', 'sec'],
  'BNB/USD': ['bnb', 'binance', 'crypto', 'exchange'],
  'SOL/USD': ['solana', 'sol', 'crypto', 'defi'],
  'XRP/USD': ['xrp', 'ripple', 'sec', 'crypto'],
  'DOGE/USD': ['dogecoin', 'doge', 'elon', 'musk', 'crypto'],
  'ADA/USD': ['cardano', 'ada', 'crypto'],
  'AVAX/USD': ['avalanche', 'avax', 'crypto', 'defi'],
  'LINK/USD': ['chainlink', 'link', 'oracle', 'crypto'],
  'DOT/USD':  ['polkadot', 'dot', 'parachain', 'crypto'],
  'MATIC/USD': ['polygon', 'matic', 'layer2', 'ethereum', 'crypto'],
  'UNI/USD':  ['uniswap', 'uni', 'defi', 'dex', 'crypto']
}

export function getRecencyWeight(publishedAt) {
  var now = Date.now()
  var age = (now - new Date(publishedAt).getTime()) / (1000 * 60)
  if (age < 30) return 1.0
  if (age < 120) return 0.75
  if (age < 360) return 0.5
  if (age < 1440) return 0.25
  if (age < 4320) return 0.1
  return 0
}

export function getRelevanceScore(text) {
  var lower = text.toLowerCase()
  var score = 0
  var i = 0
  for (i = 0; i < RELEVANCE_KEYWORDS.critical.length; i++) {
    if (lower.indexOf(RELEVANCE_KEYWORDS.critical[i]) !== -1) score += 3
  }
  for (i = 0; i < RELEVANCE_KEYWORDS.high.length; i++) {
    if (lower.indexOf(RELEVANCE_KEYWORDS.high[i]) !== -1) score += 2
  }
  for (i = 0; i < RELEVANCE_KEYWORDS.medium.length; i++) {
    if (lower.indexOf(RELEVANCE_KEYWORDS.medium[i]) !== -1) score += 1
  }
  return score
}

export function getAffectedAssets(text) {
  var lower = text.toLowerCase()
  var affected = []
  var assets = Object.keys(ASSET_IMPACT_MAP)
  var i, j, asset, keywords
  for (i = 0; i < assets.length; i++) {
    asset = assets[i]
    keywords = ASSET_IMPACT_MAP[asset]
    for (j = 0; j < keywords.length; j++) {
      if (lower.indexOf(keywords[j]) !== -1) {
        if (affected.indexOf(asset) === -1) affected.push(asset)
        break
      }
    }
  }
  return affected
}

export async function fetchAllNews() {
  try {
    var response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'fetch_news' })
    })

    if (!response.ok) return []

    var data = await response.json()
    var articles = data.articles || []

    var enriched = []
    for (var i = 0; i < articles.length; i++) {
      var a = articles[i]
      var text = a.title + ' ' + (a.description || '')
      var rel = getRelevanceScore(text)
      var rec = getRecencyWeight(a.publishedAt)
      if (rel >= 2 && rec > 0) {
        enriched.push({
          id: Math.random().toString(36).slice(2),
          title: a.title,
          description: a.description || '',
          link: a.link,
          publishedAt: a.publishedAt,
          source: a.source,
          trustScore: a.trustScore || 65,
          relevanceScore: rel,
          recencyWeight: rec,
          affectedAssets: getAffectedAssets(text),
          combinedScore: rel * rec * ((a.trustScore || 65) / 100)
        })
      }
    }

    enriched.sort(function(a, b) { return b.combinedScore - a.combinedScore })
    return enriched.slice(0, 50)
  } catch(e) {
    console.error('fetchAllNews error:', e)
    return []
  }
}

var cache = { news: null, timestamp: 0, scored: {} }

export function getCachedNews() { return cache.news }
export function getCacheAge() { return Date.now() - cache.timestamp }
export function setCachedNews(news) { cache.news = news; cache.timestamp = Date.now() }
export function getCachedScore(assetKey) { return cache.scored[assetKey] || null }
export function setCachedScore(assetKey, score) { cache.scored[assetKey] = score }
export function clearScoreCache() { cache.scored = {} }
