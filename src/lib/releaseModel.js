// Deterministic interpretation of scheduled economic releases.
//
// A release is judged on its SURPRISE, not its level: the market has already
// priced in the forecast, so what moves prices is actual minus forecast. The
// pipeline is small and every step is inspectable:
//
//   parse numbers -> surprise -> size it against a typical surprise (z)
//   -> currency direction (via the indicator's polarity)
//   -> transmission to instruments -> signal band + confidence
//
// No model is involved. The typical-surprise sizes (`sigma`) are rounded
// estimates of how far consensus usually misses, NOT statistically fitted
// values — they are tunable and are labelled as such in the UI.
//
// This is a short-term reaction guide, not a price forecast.

var FX_PAIRS = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD',
  'EUR/GBP', 'EUR/JPY', 'EUR/CHF', 'EUR/AUD', 'EUR/CAD', 'EUR/NZD', 'GBP/JPY', 'GBP/CHF',
  'GBP/AUD', 'GBP/CAD', 'GBP/NZD', 'AUD/JPY', 'AUD/CHF', 'AUD/CAD', 'AUD/NZD', 'NZD/JPY',
  'NZD/CHF', 'NZD/CAD', 'CAD/JPY', 'CAD/CHF', 'CHF/JPY'
]
var CRYPTO = ['BTC/USD', 'ETH/USD', 'BNB/USD', 'SOL/USD', 'XRP/USD', 'DOGE/USD', 'ADA/USD', 'AVAX/USD', 'LINK/USD', 'DOT/USD', 'MATIC/USD', 'UNI/USD']

export var CURRENCY_BANK = {
  USD: 'Federal Reserve', EUR: 'ECB', GBP: 'Bank of England', JPY: 'Bank of Japan',
  CHF: 'Swiss National Bank', CAD: 'Bank of Canada', AUD: 'RBA', NZD: 'RBNZ', CNY: "China's central bank"
}

// Categories that move a currency mainly by changing what the central bank is
// expected to do with interest rates.
var RATE_DRIVEN = { inflation: 1, labour: 1, rates: 1 }

var IMPACT_WEIGHT = { high: 1, medium: 0.6, low: 0.3 }

