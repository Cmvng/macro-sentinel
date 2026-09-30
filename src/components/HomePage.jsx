import React from 'react'
import HeroScene from './HeroScene.jsx'
import Ticker from './Ticker.jsx'
import AssetIcon from './AssetIcon.jsx'
import NavIcon from './NavIcon.jsx'
import Reveal from './Reveal.jsx'
import { ReleaseVerdictSummary } from './ReleasesPanel.jsx'
import { SIGNAL_CONFIG, getAssetById } from '../lib/assets.js'
import { topSignals } from '../lib/homeView.js'
import { nextRelease, latestResult, relativeTime, dayLabel } from '../lib/releaseView.js'
import { hrefFor } from '../lib/router.js'

function SignalTile({ item, onOpenAsset }) {
  var cfg = SIGNAL_CONFIG[item.signal] || SIGNAL_CONFIG.neutral
  var asset = getAssetById(item.id)
  if (!asset) return null
  return (
    <button type="button" className="signal-tile" onClick={function() { onOpenAsset(item.id, item.signal) }}
      aria-label={'Open ' + asset.label + ', ' + cfg.label + ', score ' + item.score}>
      <AssetIcon id={asset.id} size={34} />
      <span className="signal-tile__name">{asset.label}</span>
      <span className="signal-tile__sig" style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>
        <span aria-hidden="true">{cfg.arrow}</span> {cfg.short} <b>{item.score}</b>
      </span>
    </button>
  )
}

var STEPS = [
  { icon: 'news', title: 'It reads the news', text: 'Headlines from trusted wire services and central banks are gathered every few minutes and matched to the instruments they affect.' },
  { icon: 'markets', title: 'It scores the pressure', text: 'Each of 47 currencies, metals, energy and crypto instruments gets a 0–100 score for how much the news supports or weighs on it.' },
  { icon: 'releases', title: 'It explains the data', text: 'When a release like CPI or GDP prints, it compares the result with the forecast and says in plain English what it means and what it favours.' }
]

export default function HomePage({ news, signals, calendar, results, now, pulse, onOpenAsset }) {
  var top = topSignals(signals, 3)
  var next = nextRelease(calendar.events, now)
  var latest = latestResult(calendar.events, results, now)
  var haveSignals = top.bullish.length + top.bearish.length > 0

  return (
    <div className="home">
      <section className="hero" aria-labelledby="page-title">
        <div className="hero__copy">
          <p className="eyebrow">MACRO INTELLIGENCE, EXPLAINED</p>
          <h1 id="page-title" tabIndex={-1}>Know what the news means for your trades.</h1>
          <p className="hero__lead">
            MacroSentinel reads the market news and the economic calendar, then tells you in plain English
            which currencies, metals and crypto they lean on, and why.
          </p>
          <div className="hero__cta">
            <a className="btn btn--primary" href={hrefFor('markets')}>Open the markets</a>
            <a className="btn" href={hrefFor('releases')}>Today’s releases</a>
          </div>
          <ul className="hero__points">
            <li>47 instruments scored</li>
            <li>Results interpreted as they print</li>
            <li>Live TradingView charts</li>
          </ul>
        </div>
        <HeroScene />
      </section>

      <Ticker news={news} />

      {pulse}

      <Reveal as="section" className="home-pair" aria-label="Releases at a glance">
        <article className="home-card">
          <p className="eyebrow">NEXT HIGH-IMPACT RELEASE</p>
          {calendar.loading && !calendar.events.length ? <p className="home-card__empty">Loading the calendar…</p> : next ? (
            <div>
              <h2 className="home-card__title">{next.currency} {next.title}</h2>
              <p className="home-card__big">{relativeTime(next.timestamp, now)}</p>
              <p className="home-card__meta">{dayLabel(next.timestamp, now)} {new Date(next.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · forecast <strong>{next.forecast || '—'}</strong> · previous <strong>{next.previous || '—'}</strong></p>
              <a className="btn" href={hrefFor('releases')}>See what each outcome would mean</a>
            </div>
          ) : <p className="home-card__empty">No high-impact release is coming up in this week’s calendar.</p>}
        </article>

        <article className="home-card">
          <p className="eyebrow">LATEST RESULT</p>
          {latest ? (
            <div>
              <h2 className="home-card__title">{latest.event.currency} {latest.event.title}</h2>
              <ReleaseVerdictSummary result={latest.result} />
              <a className="btn" href={hrefFor('releases')}>Full explanation</a>
            </div>
          ) : <p className="home-card__empty">{calendar.loading ? 'Loading the calendar…' : 'No result has come in during the last 24 hours. It appears here the moment one does.'}</p>}
        </article>
      </Reveal>

      <Reveal as="section" className="home-signals" aria-labelledby="top-signals-title">
        <div className="home-heading">
          <h2 id="top-signals-title">Strongest signals right now</h2>
          <a className="link-button" href={hrefFor('markets')}>All 47 instruments</a>
        </div>
        {haveSignals ? (
          <div className="home-signals__cols">
            <div>
              <h3 className="home-signals__label">Macro pressure supports</h3>
              <div className="signal-tiles">{top.bullish.length ? top.bullish.map(function(i) { return <SignalTile key={i.id} item={i} onOpenAsset={onOpenAsset} /> }) : <p className="home-card__empty">Nothing is leaning bullish.</p>}</div>
            </div>
            <div>
              <h3 className="home-signals__label">Macro pressure weighs on</h3>
              <div className="signal-tiles">{top.bearish.length ? top.bearish.map(function(i) { return <SignalTile key={i.id} item={i} onOpenAsset={onOpenAsset} /> }) : <p className="home-card__empty">Nothing is leaning bearish.</p>}</div>
            </div>
          </div>
        ) : <p className="home-card__empty">Signals appear here as soon as the first analysis finishes.</p>}
      </Reveal>

      <Reveal as="section" className="home-steps" aria-labelledby="how-title">
        <div className="home-heading">
          <h2 id="how-title">How it works</h2>
          <a className="link-button" href={hrefFor('about')}>The details and the limits</a>
        </div>
        <ol className="steps">
          {STEPS.map(function(step, i) {
            return (
              <li key={step.title} className="step" style={{ '--i': i }}>
                <span className="step__art"><NavIcon id={step.icon} size={64} /></span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            )
          })}
        </ol>
      </Reveal>
    </div>
  )
}
