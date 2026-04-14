import React from 'react'

export default function MarketHeader({
  dominantTheme, marketSummary, lastUpdate, loading, newsLoading,
  newsCount, bullCount, bearCount, onRefresh, activeTab, setActiveTab
}) {
  var tabs = [
    { id: 'forex', label: 'FOREX' },
    { id: 'metals', label: 'METALS' },
    { id: 'crypto', label: 'CRYPTO' },
  ]

  return (
    <div style={{ paddingTop: '1rem', paddingBottom: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--text-primary)', lineHeight: 1 }}>
            CMVNG <span style={{ color: 'var(--accent-cyan)' }}>APPSENTINEL</span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginTop: 3, letterSpacing: '1px' }}>
            MACRO FUNDAMENTAL SENTIMENT INTELLIGENCE
          </div>
          {dominantTheme && (
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--amber)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ color: 'var(--text-muted)' }}>THEME:</span>
              {dominantTheme.toUpperCase()}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', background: 'var(--bg-surface)', border: '0.5px solid var(--border-med)', borderRadius: 'var(--radius-md)', fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, background: loading || newsLoading ? 'var(--amber)' : 'var(--green)', animation: 'pulse 1.5s infinite' }} />
            {loading ? 'ANALYZING' : newsLoading ? 'FETCHING' : 'LIVE'}
          </div>
          {lastUpdate && (
            <div style={{ padding: '4px 8px', background: 'var(--bg-surface)', border: '0.5px solid var(--border-dim)', borderRadius: 'var(--radius-md)', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {lastUpdate.toLocaleTimeString()}
            </div>
          )}
          <button
            onClick={onRefresh}
            disabled={loading}
            style={{ padding: '4px 12px', background: 'transparent', border: '0.5px solid var(--accent-cyan)', borderRadius: 'var(--radius-md)', color: 'var(--accent-cyan)', fontSize: 10, fontFamily: 'var(--font-mono)', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
          >
            REFRESH
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6, marginBottom: '1rem' }}>
        {[
          { label: 'BULLISH', val: bullCount, col: 'var(--green)' },
          { label: 'BEARISH', val: bearCount, col: 'var(--red)' },
          { label: 'NEWS', val: newsCount, col: 'var(--accent-cyan)' },
        ].map(function(s) {
          return (
            <div key={s.label} style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border-dim)', borderRadius: 'var(--radius-md)', padding: '8px 10px' }}>
              <div style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.8px', marginBottom: 3 }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: s.col, fontFamily: 'var(--font-display)' }}>{s.val}</div>
            </div>
          )
        })}
      </div>

      {marketSummary && (
        <div style={{ padding: '8px 12px', background: 'var(--bg-surface)', border: '0.5px solid var(--border-dim)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '0.75rem', borderLeft: '2px solid var(--accent-cyan)' }}>
          {marketSummary}
        </div>
      )}

      <div style={{ display: 'flex', gap: 3, background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: 3, width: 'fit-content', border: '0.5px solid var(--border-dim)' }}>
        {tabs.map(function(t) {
          return (
            <button
              key={t.id}
              onClick={function() { setActiveTab(t.id) }}
              style={{ padding: '5px 16px', border: 'none', borderRadius: 5, background: activeTab === t.id ? 'var(--bg-raised)' : 'transparent', color: activeTab === t.id ? 'var(--accent-cyan)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.8px', cursor: 'pointer', boxShadow: activeTab === t.id ? '0 0 0 0.5px var(--border-med)' : 'none', transition: 'all 0.15s' }}
            >
              {t.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
