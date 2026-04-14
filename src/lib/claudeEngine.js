import { getCachedScore, setCachedScore } from './newsFetcher.js'
import { FOREX_IDS, METALS_IDS, CRYPTO_IDS } from './assets.js'

var ANTHROPIC_API = '/api/chat'

var SYSTEM_PROMPT = 'You are a macro market analyst. You MUST respond with ONLY a raw JSON object. Absolutely no markdown. No backticks. No explanation text. No preamble. The very first character of your response must be { and the very last must be }. Example of exact format required: {"assets":{"EUR/USD":{"signal":"buy","score":65,"confidence":"medium","primary_driver":"USD weakness on soft CPI data","supporting_factors":["Fed rate cut bets increasing","Risk sentiment improving"],"risk_to_outlook":"Strong jobs report could reverse gains","conflicting":false},"GBP/USD":{"signal":"neutral","score":50,"confidence":"low","primary_driver":"Mixed UK economic data","supporting_factors":["BoE on hold","USD also weak"],"risk_to_outlook":"UK inflation surprise","conflicting":true}},"market_summary":"Markets are pricing in Fed rate cuts as inflation cools. Risk sentiment is cautiously positive.","dominant_theme":"Fed pivot driving dollar weakness"}'

function buildBrief(news, assets) {
  var hi = []
  var lo = []
  var i, n, age

  for (i = 0; i < news.length; i++) {
    n = news[i]
    age = Math.round((Date.now() - new Date(n.publishedAt).getTime()) / 60000)
    var line = '[' + n.source + '|' + age + 'min] ' + n.title
    if (n.trustScore >= 80) hi.push(line)
    else lo.push(line)
  }

  return 'Return JSON only. Score: ' + assets.join(', ') + '\n\nTop news:\n' + hi.slice(0, 5).join('\n') + '\n\nOther:\n' + lo.slice(0, 4).join('\n') + '\n\nTime: ' + new Date().toUTCString()
}

async function callClaude(body) {
  var response = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!response.ok) {
    var e = await response.json()
    throw new Error((e.error && e.error.message) ? e.error.message : 'API error ' + response.status)
  }
  var data = await response.json()
  var text = ''
  if (data.content) {
    for (var i = 0; i < data.content.length; i++) {
      if (data.content[i].type === 'text') { text = data.content[i].text; break }
    }
  }
  return text
}

function parseJSON(text) {
  if (!text) return null
  var t = text.trim()
  t = t.replace(/```json/gi, '').replace(/```/g, '').trim()
  try { return JSON.parse(t) } catch(e) {}
  var s = t.indexOf('{')
  var e = t.lastIndexOf('}')
  if (s !== -1 && e > s) {
    try { return JSON.parse(t.slice(s, e + 1)) } catch(e2) {}
  }
  return null
}

function fallback(assets) {
  var r = { assets: {}, market_summary: 'Analysis pending — retrying shortly.', dominant_theme: 'Markets await direction' }
  for (var i = 0; i < assets.length; i++) {
    r.assets[assets[i]] = {
      signal: 'neutral', score: 50, confidence: 'low',
      primary_driver: 'Insufficient data', supporting_factors: ['Retrying analysis'],
      risk_to_outlook: 'Unknown', conflicting: false
    }
  }
  return r
}

var FOREX_MAJORS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD']
var FOREX_MINORS = ['EUR/GBP', 'EUR/JPY', 'EUR/CHF', 'EUR/AUD', 'EUR/CAD', 'EUR/NZD', 'GBP/JPY', 'GBP/CHF', 'GBP/AUD', 'GBP/CAD', 'GBP/NZD']
var FOREX_CROSSES = ['AUD/JPY', 'AUD/CHF', 'AUD/CAD', 'AUD/NZD', 'NZD/JPY', 'NZD/CHF', 'NZD/CAD', 'CAD/JPY', 'CAD/CHF', 'CHF/JPY']

