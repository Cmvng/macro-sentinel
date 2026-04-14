import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ASSETS, ALL_ASSET_IDS } from '../lib/assets.js'
import { fetchAllNews, getCachedNews, setCachedNews } from '../lib/newsFetcher.js'
import { scoreAssets, scoreAssetsForce, analyzeAsset, checkBreakingNews } from '../lib/claudeEngine.js'
import SignalTable from './SignalTable.jsx'
import NewsFeed from './NewsFeed.jsx'
import MarketHeader from './MarketHeader.jsx'
import AnalysisPanel from './AnalysisPanel.jsx'
import Ticker from './Ticker.jsx'

var BREAKING_CHECK_MS = 60 * 60 * 1000

export default function Dashboard({ apiKey, onChangeKey }) {
  var [activeTab, setActiveTab] = useState('forex')
  var [news, setNews] = useState([])
  var [signals, setSignals] = useState({})
  var [marketSummary, setMarketSummary] = useState('')
  var [dominantTheme, setDominantTheme] = useState('')
  var [loading, setLoading] = useState(false)
  var [newsLoading, setNewsLoading] = useState(false)
  var [error, setError] = useState(null)
  var [lastUpdate, setLastUpdate] = useState(null)
  var [analysis, setAnalysis] = useState(null)
  var [newsCount, setNewsCount] = useState(0)
  var [selectedAsset, setSelectedAsset] = useState(null)
  var [breakingAlert, setBreakingAlert] = useState(null)
  var timerRef = useRef(null)
  var breakingRef = useRef(null)

  var loadNews = useCallback(async function() {
    setNewsLoading(true)
    try {
      var fresh = await fetchAllNews()
      setCachedNews(fresh)
      setNews(fresh)
      setNewsCount(fresh.length)
      return fresh
    } catch(e) {
      return []
    } finally {
      setNewsLoading(false)
    }
  }, [])

  var loadSignals = useCallback(async function(force) {
    setLoading(true)
    setError(null)
    try {
      var result = force ? await scoreAssetsForce() : await scoreAssets([], [], apiKey)
      if (result && result.assets) {
        setSignals(result.assets)
        setMarketSummary(result.market_summary || '')
        setDominantTheme(result.dominant_theme || '')
        setLastUpdate(new Date())
      }
    } catch(e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [apiKey])

  var checkBreaking = useCallback(async function() {
    var result = await checkBreakingNews()
    if (result && result.breaking) {
      setBreakingAlert(result.headlines)
      if (result.signals && result.signals.assets) {
        setSignals(result.signals.assets)
        setMarketSummary(result.signals.market_summary || '')
        setDominantTheme(result.signals.dominant_theme || '')
        setLastUpdate(new Date())
      }
    }
  }, [])

  useEffect(function() {
    loadNews()
    loadSignals(false)
    breakingRef.current = setInterval(checkBreaking, BREAKING_CHECK_MS)
    return function() {
      if (timerRef.current) clearInterval(timerRef.current)
      if (breakingRef.current) clearInterval(breakingRef.current)
    }
  }, [])

  async function handleAnalyze(assetId, currentSignal) {
    setSelectedAsset(assetId)
    setAnalysis({ asset: assetId, loading: true, text: null, signal: currentSignal })
    try {
      var text = await analyzeAsset(assetId, news, currentSignal, apiKey)
      setAnalysis({ asset: assetId, loading: false, text: text, signal: currentSignal })
    } catch(e) {
      setAnalysis({ asset: assetId, loading: false, text: null, error: e.message, signal: currentSignal })
    }
  }

  var currentAssets = ASSETS[activeTab] || []
  var bullCount = Object.values(signals).filter(function(s) { return s && (s.signal === 'strong_buy' || s.signal === 'buy') }).length
  var bearCount = Object.values(signals).filter(function(s) { return s && (s.signal === 'strong_sell' || s.signal === 'sell') }).length

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
          newsCount={newsCount}
          bullCount={bullCount}
          bearCount={bearCount}
          onRefresh={function() { loadSignals(true); loadNews() }}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        {breakingAlert && (
          <div style={{
            margin: '0.5rem 0 1rem', padding: '10px 14px',
            background: 'rgba(230,81,0,0.08)', border: '0.5px solid var(--amber)',
            borderRadius: 'var(--radius-md)', fontSize: 12,
            color: 'var(--amber)', fontFamily: 'var(--font-mono)',
            display: 'flex', alignItems: 'flex-start', gap: 8
          }}>
            <span style={{ flexShrink: 0, fontWeight: 700 }}>BREAKING</span>
            <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: 13 }}>
              {breakingAlert[0]}
            </span>
            <button
              onClick={function() { setBreakingAlert(null) }}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0, fontSize: 14 }}
            >
              x
            </button>
          </div>
        )}

        {error && (
          <div style={{
            margin: '0.5rem 0', padding: '10px 14px',
            background: 'var(--red-dim)', border: '0.5px solid var(--red)',
            borderRadius: 'var(--radius-md)', fontSize: 13,
            color: 'var(--red)', fontFamily: 'var(--font-mono)'
          }}>
            {'Error: ' + error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginTop: '0.5rem' }} className="main-grid">
          <div>
            <SignalTable
              assets={currentAssets}
              signals={signals}
              loading={loading}
              onAnalyze={handleAnalyze}
              selectedAsset={selectedAsset}
            />
            {analysis && (
              <AnalysisPanel
                analysis={analysis}
                onClose={function() { setAnalysis(null); setSelectedAsset(null) }}
              />
            )}
          </div>
          <div>
            <NewsFeed news={news} loading={newsLoading} activeTab={activeTab} />
          </div>
        </div>
      </div>
    </div>
  )
}
