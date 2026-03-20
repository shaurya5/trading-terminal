import { StockQuote, CandleData, NewsItem, MarketIndex, SectorPerformance } from '@/types';

export const MOCK_STOCKS: StockQuote[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 178.72, change: 2.34, changePercent: 1.33, high: 179.50, low: 175.80, open: 176.15, prevClose: 176.38, volume: 58_234_100, marketCap: 2.78e12, pe: 28.5, week52High: 199.62, week52Low: 143.90, sector: 'Technology' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', price: 378.91, change: -1.23, changePercent: -0.32, high: 381.20, low: 377.00, open: 380.50, prevClose: 380.14, volume: 22_456_300, marketCap: 2.81e12, pe: 35.2, week52High: 420.82, week52Low: 309.45, sector: 'Technology' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 141.80, change: 0.95, changePercent: 0.67, high: 142.50, low: 140.10, open: 141.00, prevClose: 140.85, volume: 25_678_900, marketCap: 1.77e12, pe: 25.8, week52High: 153.78, week52Low: 115.83, sector: 'Technology' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 178.25, change: 3.12, changePercent: 1.78, high: 179.00, low: 174.80, open: 175.50, prevClose: 175.13, volume: 45_123_400, marketCap: 1.85e12, pe: 62.3, week52High: 189.77, week52Low: 118.35, sector: 'Consumer Cyclical' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 875.28, change: 15.67, changePercent: 1.82, high: 880.00, low: 858.50, open: 860.00, prevClose: 859.61, volume: 42_567_800, marketCap: 2.16e12, pe: 72.1, week52High: 974.00, week52Low: 392.30, sector: 'Technology' },
  { symbol: 'META', name: 'Meta Platforms', price: 505.75, change: -3.45, changePercent: -0.68, high: 510.20, low: 503.00, open: 509.00, prevClose: 509.20, volume: 18_345_600, marketCap: 1.30e12, pe: 33.7, week52High: 542.81, week52Low: 274.38, sector: 'Technology' },
  { symbol: 'TSLA', name: 'Tesla Inc.', price: 238.45, change: -5.82, changePercent: -2.38, high: 245.00, low: 237.10, open: 244.00, prevClose: 244.27, volume: 98_765_400, marketCap: 758e9, pe: 58.9, week52High: 299.29, week52Low: 152.37, sector: 'Consumer Cyclical' },
  { symbol: 'JPM', name: 'JPMorgan Chase', price: 195.30, change: 1.45, changePercent: 0.75, high: 196.00, low: 193.50, open: 194.00, prevClose: 193.85, volume: 12_345_600, marketCap: 564e9, pe: 11.8, week52High: 200.94, week52Low: 143.64, sector: 'Financial Services' },
  { symbol: 'V', name: 'Visa Inc.', price: 279.85, change: 0.72, changePercent: 0.26, high: 281.00, low: 278.50, open: 279.50, prevClose: 279.13, volume: 7_890_100, marketCap: 574e9, pe: 31.2, week52High: 290.96, week52Low: 227.77, sector: 'Financial Services' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', price: 156.78, change: -0.34, changePercent: -0.22, high: 157.50, low: 155.90, open: 157.10, prevClose: 157.12, volume: 6_543_200, marketCap: 378e9, pe: 20.1, week52High: 168.85, week52Low: 143.13, sector: 'Healthcare' },
  { symbol: 'WMT', name: 'Walmart Inc.', price: 165.23, change: 0.89, changePercent: 0.54, high: 166.00, low: 164.10, open: 164.50, prevClose: 164.34, volume: 8_234_500, marketCap: 445e9, pe: 27.8, week52High: 170.00, week52Low: 145.62, sector: 'Consumer Defensive' },
  { symbol: 'XOM', name: 'Exxon Mobil', price: 104.56, change: 1.23, changePercent: 1.19, high: 105.20, low: 103.00, open: 103.50, prevClose: 103.33, volume: 15_678_300, marketCap: 434e9, pe: 12.5, week52High: 120.70, week52Low: 95.77, sector: 'Energy' },
  { symbol: 'UNH', name: 'UnitedHealth Group', price: 527.40, change: 4.56, changePercent: 0.87, high: 530.00, low: 522.00, open: 523.00, prevClose: 522.84, volume: 3_456_700, marketCap: 487e9, pe: 22.6, week52High: 554.70, week52Low: 436.38, sector: 'Healthcare' },
  { symbol: 'HD', name: 'Home Depot', price: 345.12, change: -2.15, changePercent: -0.62, high: 348.00, low: 344.00, open: 347.50, prevClose: 347.27, volume: 4_567_800, marketCap: 343e9, pe: 23.4, week52High: 396.87, week52Low: 274.26, sector: 'Consumer Cyclical' },
  { symbol: 'BAC', name: 'Bank of America', price: 34.56, change: 0.23, changePercent: 0.67, high: 34.80, low: 34.20, open: 34.40, prevClose: 34.33, volume: 35_678_900, marketCap: 274e9, pe: 10.2, week52High: 37.56, week52Low: 26.67, sector: 'Financial Services' },
  { symbol: 'DIS', name: 'Walt Disney Co.', price: 112.34, change: -1.56, changePercent: -1.37, high: 114.50, low: 111.80, open: 114.00, prevClose: 113.90, volume: 11_234_500, marketCap: 205e9, pe: 68.5, week52High: 123.74, week52Low: 78.73, sector: 'Communication Services' },
];

export const MOCK_INDICES: MarketIndex[] = [
  { symbol: 'SPX', name: 'S&P 500', value: 5021.84, change: 21.37, changePercent: 0.43 },
  { symbol: 'DJI', name: 'Dow Jones', value: 38996.39, change: 134.21, changePercent: 0.35 },
  { symbol: 'IXIC', name: 'NASDAQ', value: 15927.90, change: 78.81, changePercent: 0.50 },
  { symbol: 'RUT', name: 'Russell 2000', value: 2045.62, change: -5.31, changePercent: -0.26 },
  { symbol: 'VIX', name: 'CBOE VIX', value: 14.23, change: -0.45, changePercent: -3.07 },
];

export const MOCK_SECTORS: SectorPerformance[] = [
  { name: 'Technology', performance: 1.45, stocks: ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'META'] },
  { name: 'Healthcare', performance: 0.67, stocks: ['JNJ', 'UNH'] },
  { name: 'Financial Services', performance: 0.52, stocks: ['JPM', 'V', 'BAC'] },
  { name: 'Consumer Cyclical', performance: -0.42, stocks: ['AMZN', 'TSLA', 'HD'] },
  { name: 'Energy', performance: 1.19, stocks: ['XOM'] },
  { name: 'Consumer Defensive', performance: 0.54, stocks: ['WMT'] },
  { name: 'Communication Services', performance: -1.37, stocks: ['DIS'] },
];

