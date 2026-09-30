// Motion primitives. Every effect here is decoration: it is switched off for
// people who ask for reduced motion, and pointer-driven effects are skipped on
// touch screens, where there is no hover to respond to.
import { useEffect, useRef, useState, useCallback } from 'react'

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function canTilt() {
  return typeof window !== 'undefined' && !!window.matchMedia &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches && !prefersReducedMotion()
}

// Tilts an element toward the pointer and tracks a glare position. Work is
// batched into one animation frame and only CSS variables change, so the
// browser can composite the transform without re-laying anything out.
export function useTilt(max) {
  var ref = useRef(null)
  var frame = useRef(0)

  var onPointerMove = useCallback(function(e) {
    if (e.pointerType === 'touch' || !canTilt()) return
    var el = ref.current
    if (!el) return
    var box = el.getBoundingClientRect()
    if (!box.width || !box.height) return
    var x = (e.clientX - box.left) / box.width
    var y = (e.clientY - box.top) / box.height
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(function() {
      el.style.setProperty('--rx', ((0.5 - y) * max * 2).toFixed(2) + 'deg')
      el.style.setProperty('--ry', ((x - 0.5) * max * 2).toFixed(2) + 'deg')
      el.style.setProperty('--mx', (x * 100).toFixed(1) + '%')
      el.style.setProperty('--my', (y * 100).toFixed(1) + '%')
      el.setAttribute('data-tilting', 'true')
    })
  }, [max])

  var onPointerLeave = useCallback(function() {
    var el = ref.current
    cancelAnimationFrame(frame.current)
    if (!el) return
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
    el.removeAttribute('data-tilting')
  }, [])

  useEffect(function() { return function() { cancelAnimationFrame(frame.current) } }, [])

  return { ref: ref, onPointerMove: onPointerMove, onPointerLeave: onPointerLeave }
}

// Eases a displayed number toward its target. Under reduced motion, or for a
// value that is not a number, it simply shows the target.
export function useCountUp(target, duration) {
  var ms = duration || 900
  var [shown, setShown] = useState(typeof target === 'number' && !prefersReducedMotion() ? 0 : target)
  var from = useRef(shown)

  useEffect(function() {
    if (typeof target !== 'number' || prefersReducedMotion()) { setShown(target); from.current = target; return undefined }
    var start = null
    var origin = typeof from.current === 'number' ? from.current : 0
    var id = 0
    function step(ts) {
      if (start === null) start = ts
      var t = Math.min(1, (ts - start) / ms)
      var eased = 1 - Math.pow(1 - t, 3)
      var value = origin + (target - origin) * eased
      from.current = value
      setShown(Math.round(value))
      if (t < 1) id = requestAnimationFrame(step)
    }
    id = requestAnimationFrame(step)
    return function() { cancelAnimationFrame(id) }
  }, [target, ms])

  return shown
}

// True one frame after mount, so a CSS transition has a start state to leave.
export function useMounted() {
  var [mounted, setMounted] = useState(false)
  useEffect(function() {
    var id = requestAnimationFrame(function() { setMounted(true) })
    return function() { cancelAnimationFrame(id) }
  }, [])
  return mounted
}