// polarity: +1 means a higher-than-forecast print is currency-positive.
// sigma: typical size of a consensus miss, in the indicator's own unit.
//        A number, or { mm, qq, yy, def } chosen from the title's period.
// rel:   sigma as a fraction of the forecast, for level-type series.
var INDICATORS = [
  { id: 'core_pce', test: /core pce/, name: 'Core PCE Price Index', category: 'inflation', polarity: 1, sigma: { def: 0.1 },
    titles: ['Core PCE Price Index m/m'],
    what: "The U.S. central bank's preferred inflation gauge: how fast the prices of goods and services people buy are rising, leaving out food and energy.",
    why: 'The Fed targets 2% on this measure, so it feeds straight into where interest rates go next.' },
  { id: 'pce', test: /pce price/, name: 'PCE Price Index', category: 'inflation', polarity: 1, sigma: { def: 0.1 },
    titles: ['PCE Price Index m/m'],
    what: "The U.S. central bank's preferred inflation gauge: how fast the prices of everything people buy are rising.",
    why: 'The Fed targets 2% on this measure, so it feeds straight into where interest rates go next.' },
  { id: 'core_ppi', test: /core ppi/, name: 'Core PPI', category: 'inflation', polarity: 1, sigma: { mm: 0.2, yy: 0.3, def: 0.2 },
    titles: ['Core PPI m/m'],
    what: 'Producer Price Index (excluding food and energy): the prices businesses get for their goods and services at the wholesale level, before they reach shoppers.',
    why: 'Wholesale price rises often get passed on to consumers later, so markets treat PPI as an early inflation signal.' },
  { id: 'ppi', test: /\bppi\b|producer price/, name: 'PPI', category: 'inflation', polarity: 1, sigma: { mm: 0.2, yy: 0.3, def: 0.2 },
    titles: ['PPI m/m'],
    what: 'Producer Price Index: the prices businesses get for their goods and services at the wholesale level, before they reach shoppers.',
    why: 'Wholesale price rises often get passed on to consumers later, so markets treat PPI as an early inflation signal.' },
  { id: 'core_cpi', test: /core cpi|cpi core|trimmed mean cpi|median cpi|common cpi/, name: 'Core CPI', category: 'inflation', polarity: 1, sigma: { def: 0.1 },
    titles: ['Core CPI m/m', 'Core CPI y/y'],
    what: 'Consumer Price Index without food and energy: how much more households pay for everyday things, stripped of the most volatile items.',
    why: 'It is the cleanest read on underlying inflation, and central banks set interest rates around inflation.' },
  { id: 'cpi', test: /cpi|consumer price/, name: 'CPI', category: 'inflation', polarity: 1, sigma: { def: 0.1 },
    titles: ['CPI m/m', 'CPI y/y'],
    what: 'Consumer Price Index: how much more (or less) households are paying for everyday goods and services. The headline measure of inflation.',
    why: 'Central banks set interest rates around inflation, so CPI surprises move rate expectations within seconds.' },
  { id: 'wages', test: /average hourly earnings|average earnings|wage price|labou?r cost|employment cost/, name: 'Wage growth', category: 'labour', polarity: 1, sigma: { def: 0.1 },
    titles: ['Average Hourly Earnings m/m'],
    what: 'How fast workers’ pay is rising.',
    why: 'Fast wage growth can keep prices rising, which makes central banks slower to cut interest rates.' },
  { id: 'adp', test: /adp/, name: 'ADP Employment', category: 'labour', polarity: 1, sigma: { def: 60000 },
    titles: ['ADP Non-Farm Employment Change'],
    what: 'How many private-sector jobs were added, according to payroll processor ADP. A preview of the official jobs report.',
    why: 'It hints at what the official payrolls number will show, though it is a noisy guide.' },
  { id: 'nfp', test: /non-?farm|nfp/, name: 'Non-Farm Payrolls', category: 'labour', polarity: 1, sigma: { def: 60000 },
    titles: ['Non-Farm Employment Change'],
    what: 'How many jobs the U.S. economy added last month, excluding farms. The single most watched jobs number.',
    why: 'It shows how strong the economy is and how much room the Fed has to cut interest rates.' },
  { id: 'unemployment', test: /unemployment rate|jobless rate/, name: 'Unemployment Rate', category: 'labour', polarity: -1, sigma: { def: 0.1 },
    titles: ['Unemployment Rate'],
    what: 'The share of people who want a job but do not have one. Lower is stronger.',
    why: 'A weakening jobs market makes interest-rate cuts more likely.' },
  { id: 'claims', test: /unemployment claims|jobless claims|initial claims|continuing claims|claimant count/, name: 'Jobless Claims', category: 'labour', polarity: -1, sigma: { def: 12000 },
    titles: ['Unemployment Claims'],
    what: 'New applications for unemployment benefits: a weekly read on layoffs. Fewer is stronger.',
    why: 'Rising layoffs are an early sign the jobs market is cooling.' },
  { id: 'jolts', test: /jolts|job openings/, name: 'Job Openings', category: 'labour', polarity: 1, sigma: { def: 300000 },
    titles: ['JOLTS Job Openings'],
    what: 'How many unfilled jobs employers are advertising.',
    why: 'Plenty of openings means employers are still hungry to hire.' },
  { id: 'employment', test: /employment change|employment|jobs/, name: 'Employment Change', category: 'labour', polarity: 1, sigma: { def: 25000 },
    titles: ['Employment Change'],
    what: 'How many jobs the economy added or lost last month.',
    why: 'Strong hiring supports spending and gives the central bank less reason to cut interest rates.' },
  { id: 'gdp_deflator', test: /gdp price index|gdp deflator/, name: 'GDP Price Index', category: 'inflation', polarity: 1, sigma: { def: 0.1 },
    titles: ['GDP Price Index q/q'],
    what: 'The price index behind GDP: how much prices across the whole economy rose, not just the ones consumers see in shops.',
    why: 'It is an inflation reading, so it is judged like CPI rather than like growth.' },
  { id: 'gdp', test: /gdp/, name: 'GDP', category: 'growth', polarity: 1, sigma: { qq: 0.4, mm: 0.1, yy: 0.3, def: 0.3 },
    titles: ['GDP q/q', 'GDP m/m'],
    what: 'Gross Domestic Product: the total value of everything the economy produced. The broadest measure of economic growth.',
    why: 'Faster growth tends to lift interest-rate expectations and attract investment.' },
  { id: 'retail', test: /retail sales/, name: 'Retail Sales', category: 'growth', polarity: 1, sigma: { def: 0.4 },
    titles: ['Retail Sales m/m', 'Core Retail Sales m/m'],
    what: 'How much consumers spent in shops and online. Consumer spending drives most of a modern economy.',
    why: 'Strong spending points to a healthy economy.' },
  { id: 'industrial', test: /industrial production|manufacturing production|factory orders/, name: 'Industrial Production', category: 'growth', polarity: 1, sigma: { def: 0.3 },
    titles: ['Industrial Production m/m', 'Manufacturing Production m/m'],
    what: 'How much factories, mines and utilities produced.',
    why: 'A gauge of the goods side of the economy.' },
  { id: 'durable', test: /durable goods/, name: 'Durable Goods Orders', category: 'growth', polarity: 1, sigma: { def: 0.8 },
    titles: ['Durable Goods Orders m/m'],
    what: 'Orders for long-lasting factory goods such as machinery and aircraft.',
    why: 'A signal of how confident businesses feel about investing.' },
  { id: 'pmi', test: /pmi|ism|ifo|zew|tankan|business climate|business confidence|philly fed|empire state/, name: 'Business Survey (PMI)', category: 'growth', polarity: 1, sigma: { def: 1.2 },
    titles: ['ISM Manufacturing PMI', 'ISM Services PMI', 'Flash Manufacturing PMI'],
    what: 'A survey of purchasing managers. Above 50 means the sector is expanding; below 50 means it is shrinking.',
    why: 'Surveys are early: they show which way activity is heading before the hard data arrives.' },
  { id: 'confidence', test: /consumer confidence|consumer sentiment/, name: 'Consumer Confidence', category: 'growth', polarity: 1, sigma: { def: 3 },
    titles: ['CB Consumer Confidence', 'Prelim UoM Consumer Sentiment'],
    what: 'How optimistic households feel about the economy and their finances.',
    why: 'Confident consumers spend more, and spending drives growth.' },
  { id: 'housing', test: /building permits|housing starts|new home sales|existing home sales|pending home sales/, name: 'Housing Activity', category: 'growth', polarity: 1, rel: 0.04, sigma: { def: 0 },
    titles: ['Building Permits', 'Housing Starts', 'Existing Home Sales'],
    what: 'How much new housing is being built or sold. Housing is very sensitive to interest rates.',
    why: 'A gauge of how the economy is coping with the current level of interest rates.' },
  { id: 'rate', test: /federal funds rate|official bank rate|cash rate|main refinancing rate|overnight rate|policy rate|deposit facility|bank rate/, name: 'Interest Rate Decision', category: 'rates', polarity: 1, sigma: { def: 0.125 },
    titles: ['Federal Funds Rate', 'Official Bank Rate', 'Cash Rate'],
    what: "The central bank's decision on its main interest rate: the price of borrowing that anchors the whole economy.",
    why: 'Higher rates make a currency more attractive to hold. The surprise versus expectations matters more than the decision itself.' }
]

