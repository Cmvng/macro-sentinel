import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ASSETS, ALL_ASSET_IDS } from '../lib/assets.js'
import { fetchAllNews, getCachedNews, getCacheAge, setCachedNews, clearScoreCache } from '../lib/newsFetcher.js'
import { scoreAssets, analyzeAsset, estimateTokens } from '../lib/claudeEngine.js'
import SignalTable from './SignalTable.jsx'
import NewsFeed from './NewsFeed.jsx'
import MarketHeader from './MarketHeader.jsx'
import AnalysisPanel from './AnalysisPanel.jsx'
import Ticker from './Ticker.jsx'

const CACHE_TTL = 15 * 60 * 1000
const AUTO_REFRESH_MS = 15 * 60 * 1000

export default function Dashboard({ apiKey, onChangeKey }) {
  const [activeTab, setActiveTab] = useState('forex')
  const [news, setNews] = useState([])
  const [signals, setSignals] = useState({})
  const [marketSummary, setMarketSummary] = useState('')
  const [dominantTheme, setDominantTheme] = useState('')
  const [loading, setLoading] = useState(false)
  const [newsLoading, setNewsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [totalCostUSD, setTotalCostUSD] = useState(0)
  const [callCount, setCallCount] = useState(0)
  const [newsCount, setNewsCount] = useState(0)
  const timerRef = useRef(null)

  const fetchNews = useCallback(async (force = false) => {
    const cached = getCachedNews()
    if (cached && !force && getCacheAge() < CACHE_TTL) {
      setNews(cached)
      setNewsCount(cached.length)
      return cached
    }
    setNewsLoading(true)
    try {
      const fresh = await fetchAllNews()
      setCachedNews(fresh)
      setNews(fresh)
      setNewsCount(fresh.length)
      return fresh
    } catch (e) {
      console.error('News fetch error:', e)
      return cached || []
    } finally {
      setNewsLoading(false)
    }
  }, [])

  const runAnalysis = useCallback(async (newsData, force = false) => {
    if (!apiKey) { setError('NO_API_KEY'); return }
    setLoading(true)
    setError(null)
    if (force) clearScoreCache()
    try {
      const filtered = newsData || getCachedNews() || []
      const est = estimateTokens(Math.min(filtered.length, 18), ALL_ASSET_IDS.length)
      const result = await scoreAssets(filtered, ALL_ASSET_IDS, apiKey)
      if (result?.assets) {
        setSignals(result.assets)
        setMarketSummary(result.market_summary || '')
        setDominantTheme(result.dominant_theme || '')
        setLastUpdate(new Date())
        setTotalCostUSD(p => +(p + est.costUSD).toFixed(4))
        setCallCount(p => p + 1)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [apiKey])

  const refresh = useCallback(async (force = false) => {
    const freshNews = await fetchNews(force)
    await runAnalysis(freshNews, force)
  }, [fetchNews, runAnalysis])

  useEffect(() => {
    refresh()
    timerRef.current = setInterval(() => refresh(), AUTO_REFRESH_MS)
    return () => clearInterval(timerRef.current)
  }, [])

  const handleAnalyze = async (assetId, currentSignal) => {
    setAnalysis({ asset: assetId, loading: true, text: null })
    setAnalysisLoading(true)
    try {
      const text = await analyzeAsset(assetId, news, currentSignal, apiKey)
      setAnalysis({ asset: assetId, loading: false, text, signal: currentSignal })
    } catch (e) {
      setAnalysis({ asset: assetId, loading: false, text: null, error: e.message })
    } finally {
      setAnalysisLoading(false)
    }
  }

  const currentAssets = ASSETS[activeTab] || []
  const bullCount = Object.values(signals).filter(s =>
    s?.signal === 'strong_buy' || s?.signal === 'buy'
  ).length
  const bearCount = Object.values(signals).filter(s =>
    s?.signal === 'strong_sell' || s?.signal === 'sell'
  ).length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)', display: 'flex', flexDirection: 'column' }}>
      <Ticker news={news} />

      <div style={{
        flex: 1, maxWidth: 1400, margin: '0 auto',
        width: '100%', padding: '0 1.5rem 2rem'
      }}>
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
          onRefresh={() => refresh(true)}
          onChangeKey={onChangeKey}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        {error && (
          <div style={{
            margin: '1rem 0', padding: '12px 16px',
            background: 'var(--red-dim)', border: '0.5px solid var(--red)',
            borderRadius: 'var(--radius-md)', fontSize: 13,
            color: 'var(--red)', fontFamily: 'var(--font-mono)'
          }}>
            {error === 'NO_API_KEY'
              ? 'No API key set. Please add your Anthropic key.'
              : `Error: ${error}`
            }
          </div>
        )}

        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 340px',
          gap: '1.25rem', marginTop: '1rem'
        }}>
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
                onClose={() => setAnalysis(null)}
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
