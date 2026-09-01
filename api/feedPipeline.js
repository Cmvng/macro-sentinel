import { keywordsForAll } from './assetKeywords.js'
export var SOURCE_REGISTRY = [
  { id: 'reuters-business', name: 'Reuters Business', domain: 'reuters.com', url: 'https://feeds.reuters.com/reuters/businessNews', tier: 1, weight: 1, specialization: 'global-macro' },
  { id: 'reuters-top', name: 'Reuters Top News', domain: 'reuters.com', url: 'https://feeds.reuters.com/reuters/topNews', tier: 1, weight: 1, specialization: 'global-macro' },
  { id: 'forexlive', name: 'ForexLive', domain: 'forexlive.com', url: 'https://www.forexlive.com/feed/news', tier: 2, weight: 0.85, specialization: 'fx' },
  { id: 'fxstreet', name: 'FXStreet', domain: 'fxstreet.com', url: 'https://www.fxstreet.com/rss/news', tier: 2, weight: 0.8, specialization: 'fx' },
  { id: 'kitco', name: 'Kitco', domain: 'kitco.com', url: 'https://www.kitco.com/rss/kitco-news.rss', tier: 2, weight: 0.8, specialization: 'metals' },
  { id: 'coindesk', name: 'CoinDesk', domain: 'coindesk.com', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', tier: 2, weight: 0.78, specialization: 'crypto' },
  { id: 'cointelegraph', name: 'Cointelegraph', domain: 'cointelegraph.com', url: 'https://cointelegraph.com/rss', tier: 3, weight: 0.68, specialization: 'crypto' },
  { id: 'marketwatch', name: 'MarketWatch', domain: 'marketwatch.com', url: 'https://feeds.marketwatch.com/marketwatch/topstories/', tier: 3, weight: 0.65, specialization: 'global-macro' },
  { id: 'google-fed', name: 'Google News: Fed', domain: 'news.google.com', url: 'https://news.google.com/rss/search?q=federal+reserve+interest+rates&hl=en-US&gl=US&ceid=US:en', tier: 3, weight: 0.58, specialization: 'policy' },
  { id: 'google-geopolitics', name: 'Google News: Geopolitics', domain: 'news.google.com', url: 'https://news.google.com/rss/search?q=geopolitical+war+sanctions+market&hl=en-US&gl=US&ceid=US:en', tier: 3, weight: 0.58, specialization: 'geopolitics' },
  { id: 'google-energy', name: 'Google News: Energy', domain: 'news.google.com', url: 'https://news.google.com/rss/search?q=OPEC+oil+crude+production&hl=en-US&gl=US&ceid=US:en', tier: 3, weight: 0.58, specialization: 'energy' },
  { id: 'google-crypto', name: 'Google News: Crypto', domain: 'news.google.com', url: 'https://news.google.com/rss/search?q=bitcoin+ethereum+crypto+market&hl=en-US&gl=US&ceid=US:en', tier: 3, weight: 0.58, specialization: 'crypto' },
  { id: 'google-metals', name: 'Google News: Metals', domain: 'news.google.com', url: 'https://news.google.com/rss/search?q=gold+silver+commodities+market&hl=en-US&gl=US&ceid=US:en', tier: 3, weight: 0.58, specialization: 'metals' },
  { id: 'google-central-banks', name: 'Google News: Central Banks', domain: 'news.google.com', url: 'https://news.google.com/rss/search?q=ECB+BOJ+RBA+RBNZ+central+bank&hl=en-US&gl=US&ceid=US:en', tier: 3, weight: 0.58, specialization: 'policy' }
]

var ENTITY_MAP = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" }

export async function collectNews(now) {
  var settled = await Promise.all(SOURCE_REGISTRY.map(function(source) { return fetchSource(source, now) }))
  var health = settled.map(function(result) { return result.health })
  var articles = settled.reduce(function(all, result) { return all.concat(result.articles) }, [])
  var clusters = clusterArticles(articles)
  return {
    articles: clusters.articles,
    events: clusters.events,
    health: health,
    healthy_source_count: health.filter(function(item) { return item.status === 'healthy' }).length,
    source_count: health.length
  }
}

async function fetchSource(source, now) {
  var began = Date.now()
  var controller = new AbortController()
  var timeout = setTimeout(function() { controller.abort() }, 7000)
  try {
    var response = await fetch(source.url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MacroSentinel/1.1)' }
    })
    if (!response.ok) throw new Error('HTTP ' + response.status)
    var articles = parseFeed(await response.text(), source)
    return {
      articles: articles,
      health: { id: source.id, name: source.name, tier: source.tier, status: 'healthy', article_count: articles.length, latency_ms: Date.now() - began, checked_at: new Date(now).toISOString() }
    }
  } catch (error) {
    return {
      articles: [],
      health: { id: source.id, name: source.name, tier: source.tier, status: 'failed', article_count: 0, latency_ms: Date.now() - began, error: String(error && error.message || 'Fetch failed').slice(0, 120), checked_at: new Date(now).toISOString() }
    }
  } finally {
    clearTimeout(timeout)
  }
}

export function parseFeed(xml, source) {
  var blocks = collectBlocks(xml, 'item').concat(collectBlocks(xml, 'entry'))
  var articles = []
  for (var i = 0; i < blocks.length; i++) {
    var article = parseBlock(blocks[i], source)
    if (article) articles.push(article)
  }
  return articles.slice(0, 30)
}

