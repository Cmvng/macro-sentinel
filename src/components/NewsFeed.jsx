import React, { useState } from 'react'
import { ASSETS } from '../lib/assets.js'

function timeAgo(dateStr) {
  if (!dateStr) return 'time unknown'
  var t = new Date(dateStr).getTime()
  if (!isFinite(t)) return 'time unknown'
  var diff = (Date.now() - t) / 1000
  if (diff < 60) return Math.max(0, Math.round(diff)) + 's ago'
  if (diff < 3600) return Math.round(diff / 60) + 'm ago'
  if (diff < 86400) return Math.round(diff / 3600) + 'h ago'
  return Math.round(diff / 86400) + 'd ago'
}

function sourceTier(trust) {
  if (trust >= 90) return { bg: 'var(--accent-cyan-dim)', col: 'var(--accent-cyan)', label: 'TIER 1' }
  if (trust >= 75) return { bg: 'var(--bg-deep)', col: 'var(--text-secondary)', label: 'TIER 2' }
  return { bg: 'var(--bg-deep)', col: 'var(--text-muted)', label: 'TIER 3' }
}

function NewsItem({ item }) {
  var tier = sourceTier(item.trustScore)
  // A real anchor, so middle-click, open-in-new-tab, copy-link, keyboard and
  // screen readers all work. Previously a div with window.open and no noopener.
  var safeHref = /^https?:\/\//i.test(item.link || '') ? item.link : null

  var body = (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
        <div aria-hidden="true" style={{
          width: 3, borderRadius: 2, background: tier.col,
          flexShrink: 0, alignSelf: 'stretch', minHeight: 14
        }} />
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-primary)', lineHeight: 1.5, flex: 1 }}>
          {item.title}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingLeft: 11, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {item.source}
        </span>
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {timeAgo(item.publishedAt)}
        </span>
        <span style={{
          fontSize: 'var(--fs-xs)', padding: '1px 6px', borderRadius: 3,
          background: tier.bg, color: tier.col, fontFamily: 'var(--font-mono)'
        }}>
          {tier.label}
        </span>
        {(item.affectedAssets || []).slice(0, 3).map(function(a) {
          return (
            <span key={a} style={{
              fontSize: 'var(--fs-xs)', padding: '1px 6px', borderRadius: 3,
              background: 'var(--accent-cyan-dim)', color: 'var(--accent-cyan)',
              fontFamily: 'var(--font-mono)'
            }}>
              {a}
            </span>
          )
        })}
      </div>
    </>
  )

  var boxStyle = {
    display: 'block', padding: '12px 14px',
    borderBottom: '1px solid var(--border-dim)',
    textDecoration: 'none', color: 'inherit'
  }

  if (!safeHref) return <div style={boxStyle}>{body}</div>

  return (
    <a
      className="row-interactive"
      href={safeHref}
      target="_blank"
      rel="noopener noreferrer"
      style={boxStyle}
    >
      {body}
    </a>
  )
}

function SkeletonItem() {
  return (
    <div style={{ padding: '14px', borderBottom: '1px solid var(--border-dim)' }}>
      <div style={{ height: 12, background: 'var(--bg-raised)', borderRadius: 3, marginBottom: 8, animation: 'pulse 1.5s infinite', width: '85%' }} />
      <div style={{ height: 10, background: 'var(--bg-raised)', borderRadius: 3, animation: 'pulse 1.5s infinite', width: '50%' }} />
    </div>
  )
}

export default function NewsFeed({ news, loading, activeTab, health }) {
  var [filter, setFilter] = useState('all')
  var tabAssets = ASSETS[activeTab] ? ASSETS[activeTab].map(function(a) { return a.id }) : []

  var filtered = news.filter(function(n) {
    if (filter === 'all') return true
    return (n.affectedAssets || []).some(function(a) { return tabAssets.indexOf(a) !== -1 })
  }).slice(0, 25)

  var buttons = [
    { id: 'all', label: 'ALL' },
    { id: 'tab', label: activeTab.toUpperCase() }
  ]

  return (
    <section aria-label="Market news" style={{
      border: '1px solid var(--border-med)', borderRadius: 'var(--radius-lg)',
      overflow: 'hidden', background: 'var(--bg-surface)'
    }}>
      <div style={{
        padding: '12px 14px', borderBottom: '1px solid var(--border-dim)',
        display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-raised)', flexWrap: 'wrap'
      }}>
        <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', letterSpacing: '0.5px', fontWeight: 400, margin: 0 }}>
          NEWS
        </h2>
        <div role="group" aria-label="Filter news" style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          {buttons.map(function(b) {
            var on = filter === b.id
            return (
              <button
                key={b.id}
                onClick={function() { setFilter(b.id) }}
                aria-pressed={on}
                style={{
                  padding: '4px 10px', minHeight: 28,
                  background: on ? 'var(--bg-deep)' : 'transparent',
                  border: '1px solid ' + (on ? 'var(--accent-cyan)' : 'var(--border-dim)'),
                  borderRadius: 'var(--radius-sm)',
                  color: on ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)'
                }}
              >
                {b.label}
              </button>
            )
          })}
        </div>
      </div>

      {health && health.healthy < health.total && (
        <div style={{
          padding: '8px 14px', background: 'var(--amber-dim)',
          borderBottom: '1px solid var(--border-dim)',
          fontSize: 'var(--fs-xs)', color: 'var(--amber)', fontFamily: 'var(--font-mono)'
        }}>
          {health.healthy}/{health.total} sources responding
        </div>
      )}

      <div style={{ maxHeight: 620, overflowY: 'auto' }}>
        {loading && news.length === 0 && [0,1,2,3,4].map(function(i) { return <SkeletonItem key={i} /> })}

        {!loading && filtered.length === 0 && (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>
            {news.length === 0
              ? 'No news could be retrieved. Sources may be temporarily unavailable.'
              : 'No recent stories affect ' + activeTab + '.'}
          </div>
        )}

        {filtered.map(function(item) { return <NewsItem key={item.id} item={item} /> })}
      </div>
    </section>
  )
}
