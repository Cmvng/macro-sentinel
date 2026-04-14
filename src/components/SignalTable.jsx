import React from 'react'
import { SIGNAL_CONFIG, CONFIDENCE_CONFIG } from '../lib/assets.js'

function ScoreBar({ score, signal }) {
  const cfg = SIGNAL_CONFIG[signal] || SIGNAL_CONFIG.neutral
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 72, height: 4, background: 'var(--bg-deep)',
        borderRadius: 2, overflow: 'hidden'
      }}>
        <div style={{
          width: `${score}%`, height: '100%', background: cfg.bar,
          borderRadius: 2, transition: 'width 0.6s ease'
        }} />
      </div>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 11,
        color: 'var(--text-secondary)', minWidth: 24
      }}>
        {score}
      </span>
    </div>
  )
}

function SignalBadge({ signal }) {
  const cfg = SIGNAL_CONFIG[signal] || SIGNAL_CONFIG.neutral
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 'var(--radius-sm)',
      background: cfg.bg, color: cfg.color,
      fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
      letterSpacing: '0.5px', border: `0.5px solid ${cfg.color}33`,
      whiteSpace: 'nowrap'
    }}>
      {cfg.short}
    </span>
  )
}

function SkeletonRow() {
  return (
    <tr>
      {[...Array(6)].map((_, i) => (
        <td key={i} style={{ padding: '12px 14px' }}>
          <div style={{
            height: 14, background: 'var(--bg-raised)', borderRadius: 4,
            width: i === 0 ? 80 : i === 3 ? 140 : 60,
            animation: 'pulse 1.5s infinite'
          }} />
        </td>
      ))}
    </tr>
  )
}

export default function SignalTable({ assets, signals, loading, onAnalyze }) {
  const cols = ['ASSET', 'SIGNAL', 'SCORE', 'KEY DRIVERS', 'CONFIDENCE', 'ANALYSIS']

  return (
    <div style={{
      border: '0.5px solid var(--border-med)', borderRadius: 'var(--radius-lg)',
      overflow: 'hidden', background: 'var(--bg-surface)'
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--bg-raised)' }}>
            {cols.map(c => (
              <th key={c} style={{
                padding: '10px 14px', textAlign: 'left',
                fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '1px',
                color: 'var(--text-muted)', fontWeight: 400,
                borderBottom: '0.5px solid var(--border-dim)', whiteSpace: 'nowrap'
              }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && !signals[assets[0]?.id]
            ? assets.map((_, i) => <SkeletonRow key={i} />)
            : assets.map((asset, i) => {
                const sig = signals[asset.id]
                const sigCfg = SIGNAL_CONFIG[sig?.signal] || SIGNAL_CONFIG.neutral
                const confCfg = CONFIDENCE_CONFIG[sig?.confidence] || CONFIDENCE_CONFIG.low
                return (
                  <tr
                    key={asset.id}
                    style={{
                      borderBottom: i < assets.length - 1 ? '0.5px solid var(--border-dim)' : 'none',
                      transition: 'background 0.15s',
                      animation: `fadeIn 0.3s ease ${i * 0.05}s both`
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15, lineHeight: 1 }}>{asset.flag}</span>
                        <div>
                          <div style={{
                            fontFamily: 'var(--font-mono)', fontSize: 12,
                            fontWeight: 700, color: 'var(--text-primary)'
                          }}>
                            {asset.label}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                            {asset.category}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      {sig
                        ? <SignalBadge signal={sig.signal} />
                        : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>—</span>
                      }
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      {sig
                        ? <ScoreBar score={sig.score} signal={sig.signal} />
                        : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>—</span>
                      }
                    </td>

                    <td style={{ padding: '12px 14px', maxWidth: 200 }}>
                      {sig ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {(sig.supporting_factors || [sig.primary_driver])
                            .filter(Boolean)
                            .slice(0, 3)
                            .map((f, fi) => (
                              <span key={fi} style={{
                                fontSize: 10, padding: '2px 6px', borderRadius: 3,
                                background: 'var(--bg-deep)', color: 'var(--text-secondary)',
                                border: '0.5px solid var(--border-dim)', fontFamily: 'var(--font-body)'
                              }}>
                                {f.length > 28 ? f.slice(0, 27) + '…' : f}
                              </span>
                            ))
                          }
                          {sig.conflicting && (
                            <span style={{
                              fontSize: 10, padding: '2px 6px', borderRadius: 3,
                              background: 'var(--amber-dim)', color: 'var(--amber)',
                              border: '0.5px solid rgba(255,171,0,0.2)'
                            }}>
                              conflicting
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Awaiting data</span>
                      )}
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      {sig ? (
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: 10,
                          color: confCfg.color, display: 'flex', alignItems: 'center', gap: 4
                        }}>
                          <span style={{
                            width: 5, height: 5, borderRadius: '50%',
                            background: confCfg.color, flexShrink: 0
                          }} />
                          {confCfg.label}
                        </span>
                      ) : (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      <button
                        onClick={() => onAnalyze(asset.id, sig?.signal || 'neutral')}
                        style={{
                          padding: '4px 10px', background: 'transparent',
                          border: '0.5px solid var(--border-med)', borderRadius: 'var(--radius-sm)',
                          color: 'var(--accent-cyan)', fontSize: 10,
                          fontFamily: 'var(--font-mono)', letterSpacing: '0.3px',
                          cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap'
                        }}
                        onMouseOver={e => {
                          e.target.style.background = 'var(--accent-cyan-dim)'
                          e.target.style.borderColor = 'var(--accent-cyan)'
                        }}
                        onMouseOut={e => {
                          e.target.style.background = 'transparent'
                          e.target.style.borderColor = 'var(--border-med)'
                        }}
                      >
                        ANALYZE ↗
                      </button>
                    </td>
                  </tr>
                )
              })
          }
        </tbody>
      </table>
    </div>
  )
}
