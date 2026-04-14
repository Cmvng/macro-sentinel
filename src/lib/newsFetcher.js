var CORS_PROXY = 'https://api.allorigins.win/get?url='

export var SOURCE_TRUST = {
  'reuters.com': 95,
  'apnews.com': 95,
  'federalreserve.gov': 100,
  'bls.gov': 100,
  'ft.com': 85,
  'bloomberg.com': 85,
  'wsj.com': 85,
  'bbc.com': 75,
  'aljazeera.com': 75,
  'cnbc.com': 75,
  'marketwatch.com': 70,
  'forexlive.com': 80,
  'fxstreet.com': 78,
  'kitco.com': 78,
  'coindesk.com': 75,
  'cointelegraph.com': 72,
  'truthsocial.com': 90,
  'reddit.com': 40,
  'default': 55
}

export var RELEVANCE_KEYWORDS = {
  critical: [
    'fed', 'federal reserve', 'fomc', 'powell', 'interest rate', 'rate hike', 'rate cut',
    'cpi', 'inflation', 'ppi', 'nfp', 'non-farm', 'payroll', 'gdp', 'unemployment',
    'ecb', 'lagarde', 'boe', 'bank of england', 'boj', 'bank of japan', 'rba', 'rbnz',
    'tariff', 'sanction', 'trade war', 'embargo',
    'opec', 'oil production', 'oil supply',
    'war', 'strike', 'invasion', 'ceasefire', 'nuclear', 'missile',
    'trump', 'potus', 'white house', 'treasury', 'bessent',
    'bitcoin', 'crypto', 'etf', 'halving',
    'gold', 'silver', 'xau', 'xag',
    'usd', 'dollar', 'euro', 'yen', 'pound', 'currency'
  ],
  high: [
    'recession', 'slowdown', 'growth', 'pmi', 'manufacturing', 'services',
    'debt ceiling', 'budget', 'deficit', 'surplus',
    'election', 'coup', 'protest', 'geopolitical',
    'elon musk', 'sec', 'regulation', 'ban',
    'iran', 'russia', 'china', 'ukraine', 'israel', 'saudi',
    'crude', 'brent', 'wti',
    'yield', 'bonds'
  ],
  medium: [
    'economic', 'market', 'stocks', 'equities', 'forex', 'currency',
    'central bank', 'monetary policy', 'fiscal', 'stimulus',
    'supply chain', 'energy', 'commodity'
  ]
}

var CORS_PROXY = 'https://api.allorigins.win/get?url='

export var SOURCE_TRUST = {
  'reuters.com': 95,
  'apnews.com': 95,
  'federalreserve.gov': 100,
  'bls.gov': 100,
  'ft.com': 85,
  'bloomberg.com': 85,
  'wsj.com': 85,
  'bbc.com': 75,
  'aljazeera.com': 75,
  'cnbc.com': 75,
  'marketwatch.com': 70,
  'forexlive.com': 80,
  'fxstreet.com': 78,
  'kitco.com': 78,
  'coindesk.com': 75,
  'cointelegraph.com': 72,
  'truthsocial.com': 90,
  'reddit.com': 40,
  'default': 55
}

export var RELEVANCE_KEYWORDS = {
  critical: [
    'fed', 'federal reserve', 'fomc', 'powell', 'interest rate', 'rate hike', 'rate cut',
    'cpi', 'inflation', 'ppi', 'nfp', 'non-farm', 'payroll', 'gdp', 'unemployment',
    'ecb', 'lagarde', 'boe', 'bank of england', 'boj', 'bank of japan', 'rba', 'rbnz',
    'tariff', 'sanction', 'trade war', 'embargo',
    'opec', 'oil production', 'oil supply',
    'war', 'strike', 'invasion', 'ceasefire', 'nuclear', 'missile',
    'trump', 'potus', 'white house', 'treasury', 'bessent',
    'bitcoin', 'ethereum', 'crypto', 'etf', 'halving',
    'gold', 'silver', 'xau', 'xag',
    'usd', 'dollar', 'euro', 'yen', 'pound', 'currency',
    'naira', 'ngn', 'nigeria', 'cbn'
  ],
  high: [
    'recession', 'slowdown', 'growth', 'pmi', 'manufacturing', 'services',
    'debt ceiling', 'budget', 'deficit', 'surplus',
    'election', 'coup', 'protest', 'geopolitical',
    'elon musk', 'sec', 'regulation', 'ban', 'doge', 'dogecoin',
    'iran', 'russia', 'china', 'ukraine', 'israel', 'saudi',
    'crude', 'brent', 'wti', 'natural gas', 'copper',
    'yield', 'bonds', 'bnb', 'solana', 'cardano', 'ripple', 'xrp',
    'avalanche', 'polygon', 'chainlink', 'polkadot', 'uniswap'
  ],
  medium: [
    'economic', 'market', 'stocks', 'equities', 'forex', 'currency',
    'central bank', 'monetary policy', 'fiscal', 'stimulus',
    'supply chain', 'energy', 'commodity', 'defi', 'blockchain', 'web3'
  ]
}

