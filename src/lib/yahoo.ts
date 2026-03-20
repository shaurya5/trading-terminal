import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export const DEFAULT_SYMBOLS = [
  'RELIANCE.NS',
  'TCS.NS',
  'INFY.NS',
  'HDFCBANK.NS',
  'ICICIBANK.NS',
  'BHARTIARTL.NS',
  'ITC.NS',
  'SBIN.NS',
  'HINDUNILVR.NS',
  'BAJFINANCE.NS',
  'KOTAKBANK.NS',
  'LT.NS',
  'HCLTECH.NS',
  'AXISBANK.NS',
  'WIPRO.NS',
  'MARUTI.NS',
];

export const INDEX_SYMBOLS = [
  { symbol: '^NSEI', name: 'NIFTY 50' },
  { symbol: '^BSESN', name: 'SENSEX' },
  { symbol: '^NSEBANK', name: 'BANK NIFTY' },
  { symbol: '^CNXIT', name: 'NIFTY IT' },
];

export { yahooFinance };
