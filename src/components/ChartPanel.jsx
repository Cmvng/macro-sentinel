import React from 'react'
import AssetIcon from './AssetIcon.jsx'
import TradingViewChart from './TradingViewChart.jsx'
import { ASSETS, SIGNAL_CONFIG, getAssetById } from '../lib/assets.js'
import { tradingViewSymbol, tradingViewUrl } from '../lib/symbols.js'

var GROUPS = [
  { id: 'forex', label: 'Currencies' },
  { id: 'metals', label: 'Commodities' },
  { id: 'crypto', label: 'Digital assets' }
]

// The live price chart for whichever instrument is selected, next to what the
// app thinks of it: the macro signal and any bias from recent releases.
export default function ChartPanel({ assetId, onChange, signal, dataBias, theme }) {
  var asset = getAssetById(assetId)
  if (!asset) return null
  var cfg = SIGNAL_CONFIG[(signal && signal.signal) || 'neutral'] || SIGNAL_CONFIG.neutral
  var dataCfg = dataBias ? (SIGNAL_CONFIG[dataBias.signal] || SIGNAL_CONFIG.neutral) : null
  var mixed = dataBias && dataBias.conflicting && dataBias.signal === 'neutral'

  return (
    <section className="section-panel chart-panel rise" id="chart" aria-label={'Price chart for ' + asset.label}>
      <div className="chart-head">
        <AssetIcon id={asset.id} size={40} />
        <div className="chart-head__name">
          <p className="eyebrow">PRICE CHART</p>
          <h2>{asset.label} <span>{asset.desc}</span></h2>
        </div>

        <div className="chart-head__read">
          {signal ? (
            <span className="chart-badge" style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>
              <span aria-hidden="true">{cfg.arrow}</span> {cfg.short} <b>{signal.score}</b>
              <span className="visually-hidden">macro signal</span>
            </span>
          ) : <span className="chart-badge chart-badge--none">No signal yet</span>}
          {dataBias && (dataBias.signal !== 'neutral' || dataBias.conflicting) && (
            <span className="chart-badge" title="Bias from recent economic releases"
              style={mixed ? { color: 'var(--amber)', background: 'var(--amber-dim)', borderColor: 'var(--amber)' } : { color: dataCfg.color, background: dataCfg.bg, borderColor: dataCfg.border }}>
              DATA <span aria-hidden="true">{mixed ? '⇅' : dataCfg.arrow}</span> {mixed ? 'MIXED' : dataCfg.short}
            </span>
          )}
        </div>

        <label className="chart-picker">
          <span className="visually-hidden">Chart instrument</span>
          <select value={asset.id} onChange={function(e) { onChange(e.target.value) }}>
            {GROUPS.map(function(g) {
              return (
                <optgroup key={g.id} label={g.label}>
                  {(ASSETS[g.id] || []).map(function(a) { return <option key={a.id} value={a.id}>{a.label}</option> })}
                </optgroup>
              )
            })}
          </select>
        </label>
      </div>

      <TradingViewChart assetId={asset.id} label={asset.label} theme={theme} />

      <p className="chart-foot">
        Price chart by <a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer">TradingView</a>
        {' · '}<span className="chart-symbol">{tradingViewSymbol(asset.id)}</span>
        {' · '}<a href={tradingViewUrl(asset.id)} target="_blank" rel="noopener noreferrer">Open full chart</a>
        {' · '}Prices are from TradingView, not from MacroSentinel. The signal is macro pressure, not a price forecast.
      </p>
    </section>
  )
}
