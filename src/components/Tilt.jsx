import React from 'react'
import { useTilt } from '../lib/motion.js'

// A surface that leans toward the pointer. It renders whatever element it is
// asked to, so an <article> stays an <article> and keeps its semantics.
export default function Tilt({ as, max, className, children, ...rest }) {
  var t = useTilt(max || 4)
  return React.createElement(as || 'div', Object.assign({
    ref: t.ref,
    className: 'tilt' + (className ? ' ' + className : ''),
    onPointerMove: t.onPointerMove,
    onPointerLeave: t.onPointerLeave
  }, rest), children)
}
