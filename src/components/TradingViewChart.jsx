import React, { useEffect, useRef, useState } from 'react'
import { tradingViewSymbol, tradingViewUrl } from '../lib/symbols.js'

var SCRIPT_SRC = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'

// TradingView's free "Advanced Chart" widget. It is third-party content: the
// visitor's browser contacts TradingView to load it, which is why it is only
// mounted once the panel scrolls near the screen, and why a blocked or failed
// load leaves a plain link instead of a hole.
export default function TradingViewChart({ assetId, label, theme }) {
  var host = useRef(null)
  var [near, setNear] = useState(false)
  var [failed, setFailed] = useState(false)
  var symbol = tradingViewSymbol(assetId)

  useEffect(function() {
    var el = host.current
    if (!el) return undefined
    if (typeof IntersectionObserver === 'undefined') { setNear(true); return undefined }
    var io = new IntersectionObserver(function(entries) {
      if (entries[0] && entries[0].isIntersecting) { setNear(true); io.disconnect() }
    }, { rootMargin: '400px 0px' })
    io.observe(el)
    return function() { io.disconnect() }
  }, [])

  useEffect(function() {
    var el = host.current
    if (!el || !near || !symbol) return undefined
    setFailed(false)
    el.innerHTML = ''
    var widget = document.createElement('div')
    widget.className = 'tradingview-widget-container__widget'
    widget.style.height = '100%'
    widget.style.width = '100%'
    el.appendChild(widget)

    var script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = SCRIPT_SRC
    script.async = true
    // The widget reads its settings from the script tag's own text.
    script.text = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: '60',
      timezone: 'Etc/UTC',
      theme: theme === 'dark' ? 'dark' : 'light',
      style: '1',
      locale: 'en',
      allow_symbol_change: false,
      hide_side_toolbar: false,
      calendar: false,
      support_host: 'https://www.tradingview.com'
    })
    script.onerror = function() { setFailed(true) }
    el.appendChild(script)

    // The widget builds its own iframe with no title, which fails WCAG's
    // "frames must have a title" rule. Name it as soon as it appears.
    var title = 'TradingView chart for ' + label
    var mo = typeof MutationObserver !== 'undefined' ? new MutationObserver(function() {
      var frames = el.getElementsByTagName('iframe')
      for (var i = 0; i < frames.length; i++) if (!frames[i].title) frames[i].title = title
    }) : null
    if (mo) mo.observe(el, { childList: true, subtree: true })

    return function() {
      if (mo) mo.disconnect()
      el.innerHTML = ''
    }
  }, [near, symbol, theme, label])

  if (!symbol) return null
  return (
    <div className="chart-frame">
      <div ref={host} className="tradingview-widget-container chart-host" />
      {failed && (
        <p className="chart-fallback" role="status">
          The chart could not be loaded. An ad blocker or a network restriction may be blocking TradingView.{' '}
          <a href={tradingViewUrl(assetId)} target="_blank" rel="noopener noreferrer">Open {label} on TradingView</a>
        </p>
      )}
    </div>
  )
}
