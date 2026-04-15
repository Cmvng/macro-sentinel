import React, { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard.jsx'
import AdminPage from './components/AdminPage.jsx'

var ENV_KEY = import.meta.env.VITE_ANTHROPIC_KEY || ''

export default function App() {
  var [page, setPage] = useState('dashboard')

  useEffect(function() {
    var path = window.location.pathname
    if (path === '/admin') setPage('admin')
    else setPage('dashboard')
  }, [])

  if (page === 'admin') {
    return <AdminPage apiKey={ENV_KEY} />
  }

  return <Dashboard apiKey={ENV_KEY} onChangeKey={function() {}} />
}
