import React, { useState } from 'react'
import Dashboard from './components/Dashboard.jsx'

var ENV_KEY = import.meta.env.VITE_ANTHROPIC_KEY || ''

export default function App() {
  return (
    <Dashboard
      apiKey={ENV_KEY}
      onChangeKey={function() {}}
    />
  )
}
