// How each instrument is shown and charted. Pure data plus lookups, so it is
// testable without a browser.
//
// TradingView symbols were each checked against TradingView's own symbol search
// on 2026-09-30. Two are not the obvious ones: Polygon is charted as POL (the
// token was renamed and MATIC no longer exists on Binance), and natural gas and
// copper use OANDA's CFD feed because CME futures are often blocked in free
// embedded charts.
import { ALL_ASSET_IDS } from './assets.js'

var CHART_SYMBOLS = {
  'XAU/USD': 'OANDA:XAUUSD',
  'XAG/USD': 'OANDA:XAGUSD',
  'XPT/USD': 'OANDA:XPTUSD',
  'WTI Oil': 'TVC:USOIL',
  'Brent': 'TVC:UKOIL',
  'Nat Gas': 'OANDA:NATGASUSD',
  'Copper': 'OANDA:XCUUSD',
  'BTC/USD': 'BINANCE:BTCUSDT',
  'ETH/USD': 'BINANCE:ETHUSDT',
  'BNB/USD': 'BINANCE:BNBUSDT',
  'SOL/USD': 'BINANCE:SOLUSDT',
  'XRP/USD': 'BINANCE:XRPUSDT',
  'DOGE/USD': 'BINANCE:DOGEUSDT',
  'ADA/USD': 'BINANCE:ADAUSDT',
  'AVAX/USD': 'BINANCE:AVAXUSDT',
  'LINK/USD': 'BINANCE:LINKUSDT',
  'DOT/USD': 'BINANCE:DOTUSDT',
  'MATIC/USD': 'BINANCE:POLUSDT',
  'UNI/USD': 'BINANCE:UNIUSDT'
}

var FLAG_CURRENCIES = { USD: 1, EUR: 1, GBP: 1, JPY: 1, CHF: 1, CAD: 1, AUD: 1, NZD: 1 }

// Every forex id is "BASE/QUOTE" with both legs a known currency.
function isPair(id) {
  var m = /^([A-Z]{3})\/([A-Z]{3})$/.exec(id)
  return m && FLAG_CURRENCIES[m[1]] && FLAG_CURRENCIES[m[2]] ? [m[1], m[2]] : null
}

export function tradingViewSymbol(id) {
  var pair = isPair(id)
  if (pair) return 'OANDA:' + pair[0] + pair[1]
  return CHART_SYMBOLS[id] || null
}

export function tradingViewUrl(id) {
  var symbol = tradingViewSymbol(id)
  return symbol ? 'https://www.tradingview.com/chart/?symbol=' + encodeURIComponent(symbol) : 'https://www.tradingview.com/'
}

// Brand colours for the coin badges. `ink` is the glyph colour, chosen to read on
// its own fill. These are stand-in badges (a colour plus a generic glyph), not
// copies of the projects' logos.
var COINS = {
  'XAU/USD': { glyph: 'Au', fill: 'radial-gradient(circle at 30% 24%, #fff3b8, #f2c230 48%, #a87406)', ink: '#3d2900' },
  'XAG/USD': { glyph: 'Ag', fill: 'radial-gradient(circle at 30% 24%, #ffffff, #cdd5de 50%, #8792a0)', ink: '#26303c' },
  'XPT/USD': { glyph: 'Pt', fill: 'radial-gradient(circle at 30% 24%, #f6f9fc, #c4cfdc 50%, #76879a)', ink: '#1f2a36' },
  'Copper': { glyph: 'Cu', fill: 'radial-gradient(circle at 30% 24%, #ffd2ac, #d97a3b 50%, #86401a)', ink: '#2e1305' },
  'WTI Oil': { glyph: 'WTI', fill: 'radial-gradient(circle at 30% 24%, #4b5a6c, #1a222c 60%, #0d1218)', ink: '#ffffff' },
  'Brent': { glyph: 'BRT', fill: 'radial-gradient(circle at 30% 24%, #4d6558, #1b2b23 60%, #0d1612)', ink: '#ffffff' },
  'Nat Gas': { glyph: 'GAS', fill: 'radial-gradient(circle at 30% 24%, #6cb4ff, #1f6fd1 55%, #124a92)', ink: '#ffffff' },
  'BTC/USD': { glyph: '₿', fill: '#f7931a', ink: '#1f1200' },
  'ETH/USD': { glyph: 'Ξ', fill: '#627eea', ink: '#ffffff' },
  'BNB/USD': { glyph: 'B', fill: '#f3ba2f', ink: '#1f1600' },
  'SOL/USD': { glyph: 'S', fill: 'linear-gradient(135deg, #9945ff, #14f195)', ink: '#ffffff' },
  'XRP/USD': { glyph: 'X', fill: '#23292f', ink: '#ffffff' },
  'DOGE/USD': { glyph: 'Ð', fill: '#c2a633', ink: '#1f1800' },
  'ADA/USD': { glyph: '₳', fill: '#0033ad', ink: '#ffffff' },
  'AVAX/USD': { glyph: 'A', fill: '#e84142', ink: '#ffffff' },
  'LINK/USD': { glyph: 'L', fill: '#2a5ada', ink: '#ffffff' },
  'DOT/USD': { glyph: 'D', fill: '#e6007a', ink: '#ffffff' },
  'MATIC/USD': { glyph: 'P', fill: '#8247e5', ink: '#ffffff' },
  'UNI/USD': { glyph: 'U', fill: '#ff007a', ink: '#ffffff' }
}

// { kind: 'pair', base, quote } for currency pairs, { kind: 'coin', glyph, fill, ink } otherwise.
export function iconSpec(id) {
  var pair = isPair(id)
  if (pair) return { kind: 'pair', base: pair[0], quote: pair[1] }
  var coin = COINS[id]
  return coin ? { kind: 'coin', glyph: coin.glyph, fill: coin.fill, ink: coin.ink } : null
}

export function allInstrumentIds() { return ALL_ASSET_IDS.slice() }
