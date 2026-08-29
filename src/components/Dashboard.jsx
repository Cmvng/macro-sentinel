import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { ASSETS } from '../lib/assets.js'
import { fetchAllNews, setCachedNews } from '../lib/newsFetcher.js'
import { scoreAssets, analyzeAsset } from '../lib/claudeEngine.js'
import SignalTable from './SignalTable.jsx'
import NewsFeed from './NewsFeed.jsx'
import MarketHeader from './MarketHeader.jsx'
import AnalysisPanel from './AnalysisPanel.jsx'
import Ticker from './Ticker.jsx'

function getStoredTheme() {
  try {
    var stored = window.localStorage.getItem('macro-sentinel-theme')
    if (stored === 'light' || stored === 'dark') return stored
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch (_) {
    return 'light'
  }
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

  useEffect(function() {
    try { window.localStorage.setItem('macro-sentinel-theme', theme) } catch (_) {}
  }, [theme])

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

  async function handleAnalyze(assetId, currentSignal) {
    setSelectedAsset(assetId)
    setAnalysis({ asset: assetId, loading: true, text: null, signal: currentSignal })
    try {
      var text = await analyzeAsset(assetId, news, currentSignal)
      setAnalysis({ asset: assetId, loading: false, text: text, signal: currentSignal })
    } catch(e) {
      setAnalysis({ asset: assetId, loading: false, text: null, error: e.message, signal: currentSignal })
    }
  }

  var currentAssets = ASSETS[activeTab] || []
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
            <section className="section-panel signal-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">SIGNAL BOARD</p>
                  <h2>{activeTab === 'forex' ? 'Currency posture' : activeTab === 'metals' ? 'Commodity posture' : 'Digital asset posture'}</h2>
                </div>
                <span className="panel-caption">Select a row for source-grounded analysis</span>
              </div>
              <SignalTable assets={currentAssets} signals={signals} loading={loading} onAnalyze={handleAnalyze} selectedAsset={selectedAsset} />
            </section>
            {analysis && <AnalysisPanel analysis={analysis} onClose={function() { setAnalysis(null); setSelectedAsset(null) }} />}
          </div>

          <aside className="secondary-column" aria-label="Recent market intelligence">
            <NewsFeed news={news} loading={newsLoading} activeTab={activeTab} />
          </aside>
        </section>

        <footer className="app-footer">
          <span>MacroSentinel provides informational market commentary only. It is not investment advice.</span>
          <span>{lastUpdate ? 'Last analysis ' + lastUpdate.toLocaleString() : 'Awaiting first analysis'}</span>
        </footer>
      </main>
    </div>
  )
}
