import React from 'react'
import { useCountUp, useMounted } from '../lib/motion.js'

// The one hero of the page: how much macro risk the current signals imply,
// 0-100. A meter is a single value against a limit, so the arc is one ramp:
// calm on the left, neutral through the middle, hot on the right. The number is
// what carries the meaning; the arc, needle and colour only support it.
var CX = 100
var CY = 104
var R = 82

function polar(radius, deg) {
  var a = (deg * Math.PI) / 180
  return { x: CX + radius * Math.cos(a), y: CY - radius * Math.sin(a) }
}

export default function PulseGauge({ score, posture }) {
  var mounted = useMounted()
  var shown = useCountUp(score, 1100)
  var safe = Math.max(0, Math.min(100, Number(score) || 0))
  var needle = -90 + (mounted ? safe : 0) * 1.8

  var ticks = []
  for (var i = 0; i <= 10; i++) {
    var deg = 180 - i * 18
    var major = i % 5 === 0
    var a = polar(major ? 63 : 68, deg)
    var b = polar(74, deg)
    ticks.push(<line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={major ? 'gauge-tick gauge-tick--major' : 'gauge-tick'} />)
  }

  return (
    <div className="gauge" role="img" aria-label={'Macro risk ' + safe + ' out of 100, ' + posture}>
      <div className="gauge-stage">
        <div className="gauge-bezel" aria-hidden="true" />
        <svg className="gauge-svg" viewBox="0 0 200 128" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id="gauge-ramp" gradientUnits="userSpaceOnUse" x1="18" y1="0" x2="182" y2="0">
              <stop offset="0" style={{ stopColor: 'var(--green)' }} />
              <stop offset="0.5" style={{ stopColor: 'var(--gauge-mid)' }} />
              <stop offset="1" style={{ stopColor: 'var(--red)' }} />
            </linearGradient>
          </defs>
          <path className="gauge-track" pathLength="100" d={'M ' + (CX - R) + ' ' + CY + ' A ' + R + ' ' + R + ' 0 0 1 ' + (CX + R) + ' ' + CY} />
          <path className="gauge-value" pathLength="100" stroke="url(#gauge-ramp)"
            style={{ strokeDasharray: (mounted ? safe : 0) + ' 100' }}
            d={'M ' + (CX - R) + ' ' + CY + ' A ' + R + ' ' + R + ' 0 0 1 ' + (CX + R) + ' ' + CY} />
          {ticks}
          <g className="gauge-needle" style={{ transform: 'rotate(' + needle + 'deg)' }}>
            <line x1={CX} y1={CY} x2={CX} y2={CY - 58} />
            <circle cx={CX} cy={CY - 58} r="3.2" />
          </g>
          <circle className="gauge-hub" cx={CX} cy={CY} r="6.5" />
        </svg>
      </div>
        <div className="gauge-figure">
          <span className="gauge-number">{shown}</span>
          <span className="gauge-of">/100</span>
        </div>
      <div className="gauge-scale" aria-hidden="true">
        <span>Calm</span><span>Balanced</span><span>Stressed</span>
      </div>
    </div>
  )
}
