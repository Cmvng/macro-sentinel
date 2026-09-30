import assert from 'node:assert/strict'
import test from 'node:test'
import { ALL_ASSET_IDS, ASSETS } from '../src/lib/assets.js'
import { tradingViewSymbol, tradingViewUrl, iconSpec } from '../src/lib/symbols.js'

test('every one of the 47 instruments has a chart symbol and an icon', function() {
  assert.equal(ALL_ASSET_IDS.length, 47)
  for (const id of ALL_ASSET_IDS) {
    assert.match(tradingViewSymbol(id), /^[A-Z]+:[A-Z0-9]+$/, id)
    assert.ok(iconSpec(id), id)
  }
})

test('chart symbols are unique, so two instruments never show the same chart', function() {
  const seen = new Set(ALL_ASSET_IDS.map(tradingViewSymbol))
  assert.equal(seen.size, ALL_ASSET_IDS.length)
})

test('forex charts are the pair on OANDA, and both legs get a flag', function() {
  for (const a of ASSETS.forex) {
    const [base, quote] = a.id.split('/')
    assert.equal(tradingViewSymbol(a.id), 'OANDA:' + base + quote)
    const icon = iconSpec(a.id)
    assert.deepEqual([icon.kind, icon.base, icon.quote], ['pair', base, quote])
  }
})

test('the specific choices that were verified and are easy to get wrong', function() {
  assert.equal(tradingViewSymbol('XAU/USD'), 'OANDA:XAUUSD')
  assert.equal(tradingViewSymbol('BTC/USD'), 'BINANCE:BTCUSDT')
  assert.equal(tradingViewSymbol('MATIC/USD'), 'BINANCE:POLUSDT', 'MATIC was renamed POL')
  assert.equal(tradingViewSymbol('Nat Gas'), 'OANDA:NATGASUSD')
  assert.equal(tradingViewSymbol('Copper'), 'OANDA:XCUUSD')
})

test('metals, energy and crypto get coins with a colour and a glyph', function() {
  for (const a of ASSETS.metals.concat(ASSETS.crypto)) {
    const icon = iconSpec(a.id)
    assert.equal(icon.kind, 'coin', a.id)
    assert.ok(icon.glyph && icon.fill && icon.ink, a.id)
  }
  assert.match(iconSpec('BTC/USD').fill, /f7931a/i)
})

test('unknown ids are handled, not thrown on', function() {
  for (const bad of ['', 'FOO/BAR', 'EUR/XXX', null, undefined, 42]) {
    assert.equal(tradingViewSymbol(bad), null)
    assert.equal(iconSpec(bad), null)
  }
  assert.equal(tradingViewUrl('nope'), 'https://www.tradingview.com/')
  assert.equal(tradingViewUrl('EUR/USD'), 'https://www.tradingview.com/chart/?symbol=OANDA%3AEURUSD')
})
