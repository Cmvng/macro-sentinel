import React, { useState } from 'react'
import { SIGNAL_CONFIG, getAssetById } from '../lib/assets.js'

// One line answer to "so what does today's data mean for my instruments?"
var LIMIT = 12

export default function BiasStrip({ bias, count }) {
  var [showAll, setShowAll] = useState(false)
  var all = (bias || []).filter(function(b) { return b.signal !== 'neutral' || b.conflicting })
  var shown = showAll ? all : all.slice(0, LIMIT)
  if (!shown.length) return null
  return (
    <section className="bias-strip" aria-label="Bias from released data">
      <div className="bias-strip__head">
        <div>
          <p className="eyebrow">FROM TODAY'S DATA</p>
          <h2>Bias from {count === 1 ? 'this release' : 'today’s releases'}</h2>
        </div>
        <span className="panel-caption">Fades over about six hours. A reaction guide, not a price forecast.</span>
      </div>
      <ul className="bias-strip__list">
        {shown.map(function(b, n) {
          var cfg = SIGNAL_CONFIG[b.signal] || SIGNAL_CONFIG.neutral
          var asset = getAssetById(b.asset)
          var label = asset ? asset.label : b.asset
          var mixed = b.conflicting && b.signal === 'neutral'
          return (
            <li key={b.asset} className="instrument-chip" title={b.sources.map(function(s) { return s.title }).join('\n')}
              style={{ '--i': n, background: mixed ? 'var(--amber-dim)' : cfg.bg, color: mixed ? 'var(--amber)' : cfg.color, borderColor: mixed ? 'var(--amber)' : cfg.border }}>
              <span className="instrument-chip__name">{label}</span>
              <span className="instrument-chip__sig">
                <span aria-hidden="true">{mixed ? '⇅' : cfg.arrow}</span> {mixed ? 'MIXED' : cfg.short}
              </span>
            </li>
          )
        })}
      </ul>
      {all.length > LIMIT && (
        <button type="button" className="link-button chip-more" onClick={function() { setShowAll(!showAll) }}>
          {showAll ? 'Show fewer' : 'Show all ' + all.length + ' instruments (gold, silver, crypto and more)'}
        </button>
      )}
    </section>
  )
}
