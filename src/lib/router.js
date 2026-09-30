// A tiny hash router. There are five pages, no nesting and no parameters, so a
// library would be more code than this. Hash routes also work on a static host
// with no server rewrites, and the back button does the right thing.
import { useState, useEffect, useCallback } from 'react'

export var PAGES = [
  { id: 'home', path: '/', label: 'Home', title: 'MacroSentinel' },
  { id: 'markets', path: '/markets', label: 'Markets', title: 'Markets' },
  { id: 'releases', path: '/releases', label: 'Releases', title: 'Economic releases' },
  { id: 'news', path: '/news', label: 'News', title: 'News' },
  { id: 'about', path: '/about', label: 'About', title: 'How it works' }
]

// "#/markets" -> "markets". Anything unknown (including an in-page "#main")
// is the home page rather than an error.
export function parseHash(hash) {
  var h = String(hash || '').replace(/^#/, '').split('?')[0].replace(/\/+$/, '')
  if (!h) return 'home'
  for (var i = 0; i < PAGES.length; i++) if (PAGES[i].path === h) return PAGES[i].id
  return 'home'
}

export function hrefFor(id) {
  for (var i = 0; i < PAGES.length; i++) if (PAGES[i].id === id) return '#' + PAGES[i].path
  return '#/'
}

export function pageOf(id) {
  for (var i = 0; i < PAGES.length; i++) if (PAGES[i].id === id) return PAGES[i]
  return PAGES[0]
}

export function useRoute() {
  var [route, setRoute] = useState(function() { return parseHash(window.location.hash) })
  useEffect(function() {
    function onChange() { setRoute(parseHash(window.location.hash)) }
    window.addEventListener('hashchange', onChange)
    return function() { window.removeEventListener('hashchange', onChange) }
  }, [])
  var go = useCallback(function(id) { window.location.hash = hrefFor(id) }, [])
  return [route, go]
}