export var ASSET_IMPACT_MAP = {
  'EUR/USD': ['ecb', 'lagarde', 'euro', 'eurozone', 'europe', 'fed', 'dollar', 'cpi', 'usd'],
  'GBP/USD': ['boe', 'bank of england', 'pound', 'uk', 'britain', 'fed', 'dollar'],
  'USD/JPY': ['boj', 'bank of japan', 'yen', 'japan', 'intervention', 'fed', 'dollar'],
  'USD/CHF': ['snb', 'switzerland', 'franc', 'safe haven', 'fed', 'dollar'],
  'AUD/USD': ['rba', 'australia', 'china', 'commodity', 'fed', 'dollar'],
  'USD/CAD': ['boc', 'canada', 'oil', 'crude', 'fed', 'dollar'],
  'NZD/USD': ['rbnz', 'new zealand', 'dairy', 'fed', 'dollar'],
  'EUR/GBP': ['ecb', 'lagarde', 'euro', 'boe', 'pound', 'uk', 'europe'],
  'EUR/JPY': ['ecb', 'euro', 'boj', 'yen', 'japan', 'risk'],
  'EUR/CHF': ['ecb', 'euro', 'snb', 'switzerland', 'franc'],
  'EUR/AUD': ['ecb', 'euro', 'rba', 'australia', 'commodity'],
  'EUR/CAD': ['ecb', 'euro', 'boc', 'canada', 'oil'],
  'GBP/JPY': ['boe', 'pound', 'uk', 'boj', 'yen', 'japan', 'risk'],
  'GBP/CHF': ['boe', 'pound', 'snb', 'switzerland', 'franc'],
  'AUD/JPY': ['rba', 'australia', 'boj', 'yen', 'japan', 'risk', 'china'],
  'USD/SGD': ['singapore', 'sgd', 'mas', 'fed', 'dollar', 'asia'],
  'USD/ZAR': ['south africa', 'rand', 'zar', 'fed', 'dollar', 'emerging'],
  'USD/NGN': ['nigeria', 'naira', 'ngn', 'cbn', 'fed', 'dollar', 'oil'],
  'XAU/USD': ['gold', 'safe haven', 'inflation', 'fed', 'dollar', 'war', 'geopolitical'],
  'XAG/USD': ['silver', 'gold', 'industrial', 'solar', 'inflation', 'fed'],
  'XPT/USD': ['platinum', 'auto', 'electric vehicle', 'south africa'],
  'XPD/USD': ['palladium', 'auto', 'russia', 'south africa'],
  'WTI Oil': ['oil', 'crude', 'opec', 'wti', 'energy', 'iran', 'saudi', 'russia'],
  'Brent': ['oil', 'crude', 'opec', 'brent', 'energy', 'iran', 'saudi', 'russia'],
  'Nat Gas': ['natural gas', 'gas', 'energy', 'russia', 'lng', 'winter'],
  'Copper': ['copper', 'china', 'manufacturing', 'industrial', 'demand'],
  'BTC/USD': ['bitcoin', 'btc', 'crypto', 'etf', 'halving', 'regulation', 'sec'],
  'ETH/USD': ['ethereum', 'eth', 'defi', 'staking', 'crypto', 'sec'],
  'BNB/USD': ['bnb', 'binance', 'crypto', 'exchange'],
  'SOL/USD': ['solana', 'sol', 'crypto', 'defi'],
  'XRP/USD': ['xrp', 'ripple', 'sec', 'crypto'],
  'ADA/USD': ['cardano', 'ada', 'crypto'],
  'DOGE/USD': ['dogecoin', 'doge', 'elon', 'musk', 'crypto'],
  'AVAX/USD': ['avalanche', 'avax', 'crypto', 'defi'],
  'LINK/USD': ['chainlink', 'link', 'oracle', 'crypto'],
  'DOT/USD': ['polkadot', 'dot', 'parachain', 'crypto'],
  'MATIC/USD': ['polygon', 'matic', 'layer2', 'ethereum', 'crypto'],
  'UNI/USD': ['uniswap', 'uni', 'defi', 'dex', 'crypto']
}

