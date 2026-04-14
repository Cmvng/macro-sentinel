import React from 'react'

export default function MarketHeader({
  dominantTheme, marketSummary, lastUpdate, loading, newsLoading,
  newsCount, bullCount, bearCount, totalCostUSD, callCount,
  onRefresh, onChangeKey, activeTab, setActiveTab
}) {
  const tabs = [
    { id: 'forex', label: 'FOREX' },
    { id: 'metals', label: 'METALS' },
    { id: 'crypto', label: 'CRYPTO' },
  ]

  return (
    <div style={{ paddingTop: '1.5rem', paddingBottom: '1rem' }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: '1.25rem', flexWrap: 'wrap', gap: 12
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800,
            letterSpacing: '-0.5px', color: 'var(--text-primary)', lineHeight: 1
          }}>
            MACRO<span style={{ color: 'var(--accent-cyan)' }}>SENTINEL</span>
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)',
            marginTop: 4, letterSpacing: '1px'
          }}>
            FUNDAMENTAL SENTIMENT INTELLIGENCE
          </div>
          {dominantTheme && (
            <div style={{
              marginTop: 8, fontSize: 12, color: 'var(--amber)',
              fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 6
            }}>
              <span style={{ color: 'var(--text-muted)' }}>THEME:</span>
              {dominantTheme.toUpperCase()}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px',
            background: 'var(--bg-surface)', border: '0.5px solid var(--border-med)',
            borderRadius: 'var(--radius-md)', fontSize: 11, color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)'
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: loading || newsLoading ? 'var(--amber)' : 'var(--green)',
              animation: 'pulse 1.5s infinite'
            }} />
            {loading ? 'ANALYZING' : newsLoading ? 'FETCHING' : 'LIVE'}
          </div>

          {lastUpdate && (
            <div style={{
              padding: '5px 10px', background: 'var(--bg-surface)',
              border: '0.5px solid var(--border-dim)', borderRadius: 'var(--radius-md)',
              fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)'
            }}>
              {lastUpdate.toLocaleTimeString()}
            </div>
          )}

          <button
            onClick={onRefresh}
            disabled={loading}
            style={{
              padding: '5px 14px', background: 'transparent',
              border: '0.5px solid var(--accent-cyan)', borderRadius: 'var(--radius-md)',
              color: 'var(--accent-cyan)', fontSize: 11, fontFamily: 'var(--font-mono)',
              letterSpacing: '0.5px', cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1
            }}
          >
            ↻ REFRESH
          </button>

          <button
            onClick={onChangeKey}
            style={{
              padding: '5px 10px', background: 'transparent',
              border: '0.5px solid var(--border-med)', borderRadius: 'var(--radius-md)',
              color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)',
              cursor: 'pointer'
            }}
          >
            ⚙ KEY
          </button>
        </div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
        gap: 8, marginBottom: '1.25rem'
      }}>
        {[
          { label: 'BULLISH',      val: bullCount,                   col: 'var(--green)' },
          { label: 'BEARISH',      val: bearCount,                   col: 'var(--red)' },
          { label: 'NEWS ITEMS',   val: newsCount,                   col: 'var(--accent-cyan)' },
          { label: 'AI CALLS',     val: callCount,                   col: 'var(--text-secondary)' },
          { label: 'SESSION COST', val: `$${totalCostUSD.toFixed(4)}`, col: 'var(--amber)' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--bg-surface)', border: '0.5px solid var(--border-dim)',
            borderRadius: 'var(--radius-md)', padding: '10px 12px'
          }}>
            <div style={{
              fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
              letterSpacing: '0.8px', marginBottom: 4
            }}>
              {s.label}
            </div>
            <div style={{
              fontSize: 20, fontWeight: 600, color: s.col,
              fontFamily: 'var(--font-display)'
            }}>
              {s.val}
            </div>
          </div>
        ))}
      </div>

      {marketSummary && (
        <div style={{
          padding: '10px 14px', background: 'var(--bg-surface)',
          border: '0.5px solid var(--border-dim)', borderRadius: 'var(--radius-md)',
          fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6,
          marginBottom: '1rem', borderLeft: '2px solid var(--accent-cyan)'
        }}>
          {marketSummary}
        </div>
      )}

      <div style={{
        display: 'flex', gap: 4, background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-md)', padding: 3,
        width: 'fit-content', border: '0.5px solid var(--border-dim)'
      }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '6px 20px', border: 'none', borderRadius: 6,
              background: activeTab === t.id ? 'var(--bg-raised)' : 'transparent',
              color: activeTab === t.id ? 'var(--accent-cyan)' : 'var(--text-muted)',
              fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.8px',
              cursor: 'pointer',
              boxShadow: activeTab === t.id ? '0 0 0 0.5px var(--border-med)' : 'none',
              transition: 'all 0.15s'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}
