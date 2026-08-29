import React, { useState, useEffect, useCallback } from 'react'
import { ASSETS } from '../lib/assets.js'
import { fetchAllNews, setCachedNews } from '../lib/newsFetcher.js'
import { scoreAssets, analyzeAsset } from '../lib/claudeEngine.js'
import SignalTable from './SignalTable.jsx'
import NewsFeed from './NewsFeed.jsx'
import MarketHeader from './MarketHeader.jsx'
import AnalysisPanel from './AnalysisPanel.jsx'
import Ticker from './Ticker.jsx'

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
  var bullCount = currentAssets.filter(function(asset) {
    var signal = signals[asset.id]
    return signal && (signal.signal === 'strong_buy' || signal.signal === 'buy')
  }).length
  var bearCount = currentAssets.filter(function(asset) {
    var signal = signals[asset.id]
    return signal && (signal.signal === 'strong_sell' || signal.signal === 'sell')
  }).length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)', display: 'flex', flexDirection: 'column' }}>
      <Ticker news={news} />
      <div style={{ flex: 1, maxWidth: 1400, margin: '0 auto', width: '100%', padding: '0 1rem 2rem' }}>
        <MarketHeader
          dominantTheme={dominantTheme}
          marketSummary={marketSummary}
          lastUpdate={lastUpdate}
          loading={loading}
          newsLoading={newsLoading}
          dataStatus={dataStatus}
          newsCount={newsCount}
          bullCount={bullCount}
          bearCount={bearCount}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        {error && (
          <div style={{ margin: '0.5rem 0', padding: '10px 14px', background: 'var(--red-dim)', border: '0.5px solid var(--red)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>
            {'Analysis unavailable: ' + error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginTop: '0.5rem' }} className="main-grid">
          <div>
            <SignalTable assets={currentAssets} signals={signals} loading={loading} onAnalyze={handleAnalyze} selectedAsset={selectedAsset} />
            {analysis && <AnalysisPanel analysis={analysis} onClose={function() { setAnalysis(null); setSelectedAsset(null) }} />}
          </div>
          <div><NewsFeed news={news} loading={newsLoading} activeTab={activeTab} /></div>
        </div>

        <footer style={{ color: 'var(--text-muted)', fontSize: 11, lineHeight: 1.5, marginTop: '1rem', textAlign: 'center' }}>
          MacroSentinel provides informational market commentary only. It is not investment advice and does not constitute a recommendation to trade.
        </footer>
      </div>
    </div>
  )
}