function generateCandles(basePrice: number, days: number): CandleData[] {
  const candles: CandleData[] = [];
  let price = basePrice * 0.85;
  const now = new Date();

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const volatility = price * 0.02;
    const open = price + (Math.random() - 0.48) * volatility;
    const close = open + (Math.random() - 0.47) * volatility;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;

    candles.push({
      time: date.toISOString().split('T')[0],
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +close.toFixed(2),
      volume: Math.floor(Math.random() * 50_000_000 + 10_000_000),
    });
    price = close;
  }
  return candles;
}

const candleCache: Record<string, CandleData[]> = {};

export function getMockCandles(symbol: string): CandleData[] {
  if (!candleCache[symbol]) {
    const stock = MOCK_STOCKS.find(s => s.symbol === symbol);
    candleCache[symbol] = generateCandles(stock?.price ?? 150, 365);
  }
  return candleCache[symbol];
}

export function getMockNews(symbol: string): NewsItem[] {
  const stock = MOCK_STOCKS.find(s => s.symbol === symbol);
  const name = stock?.name ?? symbol;
  const sources = ['Reuters', 'Bloomberg', 'CNBC', 'WSJ', 'MarketWatch', 'Financial Times', 'Barron\'s'];
  const now = Date.now();

  const templates = [
    { headline: `${name} Reports Strong Q4 Earnings, Beats Estimates`, sentiment: 'positive' as const },
    { headline: `${name} Announces $10B Stock Buyback Program`, sentiment: 'positive' as const },
    { headline: `Analysts Upgrade ${symbol} to Overweight on Growth Prospects`, sentiment: 'positive' as const },
    { headline: `${name} Faces Regulatory Scrutiny Over Market Practices`, sentiment: 'negative' as const },
    { headline: `${symbol} Shares Drop After Disappointing Revenue Guidance`, sentiment: 'negative' as const },
    { headline: `${name} CEO Discusses AI Strategy at Industry Conference`, sentiment: 'neutral' as const },
    { headline: `${name} Expands Partnership with Major Cloud Provider`, sentiment: 'positive' as const },
    { headline: `Wall Street Mixed on ${symbol} After Latest Product Launch`, sentiment: 'neutral' as const },
    { headline: `${name} Supply Chain Concerns Weigh on Stock Price`, sentiment: 'negative' as const },
    { headline: `Institutional Investors Increase ${symbol} Holdings in Q3`, sentiment: 'positive' as const },
    { headline: `${name} Sets New Revenue Record in International Markets`, sentiment: 'positive' as const },
    { headline: `${symbol} Options Activity Surges Ahead of Earnings Report`, sentiment: 'neutral' as const },
  ];

  return templates.map((t, i) => ({
    id: `${symbol}-${i}`,
    headline: t.headline,
    summary: `Detailed analysis and market implications for ${name} (${symbol}). Market participants are closely watching developments as the stock trades near key technical levels.`,
    source: sources[i % sources.length],
    datetime: now - i * 3_600_000 * (1 + Math.random() * 3),
    url: '#',
    sentiment: t.sentiment,
  }));
}

export function simulatePriceUpdate(stock: StockQuote): StockQuote {
  const volatility = stock.price * 0.001;
  const delta = (Math.random() - 0.5) * volatility;
  const newPrice = +(stock.price + delta).toFixed(2);
  const change = +(newPrice - stock.prevClose).toFixed(2);
  const changePercent = +((change / stock.prevClose) * 100).toFixed(2);

  return {
    ...stock,
    price: newPrice,
    change,
    changePercent,
    high: Math.max(stock.high, newPrice),
    low: Math.min(stock.low, newPrice),
  };
}
