import React, { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard.jsx'
import AdminPage from './components/AdminPage.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// No API key is read here. Anything referenced through import.meta.env with a
// VITE_ prefix is inlined into the public bundle by Vite, which is how the
// Anthropic key was previously published to every visitor. The key lives only
// in the serverless functions now.

function currentPage() {
  return window.location.pathname.replace(/\/+$/, '') === '/admin' ? 'admin' : 'dashboard'
}

export default function App() {
  var [page, setPage] = useState(currentPage)

  useEffect(function() {
    function onNav() { setPage(currentPage()) }
    window.addEventListener('popstate', onNav)
    return function() { window.removeEventListener('popstate', onNav) }
  }, [])

  return (
    <ErrorBoundary>
      {page === 'admin' ? <AdminPage /> : <Dashboard />}
    </ErrorBoundary>
  )
}
