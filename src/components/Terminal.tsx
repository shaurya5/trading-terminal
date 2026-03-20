'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { IndicatorConfig, PriceAlert, ChartWindow, NamedWatchlist, ToastItem, SectorPerformance } from '@/types';
import { useQuotes, useIndices, useCandles, useNews } from '@/hooks/useStockData';
import { useCompareData } from '@/hooks/useCompareData';
import { safeParseJSON, safeGetString } from '@/lib/storage';
import Header from './Header';
import Watchlist from './Watchlist';
import Chart from './Chart';
import ChartControls from './ChartControls';
import StockDetails from './StockDetails';
import NewsFeed from './NewsFeed';
import MarketOverview from './MarketOverview';
import AlertsPanel from './AlertsPanel';
import StockSearch from './StockSearch';
import UserWatchlist from './UserWatchlist';
import ComparePanel from './ComparePanel';
import MultiChart from './MultiChart';
import ToastStack from './Toast';
import ErrorBoundary from './ErrorBoundary';

const SECTOR_MAP: Record<string, string[]> = {
  'IT': ['TCS.NS', 'INFY.NS', 'HCLTECH.NS', 'WIPRO.NS'],
  'Banking': ['HDFCBANK.NS', 'ICICIBANK.NS', 'SBIN.NS', 'AXISBANK.NS', 'KOTAKBANK.NS', 'BAJFINANCE.NS'],
  'Oil & Gas': ['RELIANCE.NS'],
  'Telecom': ['BHARTIARTL.NS'],
  'FMCG': ['ITC.NS', 'HINDUNILVR.NS'],
  'Auto': ['MARUTI.NS'],
  'Infrastructure': ['LT.NS'],
};

const DEFAULT_INDICATORS: IndicatorConfig[] = [
  { type: 'SMA', period: 20, enabled: false, color: '#FFD700' },
  { type: 'EMA', period: 12, enabled: false, color: '#00BFFF' },
  { type: 'RSI', period: 14, enabled: false, color: '#AB47BC' },
  { type: 'MACD', period: 12, enabled: false, color: '#2196F3' },
  { type: 'BOLLINGER', period: 20, enabled: false, color: '#2196F3' },
];

function displaySymbol(s: string) {
  return s.replace('.NS', '').replace('.BO', '');
}

