import { getCachedScore, setCachedScore } from './newsFetcher.js'

var ANTHROPIC_API = '/api/chat'

var SYSTEM_PROMPT = 'You are a professional macro market analyst with 20 years of experience in Forex, commodities, and crypto markets. You receive filtered, high-quality market news and economic data. Your job is to analyze the fundamental sentiment for specific assets and output structured signals. SIGNAL DEFINITIONS: strong_buy (score 75-100): Strong bullish fundamentals. buy (score 55-74): Bullish lean. neutral (score 40-54): Mixed signals. sell (score 26-39): Bearish lean. strong_sell (score 0-25): Strong bearish fundamentals. SCORING RULES: 1. Official government data = maximum weight. 2. Presidential statements = high weight. 3. Corroborated news 3+ sources = confirmed signal. 4. Single source = reduce confidence. 5. Recent news outweighs old news. OUTPUT FORMAT: respond ONLY with valid JSON, no markdown, no explanation: { "assets": { "ASSET_NAME": { "signal": "strong_buy|buy|neutral|sell|strong_sell", "score": 0, "confidence": "high|medium|low", "primary_driver": "one sentence", "supporting_factors": ["factor1", "factor2"], "risk_to_outlook": "one sentence", "conflicting": false } }, "market_summary": "2 sentence summary", "dominant_theme": "5 word theme" }'

function buildNewsBrief(filteredNews, assets) {
  var confirmed = []
  var unconfirmed = []
  var flags = []
  var i, n

  for (i = 0; i < filteredNews.length; i++) {
    n = filteredNews[i]
    if (n.trustScore >= 85) confirmed.push(n)
    else if (n.trustScore >= 60) unconfirmed.push(n)
    else flags.push(n)
  }

  function formatItem(n) {
    var age = Math.round((Date.now() - new Date(n.publishedAt).getTime()) / 60000)
    return '[' + n.source + ' | trust:' + n.trustScore + ' | age:' + age + 'min] ' + n.title
  }

  var confirmedText = confirmed.slice(0, 8).map(formatItem).join('\n') || 'None'
  var unconfirmedText = unconfirmed.slice(0, 6).map(formatItem).join('\n') || 'None'
  var flagsText = flags.slice(0, 4).map(formatItem).join('\n') || 'None'

  return 'ANALYZE FUNDAMENTAL SENTIMENT FOR: ' + assets.join(', ') + '\n\nCONFIRMED HIGH-TRUST EVENTS:\n' + confirmedText + '\n\nMEDIUM-TRUST SOURCES:\n' + unconfirmedText + '\n\nEARLY FLAGS:\n' + flagsText + '\n\nDate: ' + new Date().toUTCString() + '\n\nScore each asset. Output only JSON.'
}

export async function scoreAssets(filteredNews, assets, apiKey) {
  if (!apiKey) throw new Error('NO_API_KEY')

  var cacheKey = assets.join('_') + '_' + filteredNews.slice(0, 3).map(function(n) { return n.id }).join('_')
  var cached = getCachedScore(cacheKey)
  if (cached) return cached

  var brief = buildNewsBrief(filteredNews, assets)

  var response = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: brief }]
    })
  })

  if (!response.ok) {
    var err = await response.json()
    throw new Error((err.error && err.error.message) ? err.error.message : 'API error')
  }

  var data = await response.json()
  var text = ''
  if (data.content) {
    for (var i = 0; i < data.content.length; i++) {
      if (data.content[i].type === 'text') {
        text = data.content[i].text
        break
      }
    }
  }

  var parsed
  try {
    var clean = text.replace(/```json/g, '').replace(/```/g, '').trim()
    parsed = JSON.parse(clean)
  } catch(e) {
    throw new Error('Failed to parse Claude response')
  }

  setCachedScore(cacheKey, parsed)
  return parsed
}

export async function analyzeAsset(asset, recentNews, currentSignal, apiKey) {
  if (!apiKey) throw new Error('NO_API_KEY')

  var assetNews = []
  for (var i = 0; i < recentNews.length; i++) {
    if (recentNews[i].affectedAssets && recentNews[i].affectedAssets.indexOf(asset) !== -1) {
      assetNews.push(recentNews[i])
      if (assetNews.length >= 10) break
    }
  }

  var newsLines = assetNews.length > 0
    ? assetNews.map(function(n) { return '- [' + n.source + '] ' + n.title }).join('\n')
    : '- No specific news found, using general market context'

  var prompt = 'Provide a detailed fundamental analysis for ' + asset + '.\n\nCurrent signal: ' + currentSignal + '\n\nRelevant recent news:\n' + newsLines + '\n\nWrite a professional 4-5 sentence analysis covering: 1. Current fundamental bias and why. 2. Most impactful recent driver. 3. Geopolitical or macro risks. 4. Central bank stance if applicable. 5. What would change this signal. Be direct and specific. Plain prose only.'

  var response = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }]
    })
  })

  var data = await response.json()
  var result = 'Analysis unavailable.'
  if (data.content) {
    for (var j = 0; j < data.content.length; j++) {
      if (data.content[j].type === 'text') {
        result = data.content[j].text
        break
      }
    }
  }
  return result
}

export function estimateTokens(newsCount, assetCount) {
  var inputTokens = 350 + (newsCount * 35) + (assetCount * 10)
  var outputTokens = assetCount * 80 + 100
  var costUSD = (inputTokens * 0.000003) + (outputTokens * 0.0000015)
  return { inputTokens: inputTokens, outputTokens: outputTokens, costUSD: costUSD }
}
