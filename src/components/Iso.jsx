import React from 'react'
import { boxFaces } from '../lib/iso.js'

// One shaded box. The three faces take their shade from `--c`, so a shape is
// recoloured with a single CSS variable and follows the theme.
export function IsoBox({ x, y, z, w, d, h, scale, ox, oy, color, opacity }) {
  var f = boxFaces(x, y, z, w, d, h, scale, ox, oy)
  var style = color ? { '--c': color } : undefined
  return (
    <g className="iso" style={style} opacity={opacity}>
      <polygon className="iso-left" points={f.left} />
      <polygon className="iso-right" points={f.right} />
      <polygon className="iso-top" points={f.top} />
    </g>
  )
}
