import React from 'react'
import { iconSpec } from '../lib/symbols.js'

// Flags are drawn as inline SVG on a 32x32 square and cropped to a circle with
// CSS, so there is no network request, no clipPath id to collide, and nothing
// to load late. They are simplified on purpose: at 28px the eye needs the
// colours and the main shape, not the detail.
function UnionJack() {
  return (
    <g>
      <rect width="32" height="32" fill="#012169" />
      <path d="M0 0L32 32M32 0L0 32" stroke="#fff" strokeWidth="6" />
      <path d="M0 0L32 32M32 0L0 32" stroke="#c8102e" strokeWidth="2" />
      <path d="M16 0V32M0 16H32" stroke="#fff" strokeWidth="10" />
      <path d="M16 0V32M0 16H32" stroke="#c8102e" strokeWidth="6" />
    </g>
  )
}

var FLAGS = {
  USD: function() {
    var stripes = []
    for (var i = 0; i < 13; i += 2) stripes.push(<rect key={i} y={i * 2.4615} width="32" height="2.4615" fill="#b22234" />)
    var stars = []
    for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) stars.push(<circle key={r + '-' + c} cx={3.4 + c * 4.4} cy={3.6 + r * 4.6} r="1" fill="#fff" />)
    return (
      <g>
        <rect width="32" height="32" fill="#fff" />
        {stripes}
        <rect width="15" height="17.23" fill="#3c3b6e" />
        {stars}
      </g>
    )
  },
  EUR: function() {
    var stars = []
    for (var i = 0; i < 12; i++) {
      var a = (i / 12) * Math.PI * 2
      stars.push(<circle key={i} cx={16 + Math.cos(a) * 8.6} cy={16 + Math.sin(a) * 8.6} r="1.5" fill="#ffcc00" />)
    }
    return <g><rect width="32" height="32" fill="#003399" />{stars}</g>
  },
  GBP: function() { return <UnionJack /> },
  JPY: function() {
    return <g><rect width="32" height="32" fill="#fff" /><circle cx="16" cy="16" r="7" fill="#bc002d" /></g>
  },
  CHF: function() {
    return <g><rect width="32" height="32" fill="#da291c" /><rect x="13" y="6" width="6" height="20" fill="#fff" /><rect x="6" y="13" width="20" height="6" fill="#fff" /></g>
  },
  CAD: function() {
    return (
      <g>
        <rect width="32" height="32" fill="#fff" />
        <rect width="8" height="32" fill="#d52b1e" />
        <rect x="24" width="8" height="32" fill="#d52b1e" />
        <path d="M16 6l2.2 4.2 3-1-1 5.4 3.2-2.2.9 2-3 2.6 1 3-6-1 .1 5.4h-.8l.1-5.4-6 1 1-3-3-2.6.9-2 3.2 2.2-1-5.4 3 1z" fill="#d52b1e" />
      </g>
    )
  },
  AUD: function() {
    return (
      <g>
        <rect width="32" height="32" fill="#012169" />
        <g transform="scale(.5)"><UnionJack /></g>
        <circle cx="9" cy="23.5" r="3" fill="#fff" />
        <circle cx="23" cy="8" r="1.5" fill="#fff" />
        <circle cx="27" cy="15" r="1.5" fill="#fff" />
        <circle cx="23" cy="25" r="1.5" fill="#fff" />
        <circle cx="19" cy="15" r="1.5" fill="#fff" />
      </g>
    )
  },
  NZD: function() {
    var stars = [[23, 7], [19, 15], [27, 14], [23, 25]]
    return (
      <g>
        <rect width="32" height="32" fill="#012169" />
        <g transform="scale(.5)"><UnionJack /></g>
        {stars.map(function(s, i) { return <circle key={i} cx={s[0]} cy={s[1]} r="1.9" fill="#cc142b" stroke="#fff" strokeWidth=".7" /> })}
      </g>
    )
  }
}

export function Flag({ code, size }) {
  var draw = FLAGS[code]
  var px = size || 28
  return (
    <span className="flag" style={{ width: px, height: px }}>
      <svg viewBox="0 0 32 32" width={px} height={px} focusable="false" aria-hidden="true">
        {draw ? draw() : <rect width="32" height="32" fill="#8a97a6" />}
      </svg>
    </span>
  )
}

// Decorative: the instrument's name is always written next to it, so screen
// readers skip the icon.
export default function AssetIcon({ id, size }) {
  var spec = iconSpec(id)
  var px = size || 28
  if (!spec) return <span className="asset-icon asset-icon--blank" style={{ width: px, height: px }} aria-hidden="true" />
  if (spec.kind === 'pair') {
    var small = Math.round(px * 0.74)
    return (
      <span className="asset-icon asset-icon--pair" style={{ width: px + small * 0.5, height: px }} aria-hidden="true">
        <span className="asset-icon__base"><Flag code={spec.base} size={small} /></span>
        <span className="asset-icon__quote"><Flag code={spec.quote} size={small} /></span>
      </span>
    )
  }
  var long = spec.glyph.length > 2
  return (
    <span className="asset-icon asset-icon--coin" aria-hidden="true"
      style={{ width: px, height: px, background: spec.fill, color: spec.ink, fontSize: Math.round(px * (long ? 0.3 : spec.glyph.length === 2 ? 0.4 : 0.52)) }}>
      {spec.glyph}
    </span>
  )
}
