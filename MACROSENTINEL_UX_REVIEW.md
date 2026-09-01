# MACROSENTINEL — UI/UX & FUNCTIONALITY REVIEW

**Companion to:** `MACROSENTINEL_ARCHITECTURE.md` (logic/security audit) and
`MACROSENTINEL_ROADMAP.md` (remaining work).
**Scope:** interface, interaction, accessibility and product functionality.
**Method:** read every component; measured contrast ratios, font-size distribution and
keyboard/ARIA coverage rather than eyeballing them.

Measured facts are marked as such. Everything else is design judgement, and labelled.

---

## 1. The finding that undermines the whole product

**The "last updated" time in the header is fabricated.**

`api/refresh.js` returns three freshness fields on every `get`:

```js
{ signals, cached: true, age_minutes: 1387, next_refresh_hours: 1 }
```

`scoreAssets()` in `claudeEngine.js` returns `data.signals` and **discards all three**.
`Dashboard` then does `setLastUpdate(new Date())` unconditionally.

So the server says *"this data is 23 hours old"*, the client throws that away, and the
header prints the current clock time next to a pulsing green `LIVE` dot.

For an ordinary dashboard that would be a bug. For this one it contradicts the product's
stated purpose — your brief's Phase 16 asks the dashboard to "be honest about its own data"
and warns against showing "an old BUY signal as if it is current." That is exactly what it
does today, and the fix is small: stop discarding fields the API already returns.

Related: `MarketHeader` shows `LIVE / ANALYZING / FETCHING` derived purely from in-flight
request state. It reports on the fetch, not on the data. There is no `DELAYED`, `STALE` or
`PARTIAL` state anywhere, and no feed-health surface.

---

## 2. Accessibility — measured

### 2.1 Colour contrast (WCAG AA needs 4.5:1; none of this text qualifies as "large")

| Ratio | Verdict | Usage |
|---|---|---|
| 15.57 | ✅ AA | `text-primary` on white — asset labels, news titles |
| 7.77 | ✅ AA | `text-secondary` on white — key drivers, analysis body |
| 3.12 | ❌ fail | `text-muted` on white — news source and timestamp, 9px |
| 2.97 | ❌ fail badly | `text-muted` on `bg-raised` — **every table header**, 8px |
| 2.86 | ❌ fail badly | `text-muted` on `bg-void` — labels, 10–11px |
| 2.77 | ❌ fail badly | `text-muted` on `bg-deep` — category badges, 8px |
| 1.79 | ❌ fail badly | `text-dim` on white |

**Every signal badge fails**, which matters because these are the primary output:

| Ratio | Badge |
|---|---|
| 3.89 | STR BUY |
| 2.76 | BUY |
| 2.84 | NEUTRAL |
| 3.35 | SELL |
| 4.16 | STR SELL |

`BUY` at 2.76:1 is the worst, and it is one of the two most important words on the screen.
White on `accent-cyan` scrapes through at 4.55.

The root cause is a single token: `--text-muted: #7a9a7a` is too light for any background in
the palette. Darkening it to roughly `#4a6a4a` fixes the majority of these in one edit.
The badges need their text colours darkened or their tint backgrounds strengthened.

### 2.2 Keyboard and screen reader

Measured across `src/`: **zero occurrences of `tabIndex`, `role=` or any `aria-*`
attribute.** The only two `onKeyDown` handlers are on the PIN and API-key inputs.

- **`src/index.css` defines no `:focus` styles at all.** A keyboard user gets whatever the
  browser default is, on top of custom-styled controls that suppress most of it. There is
  no visible focus indicator anywhere in the app.
- **`SignalTable.jsx:111` — `<tr onClick>` with no keyboard path.** Opening an instrument's
  analysis is the primary interaction of the product and it is mouse-only. (The `AI` button
  in the last cell does reach it by keyboard, so the function is not entirely stranded —
  but the row itself, which is what users click, is inert.)
