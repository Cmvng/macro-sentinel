import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ASSETS, ALL_ASSET_IDS } from '../lib/assets.js'
import { fetchAllNews, getCachedNews, getCacheAge, setCachedNews, clearScoreCache } from '../lib/newsFetcher.js'
import { scoreAssets, analyzeAsset, estimateTokens } from '../lib/claudeEngine.js'
import SignalTable from './SignalTable.jsx'
import NewsFeed from './NewsFeed.jsx'
import MarketHeader from './MarketHeader.jsx'
import AnalysisPanel from './AnalysisPanel.jsx'
import Ticker from './Ticker.jsx'

var CACHE_TTL = 15 * 60 * 1000
var AUTO_REFRESH_MS = 15 * 60 * 1000

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
  var [analysisLoading, setAnalysisLoading] = useState(false)
  var [totalCostUSD, setTotalCostUSD] = useState(0)
  var [callCount, setCallCount] = useState(0)
  var [newsCount, setNewsCount] = useState(0)
  var timerRef = useRef(null)

  var fetchNews = useCallback(async function(force) {
    var cached = getCachedNews()
    if (cached && !force && getCacheAge() < CACHE_TTL) {
      setNews(cached)
      setNewsCount(cached.length)
      return cached
    }
    setNewsLoading(true)
    try {
      var fresh = await fetchAllNews()
      setCachedNews(fresh)
      setNews(fresh)
      setNewsCount(fresh.length)
      return fresh
    } catch(e) {
      console.error('News fetch error:', e)
      return cached || []
    } finally {
      setNewsLoading(false)
    }
  }, [])

  var runAnalysis = useCallback(async function(newsData, force) {
    if (!apiKey) { setError('NO_API_KEY'); return }
    setLoading(true)
    setError(null)
    if (force) clearScoreCache()
    try {
      var filtered = newsData || getCachedNews() || []
      var est = estimateTokens(Math.min(filtered.length, 18), ALL_ASSET_IDS.length)
      var result = await scoreAssets(filtered, ALL_ASSET_IDS, apiKey)
      if (result && result.assets) {
        setSignals(result.assets)
        setMarketSummary(result.market_summary || '')
        setDominantTheme(result.dominant_theme || '')
        setLastUpdate(new Date())
        setTotalCostUSD(function(p) { return +(p + est.costUSD).toFixed(4) })
        setCallCount(function(p) { return p + 1 })
      }
    } catch(e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [apiKey])

  var refresh = useCallback(async function(force) {
    var freshNews = await fetchNews(force)
    await runAnalysis(freshNews, force)
  }, [fetchNews, runAnalysis])

  useEffect(function() {
    refresh()
    timerRef.current = setInterval(function() { refresh() }, AUTO_REFRESH_MS)
    return function() { clearInterval(timerRef.current) }
  }, [])

  async function handleAnalyze(assetId, currentSignal) {
    setAnalysis({ asset: assetId, loading: true, text: null })
    setAnalysisLoading(true)
    try {
      var text = await analyzeAsset(assetId, news, currentSignal, apiKey)
      setAnalysis({ asset: assetId, loading: false, text: text, signal: currentSignal })
    } catch(e) {
      setAnalysis({ asset: assetId, loading: false, text: null, error: e.message })
    } finally {
      setAnalysisLoading(false)
    }
  }

  var currentAssets = ASSETS[activeTab] || []

  var bullCount = Object.values(signals).filter(function(s) {
    return s && (s.signal === 'strong_buy' || s.signal === 'buy')
  }).length

  var bearCount = Object.values(signals).filter(function(s) {
    return s && (s.signal === 'strong_sell' || s.signal === 'sell')
  }).length

  var outerStyle = {
    minHeight: '100vh',
    background: 'var(--bg-void)',
    display: 'flex',
    flexDirection: 'column'
  }

  var innerStyle = {
    flex: 1,
    maxWidth: 1400,
    margin: '0 auto',
    width: '100%',
    padding: '0 1.5rem 2rem'
  }

  var errorStyle = {
    margin: '1rem 0',
    padding: '12px 16px',
    background: 'var(--red-dim)',
    border: '0.5px solid var(--red)',
    borderRadius: 'var(--radius-md)',
    fontSize: 13,
    color: 'var(--red)',
    fontFamily: 'var(--font-mono)'
  }

  var gridStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 340px',
    gap: '1.25rem',
    marginTop: '1rem'
  }

  return (
    <div style={outerStyle}>
      <Ticker news={news} />
      <div style={innerStyle}>
        <MarketHeader
          dominantTheme={dominantTheme}
          marketSummary={marketSummary}
          lastUpdate={lastUpdate}
          loading={loading}
          newsLoading={newsLoading}
          newsCount={newsCount}
          bullCount={bullCount}
          bearCount={bearCount}
          totalCostUSD={totalCostUSD}
          callCount={callCount}
          onRefresh={function() { refresh(true) }}
          onChangeKey={onChangeKey}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        {error && (
          <div style={errorStyle}>
            {error === 'NO_API_KEY' ? 'No API key set. Please add your Anthropic key.' : 'Error: ' + error}
          </div>
        )}
        <div style={gridStyle}>
          <div>
            <SignalTable
              assets={currentAssets}
              signals={signals}
              loading={loading}
              onAnalyze={handleAnalyze}
            />
            {analysis && (
              <AnalysisPanel
                analysis={analysis}
                onClose={function() { setAnalysis(null) }}
              />
            )}
          </div>
          <div>
            <NewsFeed
              news={news}
              loading={newsLoading}
              activeTab={activeTab}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