function collectBlocks(xml, tag) {
  var expression = new RegExp('<(?:[\\w.-]+:)?' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?' + tag + '>', 'gi')
  var blocks = []
  var match
  while ((match = expression.exec(xml)) !== null) blocks.push(match[1])
  return blocks
}

function parseBlock(block, source) {
  var title = cleanText(findTag(block, ['title']))
  if (!title || title.length < 6) return null
  var date = findTag(block, ['pubDate', 'date', 'updated', 'published'])
  var dateValue = new Date(cleanText(date)).getTime()
  if (!Number.isFinite(dateValue)) return null
  var link = findLink(block)
  var description = cleanText(findTag(block, ['description', 'summary', 'content']))
  return {
    id: source.id + ':' + normaliseTitle(title).slice(0, 80) + ':' + dateValue,
    title: title,
    link: link,
    description: description.slice(0, 800),
    publishedAt: new Date(dateValue).toISOString(),
    source: source.name,
    source_id: source.id,
    source_tier: source.tier,
    source_weight: source.weight,
    trustScore: Math.round(source.weight * 100),
    event_id: null,
    independent_source_count: 1
  }
}

function findTag(block, names) {
  for (var i = 0; i < names.length; i++) {
    var name = names[i].replace(':', '\\:')
    var expression = new RegExp('<(?:[\\w.-]+:)?' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?' + name + '>', 'i')
    var match = block.match(expression)
    if (match) return match[1]
  }
  return ''
}

function findLink(block) {
  var href = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i)
  if (href) return decodeXml(href[1])
  return cleanText(findTag(block, ['link']))
}

function cleanText(value) {
  return decodeXml(String(value || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim())
}

function decodeXml(value) {
  return value.replace(/&(#x[0-9a-f]+|#\\d+|amp|lt|gt|quot|apos|#39);/gi, function(entity, key) {
    var normalized = key.toLowerCase()
    if (ENTITY_MAP[normalized]) return ENTITY_MAP[normalized]
    var code = normalized.indexOf('#x') === 0 ? parseInt(normalized.slice(2), 16) : parseInt(normalized.slice(1), 10)
    return Number.isFinite(code) ? String.fromCodePoint(code) : entity
  })
}

export function clusterArticles(articles) {
  var ordered = articles.slice().sort(function(a, b) { return new Date(b.publishedAt) - new Date(a.publishedAt) })
  var events = []
  for (var i = 0; i < ordered.length; i++) {
    var article = ordered[i]
    var event = events.find(function(candidate) { return sameEvent(article, candidate.primary_story) })
    if (!event) {
      event = {
        event_id: 'evt_' + normaliseTitle(article.title).slice(0, 48) + '_' + new Date(article.publishedAt).getTime(),
        primary_story: article,
        related_stories: [],
        independent_source_count: 1,
        first_seen: article.publishedAt,
        last_seen: article.publishedAt
      }
      events.push(event)
    } else {
      event.related_stories.push(article)
      event.last_seen = new Date(article.publishedAt) > new Date(event.last_seen) ? article.publishedAt : event.last_seen
      event.first_seen = new Date(article.publishedAt) < new Date(event.first_seen) ? article.publishedAt : event.first_seen
      var sources = [event.primary_story.source_id].concat(event.related_stories.map(function(item) { return item.source_id }))
      event.independent_source_count = Array.from(new Set(sources)).length
    }
    article.event_id = event.event_id
  }

  return {
    events: events,
    articles: ordered.map(function(article) {
      var event = events.find(function(candidate) { return candidate.event_id === article.event_id })
      article.independent_source_count = event ? event.independent_source_count : 1
      return article
    })
  }
}

function sameEvent(a, b) {
  var aTime = new Date(a.publishedAt).getTime()
  var bTime = new Date(b.publishedAt).getTime()
  if (Math.abs(aTime - bTime) > 18 * 60 * 60 * 1000) return false
  var aTokens = tokenSet(a.title)
  var bTokens = tokenSet(b.title)
  var overlap = 0
  aTokens.forEach(function(token) { if (bTokens.has(token)) overlap += 1 })
  var union = new Set(Array.from(aTokens).concat(Array.from(bTokens))).size || 1
  return overlap / union >= 0.48 || (overlap >= 4 && overlap / Math.min(aTokens.size || 1, bTokens.size || 1) >= 0.72)
}

function tokenSet(title) {
  var stop = new Set(['the', 'and', 'for', 'with', 'from', 'into', 'after', 'says', 'say', 'will', 'that', 'this', 'over', 'amid', 'market'])
  return new Set(normaliseTitle(title).split(' ').filter(function(token) { return token.length > 2 && !stop.has(token) }))
}

function normaliseTitle(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
}

export function rankForAssets(articles, assets, now) {
  var terms = assetTerms(assets)
  return articles.map(function(article) {
    var text = (article.title + ' ' + article.description).toLowerCase()
    var relevance = terms.reduce(function(score, term) { return score + (new RegExp('(^|\\W)' + term + '(?=\\W|$)', 'i').test(text) ? 1 : 0) }, 0)
    var ageHours = Math.max(0, (now - new Date(article.publishedAt).getTime()) / 3600000)
    var recency = Math.exp(-ageHours / 30)
    var independence = Math.min(article.independent_source_count || 1, 3) / 3
    return Object.assign({}, article, { rank: Math.round((relevance * 0.54 + article.source_weight * 0.25 + recency * 0.14 + independence * 0.07) * 1000) / 1000 })
  }).sort(function(a, b) { return b.rank - a.rank })
}

function assetTerms(assets) {
  // Composed per leg in assetKeywords.js so every instrument is covered, not
  // just the sixteen that used to be listed here.
  return keywordsForAll(assets)
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^$()|[\\]\\]/g, '\\$&')
}
