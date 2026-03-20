// Lightweight Sentry integration — reports errors when NEXT_PUBLIC_SENTRY_DSN is set.
// Falls back to console.error when not configured.

const DSN = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_SENTRY_DSN ?? '')
  : (process.env.NEXT_PUBLIC_SENTRY_DSN ?? '');

const ENABLED = DSN.length > 0;

let initialized = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SentryModule: any = null;

async function ensureInit() {
  if (!ENABLED || initialized) return;
  initialized = true;
  try {
    SentryModule = await import('@sentry/nextjs');
    SentryModule.init({
      dsn: DSN,
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV,
    });
  } catch {
    // @sentry/nextjs not installed — that's fine, errors go to console
  }
}

export async function captureException(error: unknown, context?: Record<string, unknown>) {
  if (ENABLED) {
    await ensureInit();
    if (SentryModule) {
      SentryModule.captureException(error, { extra: context });
      return;
    }
  }
  console.error('[Error]', error, context);
}

export async function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (ENABLED) {
    await ensureInit();
    if (SentryModule) {
      SentryModule.captureMessage(message, level);
      return;
    }
  }
  if (level === 'error') console.error(message);
  else if (level === 'warning') console.warn(message);
  else console.info(message);
}
