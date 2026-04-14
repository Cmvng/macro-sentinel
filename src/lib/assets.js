export var ASSETS = {
  forex: [
    { id: 'EUR/USD', label: 'EUR/USD', flag: 'EU', desc: 'Euro / US Dollar', category: 'Major' },
    { id: 'GBP/USD', label: 'GBP/USD', flag: 'GB', desc: 'British Pound / US Dollar', category: 'Major' },
    { id: 'USD/JPY', label: 'USD/JPY', flag: 'JP', desc: 'US Dollar / Japanese Yen', category: 'Major' },
    { id: 'USD/CHF', label: 'USD/CHF', flag: 'CH', desc: 'US Dollar / Swiss Franc', category: 'Major' },
    { id: 'AUD/USD', label: 'AUD/USD', flag: 'AU', desc: 'Australian Dollar / US Dollar', category: 'Major' },
    { id: 'USD/CAD', label: 'USD/CAD', flag: 'CA', desc: 'US Dollar / Canadian Dollar', category: 'Major' },
    { id: 'NZD/USD', label: 'NZD/USD', flag: 'NZ', desc: 'New Zealand Dollar / US Dollar', category: 'Major' },
    { id: 'EUR/GBP', label: 'EUR/GBP', flag: 'EG', desc: 'Euro / British Pound', category: 'Minor' },
    { id: 'EUR/JPY', label: 'EUR/JPY', flag: 'EJ', desc: 'Euro / Japanese Yen', category: 'Minor' },
    { id: 'EUR/CHF', label: 'EUR/CHF', flag: 'EC', desc: 'Euro / Swiss Franc', category: 'Minor' },
    { id: 'EUR/AUD', label: 'EUR/AUD', flag: 'EA', desc: 'Euro / Australian Dollar', category: 'Minor' },
    { id: 'EUR/CAD', label: 'EUR/CAD', flag: 'EN', desc: 'Euro / Canadian Dollar', category: 'Minor' },
    { id: 'EUR/NZD', label: 'EUR/NZD', flag: 'EZ', desc: 'Euro / New Zealand Dollar', category: 'Minor' },
    { id: 'GBP/JPY', label: 'GBP/JPY', flag: 'GJ', desc: 'British Pound / Japanese Yen', category: 'Minor' },
    { id: 'GBP/CHF', label: 'GBP/CHF', flag: 'GC', desc: 'British Pound / Swiss Franc', category: 'Minor' },
    { id: 'GBP/AUD', label: 'GBP/AUD', flag: 'GA', desc: 'British Pound / Australian Dollar', category: 'Minor' },
    { id: 'GBP/CAD', label: 'GBP/CAD', flag: 'GN', desc: 'British Pound / Canadian Dollar', category: 'Minor' },
    { id: 'GBP/NZD', label: 'GBP/NZD', flag: 'GZ', desc: 'British Pound / New Zealand Dollar', category: 'Minor' },
    { id: 'AUD/JPY', label: 'AUD/JPY', flag: 'AJ', desc: 'Australian Dollar / Japanese Yen', category: 'Minor' },
    { id: 'AUD/CHF', label: 'AUD/CHF', flag: 'AC', desc: 'Australian Dollar / Swiss Franc', category: 'Minor' },
    { id: 'AUD/CAD', label: 'AUD/CAD', flag: 'AN', desc: 'Australian Dollar / Canadian Dollar', category: 'Minor' },
    { id: 'AUD/NZD', label: 'AUD/NZD', flag: 'AZ', desc: 'Australian Dollar / New Zealand Dollar', category: 'Minor' },
    { id: 'NZD/JPY', label: 'NZD/JPY', flag: 'NJ', desc: 'New Zealand Dollar / Japanese Yen', category: 'Minor' },
    { id: 'NZD/CHF', label: 'NZD/CHF', flag: 'NC', desc: 'New Zealand Dollar / Swiss Franc', category: 'Minor' },
    { id: 'NZD/CAD', label: 'NZD/CAD', flag: 'NN', desc: 'New Zealand Dollar / Canadian Dollar', category: 'Minor' },
    { id: 'CAD/JPY', label: 'CAD/JPY', flag: 'CJ', desc: 'Canadian Dollar / Japanese Yen', category: 'Minor' },
    { id: 'CAD/CHF', label: 'CAD/CHF', flag: 'CC', desc: 'Canadian Dollar / Swiss Franc', category: 'Minor' },
    { id: 'CHF/JPY', label: 'CHF/JPY', flag: 'HJ', desc: 'Swiss Franc / Japanese Yen', category: 'Minor' },
  ],
  metals: [
    { id: 'XAU/USD', label: 'Gold', flag: 'AU', desc: 'Gold Spot / US Dollar', category: 'Precious' },
    { id: 'XAG/USD', label: 'Silver', flag: 'AG', desc: 'Silver Spot / US Dollar', category: 'Precious' },
    { id: 'XPT/USD', label: 'Platinum', flag: 'PT', desc: 'Platinum / US Dollar', category: 'Precious' },
    { id: 'WTI Oil', label: 'WTI Crude', flag: 'OL', desc: 'WTI Crude Oil', category: 'Energy' },
    { id: 'Brent', label: 'Brent', flag: 'BR', desc: 'Brent Crude Oil', category: 'Energy' },
    { id: 'Nat Gas', label: 'Nat Gas', flag: 'GS', desc: 'Natural Gas', category: 'Energy' },
    { id: 'Copper', label: 'Copper', flag: 'CU', desc: 'Copper Futures', category: 'Base' },
  ],
  crypto: [
    { id: 'BTC/USD', label: 'Bitcoin', flag: 'BT', desc: 'Bitcoin / US Dollar', category: 'L1' },
    { id: 'ETH/USD', label: 'Ethereum', flag: 'ET', desc: 'Ethereum / US Dollar', category: 'L1' },
    { id: 'BNB/USD', label: 'BNB', flag: 'BN', desc: 'BNB / US Dollar', category: 'L1' },
    { id: 'SOL/USD', label: 'Solana', flag: 'SO', desc: 'Solana / US Dollar', category: 'L1' },
    { id: 'XRP/USD', label: 'XRP', flag: 'XR', desc: 'XRP / US Dollar', category: 'Alt' },
    { id: 'DOGE/USD', label: 'Dogecoin', flag: 'DG', desc: 'Dogecoin / US Dollar', category: 'Meme' },
    { id: 'ADA/USD', label: 'Cardano', flag: 'AD', desc: 'Cardano / US Dollar', category: 'Alt' },
    { id: 'AVAX/USD', label: 'Avalanche', flag: 'AV', desc: 'Avalanche / US Dollar', category: 'L1' },
    { id: 'LINK/USD', label: 'Chainlink', flag: 'LK', desc: 'Chainlink / US Dollar', category: 'DeFi' },
    { id: 'DOT/USD', label: 'Polkadot', flag: 'DT', desc: 'Polkadot / US Dollar', category: 'L0' },
    { id: 'MATIC/USD', label: 'Polygon', flag: 'MG', desc: 'Polygon / US Dollar', category: 'L2' },
    { id: 'UNI/USD', label: 'Uniswap', flag: 'UN', desc: 'Uniswap / US Dollar', category: 'DeFi' },
  ]
}

