// What the landing page highlights. Pure, so it is testable.

var BULL = { strong_buy: 1, buy: 1 }
var BEAR = { strong_sell: 1, sell: 1 }

// The most decisive signals: furthest from 50 on each side, strongest first.
export function topSignals(signals, perSide) {
  var n = perSide || 3
  var bull = []
  var bear = []
  var ids = Object.keys(signals || {})
  for (var i = 0; i < ids.length; i++) {
    var s = signals[ids[i]]
    if (!s || typeof s.score !== 'number' || !isFinite(s.score)) continue
    var item = { id: ids[i], signal: s.signal, score: s.score, strength: Math.abs(s.score - 50) }
    if (BULL[s.signal]) bull.push(item)
    else if (BEAR[s.signal]) bear.push(item)
  }
  var byStrength = function(a, b) { return b.strength - a.strength || (a.id < b.id ? -1 : 1) }
  bull.sort(byStrength)
  bear.sort(byStrength)
  return { bullish: bull.slice(0, n), bearish: bear.slice(0, n) }
}
