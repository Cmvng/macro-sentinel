import React from 'react'
import { IsoBox } from './Iso.jsx'
import { project, pyramidFaces, boxFaces } from '../lib/iso.js'

// Small isometric icons, one per page. Drawn as SVG polygons from three shades of
// one colour, so they read as solid objects and recolour with the theme.
var S = 6.4
var OX = 16
var OY = 20

function Home() {
  var roof = pyramidFaces(-0.15, -0.15, 1.5, 2.3, 2.3, 1.2, S, OX, OY + 1)
  return (
    <g>
      <IsoBox x={0} y={0} z={0} w={2} d={2} h={1.5} scale={S} ox={OX} oy={OY + 1} color="var(--accent-cyan)" />
      <g className="iso" style={{ '--c': 'var(--amber)' }}>
        <polygon className="iso-left" points={roof.left} />
        <polygon className="iso-right" points={roof.right} />
      </g>
    </g>
  )
}

function Markets() {
  return (
    <g>
      <IsoBox x={0} y={0} z={0} w={0.9} d={1.4} h={1.1} scale={S} ox={OX - 4} oy={OY - 2} color="var(--green)" />
      <IsoBox x={1.1} y={0} z={0} w={0.9} d={1.4} h={2} scale={S} ox={OX - 4} oy={OY - 2} color="var(--accent-cyan)" />
      <IsoBox x={2.2} y={0} z={0} w={0.9} d={1.4} h={3} scale={S} ox={OX - 4} oy={OY - 2} color="var(--green)" />
    </g>
  )
}

function Releases() {
  var cells = []
  for (var r = 0; r < 2; r++) for (var c = 0; c < 3; c++) {
    var f = boxFaces(0.3 + c * 0.75, 0.55 + r * 0.85, 0.5, 0.55, 0.6, 0.02, S, OX, OY + 1)
    cells.push(<polygon key={r + '-' + c} points={f.top} className={r === 0 && c === 1 ? 'iso-cell iso-cell--hot' : 'iso-cell'} />)
  }
  var ringA = project(0.55, 0.05, 0.5, S, OX, OY + 1)
  var ringB = project(1.65, 0.05, 0.5, S, OX, OY + 1)
  return (
    <g>
      <IsoBox x={0} y={0} z={0} w={2.5} d={2.2} h={0.5} scale={S} ox={OX} oy={OY + 1} color="var(--amber)" />
      {cells}
      <line x1={ringA[0]} y1={ringA[1]} x2={ringA[0]} y2={ringA[1] - 4.5} className="iso-ring" />
      <line x1={ringB[0]} y1={ringB[1]} x2={ringB[0]} y2={ringB[1] - 4.5} className="iso-ring" />
    </g>
  )
}

function News() {
  return (
    <g>
      <IsoBox x={0} y={0} z={0} w={2.3} d={1.7} h={0.4} scale={S} ox={OX} oy={OY + 3} color="var(--accent-cyan)" />
      <IsoBox x={0.1} y={0.1} z={0.55} w={2.3} d={1.7} h={0.4} scale={S} ox={OX} oy={OY + 3} color="#7c5cff" />
      <IsoBox x={0.2} y={0.2} z={1.1} w={2.3} d={1.7} h={0.4} scale={S} ox={OX} oy={OY + 3} color="var(--green)" />
    </g>
  )
}

function About({ uid }) {
  return (
    <g>
      <defs>
        <radialGradient id={uid + '-o'} cx="34%" cy="28%" r="80%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".35" style={{ stopColor: 'var(--accent-cyan)' }} />
          <stop offset="1" stopColor="#0b3c78" />
        </radialGradient>
      </defs>
      <ellipse cx="16" cy="17" rx="14" ry="4.6" className="iso-ring" fill="none" transform="rotate(-18 16 17)" />
      <circle cx="16" cy="16" r="9" fill={'url(#' + uid + '-o)'} />
      <text x="16" y="20.4" textAnchor="middle" fontSize="12" fontWeight="800" fontFamily="var(--font-display)" fill="#fff">i</text>
    </g>
  )
}

export default function NavIcon({ id, size }) {
  var uid = 'ni' + React.useId().replace(/[^a-z0-9]/gi, '')
  var px = size || 26
  var art = id === 'home' ? <Home /> : id === 'markets' ? <Markets /> : id === 'releases' ? <Releases /> : id === 'news' ? <News /> : <About uid={uid} />
  return (
    <svg className="nav-icon" viewBox="0 0 32 32" width={px} height={px} aria-hidden="true" focusable="false">{art}</svg>
  )
}
