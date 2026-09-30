import React from 'react'
import Tilt from './Tilt.jsx'
import AssetIcon from './AssetIcon.jsx'
import { IsoBox } from './Iso.jsx'
import { project } from '../lib/iso.js'
import { useScrollDepth, prefersReducedMotion } from '../lib/motion.js'

// The landing page's centrepiece: a glass platform with bars rising from it,
// circled by a bright orbit, with a few real instruments floating at different
// depths. The bars are pure decoration and are not data; the whole scene is
// hidden from screen readers. It leans toward the pointer and its layers drift
// at different speeds as the page scrolls, and both stop under reduced motion.
var S = 33
var OX = 280
var OY = 96

// [x, y, height, colour]; drawn back to front.
var BARS = [
  [0.7, 1.2, 1.4, 'var(--accent-cyan)'], [1.7, 1.2, 2.2, 'var(--accent-cyan)'], [2.7, 1.2, 1.7, 'var(--accent-cyan)'],
  [3.7, 1.2, 2.9, 'var(--green)'], [4.7, 1.2, 2.3, 'var(--accent-cyan)'],
  [0.7, 3.4, 2.0, 'var(--green)'], [1.7, 3.4, 3.0, 'var(--green)'], [2.7, 3.4, 1.3, 'var(--red)'],
  [3.7, 3.4, 3.9, 'var(--green)'], [4.7, 3.4, 2.7, 'var(--amber)']
].sort(function(a, b) { return (a[0] + a[1]) - (b[0] + b[1]) })

export default function HeroScene() {
  var depth = useScrollDepth(700)
  var calm = prefersReducedMotion()
  var orbit = 'M ' + (OX - 236) + ' 262 A 236 84 0 1 0 ' + (OX + 236) + ' 262 A 236 84 0 1 0 ' + (OX - 236) + ' 262'
  var corner = project(0, 0, 0, S, OX, OY)

  return (
    <div ref={depth} className="hero-depth" aria-hidden="true">
      <Tilt max={5} className="hero-scene">
        <svg className="hero-svg hero-svg--back" viewBox="0 0 560 420" focusable="false">
          <defs>
            <linearGradient id="hero-orbit" x1="0" x2="1">
              <stop offset="0" stopColor="#7c5cff" stopOpacity="0" />
              <stop offset=".5" style={{ stopColor: 'var(--accent-cyan)' }} />
              <stop offset="1" stopColor="#7c5cff" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="hero-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0" style={{ stopColor: 'var(--accent-cyan)', stopOpacity: 0.5 }} />
              <stop offset="1" style={{ stopColor: 'var(--accent-cyan)', stopOpacity: 0 }} />
            </radialGradient>
          </defs>
          <ellipse cx="280" cy="262" rx="250" ry="96" fill="url(#hero-glow)" />
          <path d={orbit} fill="none" stroke="url(#hero-orbit)" strokeWidth="2" strokeDasharray="2 9" strokeLinecap="round" />
          <IsoBox x={0} y={0} z={0} w={6} d={5} h={0.55} scale={S} ox={OX} oy={OY + 108} color="var(--accent-cyan)" opacity="0.9" />
        </svg>

        <svg className="hero-svg hero-svg--bars" viewBox="0 0 560 420" focusable="false">
          {BARS.map(function(b, i) {
            return <IsoBox key={i} x={b[0]} y={b[1]} z={0.55} w={0.75} d={0.75} h={b[2]} scale={S} ox={OX} oy={OY + 108} color={b[3]} />
          })}
          {!calm && (
            <circle r="5" className="hero-dot">
              <animateMotion dur="14s" repeatCount="indefinite" path={orbit} />
            </circle>
          )}
          {calm && <circle r="5" className="hero-dot" cx={OX + 236} cy="262" />}
          <circle cx={corner[0]} cy={corner[1] + 108} r="0" />
        </svg>

        <span className="hero-float" style={{ left: '2%', top: '30%', '--z': '90px', '--k': 0.16 }}><span className="hero-float__in"><AssetIcon id="XAU/USD" size={68} /></span></span>
        <span className="hero-float" style={{ right: '4%', top: '8%', '--z': '70px', '--k': 0.1 }}><span className="hero-float__in hero-float__in--b"><AssetIcon id="EUR/USD" size={56} /></span></span>
        <span className="hero-float" style={{ right: '11%', bottom: '10%', '--z': '110px', '--k': 0.22 }}><span className="hero-float__in hero-float__in--c"><AssetIcon id="BTC/USD" size={62} /></span></span>
        <span className="hero-float" style={{ left: '13%', bottom: '7%', '--z': '60px', '--k': 0.08 }}><span className="hero-float__in hero-float__in--d"><AssetIcon id="GBP/JPY" size={46} /></span></span>
      </Tilt>
    </div>
  )
}
