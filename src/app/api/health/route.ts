import { NextResponse } from 'next/server';
import { yahooFinance } from '@/lib/yahoo';

export const dynamic = 'force-dynamic';

export async function GET() {
  const timestamp = Date.now();
  const uptime = process.uptime();

  let yahooStatus: 'ok' | 'down' = 'ok';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    await yahooFinance.quoteSummary('RELIANCE.NS', {
      modules: ['price'],
    });
    clearTimeout(timeout);
  } catch {
    yahooStatus = 'down';
  }

  const status = yahooStatus === 'ok' ? 'ok' : 'degraded';
  const httpStatus = yahooStatus === 'ok' ? 200 : 503;

  return NextResponse.json(
    {
      status,
      timestamp,
      uptime,
      yahoo: yahooStatus,
    },
    {
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    },
  );
}
