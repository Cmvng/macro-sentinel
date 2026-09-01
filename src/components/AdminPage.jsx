import React, { useState } from 'react'

// No secret is bundled. The previous VITE_ADMIN_PIN was inlined into the public
// JS and checked in the browser, so it protected nothing. The operator now
// supplies a secret that is sent to the server and compared against
// ADMIN_SECRET there; the client never knows whether it is correct until the
// server says so.
var SESSION_KEY = 'macrosentinel_admin_secret'

function loadSecret() {
  try { return sessionStorage.getItem(SESSION_KEY) || '' } catch(e) { return '' }
}

export default function AdminPage() {
  var [secret, setSecret] = useState(loadSecret)
  var [unlocked, setUnlocked] = useState(!!loadSecret())
  var [authError, setAuthError] = useState('')
  var [status, setStatus] = useState(null)
  var [loading, setLoading] = useState(false)
  var [log, setLog] = useState([])

  function addLog(msg) {
    var time = new Date().toLocaleTimeString()
    setLog(function(prev) { return [{ time: time, msg: msg }].concat(prev).slice(0, 20) })
  }

  async function call(body) {
    var response = await fetch('/api/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Secret': secret },
      body: JSON.stringify(body)
    })
    var data = null
    try { data = await response.json() } catch(e) { data = null }
    if (response.status === 401) {
      var err = new Error('Rejected by the server — check ADMIN_SECRET')
      err.unauthorized = true
      throw err
    }
    if (!response.ok) throw new Error((data && data.error) || ('Request failed (' + response.status + ')'))
    return data || {}
  }

  async function handleUnlock() {
    if (!secret) { setAuthError('Enter the admin secret'); return }
    setLoading(true)
    setAuthError('')
    try {
      // Cheapest authenticated round trip that proves the secret is right.
      await call({ action: 'check_breaking' })
      try { sessionStorage.setItem(SESSION_KEY, secret) } catch(e) {}
      setUnlocked(true)
      addLog('Authenticated')
    } catch(e) {
      setAuthError(e.unauthorized ? 'Incorrect secret, or ADMIN_SECRET is not configured on the server' : e.message)
    } finally {
      setLoading(false)
    }
  }

  function lock() {
    try { sessionStorage.removeItem(SESSION_KEY) } catch(e) {}
    setUnlocked(false)
    setSecret('')
    setLog([])
    setStatus(null)
  }

  async function handleRefresh() {
    setLoading(true)
    setStatus('running')
    addLog('Forced refresh started…')
    var start = Date.now()
    try {
      var data = await call({ action: 'get', force: true })
      var elapsed = ((Date.now() - start) / 1000).toFixed(1)
      var count = data.signals && data.signals.assets ? Object.keys(data.signals.assets).length : 0
      addLog('Complete — ' + count + ' instruments scored in ' + elapsed + 's')
      if (data.signals && data.signals.degraded_groups) {
        addLog('Warning: ' + data.signals.degraded_groups + '/' + data.signals.total_groups + ' groups degraded')
      }
      addLog('Theme: ' + ((data.signals && data.signals.dominant_theme) || 'none returned'))
      setStatus(data.signals && data.signals.degraded_groups ? 'partial' : 'success')
    } catch(e) {
      addLog('Error: ' + e.message)
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  async function handleCheckBreaking() {
    setLoading(true)
    addLog('Checking for breaking news…')
    try {
      var data = await call({ action: 'check_breaking' })
      if (data.breaking) {
        addLog('BREAKING: ' + data.headlines[0])
        addLog('Affected: ' + (data.affected || []).join(', '))
        if (data.degraded) addLog('Re-score degraded — existing signals left unchanged')
      } else {
        addLog('No breaking news — ' + (data.message || 'nothing new matched'))
      }
    } catch(e) {
      addLog('Error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCacheStatus() {
    addLog('Reading cache status…')
    try {
      // Deliberately not forced: this button used to be able to trigger a full
      // paid rebuild without saying so.
      var data = await call({ action: 'get' })
      if (data.cached) {
        addLog('Signals cached, ' + data.age_minutes + ' min old')
        addLog('Next scheduled refresh in ~' + data.next_refresh_hours + 'h')
      } else {
        addLog('Cache was empty — fresh signals were generated')
      }
      if (data.news_health) addLog('Feeds: ' + data.news_health.healthy + '/' + data.news_health.total + ' responding')
    } catch(e) {
      addLog('Error: ' + e.message)
    }
  }

  var pageStyle = {
    minHeight: '100vh', background: 'var(--bg-void)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '2rem', fontFamily: 'var(--font-body)'
  }
  var cardStyle = {
    width: '100%', maxWidth: 520, background: 'var(--bg-surface)',
    border: '1px solid var(--border-med)', borderRadius: 'var(--radius-lg)', padding: '2rem'
  }
  var btnPrimary = {
    width: '100%', padding: '11px', background: 'var(--accent-cyan)',
    border: 'none', borderRadius: 'var(--radius-md)', color: '#fff',
    fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--fs-sm)',
    marginBottom: 10, opacity: loading ? 0.6 : 1
  }
  var btnSecondary = {
    width: '100%', padding: '10px', background: 'transparent',
    border: '1px solid var(--border-med)', borderRadius: 'var(--radius-md)',
    color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)',
    fontSize: 'var(--fs-xs)', marginBottom: 8, opacity: loading ? 0.6 : 1
  }
  var statusColors = { running: 'var(--amber)', success: 'var(--green)', partial: 'var(--amber)', error: 'var(--red)' }

  if (!unlocked) {
    return (
      <div style={pageStyle}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xl)', fontWeight: 800, color: 'var(--text-primary)' }}>
              MACRO<span style={{ color: 'var(--accent-cyan)' }}>SENTINEL</span>
            </div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 6 }}>
              OPERATOR ACCESS
            </div>
          </div>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-med)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
            <label htmlFor="admin-secret" style={{ display: 'block', fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>
              ADMIN SECRET
            </label>
            <input
              id="admin-secret"
              type="password"
              value={secret}
              onChange={function(e) { setSecret(e.target.value); setAuthError('') }}
              onKeyDown={function(e) { if (e.key === 'Enter') handleUnlock() }}
              autoComplete="current-password"
              style={{
                width: '100%', padding: '10px 14px', background: 'var(--bg-deep)',
                border: '1px solid ' + (authError ? 'var(--red)' : 'var(--border-med)'),
                borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-base)',
                outline: 'none', marginBottom: 12
              }}
            />
            {authError && (
              <div role="alert" style={{ fontSize: 'var(--fs-xs)', color: 'var(--red)', marginBottom: 10, lineHeight: 1.5 }}>
                {authError}
              </div>
            )}
            <button onClick={handleUnlock} disabled={loading} style={btnPrimary}>
              {loading ? 'CHECKING…' : 'UNLOCK'}
            </button>
            <div style={{ textAlign: 'center', marginTop: 6 }}>
              <a href="/" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Back to dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-lg)', fontWeight: 800, color: 'var(--text-primary)' }}>
            MACRO<span style={{ color: 'var(--accent-cyan)' }}>SENTINEL</span>
          </div>
          <button onClick={lock} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', minHeight: 28 }}>
            LOCK
          </button>
        </div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.5px', marginBottom: '1.5rem' }}>
          SIGNAL MANAGEMENT
        </div>

        <div style={{ padding: '12px 14px', background: 'var(--bg-raised)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', border: '1px solid var(--border-dim)', lineHeight: 1.7 }}>
          <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 6 }}>SYSTEM</div>
          Scheduled refresh: daily, 20:00 UTC (9pm WAT)<br />
          Breaking check: manual, or via authenticated cron<br />
          Analysis cache: 2 hours per instrument
        </div>

        {status && (
          <div role="status" style={{ padding: '10px 12px', background: 'var(--bg-raised)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: 'var(--fs-xs)', color: statusColors[status], fontFamily: 'var(--font-mono)', border: '1px solid ' + statusColors[status] }}>
            {status === 'running' && 'Running analysis…'}
            {status === 'success' && 'Refresh complete'}
            {status === 'partial' && 'Refresh complete, but some groups degraded'}
            {status === 'error' && 'Refresh failed — see log'}
          </div>
        )}

        <button onClick={handleRefresh} disabled={loading} style={btnPrimary}>
          {loading ? 'RUNNING…' : 'FORCE REFRESH ALL SIGNALS'}
        </button>
        <button onClick={handleCheckBreaking} disabled={loading} style={btnSecondary}>
          CHECK BREAKING NEWS
        </button>
        <button onClick={handleCacheStatus} disabled={loading} style={btnSecondary}>
          CACHE STATUS (read-only)
        </button>
        <button onClick={function() { window.location.href = '/' }} style={Object.assign({}, btnSecondary, { marginBottom: 0 })}>
          GO TO DASHBOARD
        </button>

        {log.length > 0 && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-deep)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-dim)', maxHeight: 240, overflowY: 'auto' }}>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 10, letterSpacing: '0.5px' }}>ACTIVITY LOG</div>
            {log.map(function(entry, i) {
              return (
                <div key={i} style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginBottom: 6, display: 'flex', gap: 10 }}>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{entry.time}</span>
                  <span>{entry.msg}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
