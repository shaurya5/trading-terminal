'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { StockQuote, CandleData, NewsItem, MarketIndex } from '@/types';

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json();
}

export function useQuotes(symbols?: string[], pollInterval = 5000) {
  const [quotes, setQuotes] = useState<StockQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchQuotes = useCallback(async () => {
    try {
      const params = symbols ? `?symbols=${symbols.join(',')}` : '';
      const data = await fetchJSON<StockQuote[]>(`/api/quotes${params}`);
      if (mountedRef.current) {
        setQuotes(data);
        setError(null);
        setLoading(false);
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : 'Failed to fetch quotes');
        setLoading(false);
      }
    }
  }, [symbols]);

  useEffect(() => {
    mountedRef.current = true;
    const id = setInterval(fetchQuotes, pollInterval);
    // Fire immediately via a 0-delay timer so setState happens async
    const init = setTimeout(fetchQuotes, 0);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
      clearTimeout(init);
    };
  }, [fetchQuotes, pollInterval]);

  return { quotes, loading, error, refetch: fetchQuotes };
}

export function useIndices(pollInterval = 10000) {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const doFetch = () => {
      fetchJSON<StockQuote[]>('/api/quotes?type=indices')
        .then(data => {
          if (mountedRef.current) {
            setIndices(data.map(q => ({
              symbol: q.symbol.replace('^', ''),
              name: q.name,
              value: q.price,
              change: q.change,
              changePercent: q.changePercent,
            })));
          }
        })
        .catch(() => {});
    };
    const init = setTimeout(doFetch, 0);
    const id = setInterval(doFetch, pollInterval);
    return () => { mountedRef.current = false; clearInterval(id); clearTimeout(init); };
  }, [pollInterval]);

  return indices;
}

export function useCandles(symbol: string, range = '1y') {
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [loadedKey, setLoadedKey] = useState('');

  const key = `${symbol}:${range}`;
  const loading = loadedKey !== key;

  useEffect(() => {
    let cancelled = false;

    const doFetch = () => {
      fetchJSON<CandleData[]>(`/api/candles?symbol=${encodeURIComponent(symbol)}&range=${range}`)
        .then(data => {
          if (!cancelled) { setCandles(data); setLoadedKey(key); }
        })
        .catch(() => {
          if (!cancelled) setLoadedKey(key);
        });
    };

    doFetch();

    // Auto-refresh intraday ranges to keep chart current
    const isIntraday = range === '1d' || range === '5d';
    const pollMs = isIntraday ? 30_000 : range === '1mo' ? 120_000 : 0;
    const id = pollMs > 0 ? setInterval(doFetch, pollMs) : undefined;

    return () => { cancelled = true; if (id) clearInterval(id); };
  }, [symbol, range, key]);

  return { candles, loading };
}

export function useNews(symbol: string) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loadedSymbol, setLoadedSymbol] = useState('');

  const loading = loadedSymbol !== symbol;

  useEffect(() => {
    let cancelled = false;
    fetchJSON<NewsItem[]>(`/api/news?symbol=${encodeURIComponent(symbol)}`)
      .then(data => {
        if (!cancelled) { setNews(data); setLoadedSymbol(symbol); }
      })
      .catch(() => {
        if (!cancelled) setLoadedSymbol(symbol);
      });
    return () => { cancelled = true; };
  }, [symbol]);

  return { news, loading };
}

export function useSearch(query: string) {
  const [results, setResults] = useState<{ symbol: string; name: string; exchange: string }[]>([]);
  const [, setSearchedQuery] = useState('');

  const isEmpty = !query || query.length < 2;

  useEffect(() => {
    if (isEmpty) {
      const t = setTimeout(() => { setResults([]); setSearchedQuery(''); }, 0);
      return () => clearTimeout(t);
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      fetchJSON<{ symbol: string; name: string; exchange: string }[]>(
        `/api/search?q=${encodeURIComponent(query)}`
      ).then(data => {
        if (!cancelled) { setResults(data); setSearchedQuery(query); }
      }).catch(() => {});
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, isEmpty]);

  return results;
}
