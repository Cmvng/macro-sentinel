import React from 'react'
import { SIGNAL_CONFIG } from '../lib/assets.js'

export default function AnalysisPanel({ analysis, onClose }) {
  if (!analysis) return null
  const sigCfg = SIGNAL_CONFIG[analysis.signal] || SIGNAL_CONFIG.neutral

  return (
    <div style={{
      marginTop: '1rem', background: 'var(--bg-surface)',
      border: `0.5px solid ${sigCfg.color}44`,
      borderLeft: `2px solid ${sigCfg.color}`,
      borderRadius: 'var(--radius-lg)', padding: '1.25rem',
      animation: 'fadeIn 0.3s ease'
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: `${sigCfg.color}22`,
            border: `0.5px solid ${sigCfg.color}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontFamily: 'var(--font-mono)', color: sigCfg.color
          }}>
            AI
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 14,
              fontWeight: 700, color: 'var(--text-primary)'
            }}>
              {analysis.asset}
              <span style={{
                marginLeft: 8, fontSize: 10, padding: '2px 7px', borderRadius: 3,
                background: sigCfg.bg, color: sigCfg.color,
                fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.5px'
              }}>
                {sigCfg.short}
              </span>
            </div>
            <div style={{
              fontSize: 11, color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)', marginTop: 2
            }}>
              FUNDAMENTAL ANALYSIS
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'transparent', border: '0.5px solid var(--border-med)',
            borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)',
            fontSize: 12, padding: '2px 8px', cursor: 'pointer',
            fontFamily: 'var(--font-mono)'
          }}
        >
          ✕
        </button>
      </div>

      {analysis.loading ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          color: 'var(--text-muted)', fontSize: 13
        }}>
          <div style={{
            width: 14, height: 14, border: '1.5px solid var(--border-med)',
            borderTopColor: 'var(--accent-cyan)', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', flexShrink: 0
          }} />
          Running deep fundamental analysis...
        </div>
      ) : analysis.error ? (
        <div style={{ color: 'var(--red)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
          Error: {analysis.error}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          {analysis.text}
        </div>
      )}
    </div>
  )
}