// Titles that clearly are not a single number to compare with a forecast.
var QUALITATIVE = /speaks|speech|testifies|statement|minutes|press conference|meeting|auction|bond|treasury|holiday|election|summit/

export function indicatorTitles() {
  var out = []
  for (var i = 0; i < INDICATORS.length; i++) {
    for (var j = 0; j < INDICATORS[i].titles.length; j++) {
      out.push({ title: INDICATORS[i].titles[j], category: INDICATORS[i].category, name: INDICATORS[i].name })
    }
  }
  return out
}

export function matchIndicator(title) {
  var t = String(title || '').toLowerCase()
  if (!t || QUALITATIVE.test(t)) return null
  for (var i = 0; i < INDICATORS.length; i++) {
    if (INDICATORS[i].test.test(t)) return INDICATORS[i]
  }
  return null
}

// ---------------------------------------------------------------- parsing

var MULT = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 }

// Reads "0.3%", "-0.1%", "90K", "1.2M", "4.25%", "52.3". Anything ambiguous
// ("1.5|2.1", "<0.1%", empty) is rejected rather than guessed at.
export function parseValue(raw) {
  if (raw === null || raw === undefined) return { ok: false }
  var s = String(raw).trim().replace(/[−–]/g, '-').replace(/,/g, '')
  if (!s || s.length > 24) return { ok: false }
  var m = s.match(/^(-?\d+(?:\.\d+)?)\s*(%|[KMBT])?$/i)
  if (!m) return { ok: false }
  var num = Number(m[1])
  if (!isFinite(num)) return { ok: false }
  var unit = m[2] ? m[2].toUpperCase() : ''
  var mult = MULT[unit] || 1
  var dot = m[1].indexOf('.')
  return { ok: true, base: num * mult, unit: unit, mult: mult, decimals: dot === -1 ? 0 : m[1].length - dot - 1 }
}

