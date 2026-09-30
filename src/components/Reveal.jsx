import React from 'react'
import { useReveal } from '../lib/motion.js'

// Content that swings up out of the page as it scrolls into view.
export default function Reveal({ as, className, delay, children, ...rest }) {
  var r = useReveal()
  return React.createElement(as || 'div', Object.assign({
    ref: r[0],
    className: 'reveal' + (r[1] ? ' is-in' : '') + (className ? ' ' + className : ''),
    style: delay ? { transitionDelay: delay + 'ms' } : undefined
  }, rest), children)
}
