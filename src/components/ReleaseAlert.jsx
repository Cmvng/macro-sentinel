import React, { useState } from 'react'
import { CURRENCY_BANK } from '../lib/releaseModel.js'
import { getAssetById } from '../lib/assets.js'

// e.g. "USD Final GDP q/q: 2.2% against 1.5% forecast. STRONGER THAN EXPECTED: USD BULLISH, ..."
function ReleasedText({ alert }) {
  var r = alert.result
  var picks = r.instruments.filter(function(i) { return i.signal !== 'neutral' }).slice(0, 3)
  return (
    <span>
      <strong>{alert.event.currency} {r.headline}.</strong> {r.verdict}
      {r.currency.direction !== 'neutral'
        ? ': ' + r.currency.code + ' ' + r.currency.direction.toUpperCase() + (picks.length ? ' \u00b7 ' + picks.map(function(i) { var asset = getAssetById(i.asset); return (asset ? asset.label : i.asset) + ' ' + i.signal.replace('_', ' ').toUpperCase() }).join(', ') : '')
        : '. Close to forecast, so no clear call.'}
    </span>
  )
}

// Announces a High-impact release that is about to print, has just printed, or
// whose result is in. The result comes from the live data source (or from the
// user); when neither has it yet, the alert says so and never invents a number.
//
// It floats over the page instead of sitting in the flow: it arrives after the
// calendar loads, and a banner in the flow pushed the whole board down ~130px
// (measured layout shift 0.26). Floating also keeps it in view while scrolling.
export default function ReleaseAlert({ alerts, onJump }) {
  var dismissedState = useState({})
  var dismissed = dismissedState[0]
  var setDismissed = dismissedState[1]
  var visible = (alerts || []).filter(function(a) { return !dismissed[a.event.id + a.kind] })
  if (!visible.length) return null
  return (
    <div className="release-alerts" role="status" aria-live="polite">
      {visible.map(function(a) {
        var e = a.event
        var upcoming = a.kind === 'upcoming'
        var released = a.kind === 'released'
        var bank = CURRENCY_BANK[e.currency]
        return (
          <div key={e.id} className={'release-alert release-alert--' + a.kind}>
            <span className="release-alert__tag">{upcoming ? 'COMING UP' : released ? 'RESULT IN' : 'JUST RELEASED'}</span>
            <span className="release-alert__text">
              {released ? <ReleasedText alert={a} /> : (
                <span>
                  <strong>{e.currency} {e.title}</strong>
                  {upcoming
                    ? (a.minutes === 0 ? ' prints now' : ' prints in ' + a.minutes + ' min') +
                      (e.forecast ? ' — forecast ' + e.forecast + (e.previous ? ', previous ' + e.previous : '') + '.' : '.') +
                      ' The result will appear here when it prints.'
                    : ' came out ' + a.minutes + ' min ago' + (bank ? ' and could shift ' + bank + ' expectations' : '') +
                      '. The data source has not published the number yet; you can enter it below.'}
                </span>
              )}
            </span>
            <button type="button" className="release-alert__go" onClick={function() { onJump(e.id) }}>
              {upcoming ? 'See scenarios' : released ? 'What it means' : 'Enter result'}
            </button>
            <button type="button" className="release-alert__x" aria-label={'Dismiss alert for ' + e.currency + ' ' + e.title}
              onClick={function() { var next = {}; for (var k in dismissed) next[k] = true; next[e.id + a.kind] = true; setDismissed(next) }}>
              {'\u00d7'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
