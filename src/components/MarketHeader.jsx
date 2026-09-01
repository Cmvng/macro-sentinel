import React from 'react'

function statusDetails(loading, newsLoading, dataStatus) {
  if (loading) return { label: 'ANALYZING', tone: 'pending', description: 'Signal engine is evaluating the latest sources.' }
  if (newsLoading) return { label: 'FETCHING', tone: 'pending', description: 'News sources are being collected.' }
  if (dataStatus === 'cached') return { label: 'CACHED', tone: 'caution', description: 'Showing the most recent verified analysis.' }
  if (dataStatus === 'partial') return { label: 'PARTIAL', tone: 'caution', description: 'Some source groups were unavailable.' }
  if (dataStatus === 'unavailable') return { label: 'UNAVAILABLE', tone: 'danger', description: 'Fresh analysis could not be completed.' }
  return { label: 'LIVE', tone: 'success', description: 'Fresh server-side analysis is available.' }
}

function HealthCard({ label, value, detail, tone, icon }) {
  return (
    <div className={'health-card health-card--' + tone}>
      <div className="health-card__icon" aria-hidden="true">{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{detail}</span>
      </div>
    </div>
  )
}

export default function MarketHeader({
  dominantTheme, marketSummary, lastUpdate, loading, newsLoading, dataStatus,
  newsCount, activeTab, setActiveTab, theme, setTheme, signalStats, onRefresh,
  // Was referenced below but never destructured, so every render threw
  // "sourceCoverage is not defined" and the dashboard failed to mount.
  sourceCoverage = { healthy: 0, total: 0, events: 0 }
}) {
  var tabs = [
    { id: 'forex', label: 'Currencies' },
    { id: 'metals', label: 'Commodities' },
    { id: 'crypto', label: 'Digital assets' }
  ]
  var status = statusDetails(loading, newsLoading, dataStatus)
  var posture = signalStats.bearish > signalStats.bullish ? 'Elevated' : signalStats.bullish > signalStats.bearish ? 'Constructive' : 'Balanced'
  var postureTone = posture === 'Elevated' ? 'risk' : posture === 'Constructive' ? 'positive' : 'neutral'
  var freshness = lastUpdate ? 'Current' : loading ? 'Loading' : 'Pending'
  var sourceDetail = sourceCoverage.total ? sourceCoverage.healthy + ' of ' + sourceCoverage.total + ' sources healthy' : 'Awaiting source health'

  return (
    <header className="market-header">
      <div className="top-nav">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">⌁</div>
          <div>
            <div className="brand-name">MACRO<span>SENTINEL</span></div>
            <p>MACRO INTELLIGENCE, EXPLAINED</p>
          </div>
        </div>

        <div className="nav-actions">
          <div className={'data-status data-status--' + status.tone} title={status.description}>
            <span aria-hidden="true" />
            {status.label}
          </div>
          <button className="refresh-button" onClick={onRefresh} disabled={loading} aria-label="Refresh analysis">
            {loading ? 'Refreshing' : 'Refresh'}
          </button>
          <div className="theme-switcher" aria-label="Color theme">
            <button className={theme === 'light' ? 'is-active' : ''} onClick={function() { setTheme('light') }} aria-pressed={theme === 'light'}>☀ <span>Light</span></button>
            <button className={theme === 'dark' ? 'is-active' : ''} onClick={function() { setTheme('dark') }} aria-pressed={theme === 'dark'}>☾ <span>Dark</span></button>
          </div>
        </div>
      </div>

      <section className="pulse-card" aria-label="Today's macro pulse">
        <div className="pulse-copy">
          <p className="eyebrow">TODAY'S MACRO PULSE</p>
          <div className="pulse-value-row">
            <span className={'posture-label posture-label--' + postureTone}>{posture}</span>
            <span className="pulse-score">{signalStats.risk}<small>/100</small></span>
          </div>
          <h1>{dominantTheme || 'Global market crosscurrents'}</h1>
          <p className="pulse-summary">{marketSummary || 'Fresh analysis will appear here once the server has reviewed the current macro source set.'}</p>
        </div>
        <div className="risk-meter" aria-label={'Current posture: ' + posture + ', score ' + signalStats.risk + ' out of 100'}>
          <div className="meter-labels"><span>Risk off</span><span>Balanced</span><span>Risk on</span></div>
          <div className="meter-track"><span style={{ left: signalStats.risk + '%' }} /></div>
          <div className="meter-legend"><span>Low</span><span>Elevated</span><span>High</span></div>
        </div>
      </section>

      <section className="health-grid" aria-label="Market data health">
        <HealthCard label="Market posture" value={posture} detail={signalStats.bearish + ' bearish · ' + signalStats.bullish + ' bullish'} tone={postureTone} icon="◈" />
        <HealthCard label="Signal coverage" value={signalStats.coverage + '%'} detail={signalStats.known + ' assets analysed'} tone="blue" icon="◌" />
        <HealthCard label="Data freshness" value={freshness} detail={lastUpdate ? lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No completed run'} tone={status.tone} icon="◷" />
        <HealthCard label="Evidence coverage" value={sourceCoverage.events || '—'} detail={sourceDetail} tone={sourceCoverage.total && sourceCoverage.healthy < sourceCoverage.total ? 'caution' : 'blue'} icon="▤" />
      </section>

      <div className="section-tabs" role="tablist" aria-label="Asset groups">
        {tabs.map(function(tab) {
          return <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} className={activeTab === tab.id ? 'is-active' : ''} onClick={function() { setActiveTab(tab.id) }}>{tab.label}</button>
        })}
      </div>
    </header>
  )
}
