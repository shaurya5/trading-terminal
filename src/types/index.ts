export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
  volume: number;
  marketCap: number;
  pe: number;
  week52High: number;
  week52Low: number;
  sector: string;
}

export interface CandleData {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface WatchlistItem {
  symbol: string;
  addedAt: number;
}

export interface NamedWatchlist {
  id: string;
  name: string;
  symbols: string[];
}

export interface ChartWindow {
  id: string;
  symbol: string;
  compareSymbols: string[];
}

export interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  datetime: number;
  url: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  thumbnail?: string;
  relatedTickers?: string[];
  type?: 'news' | 'insight' | 'market';
}

export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: 'above' | 'below';
  active: boolean;
  createdAt: number;
}

export interface ToastItem {
  id: string;
  symbol: string;
  condition: 'above' | 'below';
  targetPrice: number;
  currentPrice: number;
  timestamp: number;
}

export type IndicatorType = 'SMA' | 'EMA' | 'RSI' | 'MACD' | 'BOLLINGER' | 'STOCHASTIC' | 'ATR' | 'VWAP' | 'WILLIAMS_R' | 'OBV';

export type IndicatorPanel = 'overlay' | 'subchart';

export interface IndicatorConfig {
  id: string;
  type: IndicatorType;
  period: number;
  enabled: boolean;
  color: string;
  params?: Record<string, number>; // extra params (e.g., MACD fast/slow/signal, Bollinger stdDev)
}

export interface IndicatorCatalogEntry {
  type: IndicatorType;
  label: string;
  defaultPeriod: number;
  defaultColor: string;
  panel: IndicatorPanel;
  description: string;
  defaultParams?: Record<string, number>;
}

export interface MarketIndex {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
}

export interface SectorPerformance {
  name: string;
  performance: number;
  stocks: string[];
}
