import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { ASSETS, SIGNAL_CONFIG, CONFIDENCE_CONFIG } from '../lib/assets.js'
import { fetchAllNews, setCachedNews } from '../lib/newsFetcher.js'
import { scoreAssets, analyzeAsset, fetchCalendar } from '../lib/claudeEngine.js'
import { interpretRelease, aggregateBias } from '../lib/releaseModel.js'
import { releaseAlerts, releaseDomId } from '../lib/releaseView.js'
import { loadActuals, saveActuals } from '../lib/releaseStore.js'
import { useRoute, pageOf } from '../lib/router.js'
import SignalTable from './SignalTable.jsx'
import NewsFeed from './NewsFeed.jsx'
import TopBar from './TopBar.jsx'
import PulseSection from './PulseSection.jsx'
import HomePage from './HomePage.jsx'
import AboutPage from './AboutPage.jsx'
import PageHeader from './PageHeader.jsx'
import AnalysisPanel from './AnalysisPanel.jsx'
import ChartPanel from './ChartPanel.jsx'
import ReleasesPanel from './ReleasesPanel.jsx'
import BiasStrip from './BiasStrip.jsx'
import ReleaseAlert from './ReleaseAlert.jsx'

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
  var [ageMinutes, setAgeMinutes] = useState(null)
  var [analysis, setAnalysis] = useState(null)
  var [selectedAsset, setSelectedAsset] = useState(null)
  var [route, go] = useRoute()
  var mainRef = useRef(null)
  var pendingJump = useRef(null)
  var firstRoute = useRef(true)
  var [chartAsset, setChartAsset] = useState('EUR/USD')
  var chartRef = useRef(null)
  var [sourceCoverage, setSourceCoverage] = useState({ healthy: 0, total: 0, events: 0 })
  var [theme, setTheme] = useState(getStoredTheme)
  var [sort, setSort] = useState({ key: 'default', dir: 'desc' })
  var [signalFilter, setSignalFilter] = useState('all')
  var [query, setQuery] = useState('')
  var [watchOnly, setWatchOnly] = useState(false)
  var [watchlist, setWatchlist] = useState(loadWatchlist)
  var analysisRef = useRef(null)
  var [calendar, setCalendar] = useState({ events: [], loading: true, error: false, stale: false, ageMinutes: null, actualsStatus: 'live' })
  var [actuals, setActuals] = useState(function() { return loadActuals(Date.now()) })
  var [now, setNow] = useState(Date.now())

  useEffect(function() {
    try { window.localStorage.setItem('macro-sentinel-theme', theme) } catch (_) {}
  }, [theme])

  useEffect(function() {
    try { window.localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist)) } catch (_) {}
  }, [watchlist])

  useEffect(function() { saveActuals(actuals) }, [actuals])

  // Keeps "in 42 min" and the alert banner honest without a page reload.
  useEffect(function() {
    var id = setInterval(function() { setNow(Date.now()) }, 30000)
    return function() { clearInterval(id) }
  }, [])

  var loadCalendar = useCallback(async function() {
    try {
      var res = await fetchCalendar()
      setCalendar({ events: res.events, loading: false, error: false, stale: res.stale, ageMinutes: res.ageMinutes, actualsStatus: res.actualsStatus })
    } catch (e) {
      // Keep whatever was already on screen; only flag the failure.
      setCalendar(function(prev) { return Object.assign({}, prev, { loading: false, error: true }) })
    }
  }, [])

  var loadNews = useCallback(async function() {
    setNewsLoading(true)
    try {
      var fresh = await fetchAllNews()
      setCachedNews(fresh)
      setNews(fresh)
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
      // age_minutes is the server's own figure; deriving from it means a cache
      // hit still reports a real time rather than "no completed run".
      var generated = result.generated_at
        ? new Date(result.generated_at)
        : (typeof result.age_minutes === 'number' ? new Date(Date.now() - result.age_minutes * 60000) : null)
      setLastUpdate(generated)
      setAgeMinutes(typeof result.age_minutes === 'number'
        ? result.age_minutes
        : (generated ? Math.max(0, Math.round((Date.now() - generated.getTime()) / 60000)) : null))
      setSourceCoverage({ healthy: result.healthy_source_count || 0, total: result.source_count || 0, events: result.event_count || 0 })
    } catch(e) {
      setDataStatus('unavailable')
      setAgeMinutes(null)
      setError(e.message || 'Signal analysis unavailable')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(function() {
    loadNews()
    loadSignals()
    loadCalendar()
    // The server caches the calendar for 30 minutes, so this is cheap.
    // Results appear minutes after a release, so poll every minute (the server
    // caches for a minute) but only while the tab is in view.
    var id = setInterval(function() { if (!document.hidden) loadCalendar() }, 60 * 1000)
    function onVisible() { if (!document.hidden) loadCalendar() }
    document.addEventListener('visibilitychange', onVisible)
    return function() { clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [loadNews, loadSignals, loadCalendar])

  function setActual(id, value) {
    setActuals(function(prev) {
      var next = Object.assign({}, prev)
      next[id] = { actual: value, at: Date.now() }
      return next
    })
  }

  function clearActual(id) {
    setActuals(function(prev) {
      var next = Object.assign({}, prev)
      delete next[id]
      return next
    })
  }

  function scrollToRelease(id) {
    var el = document.getElementById(releaseDomId(id))
    if (el && el.scrollIntoView) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); var input = el.querySelector('input'); if (input) input.focus({ preventScroll: true }) }
  }

  // An alert can be clicked from any page; the release card lives on Releases.
  function jumpToRelease(id) {
    if (route === 'releases') { scrollToRelease(id); return }
    pendingJump.current = id
    go('releases')
  }

  // Opening an instrument from the home page or the board: chart, analysis, Markets.
  function openAsset(id, currentSignal) {
    handleAnalyze(id, currentSignal)
    if (route !== 'markets') go('markets')
  }

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
    setChartAsset(assetId)
    setAnalysis({ asset: assetId, loading: true, text: null, signal: currentSignal })
    // The chart and analysis render below the table; without this a click on a
    // top row put the result off-screen with no feedback that anything happened.
    window.setTimeout(function() {
      if (chartRef.current && chartRef.current.scrollIntoView) {
        chartRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
  var allAssets = useMemo(function() { return ASSETS.forex.concat(ASSETS.metals).concat(ASSETS.crypto) }, [])

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

  // A result comes from the live data source, or from the user, who wins if they
  // disagree. Everything below is deterministic: no model call sits between a
  // number and the bias shown for it.
  var results = useMemo(function() {
    var out = {}
    for (var i = 0; i < calendar.events.length; i++) {
      var e = calendar.events[i]
      if (e.actual) out[e.id] = { actual: e.actual, at: e.timestamp, source: 'live' }
    }
    var mine = Object.keys(actuals)
    for (var j = 0; j < mine.length; j++) out[mine[j]] = { actual: actuals[mine[j]].actual, at: actuals[mine[j]].at, source: 'you' }
    return out
  }, [calendar.events, actuals])

  var releaseEntries = useMemo(function() {
    var out = []
    for (var i = 0; i < calendar.events.length; i++) {
      var e = calendar.events[i]
      if (!results[e.id]) continue
      var result = interpretRelease({ title: e.title, currency: e.currency, impact: e.impact, forecast: e.forecast, previous: e.previous, actual: results[e.id].actual })
      if (result.ok) out.push({ result: result, time: e.timestamp })
    }
    return out
  }, [calendar.events, results])

  var releaseBias = useMemo(function() { return aggregateBias(releaseEntries, now) }, [releaseEntries, now])
  var releaseBiasMap = useMemo(function() {
    var map = {}
    for (var i = 0; i < releaseBias.length; i++) map[releaseBias[i].asset] = releaseBias[i]
    return map
  }, [releaseBias])
  var alerts = useMemo(function() { return releaseAlerts(calendar.events, results, now) }, [calendar.events, results, now])

  // The count in the tab title is how a release gets noticed from another tab.
  useEffect(function() {
    var base = route === 'home' ? 'MacroSentinel \u2014 macro news, explained' : pageOf(route).title + ' \u00b7 MacroSentinel'
    document.title = alerts.length ? '(' + alerts.length + ') ' + base : base
  }, [route, alerts.length])

  // A new page starts at its top with focus on its heading, so keyboard and
  // screen-reader users are not left where the previous page ended.
  useEffect(function() {
    if (firstRoute.current) { firstRoute.current = false; return undefined }
    var timer = 0
    if (pendingJump.current) {
      var id = pendingJump.current
      pendingJump.current = null
      timer = window.setTimeout(function() { scrollToRelease(id) }, 160)
    } else {
      window.scrollTo(0, 0)
      var heading = document.getElementById('page-title')
      if (heading) heading.focus({ preventScroll: true })
    }
    return function() { if (timer) window.clearTimeout(timer) }
  }, [route])

  var signalStats = useMemo(function() {
    var known = allAssets.filter(function(asset) { return Boolean(signals[asset.id]) })
    var bullish = known.filter(function(asset) {
      return signals[asset.id].signal === 'strong_buy' || signals[asset.id].signal === 'buy'
    }).length
    var bearish = known.filter(function(asset) {
      return signals[asset.id].signal === 'strong_sell' || signals[asset.id].signal === 'sell'
    }).length
    var coverage = allAssets.length ? Math.round((known.length / allAssets.length) * 100) : 0
    var risk = known.length ? Math.round(50 + ((bearish - bullish) / known.length) * 35) : 50
    return {
      known: known.length,
      bullish: bullish,
      bearish: bearish,
      coverage: coverage,
      risk: Math.max(0, Math.min(100, risk))
    }
  }, [allAssets, signals])

  var pulse = (
    <PulseSection
      dominantTheme={dominantTheme}
      marketSummary={marketSummary}
      lastUpdate={lastUpdate}
      ageMinutes={ageMinutes}
      loading={loading}
      signalStats={signalStats}
      sourceCoverage={sourceCoverage}
    />
  )

  var notice = error && (
    <div className="status-notice" role="status">
      <span aria-hidden="true">!</span>
      <div><strong>Analysis unavailable.</strong> {error}</div>
    </div>
  )

  return (
    <div className="app-shell" data-theme={theme}>
      <a className="skip-link" href="#main" onClick={function(e) { e.preventDefault(); if (mainRef.current) mainRef.current.focus() }}>Skip to content</a>
      <TopBar
        route={route}
        theme={theme}
        setTheme={setTheme}
        loading={loading}
        newsLoading={newsLoading}
        dataStatus={dataStatus}
        onRefresh={loadSignals}
      />

      <main id="main" ref={mainRef} tabIndex={-1} className="dashboard-shell">
        <div key={route} className="page-enter">
          {route === 'home' && (
            <div>
              {notice}
              <HomePage news={news} signals={signals} calendar={calendar} results={results} now={now} pulse={pulse} onOpenAsset={openAsset} />
            </div>
          )}

          {route === 'markets' && (
            <div>
              <PageHeader eyebrow="MARKETS" title="Markets">
                Pick an instrument to see its live chart, the macro signal behind it, and what the news says.
              </PageHeader>
              {notice}
              <section className="content-grid">
                <div className="primary-column">
                  <div ref={chartRef} className="chart-anchor">
                    <ChartPanel assetId={chartAsset} onChange={setChartAsset} signal={signals[chartAsset]} dataBias={releaseBiasMap[chartAsset]} theme={theme} />
                  </div>
                  <div ref={analysisRef}>
                    {analysis && <AnalysisPanel analysis={analysis} releaseBias={releaseBiasMap[analysis.asset]} onClose={function() { setAnalysis(null); setSelectedAsset(null) }} />}
                  </div>
                  <section className="section-panel signal-panel" id="signal-board" aria-labelledby="board-title">
                    <div className="panel-heading">
                      <div>
                        <p className="eyebrow">SIGNAL BOARD</p>
                        <h2 id="board-title">{activeTab === 'forex' ? 'Currency posture' : activeTab === 'metals' ? 'Commodity posture' : 'Digital asset posture'}</h2>
                      </div>
                      <span className="panel-caption">Select an instrument to open its chart and analysis</span>
                    </div>

                    <div className="section-tabs" role="tablist" aria-label="Asset groups" style={{ marginBottom: 14 }}>
                      {ASSET_TABS.map(function(tab) {
                        return <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} className={activeTab === tab.id ? 'is-active' : ''} onClick={function() { setActiveTab(tab.id) }}>{tab.label}</button>
                      })}
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
                      releaseBias={releaseBiasMap}
                    />
                  </section>
                </div>

                <aside className="secondary-column" aria-label="Recent market intelligence">
                  <NewsFeed news={news} loading={newsLoading} activeTab={activeTab} />
                </aside>
              </section>
            </div>
          )}

          {route === 'releases' && (
            <div>
              <PageHeader eyebrow="RELEASES" title="Economic releases">
                What each release means, what it favours, and the results as they print.
              </PageHeader>
              <BiasStrip bias={releaseBias} count={releaseEntries.length} />
              <ReleasesPanel calendar={calendar} actuals={results} now={now} onActual={setActual} onClear={clearActual} onRetry={loadCalendar} />
            </div>
          )}

          {route === 'news' && (
            <div>
              <PageHeader eyebrow="NEWS" title="Market news">
                The headlines behind the scores, tagged with the instruments they affect.
              </PageHeader>
              <div className="news-page">
                <NewsFeed news={news} loading={newsLoading} activeTab={activeTab} />
              </div>
            </div>
          )}

          {route === 'about' && <AboutPage />}
        </div>
      </main>

      <footer className="app-footer">
        <span>
          Scores are macro pressure derived from news evidence on a 0–100 scale — not
          probabilities, price targets, or forecasts. MacroSentinel provides informational
          market commentary only. It is not investment advice.
        </span>
        <span>{lastUpdate ? 'Last analysis ' + lastUpdate.toLocaleString() : 'Awaiting first analysis'}</span>
      </footer>

      <ReleaseAlert alerts={alerts} onJump={jumpToRelease} />
    </div>
  )
}

var ASSET_TABS = [
  { id: 'forex', label: 'Currencies' },
  { id: 'metals', label: 'Commodities' },
  { id: 'crypto', label: 'Digital assets' }
]

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
