'use client';

import { useState, useRef, useEffect } from 'react';
import { StockQuote } from '@/types';
import { useSearch } from '@/hooks/useStockData';

interface StockSearchProps {
  stocks: StockQuote[];
  onSelect: (symbol: string) => void;
  onClose: () => void;
}

function displaySymbol(s: string) {
  return s.replace('.NS', '').replace('.BO', '');
}

function StockSearchDialog({ stocks, onSelect, onClose }: StockSearchProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const searchResults = useSearch(query);

  const filtered = query.length >= 2
    ? searchResults.length > 0
      ? searchResults.map(r => {
          const existing = stocks.find(s => s.symbol === r.symbol);
          return existing ?? { symbol: r.symbol, name: r.name, price: 0, change: 0, changePercent: 0, high: 0, low: 0, open: 0, prevClose: 0, volume: 0, marketCap: 0, pe: 0, week52High: 0, week52Low: 0, sector: '' };
        })
      : stocks.filter(s =>
          displaySymbol(s.symbol).toLowerCase().includes(query.toLowerCase()) ||
          s.name.toLowerCase().includes(query.toLowerCase())
        )
    : stocks;

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setSelectedIdx(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIdx]) {
      onSelect(filtered[selectedIdx].symbol);
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60" role="dialog" aria-modal="true" aria-label="Search stocks" onClick={onClose}>
      <div
        className="w-[500px] max-w-[95vw] bg-[#0d1117] border border-gray-700 rounded-lg shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-gray-800">
          <svg className="w-4 h-4 text-gray-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search NSE/BSE stocks..."
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-500"
          />
          <kbd className="ml-2 px-1.5 py-0.5 text-[10px] text-gray-500 bg-gray-800 rounded border border-gray-700">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {filtered.map((stock, idx) => (
            <button
              key={stock.symbol}
              onClick={() => { onSelect(stock.symbol); onClose(); }}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${
                idx === selectedIdx ? 'bg-blue-500/20' : 'hover:bg-gray-800/50'
              }`}
            >
              <div>
                <span className="text-sm text-white font-mono font-medium">{displaySymbol(stock.symbol)}</span>
                <span className="ml-2 text-xs text-gray-500 truncate">{stock.name}</span>
              </div>
              <div className="text-right">
                {stock.price > 0 && (
                  <>
                    <span className="text-sm text-white font-mono">{'\u20B9'}{stock.price.toFixed(2)}</span>
                    <span className={`ml-2 text-xs font-mono ${stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                    </span>
                  </>
                )}
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              {query.length >= 2 ? 'Searching...' : 'Type to search NSE/BSE stocks'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StockSearch({ stocks, onSelect, onClose, isOpen }: StockSearchProps & { isOpen: boolean }) {
  if (!isOpen) return null;
  return <StockSearchDialog stocks={stocks} onSelect={onSelect} onClose={onClose} />;
}