export var RSS_SOURCES = [
  { url: 'https://feeds.reuters.com/reuters/businessNews', name: 'Reuters Business', trust: 95 },
  { url: 'https://feeds.reuters.com/reuters/topNews', name: 'Reuters Top News', trust: 95 },
  { url: 'https://feeds.marketwatch.com/marketwatch/topstories/', name: 'MarketWatch', trust: 70 },
  { url: 'https://www.forexlive.com/feed/news', name: 'ForexLive', trust: 80 },
  { url: 'https://www.fxstreet.com/rss/news', name: 'FXStreet', trust: 78 },
  { url: 'https://www.kitco.com/rss/kitco-news.rss', name: 'Kitco', trust: 78 },
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', name: 'CoinDesk', trust: 75 },
  { url: 'https://cointelegraph.com/rss', name: 'CoinTelegraph', trust: 72 },
  { url: 'https://news.google.com/rss/search?q=federal+reserve+interest+rates&hl=en-US&gl=US&ceid=US:en', name: 'Google News Fed', trust: 80 },
  { url: 'https://news.google.com/rss/search?q=geopolitical+war+sanctions+market&hl=en-US&gl=US&ceid=US:en', name: 'Google News Geo', trust: 75 },
  { url: 'https://news.google.com/rss/search?q=Trump+tariff+dollar+economy&hl=en-US&gl=US&ceid=US:en', name: 'Google News Trump', trust: 85 },
  { url: 'https://news.google.com/rss/search?q=OPEC+oil+crude+production&hl=en-US&gl=US&ceid=US:en', name: 'Google News Oil', trust: 78 },
  { url: 'https://news.google.com/rss/search?q=bitcoin+ethereum+crypto+market&hl=en-US&gl=US&ceid=US:en', name: 'Google News Crypto', trust: 75 },
  { url: 'https://news.google.com/rss/search?q=gold+silver+commodities+market&hl=en-US&gl=US&ceid=US:en', name: 'Google News Metals', trust: 75 },
  { url: 'https://news.google.com/rss/search?q=Nigeria+naira+CBN+economy&hl=en-US&gl=US&ceid=US:en', name: 'Google News Nigeria', trust: 72 }
]

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

function parseRSS(xmlText, sourceName, trustScore) {
  try {
    var parser = new DOMParser()
    var doc = parser.parseFromString(xmlText, 'text/xml')
    var items = doc.querySelectorAll('item')
    var articles = []
    var i, item, title, desc, link, pubDate
    for (i = 0; i < items.length; i++) {
      item = items[i]
      title = item.querySelector('title') ? item.querySelector('title').textContent.trim() : ''
      desc = item.querySelector('description') ? item.querySelector('description').textContent.trim() : ''
      link = item.querySelector('link') ? item.querySelector('link').textContent.trim() : ''
      pubDate = item.querySelector('pubDate') ? item.querySelector('pubDate').textContent.trim() : new Date().toISOString()
      if (title) {
        articles.push({
          id: btoa(encodeURIComponent(title.slice(0, 30))).replace(/[^a-zA-Z0-9]/g, ''),
          title: title,
          description: desc.replace(/<[^>]*>/g, '').slice(0, 200),
          link: link,
          publishedAt: pubDate,
          source: sourceName,
          trustScore: trustScore
        })
      }
    }
    return articles
  } catch(err) {
    return []
  }
}