export function formatValue(base, unit, decimals) {
  var d = Math.max(0, Math.min(2, decimals || 0))
  if (unit === '%') return round(base, d) + '%'
  if (MULT[unit]) return round(base / MULT[unit], d) + unit
  return String(round(base, d))
}

function round(n, d) {
  var f = Math.pow(10, d)
  return Math.round(n * f) / f
}

function periodOf(title) {
  var t = String(title).toLowerCase()
  if (/q\/q/.test(t)) return 'qq'
  if (/y\/y/.test(t)) return 'yy'
  if (/m\/m/.test(t)) return 'mm'
  return 'def'
}

function sigmaFor(ind, title, refBase) {
  if (ind.rel) return Math.max(Math.abs(refBase) * ind.rel, 1e-6)
  var s = ind.sigma
  var v = s[periodOf(title)]
  if (v === undefined) v = s.def
  return v > 0 ? v : 1e-6
}

// A bare "215" typed for a "190K" forecast means 215K. Percent needs no scaling.
function alignUnit(a, ref) {
  var out = { ok: true, base: a.base, unit: a.unit }
  if (a.unit === '' && ref.unit && ref.mult > 1) {
    out.base = a.base * ref.mult
    out.unit = ref.unit
  } else if (a.unit && ref.unit && a.unit !== ref.unit) {
    return { ok: false }
  }
  return out
}

// ----------------------------------------------------------- transmission

function signalFromEffect(eff) {
  var m = Math.abs(eff)
  if (m < 0.1) return 'neutral'
  var strong = m >= 0.75
  if (eff > 0) return strong ? 'strong_buy' : 'buy'
  return strong ? 'strong_sell' : 'sell'
}

function rankToConfidence(r) {
  return r >= 3 ? 'high' : r === 2 ? 'medium' : 'low'
}

// From "currency X got stronger/weaker" to the instruments it touches. Only
// direct effects are modelled, and USD spillovers carry an explicit weight
// below 1 because those links are looser than the FX pair itself.
function transmit(code, category, dir) {
  var out = []
  var i, parts, isBase
  for (i = 0; i < FX_PAIRS.length; i++) {
    parts = FX_PAIRS[i].split('/')
    if (parts[0] !== code && parts[1] !== code) continue
    isBase = parts[0] === code
    out.push({
      asset: FX_PAIRS[i], dir: isBase ? dir : -dir, weight: 1, direct: true,
      note: code + ' is the ' + (isBase ? 'first' : 'second') + ' currency in ' + FX_PAIRS[i] +
        ', so a ' + (dir > 0 ? 'stronger' : 'weaker') + ' ' + code + ' pushes the pair ' +
        ((isBase ? dir : -dir) > 0 ? 'up' : 'down') + '. The other currency is unaffected by this release.'
    })
  }

  if (code === 'USD') {
    if (RATE_DRIVEN[category]) {
      out.push({ asset: 'XAU/USD', dir: -dir, weight: 0.8, direct: false,
        note: 'Gold is priced in dollars and pays no interest, so it tends to fall when the dollar and U.S. interest rates rise.' })
      out.push({ asset: 'XAG/USD', dir: -dir, weight: 0.6, direct: false,
        note: 'Silver follows gold and the dollar, but its industrial use makes the link looser.' })
      for (i = 0; i < CRYPTO.length; i++) {
        out.push({ asset: CRYPTO[i], dir: -dir, weight: i < 2 ? 0.6 : 0.5, direct: false,
          note: 'Higher-for-longer U.S. rates tighten liquidity, which has tended to weigh on crypto. This is a loose link.' })
      }
    } else {
      out.push({ asset: 'XAU/USD', dir: -dir, weight: 0.4, direct: false,
        note: 'A stronger dollar usually weighs on gold, but growth data also affects risk appetite, so this link is weak.' })
      out.push({ asset: 'Copper', dir: dir, weight: 0.6, direct: false,
        note: 'Copper is a bet on industrial demand, so stronger growth supports it.' })
      out.push({ asset: 'WTI Oil', dir: dir, weight: 0.5, direct: false,
        note: 'Stronger growth means more demand for energy.' })
      out.push({ asset: 'Brent', dir: dir, weight: 0.5, direct: false,
        note: 'Stronger growth means more demand for energy.' })
    }
  }
  if (code === 'CNY' && category === 'growth') {
    out.push({ asset: 'Copper', dir: dir, weight: 0.6, direct: false,
      note: 'China is the largest buyer of copper, so its growth data moves the metal.' })
  }
  return out
}

