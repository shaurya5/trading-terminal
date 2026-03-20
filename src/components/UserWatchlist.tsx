'use client';

import { useState, useRef, useEffect } from 'react';
import { StockQuote, NamedWatchlist } from '@/types';
import { useSearch } from '@/hooks/useStockData';

interface UserWatchlistProps {
  watchlists: NamedWatchlist[];
  activeWatchlistId: string;
  onSetActiveWatchlist: (id: string) => void;
  allStocks: StockQuote[];
  selectedSymbol: string;
  onSelect: (symbol: string) => void;
  onAdd: (symbol: string, watchlistId?: string) => void;
  onRemove: (symbol: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

function displaySymbol(s: string) {
  return s.replace('.NS', '').replace('.BO', '');
}

export default function UserWatchlist({
  watchlists, activeWatchlistId, onSetActiveWatchlist,
  allStocks, selectedSymbol, onSelect, onAdd, onRemove,
  onCreate, onRename, onDelete,
}: UserWatchlistProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [addQuery, setAddQuery] = useState('');
  const [mode, setMode] = useState<'view' | 'create' | 'rename'>('view');
  const [inputValue, setInputValue] = useState('');
  const searchResults = useSearch(addQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  const active = watchlists.find(w => w.id === activeWatchlistId) ?? watchlists[0];

  const watchlistStocks = active
    ? active.symbols.map(s => allStocks.find(st => st.symbol === s)).filter((s): s is StockQuote => s != null)
    : [];

  useEffect(() => {
    if (mode !== 'view' && inputRef.current) inputRef.current.focus();
  }, [mode]);

  const handleCreate = () => {
    const name = inputValue.trim();
    if (!name) return;
    onCreate(name);
    setInputValue('');
    setMode('view');
  };

  const handleRename = () => {
    if (active && inputValue.trim()) {
      onRename(active.id, inputValue.trim());
    }
    setMode('view');
  };

  const startRename = () => {
    if (active) {
      setInputValue(active.name);
      setMode('rename');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Watchlist tabs */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-800">
        <div className="flex items-center gap-1 flex-1 overflow-x-auto min-w-0">
          {watchlists.map(w => (
            <button
              key={w.id}
              onClick={() => { onSetActiveWatchlist(w.id); setMode('view'); }}
              className={`shrink-0 px-2 py-0.5 text-[10px] rounded transition-colors ${
                w.id === active?.id
                  ? 'text-white bg-blue-600/40 border border-blue-500/50'
                  : 'text-gray-500 border border-gray-800 hover:border-gray-700 hover:text-gray-400'
              }`}
            >
              {w.name}
              <span className="ml-1 text-[9px] text-gray-600">{w.symbols.length}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => { setInputValue(''); setMode(mode === 'create' ? 'view' : 'create'); }}
          className={`shrink-0 w-5 h-5 flex items-center justify-center text-[11px] rounded transition-colors ${
            mode === 'create'
              ? 'text-white bg-blue-600/40 border border-blue-500/50'
              : 'text-gray-500 border border-gray-800 hover:border-gray-700 hover:text-gray-400'
          }`}
          title="New watchlist"
        >
          +
        </button>
      </div>

      {/* Inline create / rename form */}
      {mode !== 'view' && (
        <div className="px-2 py-1.5 border-b border-gray-800">
          <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">
            {mode === 'create' ? 'New watchlist' : `Rename "${active?.name}"`}
          </div>
          <div className="flex gap-1">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') mode === 'create' ? handleCreate() : handleRename();
                if (e.key === 'Escape') setMode('view');
              }}
              placeholder={mode === 'create' ? 'Name...' : ''}
              autoComplete="off"
              spellCheck={false}
              className="flex-1 min-w-0 px-2 py-1 text-[11px] bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-600 outline-none focus:border-blue-500"
            />
            <button
              onClick={mode === 'create' ? handleCreate : handleRename}
              className="shrink-0 px-2 py-1 text-[10px] bg-blue-600 text-white rounded hover:bg-blue-500"
            >
              {mode === 'create' ? 'Create' : 'Save'}
            </button>
            <button
              onClick={() => setMode('view')}
              className="shrink-0 px-1.5 py-1 text-[10px] text-gray-500 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Active watchlist header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-800">
        <h2 className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold truncate">{active?.name ?? 'Watchlist'}</h2>
        <div className="flex items-center gap-2 shrink-0">
          {active && watchlists.length > 1 && (
            <button
              onClick={() => {
                if (window.confirm(`Delete "${active.name}" watchlist? This cannot be undone.`)) {
                  onDelete(active.id);
                }
              }}
              className="text-[10px] text-gray-600 hover:text-red-400 transition-colors"
              title={`Delete "${active.name}"`}
            >
              Delete
            </button>
          )}
          {active && (
            <button
              onClick={startRename}
              className="text-[10px] text-gray-600 hover:text-gray-300 transition-colors"
            >
              Rename
            </button>
          )}
          <button
            onClick={() => { setShowAdd(!showAdd); setAddQuery(''); }}
            className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
          >
            {showAdd ? 'Done' : '+ Add'}
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="px-2 py-1.5 border-b border-gray-800">
          <input
            type="text"
            value={addQuery}
            onChange={e => setAddQuery(e.target.value)}
            placeholder="Search stock to add..."
            autoComplete="off"
            spellCheck={false}
            className="w-full px-2 py-1 text-[11px] bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-600 outline-none focus:border-blue-500"
            autoFocus
          />
          {searchResults.length > 0 && (
            <div className="mt-1 max-h-32 overflow-y-auto">
              {searchResults.map(r => (
                <button
                  key={r.symbol}
                  onClick={() => { onAdd(r.symbol, active?.id); setAddQuery(''); setShowAdd(false); }}
                  className="w-full flex items-center justify-between px-2 py-1 text-left text-[11px] hover:bg-gray-800/50 rounded"
                >
                  <span className="text-white font-mono">{displaySymbol(r.symbol)}</span>
                  <span className="text-gray-500 text-[10px] truncate ml-2">{r.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center px-3 py-1 border-b border-gray-800 text-[9px] text-gray-600 uppercase tracking-wider">
        <span className="flex-1">Symbol</span>
        <span className="w-16 text-right">Last</span>
        <span className="w-14 text-right">Chg%</span>
        <span className="w-6"></span>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {watchlistStocks.length === 0 && (
          <div className="px-3 py-6 text-center text-gray-600 text-[11px]">
            {showAdd ? 'Search above to add stocks' : 'Click "+ Add" to add stocks'}
          </div>
        )}
        {watchlistStocks.map(stock => (
          <div
            key={stock.symbol}
            className={`flex items-center px-3 py-1.5 transition-colors hover:bg-gray-800/50 group ${
              selectedSymbol === stock.symbol ? 'bg-gray-800/80 border-l-2 border-blue-500' : 'border-l-2 border-transparent'
            }`}
          >
            <button onClick={() => onSelect(stock.symbol)} className="flex-1 flex items-center text-left">
              <div className="flex-1">
                <span className="text-[11px] text-white font-mono font-medium">{displaySymbol(stock.symbol)}</span>
              </div>
              <div className="w-16 text-right">
                <span className="text-[11px] text-white font-mono">{stock.price.toFixed(2)}</span>
              </div>
              <div className="w-14 text-right">
                <span className={`text-[11px] font-mono ${stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                </span>
              </div>
            </button>
            <button
              onClick={() => onRemove(stock.symbol)}
              className="w-6 flex justify-center opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
