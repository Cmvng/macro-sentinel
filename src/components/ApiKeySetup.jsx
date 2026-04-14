import React, { useState } from 'react'

export default function ApiKeySetup({ onSave }) {
  var [key, setKey] = useState('')
  var [error, setError] = useState('')

  function handleSubmit() {
    if (!key.trim().startsWith('sk-ant-')) {
      setError('Key must start with sk-ant-')
      return
    }
    onSave(key.trim())
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSubmit()
  }

  function handleChange(e) {
    setKey(e.target.value)
    setError('')
  }

  function openConsole() {
    window.open('https://console.anthropic.com', '_blank')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>

        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
            MACRO<span style={{ color: 'var(--accent-cyan)' }}>SENTINEL</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            FUNDAMENTAL SENTIMENT INTELLIGENCE
          </div>
        </div>

        <div style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border-med)', borderRadius: 'var(--radius-lg)', padding: '2rem' }}>

          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8, color: 'var(--text-primary)' }}>
              Enter your Anthropic API key
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Your key is stored locally in your browser only. Never sent anywhere except Anthropic.
            </div>
          </div>

          <input
            type="password"
            value={key}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="sk-ant-api03-..."
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'var(--bg-deep)',
              border: error ? '0.5px solid var(--red)' : '0.5px solid var(--border-med)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              outline: 'none',
              marginBottom: error ? 8 : 16,
              display: 'block'
            }}
          />

          {error && (
            <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 16 }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            style={{
              width: '100%',
              padding: '11px',
              background: 'var(--accent-cyan)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: '#000',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              display: 'block',
              marginBottom: '1.5rem'
            }}
          >
            LAUNCH DASHBOARD
          </button>

          <div style={{ padding: '1rem', background: 'var(--bg-deep)', borderRadius: 'var(--radius-md)', border: '0.5px solid var(--border-dim)' }}>
            <div style={{ fontSize: 11, color: 'var(--amber)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>
              ESTIMATED COST
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              Personal use with smart caching: $2 to $5 per month
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              Get your API key from Anthropic:
            </div>
            <button
              onClick={openConsole}
              style={{
                marginTop: 6,
                padding: '4px 10px',
                background: 'transparent',
                border: '0.5px solid var(--accent-cyan)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--accent-cyan)',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                cursor: 'pointer'
              }}
            >
              console.anthropic.com
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
