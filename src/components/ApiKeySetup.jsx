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

  var pageStyle = {
    minHeight: '100vh',
    background: 'var(--bg-void)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-body)',
    padding: '2rem'
  }

  var wrapStyle = {
    width: '100%',
    maxWidth: 480,
    animation: 'fadeIn 0.4s ease'
  }

  var logoStyle = {
    marginBottom: '2.5rem',
    textAlign: 'center'
  }

  var titleStyle = {
    fontFamily: 'var(--font-display)',
    fontSize: 28,
    fontWeight: 800,
    letterSpacing: '-0.5px',
    color: 'var(--text-primary)',
    marginBottom: 8
  }

  var subtitleStyle = {
    fontSize: 13,
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)'
  }

  var cardStyle = {
    background: 'var(--bg-surface)',
    border: '0.5px solid var(--border-med)',
    borderRadius: 'var(--radius-lg)',
    padding: '2rem'
  }

  var headingStyle = {
    fontSize: 16,
    fontWeight: 500,
    marginBottom: 8
  }

  var descStyle = {
    fontSize: 13,
    color: 'var(--text-secondary)',
    lineHeight: 1.6
  }

  var inputStyle = {
    width: '100%',
    padding: '10px 14px',
    background: 'var(--bg-deep)',
    border: error ? '0.5px solid var(--red)' : '0.5px solid var(--border-med)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    outline: 'none',
    marginBottom: error ? 8 : 16
  }

  var errorStyle = {
    fontSize: 12,
    color: 'var(--red)',
    marginBottom: 16
  }

  var btnStyle = {
    width: '100%',
    padding: '11px',
    background: 'var(--accent-cyan)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    color: '#000',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 14,
    letterSpacing: '0.5px',
    cursor: 'pointer'
  }

  var infoBoxStyle = {
    marginTop: '1.5rem',
    padding: '1rem',
    background: 'var(--bg-deep)',
    borderRadius: 'var(--radius-md)',
    border: '0.5px solid var(--border-dim)'
  }

  var infoTextStyle = {
    fontSize: 12,
    color: 'var(--text-secondary)',
    lineHeight: 1.7
  }

  var infoBoldStyle = {
    fontWeight: 500,
    color: 'var(--amber)',
    marginBottom: 6,
    fontFamily: 'var(--font-mono)'
  }

  var linkStyle = {
    color: 'var(--accent-cyan)',
    textDecoration: 'none'
  }

  var greenStyle = {
    color: 'var(--green)'
  }

  return (
    <div style={pageStyle}>
      <div style={wrapStyle}>
        <div style={logoStyle}>
          <div style={titleStyle}>
            MACRO
            <span style={{ color: 'var(--accent-cyan)' }}>SENTINEL</span>
          </div>
          <div style={subtitleStyle}>
            FUNDAMENTAL SENTIMENT INTELLIGENCE
          </div>
        </div>
        <div style={cardStyle}>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={headingStyle}>Enter your Anthropic API key</div>
            <div style={descStyle}>
              Your key is stored locally in your browser only. It is never sent to any server other than Anthropic directly.
            </div>
          </div>
          <input
            type="password"
            value={key}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="sk-ant-api03-..."
            style={inputStyle}
          />
          {error && (
            <div style={errorStyle}>{error}</div>
          )}
          <button onClick={handleSubmit} style={btnStyle}>
            LAUNCH DASHBOARD
          </button>
          <div style={infoBoxStyle}>
            <div style={infoTextStyle}>
              <div style={infoBoldStyle}>ESTIMATED COST</div>
              <span>Personal use with smart caching: </span>
              <span style={greenStyle}>$2 to $5 per month</span>
              <br />
              <span>Get your key at: </span>
              
                href="https://console.anthropic.com"
                target="_blank"
                rel="noreferrer"
                style={linkStyle}
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
