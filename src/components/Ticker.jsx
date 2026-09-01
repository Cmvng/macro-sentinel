import React, { useMemo } from 'react'

// Pausable on hover and on keyboard focus (see .ticker-mask in index.css), and
// fully disabled under prefers-reduced-motion. It previously scrolled forever
// with no way to stop it.
export default function Ticker({ news }) {
  var items = useMemo(function() {
    return news.slice(0, 12).map(function(n) { return n.title }).filter(Boolean)
  }, [news])

  var shellStyle = {
    height: 34,
    background: 'var(--bg-deep)',
    borderBottom: '1px solid var(--border-dim)',
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden'
  }

  if (!items.length) {
    return (
      <div style={Object.assign({}, shellStyle, { paddingLeft: 16 })}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
          MACROSENTINEL — LOADING HEADLINES…
        </span>
      </div>
    )
  }

  var doubled = items.concat(items)

  return (
    <div style={shellStyle}>
      <div style={{
        flexShrink: 0, padding: '0 12px', height: '100%',
        display: 'flex', alignItems: 'center',
        background: 'var(--accent-cyan)', zIndex: 1
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', fontWeight: 700, color: '#fff', letterSpacing: '1px' }}>
          LIVE
        </span>
      </div>
      <div
        className="ticker-mask"
        tabIndex={0}
        aria-label="Scrolling headlines. Focus or hover to pause."
        style={{ flex: 1, overflow: 'hidden', height: '100%', display: 'flex', alignItems: 'center' }}
      >
        <div
          className="ticker-track"
          style={{
            display: 'flex', whiteSpace: 'nowrap',
            animationDuration: (items.length * 8) + 's'
          }}
        >
          {doubled.map(function(t, i) {
            return (
              <span key={i} style={{
                fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)',
                color: 'var(--text-secondary)', padding: '0 22px', flexShrink: 0
              }}>
                {t}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
