// Article tagging (affectedAssets) now happens server-side in api/refresh.js,
// so the 47-instrument keyword map no longer needs a duplicate copy here.
import { fetchNews } from './claudeEngine.js'

// Buckets are used for display weighting only. Articles with an unknown
// publication date are kept and labelled rather than silently dropped — the
// previous NaN fall-through deleted them with no error.
export function getRecencyWeight(publishedAt) {
  if (!publishedAt) return null
  var t = new Date(publishedAt).getTime()
  if (!isFinite(t)) return null
  var age = (Date.now() - t) / (1000 * 60)
  if (age < 0) return 1.0
  if (age < 30) return 1.0
  if (age < 120) return 0.75
  if (age < 360) return 0.5
  if (age < 1440) return 0.25
  if (age < 4320) return 0.1
  return 0.05
}

export async function fetchAllNews() {
  try {
    var res = await fetchNews()
    var articles = res.articles || []
    var enriched = []
    for (var i = 0; i < articles.length; i++) {
      var a = articles[i]
      enriched.push({
        id: a.link || (a.source + '|' + a.title),
        title: a.title,
        description: a.description || '',
        link: a.link || '',
        publishedAt: a.publishedAt || null,
        dateKnown: a.dateKnown !== false && !!a.publishedAt,
        source: a.source,
        trustScore: a.trustScore || 65,
        recencyWeight: getRecencyWeight(a.publishedAt),
        affectedAssets: a.affectedAssets || []
      })
    }
    // Freshest first, unknown dates last, so the feed reads chronologically.
    enriched.sort(function(x, y) {
      var tx = x.publishedAt ? new Date(x.publishedAt).getTime() : -Infinity
      var ty = y.publishedAt ? new Date(y.publishedAt).getTime() : -Infinity
      return ty - tx
    })
    return { articles: enriched, health: res.health || null }
  } catch(e) {
    return { articles: [], health: null }
  }
}
