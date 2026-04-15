import React, { useState } from 'react'

var ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || '9999'

export default function AdminPage() {
  var [pin, setPin] = useState('')
  var [unlocked, setUnlocked] = useState(false)
  var [pinError, setPinError] = useState(false)
  var [status, setStatus] = useState(null)
  var [loading, setLoading] = useState(false)
  var [log, setLog] = useState([])

  function handlePin() {
    if (pin === ADMIN_PIN) {
      setUnlocked(true)
      setPinError(false)
    } else {
      setPinError(true)
      setPin('')
    }
  }

  function addLog(msg) {
    var time = new Date().toLocaleTimeString()
    setLog(function(prev) { return [{ time: time, msg: msg }].concat(prev).slice(0, 20) })
  }

  async function handleRefresh() {
    setLoading(true)
    setStatus('running')
    addLog('Manual refresh started...')
    try {
      var start = Date.now()
      var response = await fetch('/api/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get', force: true })
      })
      var data = await response.json()
      var elapsed = ((Date.now() - start) / 1000).toFixed(1)
      if (data.signals && data.signals.assets) {
        var count = Object.keys(data.signals.assets).length
        addLog('Refresh complete — ' + count + ' assets scored in ' + elapsed + 's')
        addLog('Theme: ' + (data.signals.dominant_theme || 'N/A'))
        setStatus('success')
      } else {
        addLog('Refresh returned no signals')
        setStatus('error')
      }
    } catch(e) {
      addLog('Error: ' + e.message)
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  async function handleCheckBreaking() {
    setLoading(true)
    addLog('Checking for breaking news...')
    try {
      var response = await fetch('/api/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check_breaking' })
      })
      var data = await response.json()
      if (data.breaking) {
        addLog('BREAKING: ' + data.headlines[0])
        addLog('Affected pairs: ' + (data.affected || []).join(', '))
      } else {
        addLog('No breaking news detected — ' + (data.message || 'cache fresh'))
      }
    } catch(e) {
      addLog('Error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCacheStatus() {
    addLog('Checking cache status...')
    try {
      var response = await fetch('/api/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get' })
      })
      var data = await response.json()
      if (data.cached) {
        addLog('Cache age: ' + data.age_minutes + ' minutes old')
        addLog('Next auto-refresh in: ' + data.next_refresh_hours + ' hours')
      } else {
        addLog('Cache was empty — fresh signals generated')
      }
    } catch(e) {
      addLog('Error: ' + e.message)
    }
  }

  var pageStyle = {
    minHeight: '100vh',
    background: 'var(--bg-void)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    fontFamily: 'var(--font-body)'
  }

  var cardStyle = {
    width: '100%',
    maxWidth: 500,
    background: 'var(--bg-surface)',
    border: '0.5px solid var(--border-med)',
    borderRadius: 'var(--radius-lg)',
    padding: '2rem'
  }

  var titleStyle = {
    fontFamily: 'var(--font-display)',
    fontSize: 20,
    fontWeight: 800,
    color: 'var(--text-primary)',
    marginBottom: 4
  }

  var subStyle = {
    fontSize: 11,
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.5px',
    marginBottom: '1.5rem'
  }

  var inputStyle = {
    width: '100%',
    padding: '10px 14px',
    background: 'var(--bg-deep)',
    border: pinError ? '0.5px solid var(--red)' : '0.5px solid var(--border-med)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: 18,
    outline: 'none',
    textAlign: 'center',
    letterSpacing: '8px',
    marginBottom: 12
  }

  var btnPrimary = {
    width: '100%',
    padding: '10px',
    background: 'var(--accent-cyan)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    color: '#fff',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    marginBottom: 8,
    opacity: loading ? 0.6 : 1
  }

  var btnSecondary = {
    width: '100%',
    padding: '9px',
    background: 'transparent',
    border: '0.5px solid var(--border-med)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    cursor: 'pointer',
    marginBottom: 8,
    opacity: loading ? 0.6 : 1
  }

  var logStyle = {
    marginTop: '1.5rem',
    padding: '1rem',
    background: 'var(--bg-deep)',
    borderRadius: 'var(--radius-md)',
    border: '0.5px solid var(--border-dim)',
    maxHeight: 220,
    overflowY: 'auto'
  }

  var statusColors = { running: 'var(--amber)', success: 'var(--green)', error: 'var(--red)' }

  if (!unlocked) {
    return (
      <div style={pageStyle}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
              CMVNG <span style={{ color: 'var(--accent-cyan)' }}>ADMIN</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
              ENTER ADMIN PIN TO CONTINUE
            </div>
          </div>
          <div style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border-med)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
            <input
              type="password"
              value={pin}
              onChange={function(e) { setPin(e.target.value); setPinError(false) }}
              onKeyDown={function(e) { if (e.key === 'Enter') handlePin() }}
              placeholder="••••"
              maxLength={8}
              style={inputStyle}
            />
            {pinError && (
              <div style={{ fontSize: 12, color: 'var(--red)', textAlign: 'center', marginBottom: 10 }}>
                Incorrect PIN
              </div>
            )}
            <button onClick={handlePin} style={btnPrimary}>
              UNLOCK
            </button>
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <a href="/" style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>
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
        <div style={titleStyle}>CMVNG <span style={{ color: 'var(--accent-cyan)' }}>ADMIN</span></div>
        <div style={subStyle}>SIGNAL MANAGEMENT PANEL</div>

        <div style={{ padding: '10px 12px', background: 'var(--bg-raised)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: 12, color: 'var(--text-secondary)', border: '0.5px solid var(--border-dim)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginBottom: 4 }}>SYSTEM INFO</div>
          Scheduled auto-refresh: daily at 9pm WAT<br />
          Breaking news check: hourly (automatic)<br />
          Analyze cache: 2 hours per pair (browser)<br />
          Estimated cost per manual refresh: ~$0.04
        </div>

        {status && (
          <div style={{ padding: '8px 12px', background: 'var(--bg-raised)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: 12, color: statusColors[status], fontFamily: 'var(--font-mono)', border: '0.5px solid ' + statusColors[status] + '44' }}>
            {status === 'running' && 'Running analysis...'}
            {status === 'success' && 'Refresh complete — cache updated for all users'}
            {status === 'error' && 'Refresh failed — check log below'}
          </div>
        )}

        <button
          onClick={handleRefresh}
          disabled={loading}
          style={btnPrimary}
        >
          {loading ? 'RUNNING...' : 'FORCE REFRESH ALL SIGNALS'}
        </button>

        <button
          onClick={handleCheckBreaking}
          disabled={loading}
          style={btnSecondary}
        >
          CHECK BREAKING NEWS NOW
        </button>

        <button
          onClick={handleCacheStatus}
          disabled={loading}
          style={btnSecondary}
        >
          CHECK CACHE STATUS
        </button>

        <button
          onClick={function() { window.location.href = '/' }}
          style={{ ...btnSecondary, marginBottom: 0 }}
        >
          GO TO DASHBOARD
        </button>

        {log.length > 0 && (
          <div style={logStyle}>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 8, letterSpacing: '0.5px' }}>ACTIVITY LOG</div>
            {log.map(function(entry, i) {
              return (
                <div key={i} style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6, display: 'flex', gap: 8 }}>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10, flexShrink: 0 }}>{entry.time}</span>
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
