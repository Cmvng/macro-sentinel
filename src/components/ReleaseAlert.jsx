import React from 'react'
import { CURRENCY_BANK } from '../lib/releaseModel.js'

// Announces a High-impact release that is about to print or has just printed.
// It cannot announce the RESULT: the calendar feed has forecasts but no actuals,
// so it asks for the number rather than pretending to know it.
export default function ReleaseAlert({ alerts, onJump }) {
  if (!alerts || !alerts.length) return null
  return (
    <div className="release-alerts" role="status" aria-live="polite">
      {alerts.map(function(a) {
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
          </div>
        )
      })}
    </div>
  )
}
