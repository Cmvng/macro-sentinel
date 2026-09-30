import React from 'react'
import Tilt from './Tilt.jsx'
import PulseGauge from './PulseGauge.jsx'
import { useCountUp } from '../lib/motion.js'

// Freshness is graded from the server's own age figure rather than being a
// binary "Current / Pending". A cache hit is still current data.
function freshnessFor(ageMinutes, lastUpdate, loading) {
  if (loading && ageMinutes === null) return { value: 'Loading', detail: 'Fetching analysis', tone: 'blue' }
  if (ageMinutes === null && !lastUpdate) return { value: 'Pending', detail: 'No completed run', tone: 'caution' }

  var age = ageMinutes
  if (age === null && lastUpdate) age = Math.max(0, Math.round((Date.now() - lastUpdate.getTime()) / 60000))

  var stamp = lastUpdate
    ? lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'time unknown'

  if (age >= 24 * 60) return { value: 'Stale', detail: 'Over a day old · ' + stamp, tone: 'danger' }
  if (age >= 90) return { value: 'Delayed', detail: formatAge(age) + ' old · ' + stamp, tone: 'caution' }
  return { value: 'Current', detail: formatAge(age) + ' old · ' + stamp, tone: 'blue' }
}

function formatAge(min) {
  if (min < 1) return 'under a minute'
  if (min < 60) return min + ' min'
  var h = Math.floor(min / 60)
  if (h < 24) return h + 'h ' + (min % 60) + 'm'
  return Math.floor(h / 24) + 'd'
}

// The split of every analysed signal: a stacked bar with counts in text, so the
// meaning never depends on colour alone.
function SignalSplit({ bullish, bearish, known }) {
  if (!known) return null
  var neutral = Math.max(0, known - bullish - bearish)
  var parts = [
    { key: 'bull', label: 'Bullish', n: bullish },
    { key: 'flat', label: 'Neutral', n: neutral },
    { key: 'bear', label: 'Bearish', n: bearish }
  ]
  return (
    <div className="split" role="img" aria-label={bullish + ' bullish, ' + neutral + ' neutral, ' + bearish + ' bearish of ' + known + ' assets'}>
      <div className="split-bar" aria-hidden="true">
        {parts.map(function(part) {
          return part.n ? <span key={part.key} className={'split-seg split-seg--' + part.key} style={{ flexGrow: part.n }} /> : null
        })}
      </div>
      <div className="split-legend" aria-hidden="true">
        {parts.map(function(part) {
          return <span key={part.key} className={'split-key split-key--' + part.key}><i />{part.label} <b>{part.n}</b></span>
        })}
      </div>
    </div>
  )
}

function HealthCard({ label, value, detail, tone, icon, index }) {
  // Numeric values count up; words ("Current", "Delayed") show as they are.
  var isPercent = typeof value === 'string' && /^\d+%$/.test(value)
  var numeric = typeof value === 'number' ? value : isPercent ? parseInt(value, 10) : null
  var counted = useCountUp(numeric, 900)
  var display = numeric === null ? value : (isPercent ? counted + '%' : counted)
  return (
    <Tilt max={5} className={'health-card health-card--' + tone + ' rise'} style={{ '--i': index }}>
      <div className="health-card__icon tilt-layer" aria-hidden="true">{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{display}</strong>
        <span>{detail}</span>
      </div>
    </Tilt>
  )
}

export default function PulseSection({
  dominantTheme, marketSummary, lastUpdate, ageMinutes, loading, signalStats,
  // Was referenced below but never destructured, so every render threw
  // "sourceCoverage is not defined" and the dashboard failed to mount.
  sourceCoverage = { healthy: 0, total: 0, events: 0 }
}) {
  var posture = signalStats.bearish > signalStats.bullish ? 'Elevated' : signalStats.bullish > signalStats.bearish ? 'Constructive' : 'Balanced'
  var postureTone = posture === 'Elevated' ? 'risk' : posture === 'Constructive' ? 'positive' : 'neutral'
  var freshness = freshnessFor(typeof ageMinutes === 'number' ? ageMinutes : null, lastUpdate, loading)
  var sourceDetail = sourceCoverage.total ? sourceCoverage.healthy + ' of ' + sourceCoverage.total + ' sources healthy' : 'Awaiting source health'

  return (
    <section className="pulse-section" aria-labelledby="pulse-title">
      <Tilt as="div" max={2.2} className="pulse-card">
        <div className="pulse-copy">
          <p className="eyebrow">TODAY'S MACRO PULSE</p>
          <span className={'posture-label posture-label--' + postureTone}>{posture}</span>
          <h2 id="pulse-title">{dominantTheme || 'Global market crosscurrents'}</h2>
          <p className="pulse-summary">{marketSummary || 'Fresh analysis will appear here once the server has reviewed the current macro source set.'}</p>
          <SignalSplit bullish={signalStats.bullish} bearish={signalStats.bearish} known={signalStats.known} />
        </div>
        <PulseGauge score={signalStats.risk} posture={posture} />
      </Tilt>

      <div className="health-grid">
        <HealthCard index={0} label="Market posture" value={posture} detail={signalStats.bearish + ' bearish · ' + signalStats.bullish + ' bullish'} tone={postureTone} icon="◈" />
        <HealthCard index={1} label="Signal coverage" value={signalStats.coverage + '%'} detail={signalStats.known + ' assets analysed'} tone="blue" icon="◌" />
        <HealthCard index={2} label="Data freshness" value={freshness.value} detail={freshness.detail} tone={freshness.tone} icon="◷" />
        <HealthCard index={3} label="Evidence coverage" value={sourceCoverage.events || '—'} detail={sourceDetail} tone={sourceCoverage.total && sourceCoverage.healthy < sourceCoverage.total ? 'caution' : 'blue'} icon="▤" />
      </div>
    </section>
  )
}
