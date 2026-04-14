import React from 'react'
import { SIGNAL_CONFIG, CONFIDENCE_CONFIG } from '../lib/assets.js'

function FlagBadge({ flag, signal }) {
  var cfg = SIGNAL_CONFIG[signal] || SIGNAL_CONFIG.neutral
  return (
    <div style={{
      width: 30, height: 30, borderRadius: 6, flexShrink: 0,
      background: cfg.bg, border: '0.5px solid ' + cfg.color + '44',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 700,
      color: cfg.color, letterSpacing: '0.5px'
    }}>
      {flag}
    </div>
  )
}

function ScoreBar({ score, signal }) {
  var cfg = SIGNAL_CONFIG[signal] || SIGNAL_CONFIG.neutral
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 60, height: 4, background: 'var(--bg-deep)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: score + '%', height: '100%', background: cfg.bar, borderRadius: 2, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)', minWidth: 20 }}>
        {score}
      </span>
    </div>
  )
}

function SignalBadge({ signal }) {
  var cfg = SIGNAL_CONFIG[signal] || SIGNAL_CONFIG.neutral
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 6px', borderRadius: 'var(--radius-sm)',
      background: cfg.bg, color: cfg.color,
      fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
      letterSpacing: '0.3px', border: '0.5px solid ' + cfg.color + '44',
      whiteSpace: 'nowrap'
    }}>
      {cfg.short}
    </span>
  )
}

function BreakingBadge() {
  return (
    <span style={{
      fontSize: 8, padding: '1px 4px', borderRadius: 3,
      background: 'var(--amber-dim)', color: 'var(--amber)',
      fontFamily: 'var(--font-mono)', fontWeight: 700,
      border: '0.5px solid var(--amber)', marginLeft: 4
    }}>
      LIVE
    </span>
  )
}

function SkeletonRow() {
  return (
    <tr>
      {[0,1,2,3].map(function(i) {
        return (
          <td key={i} style={{ padding: '10px 8px' }}>
            <div style={{
              height: 12, background: 'var(--bg-raised)', borderRadius: 4,
              width: i === 0 ? 90 : i === 2 ? 120 : 50,
              animation: 'pulse 1.5s infinite'
            }} />
          </td>
        )
      })}
    </tr>
  )
}

