export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  var key = process.env.VITE_ANTHROPIC_KEY
  if (!key) return res.status(500).json({ error: 'API key not configured' })

  var body = req.body
  var action = body.action

  if (action === 'fetch_news') {
    return await handleNews(req, res)
  }

  try {
    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    })
    var data = await response.json()
    return res.status(response.status).json(data)
  } catch(err) {
    return res.status(500).json({ error: err.message })
  }
}

async function handleNews(req, res) {
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

  var trustMap = {
    'reuters': 95, 'forexlive': 80, 'fxstreet': 78,
    'kitco': 78, 'coindesk': 75, 'cointelegraph': 72,
    'marketwatch': 70, 'google': 78
  }

  function getTrust(url) {
    var keys = Object.keys(trustMap)
    for (var i = 0; i < keys.length; i++) {
      if (url.indexOf(keys[i]) !== -1) return trustMap[keys[i]]
    }
    return 60
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
      return 'Google:' + (q ? decodeURIComponent(q[1]).slice(0, 20) : 'News')
    }
    return 'News'
  }

  function parseItems(xml, sourceName, trust) {
    var items = []
    var itemRegex = /<item>([\s\S]*?)<\/item>/g
    var match
    while ((match = itemRegex.exec(xml)) !== null) {
      var block = match[1]
      var title = ''
      var link = ''
      var pubDate = ''
      var titleMatch = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/)
      if (titleMatch) title = (titleMatch[1] || titleMatch[2] || '').trim()
      var linkMatch = block.match(/<link>(.*?)<\/link>/)
      if (linkMatch) link = linkMatch[1].trim()
      var dateMatch = block.match(/<pubDate>(.*?)<\/pubDate>/)
      if (dateMatch) pubDate = dateMatch[1].trim()
      if (title && title.length > 5) {
        items.push({
          title: title,
          link: link,
          publishedAt: pubDate || new Date().toISOString(),
          source: sourceName,
          trustScore: trust
        })
      }
    }
    return items.slice(0, 15)
  }

  async function fetchOne(url) {
    try {
      var controller = new AbortController()
      var timeout = setTimeout(function() { controller.abort() }, 6000)
      var r = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)' }
      })
      clearTimeout(timeout)
      if (!r.ok) return []
      var text = await r.text()
      return parseItems(text, getSourceName(url), getTrust(url))
    } catch(e) {
      return []
    }
  }

  try {
    var results = await Promise.allSettled(sources.map(function(s) { return fetchOne(s) }))
    var all = []
    for (var i = 0; i < results.length; i++) {
      if (results[i].status === 'fulfilled') {
        all = all.concat(results[i].value)
      }
    }

    var seen = {}
    var unique = []
    for (var j = 0; j < all.length; j++) {
      var k = all[j].title.toLowerCase().slice(0, 50)
      if (!seen[k]) { seen[k] = true; unique.push(all[j]) }
    }

    return res.status(200).json({ articles: unique })
  } catch(e) {
    return res.status(500).json({ error: e.message, articles: [] })
  }
}
