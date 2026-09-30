import React, { useState, useMemo } from 'react'
import Tilt from './Tilt.jsx'
import { SIGNAL_CONFIG, getAssetById } from '../lib/assets.js'
import { interpretRelease, scenarioFor, indicatorTitles } from '../lib/releaseModel.js'
import { groupEvents, isModelled, keyInstruments, relativeTime, dayLabel, releaseDomId } from '../lib/releaseView.js'

var CURRENCY_CHOICES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD', 'CNY']
var SECTION_LIMIT = { awaiting: 4, done: 6, upcoming: 6 }

function InstrumentChip({ item, index }) {
  var cfg = SIGNAL_CONFIG[item.signal] || SIGNAL_CONFIG.neutral
  var asset = getAssetById(item.asset)
  return (
    <li className="instrument-chip" title={item.note}
      style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border, '--i': index }}>
      <span className="instrument-chip__name">{asset ? asset.label : item.asset}</span>
      <span className="instrument-chip__sig"><span aria-hidden="true">{cfg.arrow}</span> {cfg.short}</span>
    </li>
  )
}

function DirectionTag({ currency }) {
  var tone = currency.direction === 'bullish' ? 'bull' : currency.direction === 'bearish' ? 'bear' : 'flat'
  var arrow = currency.direction === 'bullish' ? '▲' : currency.direction === 'bearish' ? '▼' : '–'
  return <span className={'dir-tag dir-tag--' + tone}><span aria-hidden="true">{arrow}</span> {currency.code} {currency.direction.toUpperCase()}</span>
}

// The answer: what the number means, in plain English, and what to do about it.
export function ReleaseVerdict({ result }) {
  var [showAll, setShowAll] = useState(false)
  var tone = result.currency.direction === 'bullish' ? 'bull' : result.currency.direction === 'bearish' ? 'bear' : 'flat'
  var affected = result.instruments.filter(function(i) { return i.signal !== 'neutral' })
  // The strongest few first. A weak jobs number touches all twelve cryptos, and
  // twenty-odd chips is a wall of tags rather than an answer.
  var CHIP_LIMIT = 8
  var visible = showAll ? affected : affected.slice(0, CHIP_LIMIT)
  return (
    <div className={'release-verdict release-verdict--' + tone}>
      <div className="release-verdict__top">
        <strong className="release-verdict__word">{result.verdict}</strong>
        <DirectionTag currency={result.currency} />
        <span className="release-verdict__size">{result.magnitude.replace('_', ' ')} surprise</span>
      </div>
      <p className="release-verdict__headline">{result.headline}</p>
      <p className="release-verdict__meaning"><span className="label">What it means</span>{result.meaning}</p>

      {affected.length > 0 ? (
        <div>
          <p className="label">Bias on your instruments</p>
          <ul className="chip-row">{visible.map(function(i, n) { return <InstrumentChip key={i.asset} item={i} index={n} /> })}</ul>
          {affected.length > CHIP_LIMIT && (
            <button type="button" className="link-button chip-more" onClick={function() { setShowAll(!showAll) }}>
              {showAll ? 'Show fewer' : 'Show all ' + affected.length + ' instruments'}
            </button>
          )}
        </div>
      ) : (
        <p className="release-verdict__flat">Close to forecast, so no instrument gets a directional call from this release.</p>
      )}

      <p className="release-verdict__meta">
        Confidence <strong>{result.confidence}</strong>
        {' · '}a typical miss for this indicator is about {result.typical_surprise} (a rough estimate)
        {result.basis === 'previous' ? ' · compared with the previous value' : ''}
      </p>
      {result.warnings.map(function(w) { return <p key={w} className="release-warning" role="alert">{w}</p> })}

      {affected.length > 0 && (
        <details className="release-details">
          <summary>Why these instruments?</summary>
          <ul>{affected.map(function(i) { return <li key={i.asset}><strong>{(getAssetById(i.asset) || { label: i.asset }).label}:</strong> {i.note}</li> })}</ul>
        </details>
      )}
      <details className="release-details">
        <summary>What is {result.indicator.name}?</summary>
        <p>{result.what_is}</p>
        <p>{result.why_it_matters}</p>
      </details>
      <ul className="release-caveats">{result.caveats.map(function(c) { return <li key={c}>{c}</li> })}</ul>
    </div>
  )
}

