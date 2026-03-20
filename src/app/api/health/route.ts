import { NextResponse } from 'next/server';
import { yahooFinance } from '@/lib/yahoo';

export const dynamic = 'force-dynamic';

export async function GET() {
  const timestamp = Date.now();
  const uptime = process.uptime();

  let yahooStatus: 'ok' | 'down' = 'ok';

  try {
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));
    await Promise.race([
      yahooFinance.quoteSummary('RELIANCE.NS', { modules: ['price'] }),
      timeoutPromise,
    ]);
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
