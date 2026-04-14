const CORS_PROXY = 'https://api.allorigins.win/get?url='

export const SOURCE_TRUST = {
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

export const RELEVANCE_KEYWORDS = {
  critical: [
    'fed', 'federal reserve', 'fomc', 'powell', 'interest rate', 'rate hike', 'rate cut',
    'cpi', 'inflation', 'ppi', 'nfp', 'non-farm', 'payroll', 'gdp', 'unemployment',
    'ecb', 'lagarde', 'boe', 'bank of england', 'boj', 'bank of japan', 'rba', 'rbnz',
    'tariff', 'sanction', 'trade war', 'embargo',
    'opec', 'oil production', 'oil supply',
    'war', 'strike', 'invasion', 'ceasefire', 'nuclear', 'missile',
    'trump', 'biden', 'potus', 'white house', 'treasury', 'bessent',
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
    'opec', 'crude', 'brent', 'wti',
    'inflation expectations', 'yield', 'bonds', 'treasury'
  ],
  medium: [
    'economic', 'market', 'stocks', 'equities', 'forex', 'currency',
    'central bank', 'monetary policy', 'fiscal', 'stimulus',
    'supply chain', 'energy', 'commodity'
  ]
}

export const ASSET_IMPACT_MAP = {
  'EUR/USD': ['ecb', 'lagarde', 'euro', 'eurozone', 'europe', 'fed', 'dollar', 'cpi', 'inflation', 'usd'],
  'GBP/USD': ['boe', 'bank of england', 'bailey', 'pound', 'uk', 'britain', 'fed', 'dollar', 'usd'],
  'USD/JPY': ['boj', 'bank of japan', 'ueda', 'yen', 'japan', 'intervention', 'fed', 'dollar'],
  'AUD/USD': ['rba', 'australia', 'aud', 'china', 'iron ore', 'commodity', 'fed', 'dollar'],
  'USD/CAD': ['boc', 'canada', 'cad', 'oil', 'crude', 'loonie', 'fed', 'dollar'],
  'NZD/USD': ['rbnz', 'new zealand', 'nzd', 'dairy', 'fed', 'dollar'],
  'USD/CHF': ['snb', 'switzerland', 'chf', 'franc', 'safe haven', 'fed', 'dollar'],
  'XAU/USD': ['gold', 'safe haven', 'inflation', 'fed', 'dollar', 'war', 'geopolitical', 'risk', 'uncertainty'],
  'XAG/USD': ['silver', 'gold', 'industrial', 'solar', 'inflation', 'fed'],
  'WTI Oil': ['oil', 'crude', 'opec', 'wti', 'brent', 'energy', 'iran', 'saudi', 'russia', 'supply'],
  'Brent':   ['oil', 'crude', 'opec', 'brent', 'wti', 'energy', 'iran', 'saudi', 'russia', 'supply'],
  'XPT/USD': ['platinum', 'palladium', 'auto', 'ev', 'electric vehicle', 'south africa'],
  'BTC/USD': ['bitcoin', 'btc', 'crypto', 'etf', 'halving', 'regulation', 'sec', 'coinbase', 'risk'],
  'ETH/USD': ['ethereum', 'eth', 'defi', 'staking', 'layer2', 'l2', 'crypto', 'sec'],
  'SOL/USD': ['solana', 'sol', 'crypto', 'defi', 'nft', 'bitcoin'],
  'XRP/USD': ['xrp', 'ripple', 'sec', 'crypto', 'cross-border', 'swift'],
  'ADA/USD': ['cardano', 'ada', 'crypto', 'defi', 'bitcoin']
}

export const RSS_SOURCES = [
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
  { url: 'https://news.google.com/rss/search?q=bitcoin+crypto+ETF&hl=en-US&gl=US&ceid=US:en', name: 'Google News Crypto', trust: 75 },
]

export function getRecencyWeight(publishedAt) {
  const now = Date.now()
  const age = (now - new Date(publishedAt).getTime()) / (1000 * 60)
  if (age < 30) return 1.0
  if (age < 120) return 0.75
  if (age < 360) return 0.5
  if (age < 1440) return 0.25
  if (age < 4320) return 0.1
  return 0
}

export function getRelevanceScore(text) {
  const lower = text.toLowerCase()
  let score = 0
  for (const kw of RELEVANCE_KEYWORDS.critical) {
    if (lower.includes(kw)) score += 3
  }
  for (const kw of RELEVANCE_KEYWORDS.high) {
    if (lower.includes(kw)) score += 2
  }
  for (const kw of RELEVANCE_KEYWORDS.medium) {
    if (lower.includes(kw)) score += 1
  }
  return score
}

export function getAffectedAssets(text) {
  const lower = text.toLowerCase()
  const affected = []
  for (const [asset, keywords] of Object.entries(ASSET_IMPACT_MAP)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        if (!affected.includes(asset)) affected.push(asset)
        break
      }
    }
  }
  return affected
}

function parseRSS(xmlText, sourceName, trustScore) {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlText, 'text/xml')
    const items = doc.querySelectorAll('item')
    const articles = []
    items.forEach(item => {
      const title = item.querySelector('title')?.textContent?.trim() || ''
      const desc = item.querySelector('description')?.textContent?.tr
