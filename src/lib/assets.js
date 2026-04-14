export const ASSETS = {
  forex: [
    { id: 'EUR/USD', label: 'EUR/USD', flag: '🇪🇺🇺🇸', desc: 'Euro / US Dollar', category: 'Major' },
    { id: 'GBP/USD', label: 'GBP/USD', flag: '🇬🇧🇺🇸', desc: 'British Pound / US Dollar', category: 'Major' },
    { id: 'USD/JPY', label: 'USD/JPY', flag: '🇺🇸🇯🇵', desc: 'US Dollar / Japanese Yen', category: 'Major' },
    { id: 'AUD/USD', label: 'AUD/USD', flag: '🇦🇺🇺🇸', desc: 'Australian Dollar / US Dollar', category: 'Major' },
    { id: 'USD/CAD', label: 'USD/CAD', flag: '🇺🇸🇨🇦', desc: 'US Dollar / Canadian Dollar', category: 'Major' },
    { id: 'NZD/USD', label: 'NZD/USD', flag: '🇳🇿🇺🇸', desc: 'New Zealand Dollar / US Dollar', category: 'Major' },
    { id: 'USD/CHF', label: 'USD/CHF', flag: '🇺🇸🇨🇭', desc: 'US Dollar / Swiss Franc', category: 'Major' },
  ],
  metals: [
    { id: 'XAU/USD', label: 'Gold', flag: '⬡', desc: 'Gold Spot / US Dollar', category: 'Precious' },
    { id: 'XAG/USD', label: 'Silver', flag: '◈', desc: 'Silver Spot / US Dollar', category: 'Precious' },
    { id: 'WTI Oil', label: 'WTI Crude', flag: '◉', desc: 'WTI Crude Oil', category: 'Energy' },
    { id: 'Brent', label: 'Brent', flag: '◉', desc: 'Brent Crude Oil', category: 'Energy' },
    { id: 'XPT/USD', label: 'Platinum', flag: '⬡', desc: 'Platinum / US Dollar', category: 'Precious' },
  ],
  crypto: [
    { id: 'BTC/USD', label: 'Bitcoin', flag: '₿', desc: 'Bitcoin / US Dollar', category: 'L1' },
    { id: 'ETH/USD', label: 'Ethereum', flag: 'Ξ', desc: 'Ethereum / US Dollar', category: 'L1' },
    { id: 'SOL/USD', label: 'Solana', flag: '◎', desc: 'Solana / US Dollar', category: 'L1' },
    { id: 'XRP/USD', label: 'XRP', flag: '✕', desc: 'XRP / US Dollar', category: 'Alt' },
    { id: 'ADA/USD', label: 'Cardano', flag: '₳', desc: 'Cardano / US Dollar', category: 'Alt' },
  ]
}

export const ALL_ASSET_IDS = [
  ...ASSETS.forex.map(a => a.id),
  ...ASSETS.metals.map(a => a.id),
  ...ASSETS.crypto.map(a => a.id)
]

export const SIGNAL_CONFIG = {
  strong_buy:  { label: 'Strong Buy',  short: 'STR BUY',  color: '#00e676', bg: 'rgba(0,230,118,0.12)',  bar: '#00e676', rank: 5 },
  buy:         { label: 'Buy',         short: 'BUY',      color: '#69ff9a', bg: 'rgba(105,255,154,0.10)', bar: '#69ff9a', rank: 4 },
  neutral:     { label: 'Neutral',     short: 'NEUTRAL',  color: '#8a9bb0', bg: 'rgba(138,155,176,0.10)', bar: '#8a9bb0', rank: 3 },
  sell:        { label: 'Sell',        short: 'SELL',     color: '#ff8a80', bg: 'rgba(255,138,128,0.10)', bar: '#ff8a80', rank: 2 },
  strong_sell: { label: 'Strong Sell', short: 'STR SELL', color: '#ff3d57', bg: 'rgba(255,61,87,0.12)',  bar: '#ff3d57', rank: 1 },
}

export const CONFIDENCE_CONFIG = {
  high:   { label: 'High', color: '#00e676' },
  medium: { label: 'Med',  color: '#ffab00' },
  low:    { label: 'Low',  color: '#ff3d57' },
}

export function getAssetById(id) {
  for (const cat of Object.values(ASSETS)) {
    const found = cat.find(a => a.id === id)
    if (found) return found
  }
  return null
}