export default function SignalTable({ assets, signals, loading, onAnalyze, selectedAsset }) {
  return (
    <div style={{
      border: '0.5px solid var(--border-med)', borderRadius: 'var(--radius-lg)',
      overflow: 'hidden', background: 'var(--bg-surface)'
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 340 }}>
          <thead>
            <tr style={{ background: 'var(--bg-raised)' }}>
              <th style={{ padding: '9px 8px', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '1px', color: 'var(--text-muted)', fontWeight: 400, borderBottom: '0.5px solid var(--border-dim)', whiteSpace: 'nowrap' }}>ASSET</th>
              <th style={{ padding: '9px 8px', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '1px', color: 'var(--text-muted)', fontWeight: 400, borderBottom: '0.5px solid var(--border-dim)', whiteSpace: 'nowrap' }}>SIGNAL</th>
              <th className="hide-mobile" style={{ padding: '9px 8px', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '1px', color: 'var(--text-muted)', fontWeight: 400, borderBottom: '0.5px solid var(--border-dim)', whiteSpace: 'nowrap' }}>SCORE</th>
              <th style={{ padding: '9px 8px', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '1px', color: 'var(--text-muted)', fontWeight: 400, borderBottom: '0.5px solid var(--border-dim)' }}>KEY DRIVERS</th>
              <th className="hide-mobile" style={{ padding: '9px 8px', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '1px', color: 'var(--text-muted)', fontWeight: 400, borderBottom: '0.5px solid var(--border-dim)', whiteSpace: 'nowrap' }}>CONF</th>
              <th style={{ padding: '9px 8px', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '1px', color: 'var(--text-muted)', fontWeight: 400, borderBottom: '0.5px solid var(--border-dim)', whiteSpace: 'nowrap' }}>AI</th>
            </tr>
          </thead>
          <tbody>
            {loading && (!signals || !signals[assets[0] && assets[0].id])
              ? assets.map(function(_, i) { return <SkeletonRow key={i} /> })
              : assets.map(function(asset, i) {
                  var sig = signals[asset.id]
                  var confCfg = CONFIDENCE_CONFIG[(sig && sig.confidence)] || CONFIDENCE_CONFIG.low
                  var isLast = i === assets.length - 1
                  var isSelected = selectedAsset === asset.id
                  var sigCfg = SIGNAL_CONFIG[(sig && sig.signal)] || SIGNAL_CONFIG.neutral

                  return (
                    <tr
                      key={asset.id}
                      onClick={function() { onAnalyze(asset.id, (sig && sig.signal) || 'neutral') }}
                      style={{
                        borderBottom: isLast ? 'none' : '0.5px solid var(--border-dim)',
                        transition: 'background 0.15s',
                        cursor: 'pointer',
                        background: isSelected ? sigCfg.bg : 'transparent',
                        borderLeft: isSelected ? '2px solid ' + sigCfg.color : '2px solid transparent'
                      }}
                      onMouseOver={function(e) { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)' }}
                      onMouseOut={function(e) { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                    >
                      <td style={{ padding: '9px 8px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <FlagBadge flag={asset.flag} signal={(sig && sig.signal) || 'neutral'} />
                          <div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
                              {asset.label}
                              {sig && sig.breaking && <BreakingBadge />}
                            </div>
                            <span style={{ fontSize: 8, padding: '1px 4px', borderRadius: 3, background: 'var(--bg-deep)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', border: '0.5px solid var(--border-dim)' }}>
                              {asset.category}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '9px 8px' }}>
                        {sig ? <SignalBadge signal={sig.signal} /> : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>—</span>}
                      </td>

                      <td className="hide-mobile" style={{ padding: '9px 8px' }}>
                        {sig ? <ScoreBar score={sig.score} signal={sig.signal} /> : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>—</span>}
                      </td>

                      <td style={{ padding: '9px 8px' }}>
                        {sig && sig.supporting_factors ? (
                          <div>
                            {sig.supporting_factors.slice(0, 2).map(function(f, fi) {
                              return (
                                <div key={fi} style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 2, display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: fi === 0 ? sigCfg.color : 'var(--border-med)', flexShrink: 0, marginTop: 5 }} />
                                  {f}
                                </div>
                              )
                            })}
                            {sig.primary_driver && (
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, fontStyle: 'italic' }}>
                                {sig.primary_driver}
                              </div>
                            )}
                            {sig.conflicting && (
                              <span style={{ fontSize: 8, padding: '1px 4px', borderRadius: 3, background: 'var(--amber-dim)', color: 'var(--amber)', border: '0.5px solid rgba(230,81,0,0.2)', display: 'inline-block', marginTop: 2 }}>
                                conflicting
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{loading ? 'Analyzing...' : 'Awaiting data'}</span>
                        )}
                      </td>

                      <td className="hide-mobile" style={{ padding: '9px 8px', whiteSpace: 'nowrap' }}>
                        {sig ? (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: confCfg.color, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <span style={{ width: 4, height: 4, borderRadius: '50%', background: confCfg.color, flexShrink: 0 }} />
                            {confCfg.label}
                          </span>
                        ) : <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>—</span>}
                      </td>

                      <td style={{ padding: '9px 8px' }}>
                        <button
                          onClick={function(e) { e.stopPropagation(); onAnalyze(asset.id, (sig && sig.signal) || 'neutral') }}
                          style={{
                            padding: '3px 8px', background: isSelected ? sigCfg.bg : 'transparent',
                            border: '0.5px solid ' + (isSelected ? sigCfg.color : 'var(--border-med)'),
                            borderRadius: 'var(--radius-sm)',
                            color: isSelected ? sigCfg.color : 'var(--text-secondary)',
                            fontSize: 9, fontFamily: 'var(--font-mono)',
                            cursor: 'pointer', whiteSpace: 'nowrap'
                          }}
                        >
                          AI
                        </button>
                      </td>
                    </tr>
                  )
                })
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}
