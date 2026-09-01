import React from 'react'
import { SIGNAL_CONFIG } from '../lib/assets.js'

export default function AnalysisPanel({ analysis, onClose, onRetry }) {
  if (!analysis) return null
  var sigCfg = SIGNAL_CONFIG[analysis.signal] || SIGNAL_CONFIG.neutral

  return (
    <section
      aria-label={'Analysis for ' + analysis.asset}
      aria-busy={analysis.loading ? 'true' : 'false'}
      style={{
        marginTop: '1rem',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-med)',
        borderLeft: '3px solid ' + sigCfg.color,
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        animation: 'fadeIn 0.3s ease'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-lg)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {analysis.asset}
            <span style={{
              marginLeft: 10, fontSize: 'var(--fs-xs)', padding: '3px 8px', borderRadius: 4,
              background: sigCfg.bg, color: sigCfg.color,
              fontFamily: 'var(--font-mono)', fontWeight: 700,
              border: '1px solid ' + sigCfg.color + '55', verticalAlign: 'middle'
            }}>
              {sigCfg.short}
            </span>
          </h2>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 4, letterSpacing: '0.5px' }}>
            FUNDAMENTAL ANALYSIS{analysis.cached ? ' · CACHED' : ''}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close analysis"
          style={{
            background: 'transparent', border: '1px solid var(--border-med)',
            borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)',
            fontSize: 'var(--fs-base)', width: 32, height: 32, minHeight: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}
        >
          ✕
        </button>
      </div>

      {analysis.loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>
          <div aria-hidden="true" style={{
            width: 16, height: 16, border: '2px solid var(--border-med)',
            borderTopColor: sigCfg.color, borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', flexShrink: 0
          }} />
          Analysing {analysis.asset}…
        </div>
      )}

      {!analysis.loading && analysis.error && (
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <div style={{ color: 'var(--red)', marginBottom: 8 }}>
            Analysis could not be generated for {analysis.asset}.
          </div>
          <div style={{ color: 'var(--text-muted)', marginBottom: 12 }}>
            Nothing has been fabricated in its place. The signal and score above still
            reflect the last completed scoring run.
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              style={{
                padding: '6px 14px', background: 'transparent',
                border: '1px solid var(--border-med)', borderRadius: 'var(--radius-sm)',
                color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)'
              }}
            >
              Try again
            </button>
          )}
        </div>
      )}

      {!analysis.loading && !analysis.error && analysis.text && (
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', lineHeight: 1.85 }}>
          {analysis.text}
        </div>
      )}
    </section>
  )
}
