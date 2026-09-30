import React, { useState } from 'react'
import { CURRENCY_BANK } from '../lib/releaseModel.js'

// Announces a High-impact release that is about to print or has just printed.
// It cannot announce the RESULT: the calendar feed has forecasts but no actuals,
// so it asks for the number rather than pretending to know it.
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
        var bank = CURRENCY_BANK[e.currency]
        return (
          <div key={e.id} className={'release-alert release-alert--' + a.kind}>
            <span className="release-alert__tag">{upcoming ? 'COMING UP' : 'JUST RELEASED'}</span>
            <span className="release-alert__text">
              <strong>{e.currency} {e.title}</strong>
              {upcoming
                ? (a.minutes === 0 ? ' prints now' : ' prints in ' + a.minutes + ' min') +
                  (e.forecast ? ' — forecast ' + e.forecast + (e.previous ? ', previous ' + e.previous : '') + '.' : '.') +
                  ' Enter the result when it drops.'
                : ' came out ' + a.minutes + ' min ago' + (bank ? ' and could shift ' + bank + ' expectations' : '') +
                  '. Enter the actual result to see what it means.'}
            </span>
            <button type="button" className="release-alert__go" onClick={function() { onJump(e.id) }}>
              {upcoming ? 'See scenarios' : 'Enter result'}
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