- **`NewsFeed.jsx:28` — `<div onClick>` calling `window.open`.** These are links but not
  `<a>` elements, so there is no middle-click, no open-in-new-tab, no copy-link, no
  keyboard access, and nothing for a screen reader to announce. Also passed without
  `'noopener'`, and the URL comes from third-party RSS with no scheme validation.

### 2.3 Motion

Five looping animations — `pulse`, `ticker`, `spin`, `blink`, `fadeIn` — and **no
`prefers-reduced-motion` media query**. The ticker is an infinite marquee with no pause
control, which fails WCAG 2.2.2 (moving content lasting more than five seconds needs a
pause/stop mechanism). The status dot pulses continuously.

### 2.4 Touch targets

WCAG 2.5.8 (AA) asks for 24×24 CSS px minimum.

| Control | Approx. height | |
|---|---|---|
| `AI` button | ~20px | ❌ |
| News filter buttons | ~20px | ❌ |
| Tab buttons | ~26px | marginal |
| Analysis close button | 28×28 | ✅ AA, fails AAA's 44 |

---

## 3. Typography and density — *judgement*

Measured distribution of the 81 inline `fontSize` declarations:

| Size | Count | |
|---|---|---|
| 8px | 11 | below practical legibility |
| 9px | 14 | below practical legibility |
| 10px | 15 | small |
| 11px | 12 | small |
| 12px+ | 29 | fine |

**52 of 81 declarations are 11px or smaller**, and 25 are 8–9px. Table headers, category
badges, the `LIVE` badge and the `conflicting` badge are all 8px. Combined with the failing
contrast on exactly those elements, the small text and the low contrast compound.

This reads as an attempt at Bloomberg-terminal density. But a terminal earns its density
through information rate, and this table shows six columns for 28 rows — it is dense
without being information-rich. Your brief asks for "reduce visual noise", "use whitespace",
"make important information scannable." A larger base size with fewer, better-chosen
elements would serve that better.

There is also no type scale. Sizes 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 28 are all
in use — thirteen steps, most differing by one pixel, which is below the threshold at which
a size difference reads as hierarchy.

**139 inline style objects** and no CSS classes for components. This is the house style and
I am not proposing a rewrite, but it is why the palette drift above went unnoticed: there is
no single place where "badge text colour" is defined.

---

## 4. Interaction and information architecture

### 4.1 The analysis panel is placed where you cannot see it

`Dashboard` renders `<SignalTable>` and then `{analysis && <AnalysisPanel>}` as siblings, so
the panel always appears **below the entire table**. On the forex tab that is 28 rows down.
Click the first row and the result renders off-screen, with no scroll-into-view, no modal,
and no inline expansion. Nothing indicates anything happened.

This is the single worst interaction problem after the timestamp. Options, cheapest first:
scroll the panel into view on open; render it as a right-hand drawer; or expand it inline
beneath the clicked row.

### 4.2 Missing table interactions

For a 28-row ranked signal table, these are conspicuous by absence:

- **No sorting.** Cannot rank by score, signal or confidence. This is the most obvious
  missing interaction in the product — the entire point is to find the strongest signals.
- **No filtering** by signal or confidence.
- **No search** to jump to an instrument.
- **No watchlist.** Your Phase 21 wants this; `localStorage` is sufficient.

### 4.3 No deep linking or persisted UI state

`App.jsx` reads `window.location.pathname` once with no `popstate` listener and no query
params. Consequences: the active tab resets to forex on reload; you cannot share a link to
an instrument's analysis; browser back does nothing.

### 4.4 Redundant and unlabelled controls

Every row is clickable *and* carries an `AI` button doing the identical thing. Two
affordances, one action, and the label `AI` names the technology rather than the outcome —
"Analysis" or "Why?" would tell the user what they get.

### 4.5 Header counters contradict the table beneath them

