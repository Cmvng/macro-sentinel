import React from 'react'
import { SIGNAL_CONFIG } from '../lib/assets.js'

export default function AnalysisPanel({ analysis, onClose, releaseBias }) {
  if (!analysis) return null

  var sigCfg = SIGNAL_CONFIG[analysis.signal] || SIGNAL_CONFIG.neutral

  return (
    <div style={{
      marginTop: '1rem',
      background: 'var(--bg-surface)',
      border: '0.5px solid var(--border-med)',
      borderLeft: '3px solid ' + sigCfg.color,
      borderRadius: 'var(--radius-lg)',
      padding: '1.25rem',
      animation: 'fadeIn 0.3s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: sigCfg.bg,
            border: '1px solid ' + sigCfg.border,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontFamily: 'var(--font-mono)',
            color: sigCfg.color, fontWeight: 700, flexShrink: 0
          }}>
            AI
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              {analysis.asset}
              <span style={{
                marginLeft: 8, fontSize: 10, padding: '2px 7px', borderRadius: 4,
                background: sigCfg.bg, color: sigCfg.color,
                fontFamily: 'var(--font-mono)', fontWeight: 700,
                border: '1px solid ' + sigCfg.border
              }}>
                {sigCfg.short}
              </span>
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2, letterSpacing: '0.5px' }}>
              FUNDAMENTAL ANALYSIS
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent', border: '0.5px solid var(--border-med)',
            borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)',
            fontSize: 14, width: 28, height: 28, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono)', flexShrink: 0
          }}
        >
          x
        </button>
      </div>

      {analysis.loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic' }}>
          <div style={{
            width: 16, height: 16, border: '2px solid var(--border-med)',
            borderTopColor: sigCfg.color, borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', flexShrink: 0
          }} />
          Analyzing {analysis.asset}...
        </div>
      )}

      {!analysis.loading && analysis.error && (
        <div style={{ color: 'var(--red)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
          Error: {analysis.error}
        </div>
      )}

      {!analysis.loading && !analysis.error && analysis.text && (
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.9 }}>
          {analysis.text}
        </div>
      )}

      {releaseBias && releaseBias.sources.length > 0 && (
        <div className="release-drivers">
          <span className="label">From today's data releases</span>
          <ul>
            {releaseBias.sources.map(function(src) {
              var up = src.effect > 0
              return <li key={src.title}>{src.title} <strong>{up ? '\u25b2 supports' : '\u25bc weighs on'}</strong> {analysis.asset}</li>
            })}
          </ul>
          {releaseBias.conflicting && <p className="release-warning" style={{ marginTop: 8 }}>These releases point in opposite directions, so the net bias is weak.</p>}
        </div>
      )}
    </div>
  )
}
