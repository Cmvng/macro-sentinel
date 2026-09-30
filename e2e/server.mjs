// Mock API + static server for the browser checks. It serves the built app and
// answers /api/refresh with fixed data, so nothing here touches the network or
// a model. Release times are computed relative to "now" so there is always one
// release that has just printed and one about to.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

var root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
var MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }
var SIGS = ['strong_buy', 'buy', 'neutral', 'sell', 'strong_sell']
var ASSETS = {}
;['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD'].forEach(function(id, i) {
  ASSETS[id] = { signal: SIGS[i % 5], score: [82, 66, 50, 34, 18][i % 5], confidence: ['high', 'medium', 'low'][i % 3],
    primary_driver: 'Rate differential favours the stronger leg', supporting_factors: ['Hawkish central bank commentary', 'Resilient labour data'],
    risk_to_outlook: 'x', conflicting: false }
})

// Fixed when the server starts, so an event keeps the same id (and time) for the
// whole run, as it does in the real feed. Ids that drifted every minute made
// stored results vanish mid-test.
var BASE = Math.floor(Date.now() / 60000) * 60000

function ev(mins, title, country, impact, forecast, previous, actual) {
  var ts = BASE + mins * 60000
  return { id: country + '|' + title + '|' + ts, title: title, currency: country,
    impact: impact, time: new Date(ts).toISOString(), timestamp: ts, forecast: forecast, previous: previous, actual: actual || '' }
}

export function start(port, scenario) {
  var server = http.createServer(function(req, res) {
    var u = new URL(req.url, 'http://x')
    if (u.pathname === '/api/refresh') {
      var b = ''
      req.on('data', function(c) { b += c })
      req.on('end', function() {
        var action = 'get'
        try { action = JSON.parse(b || '{}').action || 'get' } catch (e) { action = 'get' }
        res.setHeader('content-type', 'application/json')
        if (action === 'get_calendar') {
          if (scenario === 'down') { res.statusCode = 503; return res.end(JSON.stringify({ error: 'Economic calendar is temporarily unavailable' })) }
          return res.end(JSON.stringify({ events: [
            ev(-25, 'PPI m/m', 'USD', 'high', '0.3%', '0.1%'),
            // The data source has published this one: no typing needed.
            ev(-12, 'Retail Sales m/m', 'GBP', 'high', '0.3%', '0.1%', '0.9%'),
            ev(-130, 'Unemployment Claims', 'USD', 'medium', '220K', '225K'),
            ev(40, 'Final GDP q/q', 'USD', 'high', '1.5%', '1.5%'),
            ev(180, 'Core PCE Price Index m/m', 'USD', 'high', '0.3%', '0.2%'),
            ev(200, 'FOMC Member Waller Speaks', 'USD', 'high', '', ''),
            ev(300, 'CPI Flash Estimate y/y', 'EUR', 'high', '2.1%', '2.2%'),
            ev(2900, 'Non-Farm Employment Change', 'USD', 'high', '90K', '162K'),
            ev(60, 'Bank Holiday', 'GBP', 'low', '', '')
          ], fetched_at: new Date().toISOString(), age_minutes: 4, stale: false, has_actuals: true, actuals_status: scenario === 'noactuals' ? 'unavailable' : 'live' }))
        }
        if (action === 'get_news') return res.end(JSON.stringify({ articles: [{ title: 'Fed holds rates steady as inflation cools', link: 'https://example.com/1', publishedAt: new Date(Date.now() - 25 * 60000).toISOString(), source: 'Reuters', trustScore: 95, affectedAssets: ['EUR/USD'] }], cached: true, feed_health: [], healthy_source_count: 13, source_count: 15, event_count: 22 }))
        if (action === 'analyze') return res.end(JSON.stringify({ text: 'EUR/USD remains under bearish macro pressure.' }))
        return res.end(JSON.stringify({ signals: { assets: ASSETS, market_summary: 'Dollar strength dominates.', dominant_theme: 'Higher for longer' }, cached: true, data_status: 'cached', age_minutes: 12, generated_at: new Date(Date.now() - 12 * 60000).toISOString(), feed_health: [], healthy_source_count: 15, source_count: 15, event_count: 22 }))
      })
      return
    }
    var file = path.join(root, u.pathname === '/' ? 'index.html' : u.pathname)
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html')
    res.setHeader('content-type', MIME[path.extname(file)] || 'application/octet-stream')
    res.end(fs.readFileSync(file))
  })
  return new Promise(function(resolve) { server.listen(port, '127.0.0.1', function() { resolve(server) }) })
}