export default function Terminal() {
  const [disclaimerDismissed, setDisclaimerDismissed] = useState(() => {
    return safeGetString('trading-disclaimer-dismissed', '') === 'true';
  });

  const dismissDisclaimer = useCallback(() => {
    setDisclaimerDismissed(true);
    try {
      localStorage.setItem('trading-disclaimer-dismissed', 'true');
    } catch {
      // localStorage unavailable
    }
  }, []);

  const [selectedSymbol, setSelectedSymbol] = useState(() => {
    return safeGetString('trading-selected-symbol', 'RELIANCE.NS');
  });
  const [activeView, setActiveView] = useState(() => {
    return safeGetString('trading-active-view', 'terminal');
  });
  const [searchOpen, setSearchOpen] = useState(false);
  const [indicators, setIndicators] = useState<IndicatorConfig[]>(() => {
    const parsed = safeParseJSON<IndicatorConfig[] | null>('trading-indicators', null);
    if (parsed) {
      return DEFAULT_INDICATORS.map(d => {
        const match = parsed.find(p => p.type === d.type);
        return match ? { ...d, enabled: match.enabled } : d;
      });
    }
    return DEFAULT_INDICATORS;
  });
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => {
    return safeParseJSON<PriceAlert[]>('trading-alerts', []);
  });
  const [rightPanel, setRightPanel] = useState<'details' | 'news' | 'watchlist'>('details');
  const [chartRange, setChartRange] = useState(() => {
    return safeGetString('trading-chart-range', '1y');
  });
  const [measureMode, setMeasureMode] = useState(false);

  // Responsive sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [mobileWarningDismissed, setMobileWarningDismissed] = useState(false);

  // Auto-collapse sidebar on small screens
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 1024px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setSidebarCollapsed(e.matches);
      if (e.matches) setRightPanelOpen(false);
      else setRightPanelOpen(true);
    };
    handler(mql);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  const toggleRightPanel = useCallback(() => {
    setRightPanelOpen(prev => !prev);
  }, []);

  // Multi-window
  const [chartWindows, setChartWindows] = useState<ChartWindow[]>([
    { id: 'main', symbol: 'RELIANCE.NS', compareSymbols: [] },
  ]);

  // Comparison
  const [compareSymbols, setCompareSymbols] = useState<string[]>([]);

  // Multiple named watchlists
  const [watchlists, setWatchlists] = useState<NamedWatchlist[]>(() => {
    const defaultWatchlist = [{ id: crypto.randomUUID(), name: 'My Watchlist', symbols: [] as string[] }];
    const saved = safeParseJSON<NamedWatchlist[] | null>('trading-watchlists', null);
    if (saved) return saved;
    // Migrate from old single watchlist
    const legacy = safeParseJSON<string[] | null>('trading-watchlist', null);
    if (legacy && legacy.length > 0) {
      return [{ id: crypto.randomUUID(), name: 'My Watchlist', symbols: legacy }];
    }
    return defaultWatchlist;
  });
  const [activeWatchlistId, setActiveWatchlistId] = useState<string>(() => {
    return safeGetString('trading-active-watchlist', '');
  });

  const { quotes: stocks, loading: stocksLoading, error: stocksError } = useQuotes();
  const indices = useIndices();
  const { candles: candleData, loading: candlesLoading } = useCandles(selectedSymbol, chartRange);
  const { news: newsData, loading: newsLoading } = useNews(selectedSymbol);
  const compareDataState = useCompareData(compareSymbols, chartRange);

  // Toast notification state
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const triggeredAlertIdsRef = useRef<Set<string>>(new Set());
  const notificationPermissionRequested = useRef(false);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Auto-dismiss toasts after 10 seconds
  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map(toast => {
      const age = Date.now() - toast.timestamp;
      const remaining = Math.max(10000 - age, 0);
      return setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id));
      }, remaining);
    });
    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  // Check alerts against current stock prices
  useEffect(() => {
    if (stocks.length === 0 || alerts.length === 0) return;

    const activeAlerts = alerts.filter(a => a.active);
    const newToasts: ToastItem[] = [];

    for (const alert of activeAlerts) {
      if (triggeredAlertIdsRef.current.has(alert.id)) continue;

      const stock = stocks.find(s => s.symbol === alert.symbol);
      if (!stock) continue;

      const triggered =
        (alert.condition === 'above' && stock.price >= alert.targetPrice) ||
        (alert.condition === 'below' && stock.price <= alert.targetPrice);

      if (triggered) {
        triggeredAlertIdsRef.current.add(alert.id);

        const toastItem: ToastItem = {
          id: `toast-${alert.id}-${Date.now()}`,
          symbol: alert.symbol,
          condition: alert.condition,
          targetPrice: alert.targetPrice,
          currentPrice: stock.price,
          timestamp: Date.now(),
        };
        newToasts.push(toastItem);

        // Send browser notification alongside toast
        try {
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            const sym = alert.symbol.replace('.NS', '').replace('.BO', '');
            new Notification(`Price Alert: ${sym}`, {
              body: `${sym} is ${alert.condition} \u20B9${alert.targetPrice.toFixed(2)} (now \u20B9${stock.price.toFixed(2)})`,
              icon: '/favicon.ico',
            });
          }
        } catch {
          // Non-blocking: browser notification failed
        }
      }
    }

    if (newToasts.length > 0) {
      setToasts(prev => {
        const combined = [...prev, ...newToasts];
        // Max 5 toasts: oldest removed first
        return combined.slice(-5);
      });
    }
  }, [stocks, alerts]);

  // Clean up triggered IDs when an alert is removed or deactivated
  useEffect(() => {
    const activeIds = new Set(alerts.filter(a => a.active).map(a => a.id));
    for (const id of triggeredAlertIdsRef.current) {
      if (!activeIds.has(id)) {
        triggeredAlertIdsRef.current.delete(id);
      }
    }
  }, [alerts]);

  const selectedStock = stocks.find(s => s.symbol === selectedSymbol) ?? stocks[0];

  // Compute sector performance from hardcoded mapping
  const sectors: SectorPerformance[] = useMemo(() => {
    if (stocks.length === 0) return [];
    const stockMap = new Map(stocks.map(s => [s.symbol, s]));
    return Object.entries(SECTOR_MAP).map(([name, symbols]) => {
      const matched = symbols.filter(sym => stockMap.has(sym));
      const avgPerformance = matched.length > 0
        ? matched.reduce((sum, sym) => sum + (stockMap.get(sym)!.changePercent), 0) / matched.length
        : 0;
      return { name, performance: avgPerformance, stocks: symbols };
    });
  }, [stocks]);

  // Resolve active watchlist (default to first)
  const resolvedActiveId = watchlists.find(w => w.id === activeWatchlistId)?.id ?? watchlists[0]?.id ?? '';

  // Persist watchlists
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('trading-watchlists', JSON.stringify(watchlists));
    }
  }, [watchlists]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('trading-active-watchlist', resolvedActiveId);
    }
  }, [resolvedActiveId]);

  // Persist alerts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('trading-alerts', JSON.stringify(alerts));
    }
  }, [alerts]);

  // Persist user preferences
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('trading-selected-symbol', selectedSymbol);
    }
  }, [selectedSymbol]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('trading-active-view', activeView);
    }
  }, [activeView]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('trading-chart-range', chartRange);
    }
  }, [chartRange]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('trading-indicators', JSON.stringify(indicators));
    }
  }, [indicators]);

  // Sync main window symbol (derived in handler instead of effect)
  const handleSelectSymbol = useCallback((s: string) => {
    setSelectedSymbol(s);
    setChartWindows(prev => prev.map(w => w.id === 'main' ? { ...w, symbol: s } : w));
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (searchOpen) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === '/') { e.preventDefault(); setSearchOpen(true); }
      if (e.key === '1') setActiveView('terminal');
      if (e.key === '2') setActiveView('markets');
      if (e.key === '3') setActiveView('alerts');
      if (e.key === '4') setActiveView('multi');
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [searchOpen]);

  const toggleIndicator = useCallback((type: IndicatorConfig['type']) => {
    setIndicators(prev => prev.map(i => (i.type === type ? { ...i, enabled: !i.enabled } : i)));
  }, []);

  const toggleMeasure = useCallback(() => {
    setMeasureMode(prev => !prev);
  }, []);

  const addAlert = useCallback((alert: Omit<PriceAlert, 'id' | 'createdAt'>) => {
    // Request browser notification permission on first alert creation
    if (!notificationPermissionRequested.current) {
      notificationPermissionRequested.current = true;
      try {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
      } catch {
        // Non-blocking
      }
    }
    setAlerts(prev => [...prev, { ...alert, id: crypto.randomUUID(), createdAt: Date.now() }]);
  }, []);
  const removeAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);
  const toggleAlert = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => (a.id === id ? { ...a, active: !a.active } : a)));
  }, []);

  const addChartWindow = useCallback(() => {
    if (chartWindows.length >= 6) return;
    setChartWindows(prev => [...prev, { id: crypto.randomUUID(), symbol: selectedSymbol, compareSymbols: [] }]);
  }, [chartWindows.length, selectedSymbol]);

  const removeChartWindow = useCallback((id: string) => {
    setChartWindows(prev => prev.length <= 1 ? prev : prev.filter(w => w.id !== id));
  }, []);

  const addWindowCompare = useCallback((windowId: string, symbol: string) => {
    setChartWindows(prev => prev.map(w => {
      if (w.id !== windowId) return w;
      if (w.compareSymbols.includes(symbol) || w.compareSymbols.length >= 2) return w;
      return { ...w, compareSymbols: [...w.compareSymbols, symbol] };
    }));
  }, []);

  const removeWindowCompare = useCallback((windowId: string, symbol: string) => {
    setChartWindows(prev => prev.map(w =>
      w.id === windowId ? { ...w, compareSymbols: w.compareSymbols.filter(s => s !== symbol) } : w
    ));
  }, []);

  const addToWatchlist = useCallback((symbol: string, watchlistId?: string) => {
    const targetId = watchlistId ?? resolvedActiveId;
    setWatchlists(prev => prev.map(w =>
      w.id === targetId && !w.symbols.includes(symbol)
        ? { ...w, symbols: [...w.symbols, symbol] }
        : w
    ));
  }, [resolvedActiveId]);

  const removeFromWatchlist = useCallback((symbol: string) => {
    setWatchlists(prev => prev.map(w =>
      w.id === resolvedActiveId
        ? { ...w, symbols: w.symbols.filter(s => s !== symbol) }
        : w
    ));
  }, [resolvedActiveId]);

  const createWatchlist = useCallback((name: string) => {
    const newList: NamedWatchlist = { id: crypto.randomUUID(), name, symbols: [] };
    setWatchlists(prev => [...prev, newList]);
    setActiveWatchlistId(newList.id);
  }, []);

  const renameWatchlist = useCallback((id: string, name: string) => {
    setWatchlists(prev => prev.map(w => w.id === id ? { ...w, name } : w));
  }, []);

  const deleteWatchlist = useCallback((id: string) => {
    setWatchlists(prev => {
      const filtered = prev.filter(w => w.id !== id);
      if (filtered.length === 0) {
        return [{ id: crypto.randomUUID(), name: 'My Watchlist', symbols: [] }];
      }
      return filtered;
    });
  }, []);

  const addCompare = useCallback((symbol: string) => {
    setCompareSymbols(prev => prev.includes(symbol) ? prev : [...prev, symbol].slice(0, 4));
  }, []);
  const removeCompare = useCallback((symbol: string) => {
    setCompareSymbols(prev => prev.filter(s => s !== symbol));
  }, []);

  if (stocksLoading && stocks.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0e17] text-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-sm text-gray-400">Loading market data...</div>
        </div>
      </div>
    );
  }

  if (stocksError && stocks.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0e17] text-white">
        <div className="text-center">
          <div className="text-red-400 text-sm mb-2">Failed to load market data</div>
          <div className="text-gray-500 text-xs">{stocksError}</div>
        </div>
      </div>
    );
  }

  const chartSection = (
    <div className="flex-1 flex flex-col min-w-0">
      <ChartControls indicators={indicators} onToggle={toggleIndicator} measureMode={measureMode} onToggleMeasure={toggleMeasure} />
      <ComparePanel compareSymbols={compareSymbols} onAdd={addCompare} onRemove={removeCompare} />
      <div className="flex items-center gap-0.5 px-3 py-1 border-b border-gray-800 bg-[#0d1117]">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider mr-2">Range</span>
        {[
          { value: '1d', label: '1 day range' },
          { value: '5d', label: '5 day range' },
          { value: '1mo', label: '1 month range' },
          { value: '6mo', label: '6 month range' },
          { value: '1y', label: '1 year range' },
          { value: '5y', label: '5 year range' },
        ].map(r => (
          <button
            key={r.value}
            onClick={() => setChartRange(r.value)}
            aria-label={r.label}
            aria-pressed={chartRange === r.value}
            className={`px-2 py-0.5 text-[11px] rounded font-mono transition-colors ${
              chartRange === r.value
                ? 'text-white border border-gray-600 bg-gray-800'
                : 'text-gray-500 border border-gray-800 hover:border-gray-700 hover:text-gray-400'
            }`}
          >
            {r.value.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="flex-1 relative">
        {candlesLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0e17]/80 z-10">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <ErrorBoundary fallbackTitle="Chart failed to render">
          <Chart data={candleData} symbol={displaySymbol(selectedSymbol)} indicators={indicators} compareData={compareDataState} measureMode={measureMode} />
        </ErrorBoundary>
      </div>
    </div>
  );

  const rightPanelContent = (
    <>
      <div className="flex border-b border-gray-800">
        {(['details', 'news', 'watchlist'] as const).map(p => (
          <button
            key={p}
            onClick={() => setRightPanel(p)}
            className={`flex-1 py-1.5 text-[10px] uppercase tracking-wider transition-colors ${
              rightPanel === p ? 'text-white bg-gray-800/50' : 'text-gray-600 hover:text-gray-400'
            }`}
          >
            {p === 'watchlist' ? `W/List${watchlists.reduce((n, w) => n + w.symbols.length, 0) > 0 ? ` (${watchlists.reduce((n, w) => n + w.symbols.length, 0)})` : ''}` : p}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {rightPanel === 'details' && selectedStock && <StockDetails stock={selectedStock} />}
        {rightPanel === 'news' && <NewsFeed news={newsData} symbol={displaySymbol(selectedSymbol)} loading={newsLoading} />}
        {rightPanel === 'watchlist' && (
          <UserWatchlist
            watchlists={watchlists}
            activeWatchlistId={resolvedActiveId}
            onSetActiveWatchlist={setActiveWatchlistId}
            allStocks={stocks}
            selectedSymbol={selectedSymbol}
            onSelect={handleSelectSymbol}
            onAdd={addToWatchlist}
            onRemove={removeFromWatchlist}
            onCreate={createWatchlist}
            onRename={renameWatchlist}
            onDelete={deleteWatchlist}
          />
        )}
      </div>
    </>
  );

  const rightPanelSection = (
    <>
      {/* Desktop: inline panel */}
      <div className="hidden lg:flex w-72 border-l border-gray-800 flex-shrink-0 flex-col">
        {rightPanelContent}
      </div>
      {/* Tablet/small: overlay panel */}
      {rightPanelOpen && (
        <div className="lg:hidden absolute right-0 top-0 bottom-0 w-72 bg-[#0a0e17] border-l border-gray-800 flex flex-col z-30">
          <button
            onClick={toggleRightPanel}
            aria-label="Close details panel"
            className="absolute top-1 right-1 z-40 p-1 text-gray-500 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {rightPanelContent}
        </div>
      )}
    </>
  );

  return (
    <ErrorBoundary fallbackTitle="Trading Terminal encountered an error">
    <div id="main-content" className="flex flex-col h-screen bg-[#0a0e17] text-white overflow-hidden">
      {/* Mobile warning for < 768px */}
      {!mobileWarningDismissed && (
        <div className="md:hidden fixed inset-0 z-50 bg-[#0a0e17] flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="w-3 h-3 rounded-full bg-orange-500 mx-auto mb-4" />
            <h2 className="text-lg text-white font-bold mb-2">Desktop Optimized</h2>
            <p className="text-sm text-gray-400 mb-6">
              This terminal is optimized for desktop. For the best experience, use a screen 768px or wider.
            </p>
            <button
              onClick={() => setMobileWarningDismissed(true)}
              className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-500 text-white rounded transition-colors"
            >
              Continue Anyway
            </button>
          </div>
        </div>
      )}
      {!disclaimerDismissed && (
        <div className="h-5 bg-[#0a0e17] border-b border-gray-800/50 flex items-center justify-center relative flex-shrink-0">
          <span className="text-[8px] text-gray-600 text-center">
            Data provided by Yahoo Finance. Prices may be delayed. For informational purposes only — not financial advice.
          </span>
          <button
            onClick={dismissDisclaimer}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-700 hover:text-gray-400 text-[10px] leading-none"
            aria-label="Dismiss disclaimer"
          >
            ×
          </button>
        </div>
      )}
      <Header
        onSearchOpen={() => setSearchOpen(true)}
        activeView={activeView}
        onViewChange={setActiveView}
        onToggleSidebar={toggleSidebar}
        sidebarCollapsed={sidebarCollapsed}
      />

      <StockSearch
        stocks={stocks}
        onSelect={handleSelectSymbol}
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />

      {activeView === 'terminal' && (
        <div className="flex flex-1 overflow-hidden relative">
          <div className={`border-r border-gray-800 flex-shrink-0 transition-all duration-200 ${sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-64'}`}>
            <Watchlist stocks={stocks} selectedSymbol={selectedSymbol} onSelect={handleSelectSymbol} onAddToWatchlist={addToWatchlist} watchlists={watchlists} />
          </div>
          {chartSection}
          {rightPanelSection}
          {/* Toggle buttons for collapsed panels on small screens */}
          {sidebarCollapsed && (
            <button
              onClick={toggleSidebar}
              aria-label="Show watchlist sidebar"
              className="lg:hidden absolute left-2 top-2 z-20 p-1.5 bg-gray-800 border border-gray-700 rounded text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          {!rightPanelOpen && (
            <button
              onClick={toggleRightPanel}
              aria-label="Show details panel"
              className="lg:hidden absolute right-2 top-2 z-20 p-1.5 bg-gray-800 border border-gray-700 rounded text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>
      )}

      {activeView === 'markets' && (
        <div className="flex flex-1 overflow-hidden relative">
          <div className={`border-r border-gray-800 transition-all duration-200 ${sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-80'}`}>
            <MarketOverview indices={indices} sectors={sectors} />
          </div>
          {chartSection}
          <div className="hidden lg:block w-64 border-l border-gray-800">
            <Watchlist stocks={[...stocks].sort((a, b) => b.changePercent - a.changePercent)} selectedSymbol={selectedSymbol} onSelect={handleSelectSymbol} onAddToWatchlist={addToWatchlist} watchlists={watchlists} />
          </div>
          {sidebarCollapsed && (
            <button
              onClick={toggleSidebar}
              aria-label="Show market overview sidebar"
              className="lg:hidden absolute left-2 top-2 z-20 p-1.5 bg-gray-800 border border-gray-700 rounded text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      )}

      {activeView === 'alerts' && (
        <div className="flex flex-1 overflow-hidden relative">
          <div className={`border-r border-gray-800 transition-all duration-200 ${sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-80'}`}>
            <AlertsPanel alerts={alerts} stocks={stocks} onAdd={addAlert} onRemove={removeAlert} onToggle={toggleAlert} />
          </div>
          {chartSection}
          <div className="hidden lg:block w-72 border-l border-gray-800">
            {selectedStock && <StockDetails stock={selectedStock} />}
          </div>
          {sidebarCollapsed && (
            <button
              onClick={toggleSidebar}
              aria-label="Show alerts sidebar"
              className="lg:hidden absolute left-2 top-2 z-20 p-1.5 bg-gray-800 border border-gray-700 rounded text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      )}

      {activeView === 'multi' && (
        <div className="flex flex-1 overflow-hidden relative">
          <div className={`border-r border-gray-800 flex-shrink-0 flex flex-col transition-all duration-200 ${sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-64'}`}>
            <Watchlist stocks={stocks} selectedSymbol={selectedSymbol} onSelect={handleSelectSymbol} onAddToWatchlist={addToWatchlist} watchlists={watchlists} />
            <div className="border-t border-gray-800 px-3 py-2">
              <button
                onClick={addChartWindow}
                disabled={chartWindows.length >= 6}
                className="w-full px-2 py-1 text-[11px] bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded transition-colors"
              >
                + New Chart Window ({chartWindows.length}/6)
              </button>
            </div>
          </div>
          <MultiChart
            windows={chartWindows}
            onRemoveWindow={removeChartWindow}
            onChangeSymbol={(id, sym) => setChartWindows(prev => prev.map(w => w.id === id ? { ...w, symbol: sym } : w))}
            indicators={indicators}
            onToggleIndicator={toggleIndicator}
            chartRange={chartRange}
            onChangeRange={setChartRange}
            onAddWindowCompare={addWindowCompare}
            onRemoveWindowCompare={removeWindowCompare}
            measureMode={measureMode}
            onToggleMeasure={toggleMeasure}
          />
          {rightPanelSection}
          {sidebarCollapsed && (
            <button
              onClick={toggleSidebar}
              aria-label="Show watchlist sidebar"
              className="lg:hidden absolute left-2 top-2 z-20 p-1.5 bg-gray-800 border border-gray-700 rounded text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between h-6 px-4 bg-[#070a10] border-t border-gray-800 text-[9px] text-gray-600">
        <div className="flex items-center gap-4">
          <span><kbd className="text-gray-700 bg-gray-800 px-1 rounded mr-1">/</kbd>Search</span>
          <span><kbd className="text-gray-700 bg-gray-800 px-1 rounded mr-1">1-4</kbd>Switch View</span>
          <span><kbd className="text-gray-700 bg-gray-800 px-1 rounded mr-1">ESC</kbd>Close</span>
        </div>
        <div className="flex items-center gap-3">
          <span>{stocks.length} stocks · NSE</span>
          <span>|</span>
          <span>{alerts.filter(a => a.active).length} alerts</span>
          <span>|</span>
          <span>{watchlists.reduce((n, w) => n + w.symbols.length, 0)} in {watchlists.length} watchlist{watchlists.length !== 1 ? 's' : ''}</span>
          <span>|</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Yahoo Finance · Live
          </span>
        </div>
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
    </ErrorBoundary>
  );
}