async function fetchFeed(source) {
  try {
    var proxyUrl = CORS_PROXY + encodeURIComponent(source.url)
    var res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []
    var data = await res.json()
    return parseRSS(data.contents, source.name, source.trust)
  } catch(err) {
    return []
  }
}

export async function fetchAllNews() {
  var results = await Promise.allSettled(RSS_SOURCES.map(function(s) { return fetchFeed(s) }))
  var allArticles = []
  var i
  for (i = 0; i < results.length; i++) {
    if (results[i].status === 'fulfilled') {
      allArticles = allArticles.concat(results[i].value)
    }
  }

  var seen = {}
  var unique = []
  for (i = 0; i < allArticles.length; i++) {
    var key = allArticles[i].title.toLowerCase().slice(0, 50)
    if (!seen[key]) {
      seen[key] = true
      unique.push(allArticles[i])
    }
  }

  var relevant = []
  for (i = 0; i < unique.length; i++) {
    var text = unique[i].title + ' ' + unique[i].description
    if (getRelevanceScore(text) >= 2) relevant.push(unique[i])
  }

  var recent = []
  for (i = 0; i < relevant.length; i++) {
    if (getRecencyWeight(relevant[i].publishedAt) > 0) recent.push(relevant[i])
  }

  var enriched = []
  for (i = 0; i < recent.length; i++) {
    var t = recent[i].title + ' ' + recent[i].description
    var rel = getRelevanceScore(t)
    var rec = getRecencyWeight(recent[i].publishedAt)
    enriched.push({
      id: recent[i].id,
      title: recent[i].title,
      description: recent[i].description,
      link: recent[i].link,
      publishedAt: recent[i].publishedAt,
      source: recent[i].source,
      trustScore: recent[i].trustScore,
      relevanceScore: rel,
      recencyWeight: rec,
      affectedAssets: getAffectedAssets(t),
      combinedScore: rel * rec * (recent[i].trustScore / 100)
    })
  }

  enriched.sort(function(a, b) { return b.combinedScore - a.combinedScore })
  return enriched.slice(0, 50)
}

var cache = { news: null, timestamp: 0, scored: {} }

export function getCachedNews() { return cache.news }
export function getCacheAge() { return Date.now() - cache.timestamp }
export function setCachedNews(news) { cache.news = news; cache.timestamp = Date.now() }
export function getCachedScore(assetKey) { return cache.scored[assetKey] || null }
export function setCachedScore(assetKey, score) { cache.scored[assetKey] = score }
export function clearScoreCache() { cache.scored = {} }

export var RSS_SOURCES = [
  { url: 'https://feeds.reuters.com/reuters/businessNews', name: 'Reuters Business', trust: 95 },
  { url: 'https://feeds.reuters.com/reuters/topNews', name: 'Reuters Top News', trust: 95 },
  { url: 'https://feeds.marketwatch.com/marketwatch/topstories/', name: 'MarketWatch', trust: 70 },
  { url: 'https://www.forexlive.com/feed/news', name: 'ForexLive', trust: 80 },
  { url: 'https://www.fxstreet.com/rss/news', name: 'FXStreet', trust: 78 },
  { url: 'https://www.kitco.com/rss/kitco-news.rss', name: 'Kitco', trust: 78 },
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', name: 'CoinDesk', trust: 75 },
  { url: 'https://cointelegraph.com/rss', name: 'CoinTelegraph', trust: 72 },
  { url: 'https://news.google.com/rss/search?q=federal+reserve+interest+rates&hl=en-US&gl=US&ceid=US:en', name: 'Google News Fed', trust: 80 },
  { url: 'https://news.google.com/rss/search?q=geopolitical+war+sanctions+market&hl=en-US&gl=US&ceid=US:en', name: 'Google News Geo', trust: 75 },
  { url: 'https://news.google.com/rss/search?q=Trump+economy+tariff+dollar&hl=en-US&gl=US&ceid=US:en', name: 'Google News Trump', trust: 85 },
  { url: 'https://news.google.com/rss/search?q=OPEC+oil+crude+production&hl=en-US&gl=US&ceid=US:en', name: 'Google News Oil', trust: 78 },
  { url: 'https://news.google.com/rss/search?q=bitcoin+crypto+ETF&hl=en-US&gl=US&ceid=US:en', name: 'Google News Crypto', trust: 75 }
]

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

