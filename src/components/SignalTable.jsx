import React from 'react'
import { SIGNAL_CONFIG, CONFIDENCE_CONFIG } from '../lib/assets.js'

function SignalBadge({ signal }) {
  var cfg = SIGNAL_CONFIG[signal] || SIGNAL_CONFIG.neutral
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 'var(--radius-sm)',
      background: cfg.bg, color: cfg.color,
      fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', fontWeight: 700,
      border: '1px solid ' + cfg.color + '55', whiteSpace: 'nowrap'
    }}>
      <span aria-hidden="true">{cfg.arrow}</span>
      {cfg.short}
    </span>
  )
}

function ScoreBar({ score, signal }) {
  var cfg = SIGNAL_CONFIG[signal] || SIGNAL_CONFIG.neutral
  // Server-side validation clamps this, but the UI defends too — an out-of-range
  // value used to flow straight into a CSS width.
  var n = Number(score)
  var safe = isFinite(n) ? Math.max(0, Math.min(100, n)) : null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 56, height: 6, background: 'var(--bg-deep)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: (safe === null ? 0 : safe) + '%', height: '100%', background: cfg.bar, borderRadius: 3, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', minWidth: 22 }}>
        {safe === null ? '—' : safe}
      </span>
    </div>
  )
}

function SortHeader({ label, sortKey, sort, onSort, className, hint }) {
  var active = sort.key === sortKey
  var indicator = active ? (sort.dir === 'desc' ? ' ↓' : ' ↑') : ''
  return (
    <th
      className={className}
      scope="col"
      aria-sort={active ? (sort.dir === 'desc' ? 'descending' : 'ascending') : 'none'}
      style={{ padding: 0, borderBottom: '1px solid var(--border-dim)', whiteSpace: 'nowrap', textAlign: 'left' }}
    >
      <button
        onClick={function() { onSort(sortKey) }}
        title={hint}
        style={{
          width: '100%', textAlign: 'left', padding: '10px 10px',
          background: 'transparent', border: 'none', minHeight: 0,
          fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)',
          letterSpacing: '0.5px',
          color: active ? 'var(--accent-cyan)' : 'var(--text-muted)',
          fontWeight: active ? 700 : 400
        }}
      >
        {label}{indicator}
      </button>
    </th>
  )
}

function PlainHeader({ label, className }) {
  return (
    <th className={className} scope="col" style={{
      padding: '10px', textAlign: 'left', fontFamily: 'var(--font-mono)',
      fontSize: 'var(--fs-xs)', letterSpacing: '0.5px', color: 'var(--text-muted)',
      fontWeight: 400, borderBottom: '1px solid var(--border-dim)'
    }}>
      {label}
    </th>
  )
}

function SkeletonRow() {
  return (
    <tr>
      {[0,1,2,3,4].map(function(i) {
        return (
          <td key={i} style={{ padding: '12px 10px' }}>
            <div style={{
              height: 12, background: 'var(--bg-raised)', borderRadius: 4,
              width: i === 0 ? 90 : i === 3 ? 140 : 54,
              animation: 'pulse 1.5s infinite'
            }} />
          </td>
        )
      })}
    </tr>
  )
}

