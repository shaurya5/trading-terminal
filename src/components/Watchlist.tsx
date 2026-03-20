'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { StockQuote, NamedWatchlist } from '@/types';

interface WatchlistProps {
  stocks: StockQuote[];
  selectedSymbol: string;
  onSelect: (symbol: string) => void;
  onAddToWatchlist?: (symbol: string, watchlistId?: string) => void;
  watchlists?: NamedWatchlist[];
}

function formatVolume(v: number): string {
  if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e7) return (v / 1e7).toFixed(1) + 'Cr';
  if (v >= 1e5) return (v / 1e5).toFixed(1) + 'L';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return v.toString();
}

function displaySymbol(s: string) {
  return s.replace('.NS', '').replace('.BO', '');
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  symbol: string;
}

export default function Watchlist({ stocks, selectedSymbol, onSelect, onAddToWatchlist, watchlists }: WatchlistProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, symbol: '' });
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent, symbol: string) => {
    if (!onAddToWatchlist) return;
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, symbol });
  }, [onAddToWatchlist]);

  const handleAddToWatchlist = useCallback(() => {
    if (onAddToWatchlist && contextMenu.symbol) {
      onAddToWatchlist(contextMenu.symbol);
    }
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, [onAddToWatchlist, contextMenu.symbol]);

  // Close context menu on click outside or scroll
  useEffect(() => {
    if (!contextMenu.visible) return;
    const close = () => setContextMenu(prev => ({ ...prev, visible: false }));
    document.addEventListener('click', close);
    document.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('scroll', close, true);
    };
  }, [contextMenu.visible]);

  return (
    <div className="flex flex-col h-full relative">
      <div className="px-3 py-2 border-b border-gray-800">
        <h2 className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Watchlist</h2>
      </div>
      <div className="flex items-center px-3 py-1 border-b border-gray-800 text-[9px] text-gray-500 uppercase tracking-wider">
        <span className="w-20">Symbol</span>
        <span className="flex-1 text-right">Last</span>
        <span className="w-16 text-right">Chg%</span>
        <span className="w-14 text-right">Vol</span>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {stocks.map(stock => (
          <button
            key={stock.symbol}
            onClick={() => onSelect(stock.symbol)}
            onContextMenu={(e) => handleContextMenu(e, stock.symbol)}
            className={`w-full flex items-center px-3 py-1.5 text-left transition-colors hover:bg-gray-800/50 ${
              selectedSymbol === stock.symbol ? 'bg-gray-800/80 border-l-2 border-blue-500' : 'border-l-2 border-transparent'
            }`}
          >
            <div className="w-20">
              <div className="text-[11px] text-white font-mono font-medium truncate">{displaySymbol(stock.symbol)}</div>
            </div>
            <div className="flex-1 text-right">
              <span className="text-[11px] text-white font-mono">{stock.price.toFixed(2)}</span>
            </div>
            <div className="w-16 text-right">
              <span className={`text-[11px] font-mono ${stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                <span className="sr-only">{stock.changePercent >= 0 ? 'up' : 'down'}</span>
                {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
              </span>
            </div>
            <div className="w-14 text-right">
              <span className="text-[10px] text-gray-500 font-mono">{formatVolume(stock.volume)}</span>
            </div>
          </button>
        ))}
      </div>

      {contextMenu.visible && (
        <div
          ref={menuRef}
          className="fixed z-50 py-1 min-w-[180px] bg-[#1a1f2e] border border-gray-700 rounded shadow-lg shadow-black/50"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {watchlists && watchlists.length > 1 ? (
            <>
              <div className="px-3 py-1 text-[9px] text-gray-500 uppercase tracking-wider">Add to watchlist</div>
              {watchlists.map(w => (
                <button
                  key={w.id}
                  onClick={() => {
                    if (onAddToWatchlist && contextMenu.symbol) onAddToWatchlist(contextMenu.symbol, w.id);
                    setContextMenu(prev => ({ ...prev, visible: false }));
                  }}
                  className="w-full px-3 py-1.5 text-left text-[11px] text-gray-300 hover:bg-blue-600/30 hover:text-white transition-colors flex items-center gap-2"
                >
                  <svg className="w-3 h-3 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="truncate">{w.name}</span>
                  <span className="text-[9px] text-gray-500 ml-auto shrink-0">{w.symbols.length}</span>
                </button>
              ))}
            </>
          ) : (
            <button
              onClick={handleAddToWatchlist}
              className="w-full px-3 py-1.5 text-left text-[11px] text-gray-300 hover:bg-blue-600/30 hover:text-white transition-colors flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add to My Watchlist
            </button>
          )}
        </div>
      )}
    </div>
  );
}
