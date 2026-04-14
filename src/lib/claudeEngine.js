export async function scoreAssets(filteredNews, allAssets, apiKey) {
  var response = await fetch('/api/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'get' })
  })
  if (!response.ok) throw new Error('Signal fetch failed')
  var data = await response.json()
  return data.signals
}

export async function scoreAssetsForce() {
  var response = await fetch('/api/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'get', force: true })
  })
  if (!response.ok) throw new Error('Force refresh failed')
  var data = await response.json()
  return data.signals
}

export async function analyzeAsset(asset, recentNews, currentSignal, apiKey) {
  var assetNews = []
  for (var i = 0; i < recentNews.length; i++) {
    if (recentNews[i].affectedAssets && recentNews[i].affectedAssets.indexOf(asset) !== -1) {
      assetNews.push(recentNews[i])
      if (assetNews.length >= 6) break
    }
  }

  var response = await fetch('/api/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'analyze',
      asset: asset,
      signal: currentSignal,
      news: assetNews
    })
  })

  if (!response.ok) return 'Analysis unavailable.'
  var data = await response.json()
  return data.text || 'Analysis unavailable.'
}

export async function checkBreakingNews() {
  try {
    var response = await fetch('/api/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'check_breaking' })
    })
    if (!response.ok) return null
    var data = await response.json()
    return data
  } catch(e) {
    return null
  }
}

export function estimateTokens(newsCount, assetCount) {
  var inputTokens = 350 + (newsCount * 35) + (assetCount * 10)
  var outputTokens = assetCount * 80 + 100
  var costUSD = (inputTokens * 0.000003) + (outputTokens * 0.0000015)
  return { inputTokens: inputTokens, outputTokens: outputTokens, costUSD: costUSD }
}