// ----------------------------------------------------------- explanation

function verdictWord(ind, sign, good) {
  if (sign === 0) return 'IN LINE WITH FORECAST'
  if (ind.category === 'inflation') return sign > 0 ? 'HOTTER THAN EXPECTED' : 'COOLER THAN EXPECTED'
  if (ind.category === 'rates') return sign > 0 ? 'MORE HAWKISH THAN EXPECTED' : 'MORE DOVISH THAN EXPECTED'
  return good ? 'STRONGER THAN EXPECTED' : 'WEAKER THAN EXPECTED'
}

function meaningText(ind, code, sign, good) {
  var bank = CURRENCY_BANK[code] || 'central bank'
  if (sign === 0) return 'The result matched what economists expected, so there is little new information and rate expectations should not move much.'
  if (ind.category === 'inflation') {
    return sign > 0
      ? 'Prices are rising faster than economists expected. That makes it less likely the ' + bank + ' can cut interest rates and more likely it keeps them high for longer. Higher rates tend to support the ' + code + '.'
      : 'Inflation cooled more than economists expected. That gives the ' + bank + ' more room to cut interest rates, and lower rates tend to weigh on the ' + code + '.'
  }
  if (ind.category === 'rates') {
    return sign > 0
      ? 'The ' + bank + ' is tighter than the market expected. Higher rates make the ' + code + ' more attractive to hold.'
      : 'The ' + bank + ' is looser than the market expected. Lower rates make the ' + code + ' less attractive to hold.'
  }
  if (ind.category === 'labour') {
    return good
      ? 'The jobs market is stronger than expected. A strong jobs market supports spending and wages, which gives the ' + bank + ' less reason to cut rates. That is supportive for the ' + code + '.'
      : 'The jobs market is weaker than expected. Softer hiring raises the chance of interest-rate cuts, which tends to weigh on the ' + code + '.'
  }
  return good
    ? 'The economy is doing better than expected. Stronger growth lifts interest-rate expectations and attracts investment, which supports the ' + code + '.'
    : 'The economy is doing worse than expected. Weaker growth raises the chance of interest-rate cuts, which weighs on the ' + code + '.'
}

// ------------------------------------------------------------ interpreting

function magnitudeOf(z) {
  if (z < 0.25) return 'in_line'
  if (z < 1) return 'modest'
  if (z < 2) return 'notable'
  return 'large'
}

// Shared by interpretRelease (a real actual) and scenarioFor (a hypothetical one).
function interpretParsed(ind, ctx, actualBase) {
  var surprise = actualBase - ctx.ref
  var z = Math.abs(surprise) / ctx.sigma
  var sign = z < 0.25 ? 0 : (surprise > 0 ? 1 : -1)
  var good = sign === 0 ? null : (ind.polarity * sign > 0)
  var dir = sign === 0 ? 0 : ind.polarity * sign
  var s = sign === 0 ? 0 : Math.min(1, z / 2)
  if (ctx.revision) s *= 0.6

  var impact = ctx.impact
  var conf = ctx.basis === 'forecast'
    ? (impact === 'high' ? (z >= 1 ? 3 : 2) : impact === 'medium' ? 2 : 1)
    : 1
  if (ctx.revision) conf = Math.min(conf, 2)

  var legs = dir === 0 ? [] : transmit(ctx.code, ind.category, dir)
  var instruments = []
  for (var i = 0; i < legs.length; i++) {
    var eff = legs[i].dir * s * legs[i].weight
    var cap = legs[i].weight >= 0.9 ? 3 : legs[i].weight >= 0.7 ? 2 : 1
    instruments.push({
      asset: legs[i].asset,
      signal: signalFromEffect(eff),
      effect: round(eff, 3),
      confidence: rankToConfidence(Math.min(conf, cap)),
      direct: legs[i].direct,
      note: legs[i].note
    })
  }
  instruments.sort(function(a, b) { return Math.abs(b.effect) - Math.abs(a.effect) })

  return {
    surprise: surprise, z: z, sign: sign, good: good, dir: dir, strength: s,
    magnitude: magnitudeOf(z), instruments: instruments, conf: conf
  }
}

