import React from 'react'

// Every page opens with one h1. It takes focus when the page changes, so a
// keyboard or screen-reader user lands at the top of the new page instead of
// wherever the old one left them.
export default function PageHeader({ eyebrow, title, children }) {
  return (
    <header className="page-head">
      <p className="eyebrow">{eyebrow}</p>
      <h1 id="page-title" tabIndex={-1}>{title}</h1>
      {children && <p className="page-head__lead">{children}</p>}
    </header>
  )
}
