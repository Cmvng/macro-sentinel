import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { ASSETS, SIGNAL_CONFIG, CONFIDENCE_CONFIG } from '../lib/assets.js'
import { fetchAllNews } from '../lib/newsFetcher.js'
import { fetchSignals, analyzeAsset } from '../lib/claudeEngine.js'
import SignalTable from './SignalTable.jsx'
import NewsFeed from './NewsFeed.jsx'
import MarketHeader from './MarketHeader.jsx'
import AnalysisPanel from './AnalysisPanel.jsx'
import Ticker from './Ticker.jsx'

var POLL_MS = 10 * 60 * 1000
var WATCHLIST_KEY = 'macrosentinel_watchlist'

// Thresholds for the honest freshness states the dashboard now reports.
var DELAYED_MIN = 90
var STALE_MIN = 24 * 60

function loadWatchlist() {
  try {
    var raw = localStorage.getItem(WATCHLIST_KEY)
    var parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch(e) { return [] }
}

function saveWatchlist(list) {
  try { localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list)) } catch(e) {}
}

export default function Dashboard() {
  var [activeTab, setActiveTab] = useState('forex')
  var [news, setNews] = useState([])
  var [newsHealth, setNewsHealth] = useState(null)
  var [signals, setSignals] = useState({})
  var [meta, setMeta] = useState(null)
  var [loading, setLoading] = useState(true)
  var [refreshing, setRefreshing] = useState(false)
  var [newsLoading, setNewsLoading] = useState(true)
  var [error, setError] = useState(null)
  var [newsError, setNewsError] = useState(false)
  var [analysis, setAnalysis] = useState(null)
  var [selectedAsset, setSelectedAsset] = useState(null)
  var [sort, setSort] = useState({ key: 'default', dir: 'desc' })
  var [signalFilter, setSignalFilter] = useState('all')
  var [query, setQuery] = useState('')
  var [watchOnly, setWatchOnly] = useState(false)
  var [watchlist, setWatchlist] = useState(loadWatchlist)
  var analysisRef = useRef(null)

  var loadNews = useCallback(async function() {
    setNewsLoading(true)
    try {
      var res = await fetchAllNews()
      setNews(res.articles)
      setNewsHealth(res.health)
      setNewsError(res.articles.length === 0)
    } finally {
      setNewsLoading(false)
    }
  }, [])

  var loadSignals = useCallback(async function(isRefresh) {
    if (isRefresh) setRefreshing(true)
    setError(null)
    try {
      var res = await fetchSignals()
      setSignals(res.assets)
      setMeta(res)
      if (res.newsHealth) setNewsHealth(res.newsHealth)
    } catch(e) {
      setError(e.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(function() {
    loadNews()
    loadSignals(false)
    // Re-poll so a long-lived tab stops presenting hour-old data as current.
    // The read is served from cache, so this costs nothing extra.
    var id = setInterval(function() {
      loadNews()
      loadSignals(false)
    }, POLL_MS)
    return function() { clearInterval(id) }
  }, [loadNews, loadSignals])

  function toggleWatch(id) {
    setWatchlist(function(prev) {
      var next = prev.indexOf(id) === -1
        ? prev.concat([id])
        : prev.filter(function(x) { return x !== id })
      saveWatchlist(next)
      return next
    })
  }

  async function handleAnalyze(assetId, currentSignal) {
    setSelectedAsset(assetId)
    setAnalysis({ asset: assetId, loading: true, text: null, signal: currentSignal })
    // The panel renders below the table, so without this a click on a top row
    // put the result off-screen with no feedback.
    window.setTimeout(function() {
      if (analysisRef.current && analysisRef.current.scrollIntoView) {
        analysisRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }, 60)
    try {
      var res = await analyzeAsset(assetId, currentSignal)
      setAnalysis({ asset: assetId, loading: false, text: res.text, signal: currentSignal, cached: res.cached })
    } catch(e) {
      setAnalysis({ asset: assetId, loading: false, text: null, error: e.message, signal: currentSignal })
    }
  }

  var currentAssets = ASSETS[activeTab] || []

  var visibleAssets = useMemo(function() {
    var list = currentAssets.slice()
    if (watchOnly) list = list.filter(function(a) { return watchlist.indexOf(a.id) !== -1 })
    if (query.trim()) {
      var q = query.trim().toLowerCase()
      list = list.filter(function(a) {
        return a.id.toLowerCase().indexOf(q) !== -1 ||
               a.label.toLowerCase().indexOf(q) !== -1 ||
               (a.desc || '').toLowerCase().indexOf(q) !== -1
      })
    }
    if (signalFilter !== 'all') {
      list = list.filter(function(a) {
        var s = signals[a.id]
        if (!s) return false
        if (signalFilter === 'bullish') return s.signal === 'buy' || s.signal === 'strong_buy'
        if (signalFilter === 'bearish') return s.signal === 'sell' || s.signal === 'strong_sell'
        if (signalFilter === 'neutral') return s.signal === 'neutral'
        return true
      })
    }
    if (sort.key !== 'default') {
      var mul = sort.dir === 'asc' ? 1 : -1
      list.sort(function(a, b) {
        var sa = signals[a.id], sb = signals[b.id]
        var va, vb
        if (sort.key === 'signal') {
          va = sa ? (SIGNAL_CONFIG[sa.signal] || SIGNAL_CONFIG.neutral).rank : 0
          vb = sb ? (SIGNAL_CONFIG[sb.signal] || SIGNAL_CONFIG.neutral).rank : 0
        } else if (sort.key === 'score') {
          va = sa ? sa.score : -1
          vb = sb ? sb.score : -1
        } else if (sort.key === 'confidence') {
          va = sa ? (CONFIDENCE_CONFIG[sa.confidence] || CONFIDENCE_CONFIG.low).rank : 0
          vb = sb ? (CONFIDENCE_CONFIG[sb.confidence] || CONFIDENCE_CONFIG.low).rank : 0
        } else {
          va = a.label; vb = b.label
          return va < vb ? -mul : va > vb ? mul : 0
        }
        return (va - vb) * mul
      })
    }
    return list
  }, [currentAssets, signals, sort, signalFilter, query, watchOnly, watchlist])

  function onSort(key) {
    setSort(function(prev) {
      if (prev.key !== key) return { key: key, dir: 'desc' }
      if (prev.dir === 'desc') return { key: key, dir: 'asc' }
      return { key: 'default', dir: 'desc' }
    })
  }

  // Counters are scoped to the visible tab, which is what sits directly above them.
  var tabIds = currentAssets.map(function(a) { return a.id })
  var bullCount = 0, bearCount = 0
  for (var i = 0; i < tabIds.length; i++) {
    var s = signals[tabIds[i]]
    if (!s) continue
    if (s.signal === 'buy' || s.signal === 'strong_buy') bullCount++
    if (s.signal === 'sell' || s.signal === 'strong_sell') bearCount++
  }

  var age = meta && typeof meta.ageMinutes === 'number' ? meta.ageMinutes : null
  var degraded = meta && meta.degradedGroups > 0
  var feedsDown = newsHealth && newsHealth.healthy < newsHealth.total

  var status = 'live'
  if (error) status = 'error'
  else if (age !== null && age >= STALE_MIN) status = 'stale'
  else if (degraded || feedsDown || newsError) status = 'partial'
  else if (age !== null && age >= DELAYED_MIN) status = 'delayed'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)', display: 'flex', flexDirection: 'column' }}>
      <a className="skip-link" href="#signals">Skip to signals</a>
      <Ticker news={news} />
      <div style={{ flex: 1, maxWidth: 1400, margin: '0 auto', width: '100%', padding: '0 1rem 2rem' }}>
        <MarketHeader
          dominantTheme={meta ? meta.dominantTheme : ''}
          marketSummary={meta ? meta.marketSummary : ''}
          status={status}
          ageMinutes={age}
          partialAgeMinutes={meta ? meta.partialAgeMinutes : null}
          degradedGroups={meta ? meta.degradedGroups : 0}
          totalGroups={meta ? meta.totalGroups : 4}
          newsHealth={newsHealth}
          newsCount={news.length}
          refreshing={refreshing}
          onRefresh={function() { loadNews(); loadSignals(true) }}
          bullCount={bullCount}
          bearCount={bearCount}
          tabLabel={activeTab}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        {error && (
          <div role="alert" style={{
            margin: '0.5rem 0', padding: '12px 14px',
            background: 'var(--red-dim)', border: '1px solid var(--red)',
            borderRadius: 'var(--radius-md)', fontSize: 'var(--fs-sm)',
            color: 'var(--red)'
          }}>
            <strong>Macro intelligence is temporarily unavailable.</strong>{' '}
            {age !== null
              ? 'The last complete analysis was generated ' + formatAge(age) + ' ago.'
              : 'No analysis has been generated yet.'}{' '}
            <button
              onClick={function() { loadSignals(true) }}
              style={{
                marginLeft: 4, background: 'transparent', border: '1px solid var(--red)',
                color: 'var(--red)', borderRadius: 'var(--radius-sm)',
                padding: '2px 10px', fontSize: 'var(--fs-xs)', minHeight: 28
              }}
            >
              Try again
            </button>
          </div>
        )}

        <Controls
          query={query} setQuery={setQuery}
          signalFilter={signalFilter} setSignalFilter={setSignalFilter}
          watchOnly={watchOnly} setWatchOnly={setWatchOnly}
          watchCount={watchlist.length}
          shown={visibleAssets.length} total={currentAssets.length}
        />

        <div style={{ display: 'grid', gap: '1rem', marginTop: '0.5rem' }} className="main-grid">
          <div id="signals">
            <SignalTable
              assets={visibleAssets}
              signals={signals}
              loading={loading}
              onAnalyze={handleAnalyze}
              selectedAsset={selectedAsset}
              sort={sort}
              onSort={onSort}
              watchlist={watchlist}
              onToggleWatch={toggleWatch}
              emptyReason={currentAssets.length ? 'no-match' : 'none'}
            />
            <div ref={analysisRef}>
              {analysis && (
                <AnalysisPanel
                  analysis={analysis}
                  onClose={function() { setAnalysis(null); setSelectedAsset(null) }}
                  onRetry={function() { handleAnalyze(analysis.asset, analysis.signal) }}
                />
              )}
            </div>
            <Disclaimer />
          </div>
          <div>
            <NewsFeed news={news} loading={newsLoading} activeTab={activeTab} health={newsHealth} />
          </div>
        </div>
      </div>
    </div>
  )
}

function formatAge(min) {
  if (min < 1) return 'less than a minute'
  if (min < 60) return min + ' min'
  var h = Math.floor(min / 60)
  if (h < 24) return h + 'h ' + (min % 60) + 'm'
  return Math.floor(h / 24) + 'd ' + (h % 24) + 'h'
}

function Controls({ query, setQuery, signalFilter, setSignalFilter, watchOnly, setWatchOnly, watchCount, shown, total }) {
  var filters = [
    { id: 'all', label: 'All' },
    { id: 'bullish', label: 'Bullish' },
    { id: 'bearish', label: 'Bearish' },
    { id: 'neutral', label: 'Neutral' }
  ]
  return (
    <div style={{
      display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
      margin: '0.75rem 0 0.25rem'
    }}>
      <label className="visually-hidden" htmlFor="asset-search">Search instruments</label>
      <input
        id="asset-search"
        type="search"
        value={query}
        onChange={function(e) { setQuery(e.target.value) }}
        placeholder="Search instruments"
        style={{
          flex: '1 1 180px', maxWidth: 260, padding: '6px 12px',
          background: 'var(--bg-surface)', border: '1px solid var(--border-med)',
          borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
          fontSize: 'var(--fs-xs)'
        }}
      />
      <div role="group" aria-label="Filter by signal" style={{ display: 'flex', gap: 4 }}>
        {filters.map(function(f) {
          var on = signalFilter === f.id
          return (
            <button
              key={f.id}
              onClick={function() { setSignalFilter(f.id) }}
              aria-pressed={on}
              style={{
                padding: '5px 12px',
                background: on ? 'var(--accent-cyan-dim)' : 'var(--bg-surface)',
                border: '1px solid ' + (on ? 'var(--accent-cyan)' : 'var(--border-med)'),
                borderRadius: 'var(--radius-md)',
                color: on ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)'
              }}
            >
              {f.label}
            </button>
          )
        })}
      </div>
      <button
        onClick={function() { setWatchOnly(!watchOnly) }}
        aria-pressed={watchOnly}
        style={{
          padding: '5px 12px',
          background: watchOnly ? 'var(--accent-cyan-dim)' : 'var(--bg-surface)',
          border: '1px solid ' + (watchOnly ? 'var(--accent-cyan)' : 'var(--border-med)'),
          borderRadius: 'var(--radius-md)',
          color: watchOnly ? 'var(--accent-cyan)' : 'var(--text-secondary)',
          fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)'
        }}
      >
        {'★ Watchlist' + (watchCount ? ' (' + watchCount + ')' : '')}
      </button>
      <span aria-live="polite" style={{
        marginLeft: 'auto', fontFamily: 'var(--font-mono)',
        fontSize: 'var(--fs-xs)', color: 'var(--text-muted)'
      }}>
        {shown === total ? total + ' instruments' : shown + ' of ' + total}
      </span>
    </div>
  )
}

function Disclaimer() {
  return (
    <div style={{
      marginTop: '1rem', padding: '12px 14px',
      background: 'var(--bg-raised)', border: '1px solid var(--border-dim)',
      borderRadius: 'var(--radius-md)', fontSize: 'var(--fs-xs)',
      color: 'var(--text-muted)', lineHeight: 1.6
    }}>
      <strong style={{ color: 'var(--text-secondary)' }}>How to read this.</strong>{' '}
      Scores are <em>macro pressure</em> derived from news evidence on a 0–100 scale — they
      are not probabilities, price targets, or forecasts. Confidence measures the quality and
      independence of the underlying evidence, not the likelihood of a profitable trade.
      MacroSentinel is research tooling, not financial advice.
    </div>
  )
}