function buildContext(input, ind) {
  var f = parseValue(input.forecast)
  var p = parseValue(input.previous)
  var refParsed = f.ok ? f : (p.ok ? p : null)
  if (!refParsed) return { ok: false, reason: 'no_baseline', message: 'This release has neither a forecast nor a previous value to compare against.' }
  var impact = String(input.impact || '').toLowerCase()
  if (!IMPACT_WEIGHT[impact]) impact = 'low'
  return {
    ok: true,
    code: String(input.currency || '').toUpperCase(),
    ref: refParsed.base, refParsed: refParsed,
    basis: f.ok ? 'forecast' : 'previous',
    sigma: sigmaFor(ind, input.title, refParsed.base),
    impact: impact,
    // "Final GDP" restates numbers the market has already seen, so it moves
    // prices less than the first estimate did.
    revision: /\bfinal\b|revised|second estimate|third estimate/i.test(String(input.title || '')),
    forecast: f, previous: p
  }
}

export function interpretRelease(input) {
  var ind = matchIndicator(input && input.title)
  if (!ind) {
    return { ok: false, reason: 'not_modelled',
      message: 'This release is not one the app models (for example a speech, statement or auction), so it has no numeric verdict. Read it as news instead.' }
  }
  var actualRaw = input.actual
  if (actualRaw === undefined || actualRaw === null || String(actualRaw).trim() === '') {
    return { ok: false, reason: 'awaiting_actual', message: 'Enter the actual result to see what it means.' }
  }
  var a = parseValue(actualRaw)
  if (!a.ok) return { ok: false, reason: 'bad_actual', message: 'Could not read that number. Use a form like 0.3%, 215K or 52.1.' }

  var ctx = buildContext(input, ind)
  if (!ctx.ok) return ctx

  var aligned = alignUnit(a, ctx.refParsed)
  if (!aligned.ok) return { ok: false, reason: 'unit_mismatch', message: 'The units do not match: the forecast is ' + ctx.refParsed.unit + ' but the result is ' + a.unit + '.' }

  var r = interpretParsed(ind, ctx, aligned.base)
  var decimals = Math.max(a.decimals, ctx.refParsed.decimals)
  var actualText = formatValue(aligned.base, ctx.refParsed.unit, decimals)
  var refText = formatValue(ctx.ref, ctx.refParsed.unit, decimals)

  var caveats = ['Markets react to the surprise versus the forecast, not to the number itself.']
  var warnings = []
  if (ctx.basis === 'previous') caveats.push('No consensus forecast was available, so this is compared with the previous release. Treat it as a weaker read.')
  if (ctx.revision) caveats.push('This revises figures that were already published, so markets often react less than to the first estimate.')
  if (ind.category === 'rates') caveats.push('The central bank statement and press conference can matter more than the rate itself.')
  caveats.push('This is a short-term reaction guide, not a price prediction. First moves can reverse.')
  if (r.z > 12) warnings.push('This is unusually far from the forecast. Double-check the number.')

  var currencyDirection = r.dir > 0 ? 'bullish' : r.dir < 0 ? 'bearish' : 'neutral'
  var vw = verdictWord(ind, r.sign, r.good)

  return {
    ok: true,
    indicator: { id: ind.id, name: ind.name, category: ind.category },
    basis: ctx.basis,
    actual: actualText,
    reference: refText,
    surprise: round(r.surprise / (ctx.refParsed.mult || 1), 3),
    surprise_z: round(r.z, 2),
    magnitude: r.magnitude,
    verdict: vw,
    currency: { code: ctx.code, direction: currencyDirection, strength: round(r.strength, 2) },
    headline: input.title + ': ' + actualText + ' against ' + refText + (ctx.basis === 'forecast' ? ' forecast' : ' previous'),
    meaning: meaningText(ind, ctx.code, r.sign, r.good),
    what_is: ind.what,
    why_it_matters: ind.why,
    instruments: r.instruments,
    confidence: rankToConfidence(r.conf),
    impact: ctx.impact,
    caveats: caveats,
    warnings: warnings,
    typical_surprise: formatValue(ctx.sigma, ctx.refParsed.unit, Math.max(1, ctx.refParsed.decimals))
  }
}

