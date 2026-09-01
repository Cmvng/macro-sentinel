import React from 'react'

var STATUS = {
  live:    { label: 'LIVE',    color: 'var(--green)',  dot: 'var(--green)' },
  delayed: { label: 'DELAYED', color: 'var(--amber)',  dot: 'var(--amber)' },
  partial: { label: 'PARTIAL', color: 'var(--amber)',  dot: 'var(--amber)' },
  stale:   { label: 'STALE',   color: 'var(--red)',    dot: 'var(--red)' },
  error:   { label: 'OFFLINE', color: 'var(--red)',    dot: 'var(--red)' }
}

function formatAge(min) {
  if (min === null || min === undefined) return 'unknown'
  if (min < 1) return 'just now'
  if (min < 60) return min + 'm ago'
  var h = Math.floor(min / 60)
  if (h < 24) return h + 'h ' + (min % 60) + 'm ago'
  return Math.floor(h / 24) + 'd ago'
}

export default function MarketHeader({
  dominantTheme, marketSummary, status, ageMinutes, partialAgeMinutes,
  degradedGroups, totalGroups, newsHealth, newsCount, refreshing, onRefresh,
  bullCount, bearCount, tabLabel, activeTab, setActiveTab
}) {
  var tabs = [
    { id: 'forex', label: 'FOREX' },
    { id: 'metals', label: 'METALS' },
    { id: 'crypto', label: 'CRYPTO' }
  ]
  var st = STATUS[status] || STATUS.live

  var detail = []
  // Age is the API's own figure. It used to be replaced with the client clock,
  // so day-old data displayed the current time.
  detail.push('Signals ' + formatAge(ageMinutes))
  if (partialAgeMinutes !== null && partialAgeMinutes !== undefined) {
    detail.push('partial update ' + formatAge(partialAgeMinutes))
  }
  if (newsHealth) detail.push(newsHealth.healthy + '/' + newsHealth.total + ' feeds')
  if (degradedGroups > 0) detail.push(degradedGroups + '/' + totalGroups + ' groups degraded')

  return (
    <div style={{ paddingTop: '1rem', paddingBottom: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xl)', fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--text-primary)', lineHeight: 1.1 }}>
            MACRO<span style={{ color: 'var(--accent-cyan)' }}>SENTINEL</span>
          </h1>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: 4, letterSpacing: '0.5px' }}>
            MACRO FUNDAMENTAL SENTIMENT INTELLIGENCE
          </div>
          {dominantTheme && (
            <div style={{ marginTop: 8, fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: 'var(--text-muted)' }}>THEME: </span>
              {dominantTheme.toUpperCase()}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div
            role="status"
            aria-live="polite"
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
              background: 'var(--bg-surface)', border: '1px solid var(--border-med)',
              borderRadius: 'var(--radius-md)', fontSize: 'var(--fs-xs)',
              color: st.color, fontFamily: 'var(--font-mono)', fontWeight: 700
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: st.dot }} />
            {st.label}
          </div>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            style={{
              padding: '6px 12px', background: 'var(--bg-surface)',
              border: '1px solid var(--border-med)', borderRadius: 'var(--radius-md)',
              color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)',
              fontSize: 'var(--fs-xs)', opacity: refreshing ? 0.6 : 1
            }}
          >
            {refreshing ? 'REFRESHING…' : 'REFRESH'}
          </button>
        </div>
      </div>

      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)',
        color: 'var(--text-muted)', marginBottom: '0.75rem'
      }}>
        {detail.join(' · ')}
      </div>

      {(status === 'stale' || status === 'partial' || status === 'delayed') && (
        <div style={{
          padding: '10px 14px', marginBottom: '0.75rem',
          background: status === 'stale' ? 'var(--red-dim)' : 'var(--amber-dim)',
          border: '1px solid ' + (status === 'stale' ? 'var(--red)' : 'var(--amber)'),
          borderRadius: 'var(--radius-md)', fontSize: 'var(--fs-xs)',
          color: status === 'stale' ? 'var(--red)' : 'var(--amber)', lineHeight: 1.6
        }}>
          {status === 'stale' && 'These signals are more than a day old and may no longer reflect current conditions.'}
          {status === 'delayed' && 'These signals are not from the most recent hour. Treat them as indicative.'}
          {status === 'partial' && 'Macro intelligence is incomplete — some sources or scoring groups did not respond. Affected instruments may show reduced confidence.'}
        </div>
      )}

      {marketSummary && (
        <div style={{
          padding: '10px 14px', background: 'var(--bg-surface)',
          border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-md)',
          fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', lineHeight: 1.6,
          marginBottom: '0.75rem', borderLeft: '3px solid var(--accent-cyan)'
        }}>
          {marketSummary}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginBottom: '1rem' }}>
        {[
          { label: 'BULLISH', sub: tabLabel, val: bullCount, col: 'var(--green)' },
          { label: 'BEARISH', sub: tabLabel, val: bearCount, col: 'var(--red)' },
          { label: 'ARTICLES', sub: 'analysed', val: newsCount, col: 'var(--accent-cyan)' }
        ].map(function(s) {
          return (
            <div key={s.label} style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border-dim)',
              borderRadius: 'var(--radius-md)', padding: '10px 12px'
            }}>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.5px', marginBottom: 4 }}>
                {s.label} <span style={{ opacity: 0.75 }}>· {s.sub}</span>
              </div>
              <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, color: s.col, fontFamily: 'var(--font-display)' }}>
                {s.val}
              </div>
            </div>
          )
        })}
      </div>

      <div role="tablist" aria-label="Asset class" style={{
        display: 'flex', gap: 4, background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-md)', padding: 4,
        width: 'fit-content', border: '1px solid var(--border-dim)'
      }}>
        {tabs.map(function(t) {
          var on = activeTab === t.id
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={on}
              onClick={function() { setActiveTab(t.id) }}
              style={{
                padding: '7px 18px', border: 'none', borderRadius: 5,
                background: on ? 'var(--accent-cyan)' : 'transparent',
                color: on ? '#fff' : 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)',
                letterSpacing: '0.8px', fontWeight: on ? 700 : 400
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
