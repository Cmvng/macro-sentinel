import React, { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard.jsx'
import ApiKeySetup from './components/ApiKeySetup.jsx'

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('ms_apikey') || '')
  const [showSetup, setShowSetup] = useState(false)

  useEffect(() => {
    if (!apiKey) setShowSetup(true)
  }, [])

  const handleSaveKey = (key) => {
    localStorage.setItem('ms_apikey', key)
    setApiKey(key)
    setShowSetup(false)
  }

  const handleClearKey = () => {
    localStorage.removeItem('ms_apikey')
    setApiKey('')
    setShowSetup(true)
  }

  if (showSetup && !apiKey) {
    return <ApiKeySetup onSave={handleSaveKey} />
  }

  return (
    <Dashboard
      apiKey={apiKey}
      onChangeKey={handleClearKey}
      onSetupKey={() => setShowSetup(true)}
    />
  )
}
