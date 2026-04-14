import React, { useState } from 'react'
import { ASSETS } from '../lib/assets.js'

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60) return Math.round(diff) + 's ago'
  if (diff < 3600) return Math.round(diff / 60) + 'm ago'
  if (diff < 86400) return Math.round(diff / 3600) + 'h ago'
  return Math.round(diff / 86400) + 'd ago'
}

function getImpact(trust) {
  if (trust >= 90) return { bg: 'var(--red-dim)', col: 'var(--red)', label: 'HIGH' }
  if (trust >= 75) return { bg: 'var(--amber-dim)', col: 'var(--amber)', label: 'MED' }
  return { bg: 'var(--bg-deep)', col: 'var(--text-muted)', label: 'LOW' }
}

function NewsItem({ item }) {
  const imp = getImpact(item.trustScore)
  const handleClick = () => {
    if (item.link) window.open(item.link, '_blank')
  }
  const handleOver = (e) => { e.currentTarget.style.background = 'var(--bg-hover)' }
  const handleOut = (e) => { e.currentTarget.style.background = 'transparent' }

  return (
    <div
      onClick={handleClick}
      onMouseOver={handleOver}
      onMouseOut={handleOut}
      style={{
        padding: '10px 14px',
        borderBottom: '0.5px solid var(--border-dim)',
        cursor: item.link ? 'pointer' : 'default',
        transition: 'background 0.15s'
      }}
    >
      <div style={{ display: 'flex', gap: 6, marginBottom: 5 }}>
        <div style={{
          width: 3,
          borderRadius: 2,
          background: imp.col,
          flexShrink: 0,
          alignSelf: 'stretch',
          minHeight: 12
        }} />
        <div style={{ fontSize: 11, color: 'var(--text-primary)', lineHeight: 1.5, flex: 1 }}>
          {item.title}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', paddingLeft: 9, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {item.source}
        </span>
        <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {timeAgo(item.publishedAt)}
        </span>
        <span style={{
          fontSize: 9, padding: '1px 5px', borderRadius: 2,
          background: imp.bg, color: imp.col, fontFamily: 'var(--font-mono)'
        }}>
          {imp.label}
        </span>
        {item.affectedAssets && item.affectedAssets.slice(0, 2).map(function(a) {
          return (
            <span key={a} style={{
              fontSize: 9, padding: '1px 5px', borderRadius: 2,
              background: 'var(--accent-cyan-dim)', color: 'var(--accent-cyan)',
              fontFamily: 'var(--font-mono)'
            }}>
              {a}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function SkeletonItem({ i }) {
  return (
    <div key={i} style={{ padding: '12px 14px', borderBottom: '0.5px solid var(--border-dim)' }}>
      <div style={{
        height: 11, background: 'var(--bg-raised)', borderRadius: 3,
        marginBottom: 6, animation: 'pulse 1.5s infinite', width: '85%'
      }} />
      <div style={{
        height: 9, background: 'var(--bg-raised)', borderRadius: 3,
        animation: 'pulse 1.5s infinite', width: '50%'
      }} />
    </div>
  )
}

export default function NewsFeed({ news, loading, activeTab }) {
  const [filter, setFilter] = useState('all')
  const tabAssets = ASSETS[activeTab] ? ASSETS[activeTab].map(function(a) { return a.id }) : []

  const filtered = news.filter(function(n) {
    if (filter === 'all') return true
    return n.affectedAssets && n.affectedAssets.some(function(a) { return tabAssets.includes(a) })
  }).slice(0, 25)

  const scrollStyle = {
    maxHeight: '600px',
    overflowY: 'auto'
  }

  return (
    <div style={{ position: 'sticky', top: '1rem' }}>
      <div style={{
        background: 'var(--bg-surface)',
        border: '0.5px solid var(--border-med)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '12px 14px',
          borderBottom: '0.5px solid var(--border-dim)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-raised)'
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '1px', color: 'var(--text-secondary)' }}>
            LIVE FEED
            {loading && (
              <span style={{ marginLeft: 6, color: 'var(--amber)', animation: 'blink 1s infinite' }}>
                ●
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={function() { setFilter('all') }}
              style={{
                padding: '2px 8px',
                border: '0.5px solid var(--border-dim)',
                borderRadius: 3,
                background: filter === 'all' ? 'var(--bg-deep)' : 'transparent',
                color: filter === 'all' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                cursor: 'pointer',
                letterSpacing: '0.5px'
              }}
            >
              ALL
            </button>
            <button
              onClick={function() { setFilter('tab') }}
              style={{
                padding: '2px 8px',
                border: '0.5px solid var(--border-dim)',
                borderRadius: 3,
                background: filter === 'tab' ? 'var(--bg-deep)' : 'transparent',
                color: filter === 'tab' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                cursor: 'pointer',
                letterSpacing: '0.5px'
              }}
            >
              {activeTab.toUpperCase()}
            </button>
          </div>
        </div>

        <div style={scrollStyle}>
          {loading && filtered.length === 0 && (
            <div>
              <SkeletonItem i={0} />
              <SkeletonItem i={1} />
              <SkeletonItem i={2} />
              <SkeletonItem i={3} />
              <SkeletonItem i={4} />
              <SkeletonItem i={5} />
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 12,
              fontFamily: 'var(--font-mono)'
            }}>
              NO RELEVANT NEWS
            </div>
          )}
          {filtered.length > 0 && filtered.map(function(item, i) {
            return <NewsItem key={item.id || i} item={item} />
          })}
        </div>
      </div>
    </div>
  )
}
