import React from 'react'

// Without this, a single malformed field from the model blanked the whole page.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error: error }
  }

  componentDidCatch(error, info) {
    if (typeof console !== 'undefined') console.error('MacroSentinel render error:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg-void)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'
      }}>
        <div style={{
          maxWidth: 460, background: 'var(--bg-surface)',
          border: '1px solid var(--border-med)', borderRadius: 'var(--radius-lg)',
          padding: '2rem', textAlign: 'center'
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-lg)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
            The dashboard failed to render
          </div>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', marginBottom: 18, lineHeight: 1.6 }}>
            Something went wrong displaying the latest intelligence. No signal data has been
            lost — reloading will fetch it again.
          </p>
          <button
            onClick={function() { window.location.reload() }}
            style={{
              padding: '10px 20px', background: 'var(--accent-cyan)', border: 'none',
              borderRadius: 'var(--radius-md)', color: '#fff',
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--fs-sm)'
            }}
          >
            Reload
          </button>
        </div>
      </div>
    )
  }
}
