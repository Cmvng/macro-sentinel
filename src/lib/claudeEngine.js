import { getCachedScore, setCachedScore } from './newsFetcher.js'

var ANTHROPIC_API = '/api/chat'

var SYSTEM_PROMPT = 'You are a macro market analyst. Analyze news and return sentiment signals. You must respond with ONLY a raw JSON object. No markdown. No backticks. No explanation. No text before or after. Just the JSON object starting with { and ending with }. Use this exact structure: {"assets":{"EUR/USD":{"signal":"buy","score":60,"confidence":"medium","primary_driver":"reason here","supporting_factors":["factor1","factor2"],"risk_to_outlook":"risk here","conflicting":false},"GBP/USD":{"signal":"neutral","score":50,"confidence":"low","primary_driver":"reason here","supporting_factors":["factor1"],"risk_to_outlook":"risk here","conflicting":false}},"market_summary":"Two sentence summary here.","dominant_theme":"Five word theme here"}. Signal must be one of: strong_buy, buy, neutral, sell, strong_sell. Score is 0 to 100. Confidence is high, medium, or low.'

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
  var assetList = assets.join(', ')
  var dateStr = new Date().toUTCString()

  return 'Assets to score: ' + assetList + '\n\nHigh trust news:\n' + confirmedText + '\n\nMedium trust news:\n' + unconfirmedText + '\n\nLow trust flags:\n' + flagsText + '\n\nCurrent time: ' + dateStr + '\n\nReturn only JSON. No markdown. No backticks. Start with { and end with }.'
}

function extractJSON(text) {
  if (!text) return null

  var cleaned = text.trim()

  cleaned = cleaned.replace(/```json/gi, '')
  cleaned = cleaned.replace(/```/g, '')
  cleaned = cleaned.trim()

  if (cleaned.charAt(0) === '{') {
    try {
      return JSON.parse(cleaned)
    } catch(e) {}
  }

  var start = cleaned.indexOf('{')
  var end = cleaned.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1))
    } catch(e) {}
  }

  return null
}

function buildFallback(assets) {
  var result = { assets: {}, market_summary: 'Unable to analyze at this time.', dominant_theme: 'Data unavailable' }
  for (var i = 0; i < assets.length; i++) {
    result.assets[assets[i]] = {
      signal: 'neutral',
      score: 50,
      confidence: 'low',
      primary_driver: 'Analysis unavailable',
      supporting_factors: ['Check API key and connection'],
      risk_to_outlook: 'Unknown',
      conflicting: false
    }
  }
  return result
}

export async function scoreAssets(filteredNews, assets, apiKey) {
  if (!apiKey) throw new Error('NO_API_KEY')

  var cacheKey = assets.join('_') + '_' + filteredNews.slice(0, 3).map(function(n) { return n.id }).join('_')
  var cached = getCachedScore(cacheKey)
  if (cached) return cached

  var brief = buildNewsBrief(filteredNews, assets)

  var response
  try {
    response = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: brief }]
      })
    })
  } catch(e) {
    throw new Error('Failed to fetch: ' + e.message)
  }

  if (!response.ok) {
    var errData
    try { errData = await response.json() } catch(e) { errData = {} }
    throw new Error((errData.error && errData.error.message) ? errData.error.message : 'API error ' + response.status)
  }

  var data
  try {
    data = await response.json()
  } catch(e) {
    throw new Error('Invalid response from server')
  }

  var text = ''
  if (data.content) {
    for (var i = 0; i < data.content.length; i++) {
      if (data.content[i].type === 'text') {
        text = data.content[i].text
        break
      }
    }
  }

  var parsed = extractJSON(text)

  if (!parsed || !parsed.assets) {
    parsed = buildFallback(assets)
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

  var prompt = 'Write a 4-5 sentence professional fundamental analysis for ' + asset + '. Current signal: ' + currentSignal + '. Recent news:\n' + newsLines + '\n\nCover: 1. Current bias and why. 2. Most impactful driver. 3. Key risks. 4. Central bank stance if relevant. 5. What would change this signal. Plain prose only, no bullet points.'

  var response
  try {
    response = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }]
      })
    })
  } catch(e) {
    throw new Error('Failed to fetch: ' + e.message)
  }

  var data
  try {
    data = await response.json()
  } catch(e) {
    return 'Analysis unavailable.'
  }

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