export var FOREX_IDS = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD',
  'EUR/GBP', 'EUR/JPY', 'EUR/CHF', 'EUR/AUD', 'EUR/CAD', 'EUR/NZD',
  'GBP/JPY', 'GBP/CHF', 'GBP/AUD', 'GBP/CAD', 'GBP/NZD',
  'AUD/JPY', 'AUD/CHF', 'AUD/CAD', 'AUD/NZD',
  'NZD/JPY', 'NZD/CHF', 'NZD/CAD',
  'CAD/JPY', 'CAD/CHF', 'CHF/JPY'
]

export var METALS_IDS = ['XAU/USD', 'XAG/USD', 'XPT/USD', 'WTI Oil', 'Brent', 'Nat Gas', 'Copper']

export var CRYPTO_IDS = [
  'BTC/USD', 'ETH/USD', 'BNB/USD', 'SOL/USD', 'XRP/USD',
  'DOGE/USD', 'ADA/USD', 'AVAX/USD', 'LINK/USD', 'DOT/USD',
  'MATIC/USD', 'UNI/USD'
]

export var ALL_ASSET_IDS = FOREX_IDS.concat(METALS_IDS).concat(CRYPTO_IDS)

export var SIGNAL_CONFIG = {
  strong_buy:  { label: 'Strong Buy',  short: 'STR BUY',  color: '#00875a', bg: 'rgba(0,135,90,0.12)',  bar: '#00875a', rank: 5 },
  buy:         { label: 'Buy',         short: 'BUY',      color: '#00a86b', bg: 'rgba(0,168,107,0.10)', bar: '#00a86b', rank: 4 },
  neutral:     { label: 'Neutral',     short: 'NEUTRAL',  color: '#7a9a7a', bg: 'rgba(122,154,122,0.10)', bar: '#7a9a7a', rank: 3 },
  sell:        { label: 'Sell',        short: 'SELL',     color: '#e65100', bg: 'rgba(230,81,0,0.10)',  bar: '#e65100', rank: 2 },
  strong_sell: { label: 'Strong Sell', short: 'STR SELL', color: '#d32f2f', bg: 'rgba(211,47,47,0.12)', bar: '#d32f2f', rank: 1 },
}

export var CONFIDENCE_CONFIG = {
  high:   { label: 'High', color: '#00875a' },
  medium: { label: 'Med',  color: '#e65100' },
  low:    { label: 'Low',  color: '#d32f2f' },
}

export function getAssetById(id) {
  var cats = Object.values(ASSETS)
  for (var i = 0; i < cats.length; i++) {
    for (var j = 0; j < cats[i].length; j++) {
      if (cats[i][j].id === id) return cats[i][j]
    }
  }
  return null
}