async function scoreGroup(news, assets, cachePrefix) {
  var cacheKey = cachePrefix + '_' + news.slice(0, 3).map(function(n) { return n.id }).join('_')
  var cached = getCachedScore(cacheKey)
  if (cached) return cached

  var text = await callClaude({
    model: 'claude-sonnet-4-5',
    max_tokens: 3000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildBrief(news, assets) }]
  })

  var parsed = parseJSON(text)
  if (!parsed || !parsed.assets) {
    parsed = fallback(assets)
  }

  setCachedScore(cacheKey, parsed)
  return parsed
}

function mergeResults(results, allAssets) {
  var combined = { assets: {}, market_summary: '', dominant_theme: '' }
  for (var i = 0; i < results.length; i++) {
    if (results[i].status === 'fulfilled' && results[i].value && results[i].value.assets) {
      var keys = Object.keys(results[i].value.assets)
      for (var j = 0; j < keys.length; j++) {
        combined.assets[keys[j]] = results[i].value.assets[keys[j]]
      }
      if (!combined.market_summary && results[i].value.market_summary) {
        combined.market_summary = results[i].value.market_summary
      }
      if (!combined.dominant_theme && results[i].value.dominant_theme) {
        combined.dominant_theme = results[i].value.dominant_theme
      }
    }
  }
  if (Object.keys(combined.assets).length === 0) return fallback(allAssets)
  return combined
}

export async function scoreAssets(filteredNews, allAssets, apiKey) {
  if (!apiKey) throw new Error('NO_API_KEY')

  var results = await Promise.allSettled([
    scoreGroup(filteredNews, FOREX_MAJORS, 'forex_major'),
    scoreGroup(filteredNews, FOREX_MINORS, 'forex_minor'),
    scoreGroup(filteredNews, FOREX_CROSSES, 'forex_cross'),
    scoreGroup(filteredNews, METALS_IDS, 'metals'),
    scoreGroup(filteredNews, CRYPTO_IDS, 'crypto')
  ])

  return mergeResults(results, allAssets)
}

export async function analyzeAsset(asset, recentNews, currentSignal, apiKey) {
  if (!apiKey) throw new Error('NO_API_KEY')

  var assetNews = []
  for (var i = 0; i < recentNews.length; i++) {
    if (recentNews[i].affectedAssets && recentNews[i].affectedAssets.indexOf(asset) !== -1) {
      assetNews.push(recentNews[i])
      if (assetNews.length >= 8) break
    }
  }

  var newsLines = assetNews.length > 0
    ? assetNews.map(function(n) { return '- [' + n.source + '] ' + n.title }).join('\n')
    : '- No specific news found, use general market knowledge'

  var prompt = 'Write exactly 4 sentences of professional fundamental trading analysis for ' + asset + ' only. Current signal: ' + currentSignal + '.\n\nRecent relevant news:\n' + newsLines + '\n\nSentence 1: State the current bias for ' + asset + ' and the single most important reason why. Sentence 2: Explain the most impactful recent news driver specifically for ' + asset + '. Sentence 3: Identify the biggest risk that could reverse this signal for ' + asset + '. Sentence 4: State clearly what a trader should watch for next regarding ' + asset + '. Be specific, direct, and actionable. Only discuss ' + asset + '. Plain prose only, no bullet points, no headers.'

  try {
    var text = await callClaude({
      model: 'claude-sonnet-4-5',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }]
    })
    return text || 'Analysis unavailable.'
  } catch(e) {
    return 'Analysis error: ' + e.message
  }
}

export function estimateTokens(newsCount, assetCount) {
  var inputTokens = 350 + (newsCount * 35) + (assetCount * 10)
  var outputTokens = assetCount * 80 + 100
  var costUSD = (inputTokens * 0.000003) + (outputTokens * 0.0000015)
  return { inputTokens: inputTokens, outputTokens: outputTokens, costUSD: costUSD }
}
