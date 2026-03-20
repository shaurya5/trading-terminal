'use client';

import { useState } from 'react';
import { PriceAlert, StockQuote } from '@/types';

interface AlertsPanelProps {
  alerts: PriceAlert[];
  stocks: StockQuote[];
  onAdd: (alert: Omit<PriceAlert, 'id' | 'createdAt'>) => void;
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
}

export default function AlertsPanel({ alerts, stocks, onAdd, onRemove, onToggle }: AlertsPanelProps) {
  const [symbol, setSymbol] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !price) return;
    let sym = symbol.toUpperCase().trim();
    // Auto-append .NS if missing exchange suffix
    if (!sym.endsWith('.NS') && !sym.endsWith('.BO')) sym += '.NS';
    onAdd({ symbol: sym, targetPrice: parseFloat(price), condition, active: true });
    setSymbol('');
    setPrice('');
    setShowForm(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
        <h2 className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Price Alerts</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
        >
          {showForm ? 'Cancel' : '+ New Alert'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="px-3 py-2 border-b border-gray-800 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={symbol}
              onChange={e => setSymbol(e.target.value)}
              placeholder="Symbol"
              className="flex-1 px-2 py-1 text-[11px] bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-600 outline-none focus:border-blue-500"
              list="stock-symbols"
            />
            <datalist id="stock-symbols">
              {stocks.map(s => <option key={s.symbol} value={s.symbol} />)}
            </datalist>
            <select
              value={condition}
              onChange={e => setCondition(e.target.value as 'above' | 'below')}
              className="px-2 py-1 text-[11px] bg-gray-800 border border-gray-700 rounded text-white outline-none focus:border-blue-500"
            >
              <option value="above">Above</option>
              <option value="below">Below</option>
            </select>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="Target Price"
              step="0.01"
              className="flex-1 px-2 py-1 text-[11px] bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-600 outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="px-3 py-1 text-[11px] bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
            >
              Set Alert
            </button>
          </div>
        </form>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {alerts.length === 0 && (
          <div className="px-3 py-8 text-center text-gray-600 text-[11px]">
            No alerts set. Click &quot;+ New Alert&quot; to create one.
          </div>
        )}
        {alerts.map(alert => {
          const stock = stocks.find(s => s.symbol === alert.symbol);
          const triggered = stock && (
            (alert.condition === 'above' && stock.price >= alert.targetPrice) ||
            (alert.condition === 'below' && stock.price <= alert.targetPrice)
          );
          return (
            <div
              key={alert.id}
              className={`flex items-center justify-between px-3 py-2 border-b border-gray-800/50 ${
                triggered ? 'bg-yellow-500/10' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggle(alert.id)}
                  className={`w-2 h-2 rounded-full ${alert.active ? 'bg-green-400' : 'bg-gray-600'}`}
                />
                <div>
                  <span className="text-[11px] text-white font-mono">{alert.symbol}</span>
                  <span className="text-[10px] text-gray-500 ml-1">
                    {alert.condition === 'above' ? '>' : '<'} {'\u20B9'}{alert.targetPrice.toFixed(2)}
                  </span>
                  {triggered && (
                    <span className="ml-1.5 text-[9px] text-yellow-400 bg-yellow-400/10 px-1 rounded">TRIGGERED</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => onRemove(alert.id)}
                className="text-gray-600 hover:text-red-400 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
