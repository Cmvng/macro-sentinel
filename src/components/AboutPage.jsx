import React from 'react'
import PageHeader from './PageHeader.jsx'
import Reveal from './Reveal.jsx'

// Plain statements about where everything comes from and where it stops. Kept
// honest on purpose: this is the page that says what the app is not.
export default function AboutPage() {
  return (
    <div className="about">
      <PageHeader eyebrow="ABOUT" title="How MacroSentinel works">
        What it does, where its information comes from, and what it cannot tell you.
      </PageHeader>

      <Reveal as="section" className="about-card" aria-labelledby="ab-what">
        <h2 id="ab-what">What it is</h2>
        <p>
          A macro-news reader. It gathers headlines, scores how much each one leans on 47 currencies, metals,
          energy and crypto instruments, and explains economic releases (CPI, GDP, jobs and so on) in plain
          English. It is meant to sit beside your own chart analysis, not replace it.
        </p>
      </Reveal>

      <Reveal as="section" className="about-card" aria-labelledby="ab-score">
        <h2 id="ab-score">How to read a score</h2>
        <p>
          A score from 0 to 100 measures <strong>macro pressure from the news</strong>: above 50 the news leans
          supportive, below 50 it leans against. Strong buy and strong sell are the extremes. It is not a
          probability, a price target or a forecast, and a strong score can still be wrong.
        </p>
        <p>
          A release’s bias is worked out from the <strong>surprise</strong>, the gap between the result and the
          forecast. It is a short-term reaction guide: first moves can reverse, and the size of a “typical miss” for
          each indicator is a rough estimate.
        </p>
      </Reveal>

      <Reveal as="section" className="about-card" aria-labelledby="ab-data">
        <h2 id="ab-data">Where the information comes from</h2>
        <ul>
          <li><strong>News:</strong> public RSS feeds from wire services, central banks and financial press, collected on the server.</li>
          <li><strong>Signal scores:</strong> produced on the server by an AI model that is shown only the collected headlines. Its output is validated before it is shown.</li>
          <li><strong>Release schedule, forecasts, previous values:</strong> the Forex Factory public calendar feed.</li>
          <li><strong>Release results:</strong> a separate public economic-calendar source, matched to the schedule only when the match is unambiguous. It is unofficial, so a result can be late or missing; you can always type one yourself.</li>
          <li><strong>Charts and prices:</strong> TradingView’s embedded chart. Prices come from TradingView, not from MacroSentinel.</li>
        </ul>
      </Reveal>

      <Reveal as="section" className="about-card" aria-labelledby="ab-limits">
        <h2 id="ab-limits">What it cannot do</h2>
        <ul>
          <li>It cannot predict prices, and it does not know your positions, risk or timeframe.</li>
          <li>A release it cannot match safely gets no automatic result. That is deliberate: a missing number is better than a wrong one.</li>
          <li>Headlines can be wrong, late or already priced in.</li>
        </ul>
        <p className="about-note">MacroSentinel provides informational market commentary only. It is not investment advice.</p>
      </Reveal>

      <Reveal as="section" className="about-card" aria-labelledby="ab-privacy">
        <h2 id="ab-privacy">Your data</h2>
        <p>
          There are no accounts. Your watchlist, theme and any results you type stay in this browser. The price
          chart loads code from TradingView, so your browser contacts TradingView when a chart is on screen.
        </p>
      </Reveal>
    </div>
  )
}