function ScenarioLine({ branch, label }) {
  var picks = keyInstruments(branch.instruments)
  return (
    <li className="scenario-line">
      <span className="scenario-line__if">{label} <strong>{branch.threshold}</strong></span>
      <DirectionTag currency={branch.currency} />
      <span className="scenario-line__chips">
        {picks.map(function(i) {
          var cfg = SIGNAL_CONFIG[i.signal] || SIGNAL_CONFIG.neutral
          var asset = getAssetById(i.asset)
          return <span key={i.asset} className="mini-chip" style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>
            {asset ? asset.label : i.asset} {cfg.short}
          </span>
        })}
      </span>
    </li>
  )
}

function ReleaseCard({ event, state, now, actual, source, onActual, onClear, index }) {
  var [draft, setDraft] = useState('')
  var [editing, setEditing] = useState(false)
  var [problem, setProblem] = useState('')
  var modelled = isModelled(event)

  var scenario = useMemo(function() {
    if (state === 'done' || !modelled) return null
    return scenarioFor(event)
  }, [event, state, modelled])

  var result = useMemo(function() {
    if (!actual) return null
    return interpretRelease({ title: event.title, currency: event.currency, impact: event.impact, forecast: event.forecast, previous: event.previous, actual: actual })
  }, [event, actual])

  function submit(e) {
    e.preventDefault()
    var check = interpretRelease({ title: event.title, currency: event.currency, impact: event.impact, forecast: event.forecast, previous: event.previous, actual: draft })
    if (!check.ok) { setProblem(check.message); return }
    setProblem('')
    onActual(event.id, draft.trim())
    setDraft('')
    setEditing(false)
  }

  return (
    <Tilt as="article" max={2.4} id={releaseDomId(event.id)} className={'release-card release-card--' + state + ' rise'} style={{ '--i': index }} aria-label={event.currency + ' ' + event.title}>
      <header className="release-card__head">
        <span className="ccy-chip">{event.currency}</span>
        <span className={'impact impact--' + event.impact} title={event.impact + ' impact'}>
          <span aria-hidden="true">{event.impact === 'high' ? '●●●' : '●●'}</span>
          <span className="visually-hidden">{event.impact} impact</span>
        </span>
        <h3 className="release-card__title">{event.title}</h3>
        <span className="release-card__when">{dayLabel(event.timestamp, now)} {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} <em>{relativeTime(event.timestamp, now)}</em></span>
      </header>

      {!modelled ? (
        <p className="release-card__note">A speech or statement has no number to judge. Read it as news: the tone on interest rates is what moves markets.</p>
      ) : (
        <div className="release-values">
          <span><small>Forecast</small><strong>{event.forecast || '—'}</strong></span>
          <span><small>Previous</small><strong>{event.previous || '—'}</strong></span>
          <span><small>Actual</small><strong>{actual || '—'}</strong>
            {actual && <em className={'source-tag source-tag--' + source}>{source === 'live' ? 'LIVE DATA' : 'YOUR ENTRY'}</em>}
          </span>
          {actual && !editing && (
            source === 'live'
              ? <button type="button" className="link-button" onClick={function() { setEditing(true) }}>Enter my own</button>
              : <button type="button" className="link-button" onClick={function() { onClear(event.id) }}>{'Remove my entry'}</button>
          )}
          {(!actual || editing) && (
            <form className="release-entry" onSubmit={submit}>
              <label className="visually-hidden" htmlFor={releaseDomId(event.id) + '-in'}>Actual result for {event.title}</label>
              <input id={releaseDomId(event.id) + '-in'} value={draft} inputMode="decimal" autoComplete="off"
                onChange={function(e) { setDraft(e.target.value); setProblem('') }}
                placeholder={state === 'awaiting' ? 'Not published yet. Type it, e.g. ' + (event.forecast || '0.3%') : 'Result appears when released'} />
              <button type="submit" disabled={!draft.trim()}>Interpret</button>
              {editing && <button type="button" className="link-button" onClick={function() { setEditing(false); setProblem('') }}>Cancel</button>}
            </form>
          )}
        </div>
      )}
      {problem && <p className="release-warning" role="alert">{problem}</p>}

      {scenario && (
        <div className="release-scenario">
          <p className="label">If it prints {'…'}</p>
          <ul>
            <ScenarioLine branch={scenario.above} label="above" />
            <ScenarioLine branch={scenario.below} label="below" />
          </ul>
          <p className="release-scenario__foot">Within {scenario.in_line.low}{'–'}{scenario.in_line.high} counts as in line, with little reaction expected. {scenario.what_is}</p>
        </div>
      )}

      {result && result.ok && <ReleaseVerdict result={result} />}
      {result && !result.ok && <p className="release-warning" role="alert">{result.message}</p>}
    </Tilt>
  )
}