function parseRSS(xmlText, sourceName, trustScore) {
  try {
    var parser = new DOMParser()
    var doc = parser.parseFromString(xmlText, 'text/xml')
    var items = doc.querySelectorAll('item')
    var articles = []
    var i, item, title, desc, link, pubDate
    for (i = 0; i < items.length; i++) {
      item = items[i]
      title = item.querySelector('title') ? item.querySelector('title').textContent.trim() : ''
      desc = item.querySelector('description') ? item.querySelector('description').textContent.trim() : ''
      link = item.querySelector('link') ? item.querySelector('link').textContent.trim() : ''
      pubDate = item.querySelector('pubDate') ? item.querySelector('pubDate').textContent.trim() : new Date().toISOString()
      if (title) {
        articles.push({
          id: btoa(encodeURIComponent(title.slice(0, 30))).replace(/[^a-zA-Z0-9]/g, ''),
          title: title,
          description: desc.replace(/<[^>]*>/g, '').slice(0, 200),
          link: link,
          publishedAt: pubDate,
          source: sourceName,
          trustScore: trustScore
        })
      }
    }
    return articles
  } catch(err) {
    return []
  }
}

async function fetchFeed(source) {
  try {
    var proxyUrl = CORS_PROXY + encodeURIComponent(source.url)
    var res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []
    var data = await res.json()
    return parseRSS(data.contents, source.name, source.trust)
  } catch(err) {
    return []
  }
}

export async function fetchAllNews() {
  var results = await Promise.allSettled(RSS_SOURCES.map(function(s) { return fetchFeed(s) }))
  var allArticles = []
  var i
  for (i = 0; i < results.length; i++) {
    if (results[i].status === 'fulfilled') {
      allArticles = allArticles.concat(results[i].value)
    }
  }

  var seen = {}
  var unique = []
  for (i = 0; i < allArticles.length; i++) {
    var key = allArticles[i].title.toLowerCase().slice(0, 50)
    if (!seen[key]) {
      seen[key] = true
      unique.push(allArticles[i])
    }
  }

  var relevant = []
  for (i = 0; i < unique.length; i++) {
    var text = unique[i].title + ' ' + unique[i].description
    if (getRelevanceScore(text) >= 2) relevant.push(unique[i])
  }

  var recent = []
  for (i = 0; i < relevant.length; i++) {
    if (getRecencyWeight(relevant[i].publishedAt) > 0) recent.push(relevant[i])
  }

  var enriched = []
  for (i = 0; i < recent.length; i++) {
    var t = recent[i].title + ' ' + recent[i].description
    var rel = getRelevanceScore(t)
    var rec = getRecencyWeight(recent[i].publishedAt)
    enriched.push({
      id: recent[i].id,
      title: recent[i].title,
      description: recent[i].description,
      link: recent[i].link,
      publishedAt: recent[i].publishedAt,
      source: recent[i].source,
      trustScore: recent[i].trustScore,
      relevanceScore: rel,
      recencyWeight: rec,
      affectedAssets: getAffectedAssets(t),
      combinedScore: rel * rec * (recent[i].trustScore / 100)
    })
  }

  enriched.sort(function(a, b) { return b.combinedScore - a.combinedScore })
  return enriched.slice(0, 40)
}

var cache = { news: null, timestamp: 0, scored: {} }

export function getCachedNews() { return cache.news }
export function getCacheAge() { return Date.now() - cache.timestamp }
export function setCachedNews(news) { cache.news = news; cache.timestamp = Date.now() }
export function getCachedScore(assetKey) { return cache.scored[assetKey] || null }
export function setCachedScore(assetKey, score) { cache.scored[assetKey] = score }
export function clearScoreCache() { cache.scored = {} }
