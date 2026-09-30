import React from 'react'
import NavIcon from './NavIcon.jsx'
import { PAGES, hrefFor } from '../lib/router.js'

function statusDetails(loading, newsLoading, dataStatus) {
  if (loading) return { label: 'ANALYZING', tone: 'pending', description: 'Signal engine is evaluating the latest sources.' }
  if (newsLoading) return { label: 'FETCHING', tone: 'pending', description: 'News sources are being collected.' }
  if (dataStatus === 'cached') return { label: 'CACHED', tone: 'caution', description: 'Showing the most recent verified analysis.' }
  if (dataStatus === 'partial') return { label: 'PARTIAL', tone: 'caution', description: 'Some source groups were unavailable.' }
  if (dataStatus === 'unavailable') return { label: 'UNAVAILABLE', tone: 'danger', description: 'Fresh analysis could not be completed.' }
  return { label: 'LIVE', tone: 'success', description: 'Fresh server-side analysis is available.' }
}

// The one place to get anywhere. On a wide screen the menu sits in the bar; on a
// phone the same <nav> is pinned to the bottom edge, within thumb reach. It is a
// single landmark of real links, so keyboard, screen reader and middle-click all
// work, and the current page is announced with aria-current.
export default function TopBar({ route, theme, setTheme, loading, newsLoading, dataStatus, onRefresh }) {
  var status = statusDetails(loading, newsLoading, dataStatus)
  return (
    <header className="topbar">
      <div className="topbar__inner">
        <a className="brand-lockup" href={hrefFor('home')} aria-label="MacroSentinel, home">
          <span className="brand-mark" aria-hidden="true">⌁</span>
          <span>
            <span className="brand-name">MACRO<span>SENTINEL</span></span>
            <span className="brand-tag">MACRO INTELLIGENCE, EXPLAINED</span>
          </span>
        </a>

        <nav className="main-nav" aria-label="Main">
          <ul>
            {PAGES.map(function(page) {
              var current = route === page.id
              return (
                <li key={page.id}>
                  <a href={hrefFor(page.id)} className={current ? 'is-current' : ''} aria-current={current ? 'page' : undefined}>
                    <NavIcon id={page.id} />
                    <span>{page.label}</span>
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="nav-actions">
          <div className={'data-status data-status--' + status.tone} title={status.description}>
            <span aria-hidden="true" />
            {status.label}
          </div>
          <button className="refresh-button" onClick={onRefresh} disabled={loading} aria-label="Refresh analysis">
            {loading ? 'Refreshing' : 'Refresh'}
          </button>
          <div className="theme-switcher" role="group" aria-label="Color theme">
            <button className={theme === 'light' ? 'is-active' : ''} onClick={function() { setTheme('light') }} aria-pressed={theme === 'light'}>☀ <span>Light</span></button>
            <button className={theme === 'dark' ? 'is-active' : ''} onClick={function() { setTheme('dark') }} aria-pressed={theme === 'dark'}>☾ <span>Dark</span></button>
          </div>
        </div>
      </div>
    </header>
  )
}