function Section({ title, hint, events, state, now, actuals, onActual, onClear, limit }) {
  var [all, setAll] = useState(false)
  if (!events.length) return null
  var shown = all ? events : events.slice(0, limit)
  return (
    <section className="release-section" aria-label={title}>
      <h3 className="release-section__title">{title} <span>{events.length}</span></h3>
      {hint && <p className="release-section__hint">{hint}</p>}
      <div className="release-list">
        {shown.map(function(e, i) {
          return <ReleaseCard key={e.id} index={i} event={e} state={state} now={now}
            actual={actuals[e.id] ? actuals[e.id].actual : ''} source={actuals[e.id] ? actuals[e.id].source : ''} onActual={onActual} onClear={onClear} />
        })}
      </div>
      {events.length > limit && (
        <button type="button" className="link-button" onClick={function() { setAll(!all) }}>
          {all ? 'Show fewer' : 'Show all ' + events.length}
        </button>
      )}
    </section>
  )
}

// A calculator for any release, including ones the feed does not list or a
// feed that is down. Nothing is stored.
function ManualInterpreter() {
  var titles = useMemo(indicatorTitles, [])
  var [title, setTitle] = useState('CPI m/m')
  var [currency, setCurrency] = useState('USD')
  var [impact, setImpact] = useState('high')
  var [forecast, setForecast] = useState('')
  var [previous, setPrevious] = useState('')
  var [actual, setActual] = useState('')
  var result = useMemo(function() {
    return interpretRelease({ title: title, currency: currency, impact: impact, forecast: forecast, previous: previous, actual: actual })
  }, [title, currency, impact, forecast, previous, actual])
  var cats = ['inflation', 'labour', 'growth', 'rates']

  return (
    <details className="release-manual">
      <summary>Interpret any release yourself</summary>
      <p className="release-section__hint">For a release the calendar does not list, or when it is unavailable. Copy the numbers from Forex Factory.</p>
      <div className="release-manual__grid">
        <label>Release
          <select value={title} onChange={function(e) { setTitle(e.target.value) }}>
            {cats.map(function(c) {
              return <optgroup key={c} label={c.charAt(0).toUpperCase() + c.slice(1)}>
                {titles.filter(function(t) { return t.category === c }).map(function(t) { return <option key={t.title} value={t.title}>{t.title}</option> })}
              </optgroup>
            })}
          </select>
        </label>
        <label>Currency
          <select value={currency} onChange={function(e) { setCurrency(e.target.value) }}>
            {CURRENCY_CHOICES.map(function(c) { return <option key={c} value={c}>{c}</option> })}
          </select>
        </label>
        <label>Impact
          <select value={impact} onChange={function(e) { setImpact(e.target.value) }}>
            <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
          </select>
        </label>
        <label>Forecast<input value={forecast} onChange={function(e) { setForecast(e.target.value) }} placeholder="0.3%" autoComplete="off" /></label>
        <label>Previous<input value={previous} onChange={function(e) { setPrevious(e.target.value) }} placeholder="0.2%" autoComplete="off" /></label>
        <label>Actual<input value={actual} onChange={function(e) { setActual(e.target.value) }} placeholder="0.5%" autoComplete="off" /></label>
      </div>
      {result.ok && <ReleaseVerdict result={result} />}
      {!result.ok && actual.trim() !== '' && <p className="release-warning" role="alert">{result.message}</p>}
    </details>
  )
}

