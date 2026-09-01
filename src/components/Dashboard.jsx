import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { ASSETS, SIGNAL_CONFIG, CONFIDENCE_CONFIG } from '../lib/assets.js'
import { fetchAllNews, setCachedNews } from '../lib/newsFetcher.js'
import { scoreAssets, analyzeAsset } from '../lib/claudeEngine.js'
import SignalTable from './SignalTable.jsx'
import NewsFeed from './NewsFeed.jsx'
import MarketHeader from './MarketHeader.jsx'
import AnalysisPanel from './AnalysisPanel.jsx'
import Ticker from './Ticker.jsx'

var WATCHLIST_KEY = 'macrosentinel_watchlist'

function getStoredTheme() {
  try {
    var stored = window.localStorage.getItem('macro-sentinel-theme')
    if (stored === 'light' || stored === 'dark') return stored
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch (_) {
    return 'light'
  }
}

function loadWatchlist() {
  try {
    var raw = window.localStorage.getItem(WATCHLIST_KEY)
    var parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch (_) { return [] }
}

export default function Dashboard() {
  var [activeTab, setActiveTab] = useState('forex')
  var [news, setNews] = useState([])
  var [signals, setSignals] = useState({})
  var [marketSummary, setMarketSummary] = useState('')
  var [dominantTheme, setDominantTheme] = useState('')
  var [loading, setLoading] = useState(false)
  var [newsLoading, setNewsLoading] = useState(false)
  var [error, setError] = useState(null)
  var [dataStatus, setDataStatus] = useState('loading')
  var [lastUpdate, setLastUpdate] = useState(null)
  var [analysis, setAnalysis] = useState(null)
  var [newsCount, setNewsCount] = useState(0)
  var [selectedAsset, setSelectedAsset] = useState(null)
  var [sourceCoverage, setSourceCoverage] = useState({ healthy: 0, total: 0, events: 0 })
  var [theme, setTheme] = useState(getStoredTheme)
  var [sort, setSort] = useState({ key: 'default', dir: 'desc' })
  var [signalFilter, setSignalFilter] = useState('all')
  var [query, setQuery] = useState('')
  var [watchOnly, setWatchOnly] = useState(false)
  var [watchlist, setWatchlist] = useState(loadWatchlist)
  var analysisRef = useRef(null)

  useEffect(function() {
    try { window.localStorage.setItem('macro-sentinel-theme', theme) } catch (_) {}
  }, [theme])

  useEffect(function() {
    try { window.localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist)) } catch (_) {}
  }, [watchlist])

  var loadNews = useCallback(async function() {
    setNewsLoading(true)
    try {
      var fresh = await fetchAllNews()
      setCachedNews(fresh)
      setNews(fresh)
      setNewsCount(fresh.length)
    } catch(e) {
      setError('News feed unavailable: ' + e.message)
    } finally {
      setNewsLoading(false)
    }
  }, [])

  var loadSignals = useCallback(async function() {
    setLoading(true)
    setError(null)
    try {
      var result = await scoreAssets()
      if (!result || !result.assets) throw new Error('Signal response was incomplete')
      setSignals(result.assets)
      setMarketSummary(result.market_summary || '')
      setDominantTheme(result.dominant_theme || '')
      setDataStatus(result.data_status || 'live')
      setLastUpdate(result.generated_at ? new Date(result.generated_at) : null)
      setSourceCoverage({ healthy: result.healthy_source_count || 0, total: result.source_count || 0, events: result.event_count || 0 })
    } catch(e) {
      setDataStatus('unavailable')
      setError(e.message || 'Signal analysis unavailable')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(function() {
    loadNews()
    loadSignals()
  }, [loadNews, loadSignals])

  function toggleWatch(id) {
    setWatchlist(function(prev) {
      return prev.indexOf(id) === -1 ? prev.concat([id]) : prev.filter(function(x) { return x !== id })
    })
  }

  function onSort(key) {
    setSort(function(prev) {
      if (prev.key !== key) return { key: key, dir: 'desc' }
      if (prev.dir === 'desc') return { key: key, dir: 'asc' }
      return { key: 'default', dir: 'desc' }
    })
  }

  async function handleAnalyze(assetId, currentSignal) {
    setSelectedAsset(assetId)
    setAnalysis({ asset: assetId, loading: true, text: null, signal: currentSignal })
    // The panel renders below the table; without this a click on a top row put
    // the result off-screen with no feedback that anything had happened.
    window.setTimeout(function() {
      if (analysisRef.current && analysisRef.current.scrollIntoView) {
        analysisRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }, 60)
    try {
      var text = await analyzeAsset(assetId, news, currentSignal)
      setAnalysis({ asset: assetId, loading: false, text: text, signal: currentSignal })
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
        return s.signal === 'neutral'
      })
    }
    if (sort.key !== 'default') {
      var mul = sort.dir === 'asc' ? 1 : -1
      list.sort(function(a, b) {
        var sa = signals[a.id], sb = signals[b.id]
        if (sort.key === 'asset') {
          return a.label < b.label ? -mul : a.label > b.label ? mul : 0
        }
        var va, vb
        if (sort.key === 'signal') {
          va = sa ? (SIGNAL_CONFIG[sa.signal] || SIGNAL_CONFIG.neutral).rank : 0
          vb = sb ? (SIGNAL_CONFIG[sb.signal] || SIGNAL_CONFIG.neutral).rank : 0
        } else if (sort.key === 'confidence') {
          va = sa ? confRank(sa.confidence) : 0
          vb = sb ? confRank(sb.confidence) : 0
        } else {
          va = sa && isFinite(Number(sa.score)) ? Number(sa.score) : -1
          vb = sb && isFinite(Number(sb.score)) ? Number(sb.score) : -1
        }
        return (va - vb) * mul
      })
    }
    return list
  }, [currentAssets, signals, sort, signalFilter, query, watchOnly, watchlist])

  var signalStats = useMemo(function() {
    var known = currentAssets.filter(function(asset) { return Boolean(signals[asset.id]) })
    var bullish = known.filter(function(asset) {
      return signals[asset.id].signal === 'strong_buy' || signals[asset.id].signal === 'buy'
    }).length
    var bearish = known.filter(function(asset) {
      return signals[asset.id].signal === 'strong_sell' || signals[asset.id].signal === 'sell'
    }).length
    var coverage = currentAssets.length ? Math.round((known.length / currentAssets.length) * 100) : 0
    var risk = known.length ? Math.round(50 + ((bearish - bullish) / known.length) * 35) : 50
    return {
      known: known.length,
      bullish: bullish,
      bearish: bearish,
      coverage: coverage,
      risk: Math.max(0, Math.min(100, risk))
    }
  }, [currentAssets, signals])

  return (
    <div className="app-shell" data-theme={theme}>
      <a className="skip-link" href="#signal-board">Skip to signals</a>
      <Ticker news={news} />
      <main className="dashboard-shell">
        <MarketHeader
          dominantTheme={dominantTheme}
          marketSummary={marketSummary}
          lastUpdate={lastUpdate}
          loading={loading}
          newsLoading={newsLoading}
          dataStatus={dataStatus}
          newsCount={newsCount}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          theme={theme}
          setTheme={setTheme}
          signalStats={signalStats}
          onRefresh={loadSignals}
          sourceCoverage={sourceCoverage}
        />

        {error && (
          <div className="status-notice" role="status">
            <span aria-hidden="true">!</span>
            <div><strong>Analysis unavailable.</strong> {error}</div>
          </div>
        )}

        <section className="content-grid">
          <div className="primary-column">
            <section className="section-panel signal-panel" id="signal-board">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">SIGNAL BOARD</p>
                  <h2>{activeTab === 'forex' ? 'Currency posture' : activeTab === 'metals' ? 'Commodity posture' : 'Digital asset posture'}</h2>
                </div>
                <span className="panel-caption">Select a row for source-grounded analysis</span>
              </div>

              <BoardControls
                query={query} setQuery={setQuery}
                signalFilter={signalFilter} setSignalFilter={setSignalFilter}
                watchOnly={watchOnly} setWatchOnly={setWatchOnly}
                watchCount={watchlist.length}
                shown={visibleAssets.length} total={currentAssets.length}
              />

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
              />
            </section>
            <div ref={analysisRef}>
              {analysis && <AnalysisPanel analysis={analysis} onClose={function() { setAnalysis(null); setSelectedAsset(null) }} />}
            </div>
          </div>

          <aside className="secondary-column" aria-label="Recent market intelligence">
            <NewsFeed news={news} loading={newsLoading} activeTab={activeTab} />
          </aside>
        </section>

        <footer className="app-footer">
          <span>
            Scores are macro pressure derived from news evidence on a 0–100 scale — not
            probabilities, price targets, or forecasts. MacroSentinel provides informational
            market commentary only. It is not investment advice.
          </span>
          <span>{lastUpdate ? 'Last analysis ' + lastUpdate.toLocaleString() : 'Awaiting first analysis'}</span>
        </footer>
      </main>
    </div>
  )
}

function confRank(c) {
  var cfg = CONFIDENCE_CONFIG[c]
  if (cfg && typeof cfg.rank === 'number') return cfg.rank
  return c === 'high' ? 3 : c === 'medium' ? 2 : 1
}

function BoardControls({ query, setQuery, signalFilter, setSignalFilter, watchOnly, setWatchOnly, watchCount, shown, total }) {
  var filters = [
    { id: 'all', label: 'All' },
    { id: 'bullish', label: 'Bullish' },
    { id: 'bearish', label: 'Bearish' },
    { id: 'neutral', label: 'Neutral' }
  ]
  var chip = function(on) {
    return {
      padding: '6px 12px',
      background: on ? 'var(--accent-cyan-dim)' : 'var(--bg-surface)',
      border: '1px solid ' + (on ? 'var(--accent-cyan)' : 'var(--border-med)'),
      borderRadius: 'var(--radius-sm)',
      color: on ? 'var(--accent-cyan)' : 'var(--text-secondary)',
      fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer'
    }
  }
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', margin: '0 0 14px' }}>
      <label className="visually-hidden" htmlFor="asset-search">Search instruments</label>
      <input
        id="asset-search"
        type="search"
        value={query}
        onChange={function(e) { setQuery(e.target.value) }}
        placeholder="Search instruments"
        style={{
          flex: '1 1 170px', maxWidth: 240, padding: '7px 12px',
          background: 'var(--bg-surface)', border: '1px solid var(--border-med)',
          borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 13
        }}
      />
      <div role="group" aria-label="Filter by signal" style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {filters.map(function(f) {
          return (
            <button key={f.id} onClick={function() { setSignalFilter(f.id) }} aria-pressed={signalFilter === f.id} style={chip(signalFilter === f.id)}>
              {f.label}
            </button>
          )
        })}
      </div>
      <button onClick={function() { setWatchOnly(!watchOnly) }} aria-pressed={watchOnly} style={chip(watchOnly)}>
        {'★ Watchlist' + (watchCount ? ' (' + watchCount + ')' : '')}
      </button>
      <span aria-live="polite" style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
        {shown === total ? total + ' instruments' : shown + ' of ' + total}
      </span>
    </div>
  )
}
