import React from 'react'
import Dashboard from './components/Dashboard.jsx'

export default function App() {
  var apiKey = import.meta.env.VITE_ANTHROPIC_KEY || ''
  return (
    <Dashboard
      apiKey={apiKey}
      onChangeKey={function() {}}
    />
  )
}
