import { getCachedScore, setCachedScore } from './newsFetcher.js'

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'

const SYSTEM_PROMPT = `You are a professional macro market analyst with 20 years of experience in Forex, commodities, and crypto markets.

You receive filtered, high-quality market news and economic data. Your job is to analyze the fundamental sentiment for specific assets and output structured signals.

SIGNAL DEFINITIONS:
- strong_buy (score 75-100): Strong bullish fundamentals, multiple confirming factors
- buy (score 55-74): Bullish lean, positive drivers outweigh negatives
- neutral (score 40-54): Mixed signals, no clear directional bias
- sell (score 26-39): Bearish lean, negative drivers outweigh positives
- strong_sell (score 0-25): Strong bearish fundamentals, multiple confirming factors

SCORING RULES:
1. Official government data (Fed, BLS, ECB) = maximum weight
2. Presidential statements / social media = high weight (markets react regardless)
3. Corroborated news (3+ sources) = confirmed signal
4. Single source only = flag but reduce confidence
5. Recency matters: 10min old news > 3 day old news
6. When signals conflict: show the net score and flag as "conflicting"

OUTPUT FORMAT — respond ONLY with valid JSON, no markdown, no explanation:
{
  "assets": {
    "ASSET_NAME": {
      "signal": "strong_buy|buy|neutral|sell|strong_sell",
      "score": 0-100,
      "confidence": "high|medium|low",
      "primary_driver": "one sentence",
      "supporting_factors": ["factor1", "factor2"],
      "risk_to_outlook": "one sentence",
      "conflicting": true|false
    }
  },
  "market_summary": "2 sentence overall market environment summary",
  "dominant_theme": "The single most important market theme right now in 5 words"
}`

function buildNewsBrief(filteredNews, assets) {
  const confirmed = filteredNews.filter(n => n.trustScore >= 85)
  const unconfirmed = filteredNews.filter(n => n.trustScore >= 60 && n.trustScore < 85)
  const flags = filteredNews.filter(n => n.trustScore < 60)

  const formatItem = (n) =>
    `[${n.source} | trust:${n.trustScore} | age:${Math.round((Date.now() - new Date(n.publishedAt).getTime()) / 60000)}min] ${n.title}`

  return `ANALYZE FUNDAMENTAL SENTIMENT FOR: ${assets.join(', ')}

CONFIRMED HIGH-TRUST EVENTS (act on these):
${confirmed.slice(0, 8).map(formatItem).join('\n') || 'None'}

MEDIUM-TRUST SOURCES (corroborate before full weight):
${unconfirmed.slice(0, 6).map(formatItem).join('\n') || 'None'}

EARLY FLAGS (single source, use as background only):
${flags.slice(0, 4).map(formatItem).join('\n') || 'None'}

Today's date/time: ${new Date().toUTCString()}

Score each asset listed. If a news item does not affect an asset, ignore it for that asset.`
}

export async function scoreAssets(filteredNews, assets, apiKey) {
  if (!apiKey) throw new Error('NO_API_KEY')

  const cacheKey = `${assets.join('_')}_${filtered
