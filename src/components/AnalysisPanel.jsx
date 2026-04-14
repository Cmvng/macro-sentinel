import React from 'react'
import { SIGNAL_CONFIG } from '../lib/assets.js'

export default function AnalysisPanel({ analysis, onClose }) {
  if (!analysis) return null

  var sigCfg = SIGNAL_CONFIG[analysis.signal] || SIGNAL_CONFIG.neutral

  var containerStyle = {
    marginTop: '1rem',
    background: 'var(--bg-surface)',
    border: '0.5px solid var(--border-med)',
    borderLeft: '3px solid ' + sigCfg.color,
    borderRadius: 'var(--radius-lg)',
    padding: '1.25rem',
    animation: 'fadeIn 0.3s ease'
  }

  var headerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1rem'
  }

  var titleRowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 10
  }

  var iconStyle = {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: sigCfg.bg,
    border: '0.5px solid ' + sigCfg.color + '44',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    fontFamily: 'var(--font-mono)',
    color: sigCfg.color,
    fontWeight: 700,
    flexShrink: 0
  }

  var assetNameStyle = {
    fontFamily: 'var(--font-display)',
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--text-primary)'
  }

  var badgeStyle = {
    marginLeft: 8,
    fontSize: 10,
    padding: '2px 8px',
    borderRadius: 4,
    background: sigCfg.bg,
    color: sigCfg.color,
    fontFamily: 'var(--font-mono)',
    fontWeight: 700,
    letterSpacing: '0.5px',
    border: '0.5px solid ' + sigCfg.color + '44'
  }

  var subtitleStyle = {
    fontSize: 10,
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
    marginTop: 2,
    letterSpacing: '0.5px'
  }

  var closeStyle = {
    background: 'transparent',
    border: '0.5px solid var(--border-med)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-muted)',
    fontSize: 14,
    width: 28,
    height: 28,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-mono)',
    flexShrink: 0
  }

  var spinnerStyle = {
    width: 16,
    height: 16,
    border: '2px solid var(--border-med)',
    borderTopColor: sigCfg.color,
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    flexShrink: 0
  }

  var loadingStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    color: 'var(--text-muted)',
    fontSize: 13,
    fontStyle: 'italic'
  }

  var textStyle = {
    fontSize: 13,
    color: 'var(--text-secondary)',
    lineHeight: 1.9,
    borderTop: '0.5px solid var(--border-dim)',
    paddingTop: '1rem'
  }

  var errorStyle = {
    color: 'var(--red)',
    fontSize: 13,
    fontFamily: 'var(--font-mono)',
    borderTop: '0.5px solid var(--border-dim)',
    paddingTop: '1rem'
  }

  var whatStyle = {
    marginTop: '0.75rem',
    padding: '8px 12px',
    background: 'var(--bg-raised)',
    borderRadius: 'var(--radius-md)',
    fontSize: 11,
    color: 'var(--text-muted)',
    lineHeight: 1.6,
    borderLeft: '2px solid var(--border-med)'
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={titleRowStyle}>
          <div style={iconStyle}>AI</div>
          <div>
            <div style={assetNameStyle}>
              {analysis.asset}
              <span style={badgeStyle}>{sigCfg.short}</span>
            </div>
            <div style={subtitleStyle}>FUNDAMENTAL ANALYSIS</div>
          </div>
        </div>
        <button style={closeStyle} onClick={onClose}>x</button>
      </div>

      {analysis.loading && (
        <div style={loadingStyle}>
          <div style={spinnerStyle} />
          Analyzing fundamentals for {analysis.asset}...
        </div>
      )}

      {!analysis.loading && analysis.error && (
        <div style={errorStyle}>Error: {analysis.error}</div>
      )}

      {!analysis.loading && !analysis.error && analysis.text && (
        <div>
          <div style={textStyle}>{analysis.text}</div>
          <div style={whatStyle}>
            The ANALYZE button reads the latest news relevant to this asset and asks Claude to explain the current fundamental bias, key drivers, risks, and what to watch next — giving you context behind the signal to support your technical analysis decisions.
          </div>
        </div>
      )}
    </div>
  )
}
