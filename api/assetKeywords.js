// One keyword source for both the ranking pipeline and per-asset news selection.
// Keywords are declared per leg (currency, commodity, token) and composed, so all
// 47 instruments are covered rather than the 16 that were listed explicitly.

var LEG_KEYWORDS = {
  USD: ['fed', 'federal reserve', 'powell', 'fomc', 'dollar', 'treasury yields'],
  EUR: ['ecb', 'lagarde', 'euro', 'eurozone'],
  GBP: ['boe', 'bank of england', 'pound', 'sterling', 'britain'],
  JPY: ['boj', 'bank of japan', 'yen', 'japan', 'intervention'],
  CHF: ['snb', 'switzerland', 'franc', 'safe haven'],
  CAD: ['boc', 'bank of canada', 'canada', 'loonie'],
  AUD: ['rba', 'australia', 'australian'],
  NZD: ['rbnz', 'new zealand', 'dairy'],
  'XAU/USD': ['gold', 'bullion', 'safe haven', 'real yields'],
  'XAG/USD': ['silver', 'industrial metal'],
  'XPT/USD': ['platinum', 'palladium', 'autocatalyst'],
  'WTI Oil': ['oil', 'crude', 'wti', 'opec', 'shale'],
  'Brent': ['brent', 'crude', 'opec', 'oil'],
  'Nat Gas': ['natural gas', 'lng', 'gas storage'],
  'Copper': ['copper', 'industrial metal', 'smelter'],
  'BTC/USD': ['bitcoin', 'btc', 'halving'],
  'ETH/USD': ['ethereum', 'ether', 'eth', 'staking'],
  'BNB/USD': ['bnb', 'binance'],
  'SOL/USD': ['solana'],
  'XRP/USD': ['xrp', 'ripple'],
  'DOGE/USD': ['dogecoin', 'doge'],
  'ADA/USD': ['cardano'],
  'AVAX/USD': ['avalanche', 'avax'],
  'LINK/USD': ['chainlink', 'oracle network'],
  'DOT/USD': ['polkadot', 'parachain'],
  'MATIC/USD': ['polygon', 'matic'],
  'UNI/USD': ['uniswap']
}

var CRYPTO_SHARED = ['crypto', 'cryptocurrency', 'digital asset', 'stablecoin']
var CRYPTO_IDS = ['BTC/USD', 'ETH/USD', 'BNB/USD', 'SOL/USD', 'XRP/USD', 'DOGE/USD', 'ADA/USD', 'AVAX/USD', 'LINK/USD', 'DOT/USD', 'MATIC/USD', 'UNI/USD']

function build(id) {
  var parts = id.split('/')
  if (parts.length === 2 && LEG_KEYWORDS[parts[0]] && LEG_KEYWORDS[parts[1]]) {
    return LEG_KEYWORDS[parts[0]].concat(LEG_KEYWORDS[parts[1]])
  }
  var own = LEG_KEYWORDS[id] ? LEG_KEYWORDS[id].slice() : []
  if (CRYPTO_IDS.indexOf(id) !== -1) own = own.concat(CRYPTO_SHARED)
  return own
}

export function keywordsFor(asset) {
  return build(asset)
}

export function keywordsForAll(assets) {
  var seen = {}
  var out = []
  for (var i = 0; i < assets.length; i++) {
    var words = build(assets[i])
    for (var j = 0; j < words.length; j++) {
      if (!seen[words[j]]) { seen[words[j]] = true; out.push(words[j]) }
    }
  }
  return out
}

// Word-boundary matching. Plain indexOf matched 'war' inside "warns", which
// attributed Fed headlines to gold.
export function matchesAny(text, keywords) {
  var haystack = ' ' + String(text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ') + ' '
  for (var i = 0; i < keywords.length; i++) {
    if (haystack.indexOf(' ' + keywords[i] + ' ') !== -1) return true
  }
  return false
}