`BULLISH` and `BEARISH` count `Object.values(signals)` — all 47 instruments — while sitting
directly above a tab-filtered table showing 28, 7 or 12. Nothing labels the discrepancy, so
on the metals tab the tiles describe a set the user cannot see.

### 4.6 Score has no legend

A 0–100 number and a bar, with nothing explaining the scale, its direction, or that it is a
pressure score rather than a probability. Your Phase 18 is explicit that this distinction
must be visible in the UI.

---

## 5. Mobile — *judgement*

The 768px breakpoint hides the `SCORE` and `CONF` columns via `.hide-mobile`. So mobile
users lose the score and the confidence — two of the four things the product exists to
communicate — while keeping `KEY DRIVERS`, the widest and least scannable column. The
priority is inverted; a stacked card layout would serve small screens better than a
horizontally-scrolling table with its most important columns removed.

The grid also collapses to one column, placing the news sidebar *below* the full table, so
reaching news on mobile means scrolling past 28 rows.

---

## 6. Missing functionality

Beyond the intelligence work already in the roadmap:

| | |
|---|---|
| Manual refresh | Only in `/admin`. A user seeing stale data can only hard-reload. |
| Per-signal timestamps | Only one global time exists, and it is wrong (§1). |
| Empty states | No handling for zero assets or zero news beyond a bare string. |
| Error visibility | One red banner bound only to `loadSignals`. `loadNews` failures go to `console.error` and are invisible. |
| Error boundary | None. One malformed model field blanks the page. |
| Disclaimer | None, on a product emitting buy/sell language on real instruments. |
| Favicon / meta | `index.html` has only charset, viewport and title. No favicon, description, `theme-color` or OG tags. |
| Export / copy | No way to get a signal or thesis out of the app. |

---

## 7. Prioritised fixes

**Tier 1 — trust. Cheap, and the product's credibility rests on them.**

1. Stop discarding `cached` / `age_minutes` from the API; show real data age. Add
   `DELAYED` / `STALE` states. *(2–3 h)*
2. Scroll the analysis panel into view, or make it a drawer. *(1 h)*
3. Darken `--text-muted` to ~`#4a6a4a` and fix the five signal-badge contrasts. *(1 h)*
4. Add a disclaimer and a score legend stating these are pressure scores, not
   probabilities. *(1 h)*

**Tier 2 — accessibility. Mostly mechanical.**

5. Add `:focus-visible` styles globally. *(30 min)*
6. Make table rows keyboard-operable — `tabIndex={0}`, `role="button"`, `onKeyDown`. *(1 h)*
7. Convert news items to real `<a>` elements with `rel="noopener noreferrer"` and validate
   the URL scheme. *(1 h)*
8. Add `prefers-reduced-motion` and a ticker pause control. *(1 h)*
9. Raise 8–9px text to a 12px floor; collapse the thirteen-step scale to about five. *(2–3 h)*
10. Enlarge sub-24px touch targets. *(1 h)*

**Tier 3 — functionality.**

11. Column sorting. *(2 h)*
12. Signal and confidence filters. *(2 h)*
13. Watchlist in `localStorage`. *(3 h)*
14. Deep links and persisted tab via query params. *(2–3 h)*
15. Scope the bull/bear counters to the active tab, or label them market-wide. *(30 min)*
16. Manual refresh on the dashboard. *(1 h)*

**Tier 4 — redesign.** Everything in Phase 19 of the brief. Worth doing *after* P2 of the
roadmap, so the new layout is built around data that actually exists.

---

## 8. What is genuinely good

Worth keeping through any redesign:

- The restrained mint palette is distinctive and avoids the red/green casino look the brief
  warns against. The problem is token lightness, not the concept.
- Signals are encoded as **text plus colour**, not colour alone, so the red/green axis does
  not strand colourblind users.
- Skeleton loading states exist in both the table and the news feed.
- The table is real semantic `<table>` markup with `<thead>` and `<th>` — the structure is
  right, it just needs interaction and contrast.
- `AnalysisPanel` already separates loading, error and success states cleanly.
