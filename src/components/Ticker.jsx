import React, { useMemo } from 'react'

export default function Ticker({ news }) {
  var items = useMemo(function() {
    return news.slice(0, 12).map(function(n) { return n.title }).filter(Boolean)
  }, [news])

  if (!items.length) {
    return (
      <div style={{
        height: 32,
        background: 'var(--bg-deep)',
        borderBottom: '0.5px solid var(--border-dim)',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 16,
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        color: 'var(--text-muted)',
        letterSpacing: '0.5px'
      }}>
        MACROSENTINEL — FETCHING LIVE DATA...
      </div>
    )
  }

  var doubled = items.concat(items)

  var labelStyle = {
    flexShrink: 0,
    padding: '0 12px',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    background: 'var(--accent-cyan)',
    zIndex: 1
  }

  var spanStyle = {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    fontWeight: 700,
    color: '#ffffff',
    letterSpacing: '1px'
  }

  var maskStyle = {
    flex: 1,
    overflow: 'hidden',
    maskImage: 'linear-gradient(90deg, transparent 0, black 40px, black calc(100% - 40px), transparent 100%)'
  }

  var scrollStyle = {
    display: 'flex',
    alignItems: 'center',
    animation: 'ticker ' + (items.length * 8) + 's linear infinite',
    whiteSpace: 'nowrap'
  }

  return (
    <div style={{
      height: 32,
      background: 'var(--bg-deep)',
      borderBottom: '0.5px solid var(--border-med)',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      position: 'relative'
    }}>
      <div style={labelStyle}>
        <span style={spanStyle}>LIVE</span>
      </div>
      <div style={maskStyle}>
        <div style={scrollStyle}>
          {doubled.map(function(t, i) {
            return (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)', padding: '0 24px' }}>
                  {t}
                </span>
                <span style={{ color: 'var(--accent-cyan)', fontSize: 10, opacity: 0.5 }}>◆</span>
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
