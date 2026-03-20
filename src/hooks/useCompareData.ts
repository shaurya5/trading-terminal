'use client';

import { useState, useEffect } from 'react';
import { CandleData } from '@/types';
import { COMPARE_COLORS } from '@/lib/utils';

export function useCompareData(symbols: string[], range: string) {
  const [data, setData] = useState<{ symbol: string; data: CandleData[]; color: string }[]>([]);

  const key = symbols.join(',');
  const isEmpty = symbols.length === 0;

  useEffect(() => {
    if (isEmpty) {
      setData([]);
      return;
    }
    let cancelled = false;

    Promise.all(
      symbols.map(async (s, i) => {
        const res = await fetch(`/api/candles?symbol=${encodeURIComponent(s)}&range=${range}`);
        const candles: CandleData[] = res.ok ? await res.json() : [];
        return { symbol: s, data: candles, color: COMPARE_COLORS[i % COMPARE_COLORS.length] };
      })
    ).then(results => {
      if (!cancelled) setData(results);
    }).catch(() => {});

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, range, isEmpty]);

  return data;
}