// "If it prints above X ... if it prints below Y ..." before the release.
export function scenarioFor(input) {
  var ind = matchIndicator(input && input.title)
  if (!ind) return null
  var f = parseValue(input.forecast)
  if (!f.ok) return null
  var ctx = buildContext(input, ind)
  if (!ctx.ok || ctx.basis !== 'forecast') return null

  var dec = Math.max(1, f.decimals)
  var upBase = f.base + ctx.sigma
  var downBase = f.base - ctx.sigma
  var up = interpretParsed(ind, ctx, upBase)
  var down = interpretParsed(ind, ctx, downBase)
  var band = 0.25 * ctx.sigma

  function branch(r, base) {
    return {
      threshold: formatValue(base, f.unit, dec),
      verdict: verdictWord(ind, r.sign, r.good),
      currency: { code: ctx.code, direction: r.dir > 0 ? 'bullish' : r.dir < 0 ? 'bearish' : 'neutral' },
      meaning: meaningText(ind, ctx.code, r.sign, r.good),
      instruments: r.instruments.slice(0, 6)
    }
  }
  return {
    indicator: { id: ind.id, name: ind.name, category: ind.category },
    forecast: formatValue(f.base, f.unit, f.decimals),
    typical_surprise: formatValue(ctx.sigma, f.unit, dec),
    in_line: { low: formatValue(f.base - band, f.unit, Math.max(dec, 2)), high: formatValue(f.base + band, f.unit, Math.max(dec, 2)) },
    above: branch(up, upBase),
    below: branch(down, downBase),
    what_is: ind.what,
    why_it_matters: ind.why
  }
}

// ------------------------------------------------------------ aggregation

var HALF_LIFE_MS = 6 * 3600 * 1000
var WINDOW_MS = 24 * 3600 * 1000

// Combines every interpreted release into one bias per instrument. Releases
// fade with a six-hour half-life and drop out after a day, and two releases
// pushing opposite ways are reported as a conflict rather than averaged away.
export function aggregateBias(entries, now) {
  var acc = {}
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i]
    if (!e || !e.result || !e.result.ok) continue
    var age = now - e.time
    if (!isFinite(age) || age < 0 || age > WINDOW_MS) continue
    var decay = Math.pow(0.5, age / HALF_LIFE_MS)
    var w = decay * (IMPACT_WEIGHT[e.result.impact] || 0.3)
    for (var j = 0; j < e.result.instruments.length; j++) {
      var ins = e.result.instruments[j]
      if (!acc[ins.asset]) acc[ins.asset] = { asset: ins.asset, pos: 0, neg: 0, sources: [] }
      var v = ins.effect * w
      if (v > 0) acc[ins.asset].pos += v
      else acc[ins.asset].neg += -v
      if (ins.effect !== 0) acc[ins.asset].sources.push({ title: e.result.headline, effect: ins.effect })
    }
  }
  var out = []
  var keys = Object.keys(acc)
  for (var k = 0; k < keys.length; k++) {
    var a = acc[keys[k]]
    var net = Math.max(-1, Math.min(1, a.pos - a.neg))
    var conflicting = a.pos >= 0.15 && a.neg >= 0.15
    out.push({
      asset: a.asset,
      net: round(net, 3),
      signal: conflicting && Math.abs(net) < 0.2 ? 'neutral' : signalFromEffect(net),
      conflicting: conflicting,
      sources: a.sources
    })
  }
  out.sort(function(x, y) { return Math.abs(y.net) - Math.abs(x.net) })
  return out
}