export default function ReleasesPanel({ calendar, actuals, now, onActual, onClear, onRetry }) {
  var [currency, setCurrency] = useState('all')
  var [highOnly, setHighOnly] = useState(false)

  var events = calendar.events
  var groups = useMemo(function() {
    return groupEvents(events, actuals, now, { currency: currency, highOnly: highOnly })
  }, [events, actuals, now, currency, highOnly])

  var present = useMemo(function() {
    var seen = {}
    for (var i = 0; i < events.length; i++) seen[events[i].currency] = true
    return CURRENCY_CHOICES.filter(function(c) { return seen[c] })
  }, [events])

  var total = groups.awaiting.length + groups.done.length + groups.upcoming.length

  return (
    <section className="section-panel release-panel" id="releases" aria-label="Economic releases">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">ECONOMIC RELEASES</p>
          <h2>What the data means</h2>
        </div>
        <span className="panel-caption">
          {calendar.stale ? 'Calendar may be out of date' : calendar.ageMinutes !== null ? 'Calendar updated ' + (calendar.ageMinutes < 1 ? 'just now' : calendar.ageMinutes + ' min ago') : ''}
        </span>
      </div>

      <p className="release-intro">
        Markets react to the <strong>surprise</strong>, the gap between the result and the forecast, not to the number itself.
        Forecasts and results load automatically, so <strong>the moment a release prints you see what it means and which instruments it favours</strong>.
        If a result is missing or looks wrong, you can enter your own.
      </p>

      {events.length > 0 && calendar.actualsStatus === 'unavailable' && (
        <p className="release-warning" role="status">Live results cannot be loaded right now, so releases will not fill in by themselves. You can still type a result in.</p>
      )}
      {events.length > 0 && calendar.actualsStatus === 'stale' && (
        <p className="release-warning" role="status">Live results are a few minutes behind at the moment.</p>
      )}

      {calendar.loading && !events.length && <p className="release-empty">Loading the calendar{'…'}</p>}

      {calendar.error && !events.length && (
        <div className="release-empty" role="status">
          <strong>The economic calendar is temporarily unavailable.</strong> You can still interpret any release below.{' '}
          <button type="button" className="link-button" onClick={onRetry}>Try again</button>
        </div>
      )}

      {events.length > 0 && (
        <div className="release-filters" role="group" aria-label="Filter releases">
          <button type="button" aria-pressed={currency === 'all'} onClick={function() { setCurrency('all') }}>All</button>
          {present.map(function(c) {
            return <button key={c} type="button" aria-pressed={currency === c} onClick={function() { setCurrency(c) }}>{c}</button>
          })}
          <button type="button" className="release-filters__high" aria-pressed={highOnly} onClick={function() { setHighOnly(!highOnly) }}>High impact only</button>
        </div>
      )}

      {events.length > 0 && total === 0 && <p className="release-empty">No releases match in the last 12 hours or next 48 hours.</p>}

      <Section title="Released, waiting for the number" hint="These have printed but the data source has not published the result yet. It normally appears within minutes; you can also type it in."
        events={groups.awaiting} state="awaiting" now={now} actuals={actuals} onActual={onActual} onClear={onClear} limit={SECTION_LIMIT.awaiting} />
      <Section title="Results and what they mean" events={groups.done} state="done" now={now} actuals={actuals} onActual={onActual} onClear={onClear} limit={SECTION_LIMIT.done} />
      <Section title="Coming up" hint="Scenarios show what each outcome would mean before it happens."
        events={groups.upcoming} state="upcoming" now={now} actuals={actuals} onActual={onActual} onClear={onClear} limit={SECTION_LIMIT.upcoming} />

      <ManualInterpreter />
    </section>
  )
}
