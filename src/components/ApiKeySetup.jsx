import React, { useState } from 'react'

export default function ApiKeySetup({ onSave }) {
  const [key, setKey] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    if (!key.trim().startsWith('sk-ant-')) {
      setError('Key must start with sk-ant-')
      return
    }
    onSave(key.trim())
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-void)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-body)', padding: '2rem'
    }}>
      <div style={{ width: '100%', maxWidth: 480, animation: 'fadeIn 0.4s ease' }}>
        <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800,
            letterSpacing: '-0.5px', color: 'var(--text-primary)', marginBottom: 8
          }}>
            MACRO<span style={{ color: 'var(--accent-cyan)' }}>SENTINEL</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            FUNDAMENTAL SENTIMENT INTELLIGENCE
          </div>
        </div>

        <div style={{
          background: 'var(--bg-surface)', border: '0.5px solid var(--border-med)',
          borderRadius: 'var(--radius-lg)', padding: '2rem'
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>
              Enter your Anthropic API key
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Your key is stored locally in your browser only. It is never sent to any server other than Anthropic's API directly.
            </div>
          </div>

          <input
            type="password"
            value={key}
            onChange={e => { setKey(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="sk-ant-api03-..."
            style={{
              width: '100%', padding: '10px 14px', background: 'var(--bg-deep)',
              border: `0.5px solid ${error ? 'var(--red)' : 'var(--border-med)'}`,
              borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)', fontSize: 13, outline: 'none',
              marginBottom: error ? 8 : 16
            }}
          />
          {error && (
            <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 16 }}>{error}</div>
          )}

          <button
            onClick={handleSubmit}
            style={{
              width: '100%', padding: '11px', background: 'var(--accent-cyan)',
              border: 'none', borderRadius: 'var(--radius-md)', color: '#000',
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
              letterSpacing: '0.5px', cursor: 'pointer', transition: 'opacity 0.2s'
            }}
            onMouseOver={e => e.target.style.opacity = '0.85'}
            onMouseOut={e => e.target.style.opacity = '1'}
          >
            LAUNCH DASHBOARD
          </button>

          <div style={{
            marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-deep)',
            borderRadius: 'var(--radius-md)', border: '0.5px solid var(--border-dim)'
          }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              <div style={{ fontWeight: 500, color: 'var(--amber)', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>
                ESTIMATED COST
              </div>
              Personal use with smart caching: <span style={{ color: 'var(--green)' }}>$2–5/month</span><br />
              Get your key at{' '}
              
                href="https://console.anthropic.com"
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--accent-cyan)' }}
              >
                console.anthropic.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
