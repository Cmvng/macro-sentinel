import React, { useMemo } from 'react'

export default function Ticker({ news }) {
  const items = useMemo(() =>
    news.slice(0, 12).map(n => n.title).filter(Boolean),
    [news]
  )

  if (!items.length) return (
    <div style={{
      height: 32, background: 'var(--bg-deep)', borderBottom: '0.5px solid var(--border-dim)',
      display: 'flex', alignItems: 'center', paddingLeft: 16,
      fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.5px'
    }}>
      MACROSENTINEL — FETCHING LIVE DATA...
    </div>
  )

  const doubled = [...items, ...items]

  return (
    <div style={{
      height: 32, background: 'var(--bg-deep)', borderBottom: '0.5px solid var(--border-dim)',
      overflow: 'hidden', display: 'flex', alignItems: 'center', position: 'relative'
    }}>
      <div style={{
        flexShrink: 0, padding: '0 12px', height: '100%',
        display: 'flex', alignItems: 'center',
        background: 'var(--accent-cyan)', zIndex: 1
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
          color: '#000', letterSpacing: '1px'
        }}>
          LIVE
        </span>
      </div>

      <div style={{
        flex: 1, overflow: 'hidden',
        maskImage: 'linear-gradient(90deg, transparent 0, black 40px, black calc(100% - 40px), transparent 100%)'
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          animation: `ticker ${items.length * 8}s linear infinite`,
          whiteSpace: 'nowrap', gap: 0
        }}>
          {doubled.map((t, i) => (
            <React.Fragment key={i}>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 10,
                color: 'var(--text-muted)', padding: '0 24px'
              }}>
                {t}
              </span>
              <span style={{ color: 'var(--accent-cyan)', fontSize: 10, opacity: 0.4 }}>◆</span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}