export default function SignalTable({
  assets, signals, loading, onAnalyze, selectedAsset,
  sort, onSort, watchlist, onToggleWatch, emptyReason
}) {
  var showSkeleton = loading && assets.length > 0 && !signals[assets[0].id]

  return (
    <div style={{
      border: '1px solid var(--border-med)', borderRadius: 'var(--radius-lg)',
      overflow: 'hidden', background: 'var(--bg-surface)'
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 340 }}>
          <caption className="visually-hidden">
            Macro pressure signals by instrument. Activate a row to open its analysis.
          </caption>
          <thead>
            <tr style={{ background: 'var(--bg-raised)' }}>
              <PlainHeader label="" />
              <SortHeader label="ASSET" sortKey="asset" sort={sort} onSort={onSort} hint="Sort by name" />
              <SortHeader label="SIGNAL" sortKey="signal" sort={sort} onSort={onSort} hint="Sort by signal strength" />
              <SortHeader label="SCORE" sortKey="score" sort={sort} onSort={onSort} hint="Sort by macro pressure score" />
              <PlainHeader label="KEY DRIVERS" className="hide-mobile" />
              <SortHeader label="CONF" sortKey="confidence" sort={sort} onSort={onSort} className="hide-mobile" hint="Sort by evidence confidence" />
            </tr>
          </thead>
          <tbody>
            {showSkeleton && assets.map(function(_, i) { return <SkeletonRow key={i} /> })}

            {!showSkeleton && assets.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>
                  {emptyReason === 'no-match'
                    ? 'No instruments match the current filters.'
                    : 'No instruments in this category.'}
                </td>
              </tr>
            )}

            {!showSkeleton && assets.map(function(asset, i) {
              var sig = signals[asset.id]
              var confCfg = CONFIDENCE_CONFIG[(sig && sig.confidence)] || CONFIDENCE_CONFIG.low
              var isSelected = selectedAsset === asset.id
              var sigCfg = SIGNAL_CONFIG[(sig && sig.signal)] || SIGNAL_CONFIG.neutral
              var watched = watchlist.indexOf(asset.id) !== -1
              var activate = function() { onAnalyze(asset.id, (sig && sig.signal) || 'neutral') }

              return (
                <tr
                  key={asset.id}
                  className="row-interactive"
                  tabIndex={0}
                  role="button"
                  aria-label={'Open analysis for ' + asset.label + (sig ? ', ' + sigCfg.label : '')}
                  aria-pressed={isSelected}
                  onClick={activate}
                  onKeyDown={function(e) {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate() }
                  }}
                  style={{
                    borderBottom: i === assets.length - 1 ? 'none' : '1px solid var(--border-dim)',
                    background: isSelected ? sigCfg.bg : 'transparent',
                    borderLeft: '3px solid ' + (isSelected ? sigCfg.color : 'transparent')
                  }}
                >
                  <td style={{ padding: '10px 4px 10px 8px', width: 34 }}>
                    <button
                      onClick={function(e) { e.stopPropagation(); onToggleWatch(asset.id) }}
                      aria-label={(watched ? 'Remove ' : 'Add ') + asset.label + (watched ? ' from' : ' to') + ' watchlist'}
                      aria-pressed={watched}
                      style={{
                        background: 'transparent', border: 'none', padding: 4, minHeight: 28,
                        color: watched ? 'var(--amber)' : 'var(--text-dim)', fontSize: 'var(--fs-base)', lineHeight: 1
                      }}
                    >
                      {watched ? '★' : '☆'}
                    </button>
                  </td>

                  <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {asset.label}
                      {sig && sig.breaking && (
                        <span style={{
                          marginLeft: 6, fontSize: 'var(--fs-xs)', padding: '1px 6px', borderRadius: 3,
                          background: 'var(--amber-dim)', color: 'var(--amber)',
                          fontFamily: 'var(--font-mono)', fontWeight: 700,
                          border: '1px solid var(--amber)'
                        }}>
                          BREAKING
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                      {asset.category}
                    </div>
                  </td>

                  <td style={{ padding: '10px' }}>
                    {sig ? <SignalBadge signal={sig.signal} /> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>

                  <td style={{ padding: '10px' }}>
                    {sig ? <ScoreBar score={sig.score} signal={sig.signal} /> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>

                  <td className="hide-mobile" style={{ padding: '10px' }}>
                    {sig && sig.unavailable ? (
                      <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--amber)' }}>
                        Scoring unavailable for this group
                      </span>
                    ) : sig ? (
                      <div>
                        {(sig.supporting_factors || []).slice(0, 2).map(function(f, fi) {
                          return (
                            <div key={fi} style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 2, display: 'flex', gap: 6 }}>
                              <span aria-hidden="true" style={{ width: 4, height: 4, borderRadius: '50%', background: fi === 0 ? sigCfg.color : 'var(--border-med)', flexShrink: 0, marginTop: 6 }} />
                              <span>{f}</span>
                            </div>
                          )
                        })}
                        {sig.primary_driver && (
                          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: 3 }}>
                            {sig.primary_driver}
                          </div>
                        )}
                        {sig.conflicting && (
                          <span style={{
                            fontSize: 'var(--fs-xs)', padding: '1px 6px', borderRadius: 3,
                            background: 'var(--amber-dim)', color: 'var(--amber)',
                            border: '1px solid var(--amber)', display: 'inline-block', marginTop: 4
                          }}>
                            conflicting evidence
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                        {loading ? 'Analysing…' : 'Awaiting data'}
                      </span>
                    )}
                  </td>

                  <td className="hide-mobile" style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                    {sig ? (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: confCfg.color, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span aria-hidden="true" style={{ width: 5, height: 5, borderRadius: '50%', background: confCfg.color, flexShrink: 0 }} />
                        {confCfg.label}
                      </span>
                    ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
