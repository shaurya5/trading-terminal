import { NextRequest, NextResponse } from 'next/server';
import { yahooFinance } from '@/lib/yahoo';
import { getCachedAsync, setCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  const range = req.nextUrl.searchParams.get('range') ?? '1y';

  if (!symbol) {
    return NextResponse.json({ error: 'symbol is required' }, { status: 400 });
  }

  const cacheKey = `candles:${symbol}:${range}`;
  const cached = await getCachedAsync<unknown[]>(cacheKey);
  if (cached) return NextResponse.json(cached, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } });

  try {
    const periodMap: Record<string, { period1: string; interval: '1d' | '1wk' | '1h' | '5m' }> = {
      '1d': { period1: '1d', interval: '5m' },
      '5d': { period1: '5d', interval: '1h' },
      '1mo': { period1: '1mo', interval: '1d' },
      '6mo': { period1: '6mo', interval: '1d' },
      '1y': { period1: '1y', interval: '1d' },
      '5y': { period1: '5y', interval: '1wk' },
    };

    const isIntraday = range === '1d' || range === '5d';
    const config = periodMap[range] ?? periodMap['1y'];
    const now = new Date();
    const period1 = new Date(now);

    switch (config.period1) {
      case '1d': period1.setDate(period1.getDate() - 1); break;
      case '5d': period1.setDate(period1.getDate() - 7); break;
      case '1mo': period1.setMonth(period1.getMonth() - 1); break;
      case '6mo': period1.setMonth(period1.getMonth() - 6); break;
      case '1y': period1.setFullYear(period1.getFullYear() - 1); break;
      case '5y': period1.setFullYear(period1.getFullYear() - 5); break;
    }

    const result = await yahooFinance.chart(symbol, {
      period1,
      interval: config.interval,
    });

    const candles = result.quotes
      .filter(q => q.open != null && q.high != null && q.low != null && q.close != null)
      .map(q => ({
        time: isIntraday
          ? Math.floor(q.date.getTime() / 1000)
          : q.date.toISOString().split('T')[0],
        open: +q.open!.toFixed(2),
        high: +q.high!.toFixed(2),
        low: +q.low!.toFixed(2),
        close: +q.close!.toFixed(2),
        volume: q.volume ?? 0,
      }));

    // Deduplicate by time (keep last occurrence)
    const seen = new Map<string | number, typeof candles[number]>();
    for (const c of candles) seen.set(c.time, c);
    const deduped = Array.from(seen.values());

    setCache(cacheKey, deduped, 60000);
    return NextResponse.json(deduped, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } });
  } catch (e) {
    console.error('Candles API error:', e);
    return NextResponse.json({ error: 'Failed to fetch candles' }, { status: 500 });
  }
}
